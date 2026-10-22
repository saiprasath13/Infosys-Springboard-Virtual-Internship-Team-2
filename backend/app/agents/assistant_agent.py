"""
AI Negotiation Assistant — helps users set up negotiations via natural language.
Uses Groq when available, otherwise uses a rule-based extractor.
"""
from __future__ import annotations
import json
import logging
import re
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.schemas import AssistantChatResponse, AssistantMessage

logger = logging.getLogger(__name__)

ASSISTANT_SYSTEM = """You are an AI Negotiation Setup Assistant for the Negotiation Arena platform.

Your job is to help users configure a negotiation scenario by:
1. Identifying the negotiation domain (vendor pricing, job offer, project budget, or custom).
2. Extracting participants, goals, constraints, and issues from the user's description.
3. Asking ONE follow-up question at a time when critical information is missing.
4. Producing a structured JSON configuration when you have enough information.
5. Clearly marking any assumed defaults as [ASSUMPTION] so the user can edit them.
6. Asking the user to confirm the configuration before starting.

IMPORTANT RULES:
- Never invent specific salary numbers, budgets, or limits without telling the user they are assumptions.
- Keep responses concise and conversational.
- When you have a complete configuration, include it as JSON in your response wrapped in ```json ... ```.
- The config JSON must include: scenario_type, mode, title, agent_a_name, agent_b_name,
  agent_a_personality, agent_b_personality, max_rounds, and scenario-specific fields.

Scenario types: vendor_pricing, job_offer, project_budget, custom
Modes: simulation (AI vs AI), practice (Human vs AI)
Personalities: aggressive, collaborative, risk_averse
"""


class AssistantAgent:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None and not settings.USE_MOCK_AGENTS and settings.GROQ_API_KEY:
            from langchain_groq import ChatGroq
            self._client = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model_name=settings.GROQ_MODEL,
                temperature=0.3,
                max_tokens=1024,
            )
        return self._client

    async def chat(
        self,
        user_message: str,
        history: List[AssistantMessage],
        user_id: int,
        negotiation_id: Optional[int],
        db: AsyncSession,
    ) -> AssistantChatResponse:
        client = self._get_client()

        if client:
            return await self._groq_chat(client, user_message, history)
        else:
            return self._rule_based_chat(user_message, history)

    async def _groq_chat(self, client, user_message: str, history: List[AssistantMessage]) -> AssistantChatResponse:
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

        messages = [SystemMessage(content=ASSISTANT_SYSTEM)]
        for h in history[-10:]:
            if h.role == "user":
                messages.append(HumanMessage(content=h.content))
            else:
                messages.append(AIMessage(content=h.content))
        messages.append(HumanMessage(content=user_message))

        try:
            response = await client.ainvoke(messages)
            reply = response.content
            config, ready = self._extract_config(reply)
            return AssistantChatResponse(reply=reply, extracted_config=config, ready_to_start=ready)
        except Exception as e:
            logger.error(f"AssistantAgent groq error: {e}")
            return self._rule_based_chat(user_message, history)

    def _normalize_number(self, value: str) -> float:
        cleaned = value.strip().replace(",", "")
        if not cleaned:
            return 0.0

        cleaned = (
            cleaned.replace("₹", "")
            .replace("$", "")
            .replace("€", "")
            .replace("?", "")
            .replace("rs", "")
            .replace("inr", "")
            .replace("rupees", "")
            .replace("rupee", "")
            .strip()
            .lower()
        )
        cleaned = cleaned.replace("lakhs", "l").replace("lakh", "l")
        cleaned = cleaned.replace("lacs", "l").replace("lac", "l")
        cleaned = cleaned.replace("crores", "cr").replace("crore", "cr")
        cleaned = cleaned.replace("mn", "m").replace("l.p.a", "lpa")
        cleaned = cleaned.replace(" ", "")

        multiplier = 1.0
        if cleaned.endswith("lpa"):
            multiplier = 100000.0
            cleaned = cleaned[:-3].rstrip(".")
        elif cleaned.endswith("k"):
            multiplier = 1000.0
            cleaned = cleaned[:-1]
        elif cleaned.endswith("l"):
            multiplier = 100000.0
            cleaned = cleaned[:-1].rstrip(".")
        elif cleaned.endswith("cr"):
            multiplier = 10000000.0
            cleaned = cleaned[:-2].rstrip(".")
        elif cleaned.endswith("m"):
            multiplier = 1000000.0
            cleaned = cleaned[:-1].rstrip(".")

        cleaned = cleaned.strip(". ")
        try:
            return float(cleaned) * multiplier
        except ValueError:
            return 0.0

    def _extract_money_value(self, text: str, keywords: list[str], fallback: float) -> float:
        for keyword in keywords:
            phrase = re.escape(keyword).replace(r"\ ", r"\s+")
            regex = rf"\b{phrase}\b[^0-9₹$€]{{0,25}}(?:₹|\$|€)?\s*([0-9]+(?:[.,][0-9]+)?(?:\s*(?:k|l|lac|lakh|lpa|m|mn|cr|crore))?)"
            matches = list(re.finditer(regex, text, re.IGNORECASE))
            if matches:
                value = self._normalize_number(matches[-1].group(1))
                if value > 0:
                    return value

        numbers = re.findall(
            r"(?:₹|\$|€)?\s*\d+(?:[.,]\d+)?(?:\s*(?:k|l|lac|lakh|lpa|m|mn|cr|crore))?",
            text,
            re.IGNORECASE,
        )
        if numbers:
            value = self._normalize_number(numbers[0])
            if value > 0:
                return value
        return fallback

    def _rule_based_chat(self, user_message: str, history: List[AssistantMessage]) -> AssistantChatResponse:
        """Rule-based extractor when Groq is unavailable."""
        msg_lower = user_message.lower()
        is_first = len(history) == 0

        config = self._build_config_from_prompt(user_message)
        if config:
            reply = (
                "I’ve mapped your request into a negotiation setup. "
                "I’ve added default assumptions where specific values were not provided so you can review and edit them before starting."
            )
            return AssistantChatResponse(
                reply=reply,
                extracted_config=config,
                ready_to_start=True,
            )

        if is_first:
            if any(kw in msg_lower for kw in ["salary", "job", "offer", "lpa", "ctc", "candidate", "recruiter"]):
                return AssistantChatResponse(
                    reply=(
                        "It sounds like you want to set up a **Job Offer Negotiation**! "
                        "I can configure this for you.\n\n"
                        "Could you tell me:\n"
                        "1. What salary are you targeting (in LPA)?\n"
                        "2. Would you like to **practice** negotiating yourself, or **watch AI agents** simulate it?\n\n"
                        "*[MOCK MODE — Groq API key not configured]*"
                    ),
                    ready_to_start=False,
                )
            elif any(kw in msg_lower for kw in ["vendor", "price", "pricing", "supplier", "purchase", "buy"]):
                return AssistantChatResponse(
                    reply=(
                        "This sounds like a **Vendor Pricing Negotiation**!\n\n"
                        "Let me know:\n"
                        "1. What is the starting price?\n"
                        "2. What is your target price?\n"
                        "3. Simulation (AI vs AI) or Practice (you vs AI)?\n\n"
                        "*[MOCK MODE — Groq API key not configured]*"
                    ),
                    ready_to_start=False,
                )
            elif any(kw in msg_lower for kw in ["budget", "project", "allocation", "team", "fund"]):
                return AssistantChatResponse(
                    reply=(
                        "This looks like a **Project Budget Allocation** negotiation!\n\n"
                        "Tell me:\n"
                        "1. What is the total budget?\n"
                        "2. How many teams are negotiating?\n"
                        "3. Simulation or Practice mode?\n\n"
                        "*[MOCK MODE — Groq API key not configured]*"
                    ),
                    ready_to_start=False,
                )
            else:
                return AssistantChatResponse(
                    reply=(
                        "I can help you set up any negotiation scenario! "
                        "Please describe what you'd like to negotiate — for example:\n\n"
                        "• *\"I want to negotiate a software developer job offer with a target of ₹12 LPA\"*\n"
                        "• *\"Set up a vendor pricing negotiation for IT equipment worth ₹2L\"*\n"
                        "• *\"Negotiate project budget allocation between two teams\"*\n\n"
                        "*[MOCK MODE — Groq API key not configured. Add GROQ_API_KEY to .env for full AI capabilities.]*"
                    ),
                    ready_to_start=False,
                )
        else:
            return AssistantChatResponse(
                reply=(
                    "Thanks for that information! To use the full AI assistant with natural language understanding, "
                    "please add your GROQ_API_KEY to the `.env` file and set `USE_MOCK_AGENTS=false`.\n\n"
                    "In the meantime, you can use the **prebuilt simulation cards** on the New Negotiation screen "
                    "to configure and start a negotiation directly."
                ),
                extracted_config=self._build_config_from_prompt(user_message),
                ready_to_start=bool(self._build_config_from_prompt(user_message)),
            )

    def _extract_int_value(self, text: str, keywords: list[str], default: int) -> int:
        for keyword in keywords:
            match = re.search(rf"{re.escape(keyword)}[^0-9]{{0,20}}(\d+)", text, re.IGNORECASE)
            if match:
                return int(match.group(1))

        match = re.search(r"(\d+)\s*[-/ ]*(?:rounds?|round)", text, re.IGNORECASE)
        if match:
            return int(match.group(1))
        return default

    def _extract_payment_terms(self, text: str) -> str:
        if re.search(r"net\s*45|net45", text, re.IGNORECASE):
            return "Net 45"
        if re.search(r"net\s*60|net60", text, re.IGNORECASE):
            return "Net 60"
        if re.search(r"advance\s*payment|upfront\s*payment|pay\s*upfront", text, re.IGNORECASE):
            return "Advance Payment"
        if re.search(r"milestone", text, re.IGNORECASE):
            return "Milestone-Based"
        return "Net 30"

    def _build_config_from_prompt(self, user_message: str):
        text = user_message.strip()
        if not text:
            return None
        msg_lower = text.lower()
        scenario_type = "custom"
        if any(kw in msg_lower for kw in ["salary", "job", "offer", "lpa", "ctc", "candidate", "recruiter", "compensation"]):
            scenario_type = "job_offer"
        elif any(kw in msg_lower for kw in ["vendor", "price", "pricing", "supplier", "purchase", "buy", "procurement", "quote", "contract"]):
            scenario_type = "vendor_pricing"
        elif any(kw in msg_lower for kw in ["budget", "allocation", "team", "project", "resources", "infrastructure"]):
            scenario_type = "project_budget"

        practice_markers = [
            "practice", "human vs ai", "human v ai", "you vs ai", "you versus ai",
            "human against ai", "you yourself", "as yourself", "negotiating yourself",
            "negotiating as yourself", "i will negotiate"
        ]
        mode = "practice" if any(kw in msg_lower for kw in practice_markers) else "simulation"

        title = text[:60].strip() if len(text) > 60 else text
        config = {
            "title": title or "AI Negotiation Session",
            "mode": mode,
            "scenario_type": scenario_type,
            "agent_a_name": "You (Human Negotiator)" if mode == "practice" else "Party A",
            "agent_b_name": "AI Counterpart" if mode == "practice" else "Party B",
            "agent_a_personality": "collaborative" if mode == "practice" else "aggressive",
            "agent_b_personality": "aggressive" if mode == "practice" else "collaborative",
            "max_rounds": self._extract_int_value(text, ["max rounds", "maximum rounds", "rounds limit", "up to"], 10),
        }

        party_match = re.search(
            r"(?:between|vs|versus|against)\s+([A-Za-z0-9][A-Za-z0-9 .&'-]+?)\s+(?:and|vs|versus|against)\s+([A-Za-z0-9][A-Za-z0-9 .&'-]+?)\b",
            text,
            re.IGNORECASE,
        )
        if party_match and mode == "simulation":
            config["agent_a_name"] = party_match.group(1).strip()
            config["agent_b_name"] = party_match.group(2).strip()

        if scenario_type == "vendor_pricing":
            config.update({
                "starting_price": self._extract_money_value(text, ["starting price", "list price", "initial price", "quote"], 120000),
                "buyer_target_price": self._extract_money_value(text, ["target price", "target", "desired price", "buyer target"], 90000),
                "buyer_max_price": self._extract_money_value(text, ["max price", "maximum price", "budget", "buyer max"], 105000),
                "vendor_min_price": self._extract_money_value(text, ["minimum price", "floor price", "vendor minimum", "vendor min"], 85000),
                "quantity": self._extract_int_value(text, ["quantity", "qty", "units", "unit count"], 1000),
                "delivery_days": self._extract_int_value(text, ["delivery days", "delivery in", "lead time", "shipment within"], 30),
                "payment_terms": self._extract_payment_terms(text),
            })
            return config

        if scenario_type == "job_offer":
            config.update({
                "starting_salary": self._extract_money_value(text, ["starting salary", "base salary", "initial salary", "offer"], 2400000),
                "candidate_target": self._extract_money_value(text, ["target salary", "candidate target", "desired salary", "salary target"], 3000000),
                "candidate_min": self._extract_money_value(text, ["minimum salary", "candidate minimum", "lowest salary", "floor"], 2500000),
                "recruiter_budget": self._extract_money_value(text, ["budget", "recruiter budget", "max salary"], 2800000),
                "benefits": self._extract_benefits(text),
                "joining_days": self._extract_int_value(text, ["joining days", "notice period", "start in", "joining in"], 30),
            })
            return config

        if scenario_type == "project_budget":
            config.update({
                "total_budget": self._extract_money_value(text, ["total budget", "budget", "project budget"], 5000000),
                "alpha_requested": self._extract_money_value(text, ["alpha request", "alpha requested", "alpha budget"], 3000000),
                "beta_requested": self._extract_money_value(text, ["beta request", "beta requested", "beta budget"], 3500000),
                "alpha_minimum": self._extract_money_value(text, ["alpha minimum", "minimum alpha"], 2000000),
                "beta_minimum": self._extract_money_value(text, ["beta minimum", "minimum beta"], 2000000),
            })
            return config

        return config

    def _extract_benefits(self, text: str) -> list[str]:
        benefits = ["health_insurance", "pf", "gratuity"]
        lower = text.lower()
        if "equity" in lower:
            benefits.append("equity")
        if "remote" in lower or "work from home" in lower:
            benefits.append("remote_work")
        if "bonus" in lower:
            benefits.append("signing_bonus")
        if "pto" in lower or "leave" in lower:
            benefits.append("pto")
        # Preserve the base set, but avoid duplicates while keeping order.
        deduped = []
        seen = set()
        for item in benefits:
            if item not in seen:
                deduped.append(item)
                seen.add(item)
        return deduped

    def _extract_config(self, reply: str):
        """Extract JSON config block from assistant reply."""
        match = re.search(r"```json\s*([\s\S]*?)\s*```", reply)
        if match:
            try:
                config = json.loads(match.group(1))
                ready = config.get("confirmed", False) or "ready_to_start" in reply.lower()
                return config, ready
            except json.JSONDecodeError:
                pass
        return None, False
