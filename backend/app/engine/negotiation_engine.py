"""
Negotiation Engine — deterministic state machine that orchestrates turn-by-turn
negotiation, validates offers against hard constraints, and drives AI agent calls.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.models import (
    Negotiation, NegotiationMessage, Offer,
    NegotiationStatus, MessageRole, OfferStatus,
)
from app.engine.scenarios import get_scenario_rules
from app.agents.mock_agent import MockAgent
from app.agents.groq_agent import GroqAgent

logger = logging.getLogger(__name__)


def _get_agent(personality: str, role: str):
    if settings.USE_MOCK_AGENTS or not settings.GROQ_API_KEY:
        return MockAgent(personality=personality, role=role)
    return GroqAgent(personality=personality, role=role)


class NegotiationEngine:
    """Wraps a single negotiation session. Can be used per-request (Practice)
    or as a background task (Simulation)."""

    def __init__(self, negotiation_id: int, db: AsyncSession):
        self.negotiation_id = negotiation_id
        self.db = db

    @classmethod
    async def run_simulation(cls, negotiation_id: int):
        """Entry point for background simulation task."""
        async with AsyncSessionLocal() as db:
            engine = cls(negotiation_id, db)
            await engine._run_simulation_loop()

    async def _load_negotiation(self) -> Negotiation:
        from sqlalchemy import select
        result = await self.db.execute(
            select(Negotiation)
            .where(Negotiation.id == self.negotiation_id)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def _run_simulation_loop(self):
        neg = await self._load_negotiation()
        if not neg:
            logger.error(f"Negotiation {self.negotiation_id} not found")
            return

        config = neg.config
        rules = get_scenario_rules(neg.scenario_type, config)

        agent_a = _get_agent(config.get("agent_a_personality", "collaborative"), "agent_a")
        agent_b = _get_agent(config.get("agent_b_personality", "aggressive"), "agent_b")

        # System message
        await self._add_message(
            MessageRole.SYSTEM,
            f"Negotiation started: {neg.title}. "
            f"Max rounds: {neg.max_rounds}. Mode: AI vs AI (Simulation).",
        )
        await self.db.commit()

        offer_history = []

        for round_num in range(1, neg.max_rounds + 1):
            # Refresh status
            neg = await self._load_negotiation()
            if neg.status in (NegotiationStatus.PAUSED, NegotiationStatus.CANCELLED):
                logger.info(f"Negotiation {self.negotiation_id} paused/cancelled at round {round_num}")
                break

            neg.current_round = round_num
            await self.db.flush()

            # Agent A proposes
            a_offer, a_message = await agent_a.generate_offer(
                round_num=round_num,
                scenario_rules=rules,
                offer_history=offer_history,
                opponent_name=config.get("agent_b_name", "Party B"),
            )

            # Validate against rules
            a_offer = rules.clamp_offer("agent_a", a_offer)

            await self._add_message(MessageRole.AGENT_A, a_message, round_num)
            offer_record_a = await self._add_offer(round_num, "agent_a", a_offer, a_message)
            offer_history.append({"round": round_num, "by": "agent_a", "offer": a_offer})
            await self.db.commit()

            await asyncio.sleep(0.5)  # Simulate thinking time

            # Agent B evaluates
            b_decision, b_counter, b_message = await agent_b.evaluate_offer(
                round_num=round_num,
                opponent_offer=a_offer,
                scenario_rules=rules,
                offer_history=offer_history,
                opponent_name=config.get("agent_a_name", "Party A"),
            )

            if b_decision == "accept" and not rules.is_offer_acceptable("agent_b", a_offer):
                b_decision = "counter"
                b_counter = rules.clamp_offer("agent_b", a_offer)
                mock_prefix = "[MOCK] " if isinstance(agent_b, MockAgent) else ""
                b_message = f"{mock_prefix}The offer is outside my acceptable limits. Here is my counter-offer."

            if b_decision == "accept":
                await self._add_message(MessageRole.AGENT_B, b_message, round_num)
                offer_record_a.status = OfferStatus.ACCEPTED
                await self._complete_negotiation(neg, rules, a_offer, offer_history)
                return

            # Counter
            b_counter = rules.clamp_offer("agent_b", b_counter or a_offer)
            offer_record_a.status = OfferStatus.COUNTERED if b_decision == "counter" else OfferStatus.REJECTED

            await self._add_message(MessageRole.AGENT_B, b_message, round_num)
            offer_record_b = await self._add_offer(round_num, "agent_b", b_counter, b_message)
            offer_history.append({"round": round_num, "by": "agent_b", "offer": b_counter})
            await self.db.commit()

            await asyncio.sleep(0.5)

            # Agent A evaluates B's counter
            a_decision, _, a_response = await agent_a.evaluate_offer(
                round_num=round_num,
                opponent_offer=b_counter,
                scenario_rules=rules,
                offer_history=offer_history,
                opponent_name=config.get("agent_b_name", "Party B"),
            )
            if a_decision == "accept" and not rules.is_offer_acceptable("agent_a", b_counter):
                a_decision = "counter"
                mock_prefix = "[MOCK] " if isinstance(agent_a, MockAgent) else ""
                a_response = f"{mock_prefix}The offer is outside my acceptable limits. I cannot accept these terms."

            if a_decision == "accept":
                await self._add_message(MessageRole.AGENT_A, a_response, round_num)
                offer_record_b.status = OfferStatus.ACCEPTED
                await self._complete_negotiation(neg, rules, b_counter, offer_history)
                return

            offer_record_b.status = OfferStatus.COUNTERED
            await self._add_message(MessageRole.AGENT_A, a_response, round_num)
            await self.db.commit()

            # Deadlock detection
            if self._detect_deadlock(offer_history):
                await self._deadlock_negotiation(neg)
                return

        # Max rounds reached
        await self._deadlock_negotiation(neg)

    async def process_human_offer(self, offer_data: dict, message: Optional[str]) -> dict:
        """Handle a human offer in Practice Mode, get AI response."""
        neg = await self._load_negotiation()
        config = neg.config
        rules = get_scenario_rules(neg.scenario_type, config)

        # Clamp human offer within valid range
        clamped = rules.clamp_offer("agent_a", offer_data)

        offers_result_q = await self.db.execute(
            __import__("sqlalchemy", fromlist=["select"]).select(Offer)
            .where(Offer.negotiation_id == self.negotiation_id)
            .order_by(Offer.created_at)
        )
        prior_offers = offers_result_q.scalars().all()
        offer_history = [
            {"round": o.round_number, "by": o.made_by, "offer": o.offer_data}
            for o in prior_offers
        ]
        for previous_offer in prior_offers:
            if previous_offer.made_by == "agent_b" and previous_offer.status == OfferStatus.PENDING:
                previous_offer.status = OfferStatus.COUNTERED

        round_num = neg.current_round + 1
        neg.current_round = round_num

        # Record human offer
        human_msg = message or "Human offer submitted."
        await self._add_message(MessageRole.HUMAN, human_msg, round_num)
        human_offer = await self._add_offer(round_num, "human", clamped, human_msg)
        offer_history.append({"round": round_num, "by": "human", "offer": clamped})

        # AI agent responds
        agent_b = _get_agent(config.get("agent_b_personality", "aggressive"), "agent_b")
        decision, counter, b_message = await agent_b.evaluate_offer(
            round_num=round_num,
            opponent_offer=clamped,
            scenario_rules=rules,
            offer_history=offer_history,
            opponent_name="You",
        )

        if decision == "accept" and not rules.is_offer_acceptable("agent_b", clamped):
            decision = "counter"
            counter = rules.clamp_offer("agent_b", clamped)
            mock_prefix = "[MOCK] " if isinstance(agent_b, MockAgent) else ""
            b_message = f"{mock_prefix}Your offer is outside my acceptable limits. Here is my counter-offer."

        await self._add_message(MessageRole.AGENT_B, b_message, round_num)

        if decision == "accept":
            offer_record_b = await self._add_offer(round_num, "agent_b", clamped, b_message)
            offer_record_b.status = OfferStatus.ACCEPTED
            human_offer.status = OfferStatus.ACCEPTED
            await self._complete_negotiation(neg, rules, clamped, offer_history)
            return {"decision": "accept", "message": b_message, "agreed_offer": clamped}

        counter = rules.clamp_offer("agent_b", counter or clamped)
        human_offer.status = OfferStatus.COUNTERED
        await self._add_offer(round_num, "agent_b", counter, b_message)
        offer_history.append({"round": round_num, "by": "agent_b", "offer": counter})
        await self.db.flush()

        if round_num >= neg.max_rounds:
            await self._deadlock_negotiation(neg)
            return {"decision": "deadlock", "message": "Maximum rounds reached.", "counter_offer": counter}

        return {"decision": decision, "message": b_message, "counter_offer": counter}

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _add_message(self, role: MessageRole, content: str, round_num: Optional[int] = None):
        msg = NegotiationMessage(
            negotiation_id=self.negotiation_id,
            role=role,
            content=content,
            round_number=round_num,
        )
        self.db.add(msg)
        await self.db.flush()
        return msg

    async def _add_offer(self, round_num: int, made_by: str, offer_data: dict, rationale: str) -> Offer:
        offer = Offer(
            negotiation_id=self.negotiation_id,
            round_number=round_num,
            made_by=made_by,
            offer_data=offer_data,
            rationale=rationale,
        )
        self.db.add(offer)
        await self.db.flush()
        return offer

    def _detect_deadlock(self, history: list) -> bool:
        """Detect if the last 4 offers show no meaningful movement."""
        if len(history) < 4:
            return False
        recent = history[-4:]
        # Simple check: all offers from same party have same primary value
        a_offers = [h["offer"] for h in recent if h["by"] in ("agent_a", "human")]
        b_offers = [h["offer"] for h in recent if h["by"] == "agent_b"]
        if len(a_offers) >= 2 and len(b_offers) >= 2:
            a_stagnant = all(o == a_offers[0] for o in a_offers)
            b_stagnant = all(o == b_offers[0] for o in b_offers)
            return a_stagnant and b_stagnant
        return False

    async def _complete_negotiation(self, neg: Negotiation, rules, agreed_offer: dict, history: list):
        satisfaction = rules.compute_satisfaction(agreed_offer)
        neg.status = NegotiationStatus.COMPLETED
        neg.completed_at = datetime.now(timezone.utc)
        neg.outcome_data = {
            "final_outcome": "Agreement reached",
            "agreed_terms": agreed_offer,
            "initial_offer": history[0]["offer"] if history else {},
            "final_offer": agreed_offer,
            "satisfaction_scores": satisfaction,
        }
        await self.db.flush()
        await self._add_message(MessageRole.SYSTEM, "✅ Agreement reached! Negotiation completed successfully.")
        await self.db.commit()
        logger.info(f"Negotiation {self.negotiation_id} completed with agreement.")

    async def _deadlock_negotiation(self, neg: Negotiation):
        neg.status = NegotiationStatus.DEADLOCKED
        neg.completed_at = datetime.now(timezone.utc)
        neg.outcome_data = {
            "final_outcome": "Deadlock — no agreement reached",
            "breakdown_reason": "Parties could not reach agreement within the maximum number of rounds.",
        }
        await self.db.flush()
        await self._add_message(MessageRole.SYSTEM, "⚠️ Negotiation ended in deadlock. No agreement was reached.")
        await self.db.commit()
        logger.info(f"Negotiation {self.negotiation_id} ended in deadlock.")
