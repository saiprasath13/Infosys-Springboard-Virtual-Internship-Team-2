"""
Mock Agent — deterministic negotiation agent for development/testing.
Does NOT use an LLM. Clearly labelled as mock in all responses.
"""
from __future__ import annotations
import random
from typing import Optional, Tuple


PERSONALITY_PARAMS = {
    "aggressive": {"concession_rate": 0.05, "accept_threshold": 0.95, "reject_early": True},
    "collaborative": {"concession_rate": 0.15, "accept_threshold": 0.80, "reject_early": False},
    "risk_averse": {"concession_rate": 0.20, "accept_threshold": 0.70, "reject_early": False},
}

AGENT_PHRASES = {
    "aggressive": [
        "This is our final position and we expect compliance.",
        "Our terms are non-negotiable at this point.",
        "We need a better offer before we can proceed.",
        "I'm disappointed — let's focus on realistic numbers.",
    ],
    "collaborative": [
        "I think we can find a middle ground here.",
        "I appreciate your perspective. Here's what I can offer.",
        "Let's work towards a solution that benefits both parties.",
        "I'm willing to make a concession if you can meet me halfway.",
    ],
    "risk_averse": [
        "I prefer certainty over holding out for a better deal.",
        "This looks acceptable — let me check my constraints.",
        "I'd rather close this quickly than risk a breakdown.",
        "If we can agree on the key terms, I'm ready to proceed.",
    ],
}


class MockAgent:
    """[MOCK] Deterministic negotiation agent. Not powered by an LLM."""

    def __init__(self, personality: str = "collaborative", role: str = "agent_a"):
        self.personality = personality
        self.role = role
        params = PERSONALITY_PARAMS.get(personality, PERSONALITY_PARAMS["collaborative"])
        self.concession_rate = params["concession_rate"]
        self.accept_threshold = params["accept_threshold"]
        self.reject_early = params["reject_early"]

    async def generate_offer(
        self,
        round_num: int,
        scenario_rules,
        offer_history: list,
        opponent_name: str,
    ) -> Tuple[dict, str]:
        """Generate an opening or counter offer."""
        opening = scenario_rules.get_opening_offer(self.role)

        if not offer_history:
            # First offer — open with target
            message = f"[MOCK] {random.choice(AGENT_PHRASES[self.personality])} " \
                      f"(Round {round_num}, {self.personality.title()} stance)"
            return opening, message

        # Concede from last own offer
        my_last = next(
            (h["offer"] for h in reversed(offer_history) if h["by"] == self.role), opening
        )
        opponent_last = next(
            (h["offer"] for h in reversed(offer_history) if h["by"] != self.role), None
        )

        conceded = self._concede(my_last, opening, opponent_last)
        message = f"[MOCK] {random.choice(AGENT_PHRASES[self.personality])} " \
                  f"(Round {round_num}, concession {self.concession_rate*100:.0f}%)"
        return conceded, message

    async def evaluate_offer(
        self,
        round_num: int,
        opponent_offer: dict,
        scenario_rules,
        offer_history: list,
        opponent_name: str,
    ) -> Tuple[str, Optional[dict], str]:
        """Evaluate opponent offer. Returns (decision, counter_offer, message)."""
        opening = scenario_rules.get_opening_offer(self.role)
        my_target = self._primary_value(opening)
        opp_value = self._primary_value(opponent_offer)

        # Compute acceptance probability
        if my_target != 0:
            ratio = opp_value / my_target if self.role in ("agent_b",) else my_target / opp_value
        else:
            ratio = 0.5

        phrase = random.choice(AGENT_PHRASES[self.personality])

        if scenario_rules.is_offer_acceptable(self.role, opponent_offer) and ratio >= self.accept_threshold:
            return "accept", None, f"[MOCK] We accept your offer. {phrase} (Round {round_num})"

        if self.reject_early and round_num <= 2:
            counter = scenario_rules.clamp_offer(self.role, self._concede(opening, opening, opponent_offer))
            return "reject", counter, f"[MOCK] We cannot accept this. {phrase} (Round {round_num})"

        my_last = next(
            (h["offer"] for h in reversed(offer_history) if h["by"] == self.role),
            opening,
        )
        counter = self._concede(my_last, opening, opponent_offer)
        counter = scenario_rules.clamp_offer(self.role, counter)
        return "counter", counter, f"[MOCK] {phrase} Here is our counter-offer. (Round {round_num})"

    def _primary_value(self, offer: dict) -> float:
        """Extract the primary numeric value from an offer dict."""
        for key in ("price", "salary", "my_allocation"):
            if key in offer:
                return float(offer[key])
        vals = [v for v in offer.values() if isinstance(v, (int, float))]
        return float(vals[0]) if vals else 0.0

    def _concede(self, my_last: dict, my_ideal: dict, opponent_offer: Optional[dict]) -> dict:
        """Move towards opponent by concession_rate."""
        result = dict(my_last)
        for key in ("price", "salary", "my_allocation"):
            if key in my_last and opponent_offer and key in opponent_offer:
                current = float(my_last[key])
                target = float(opponent_offer[key])
                step = (target - current) * self.concession_rate
                result[key] = round(current + step, 2)
        return result
