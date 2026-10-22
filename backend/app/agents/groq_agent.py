"""
Groq Agent — LangChain + Groq LLM-powered negotiation agent.
Only activated when USE_MOCK_AGENTS=false and GROQ_API_KEY is set.
"""
from __future__ import annotations
import json
import logging
from typing import Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)

PERSONALITY_SYSTEM_PROMPTS = {
    "aggressive": (
        "You are a tough, aggressive negotiator who anchors high and makes minimal concessions. "
        "You push hard for your objectives and use pressure tactics. You rarely accept the first offer."
    ),
    "collaborative": (
        "You are a collaborative negotiator who seeks win-win outcomes. "
        "You are flexible on secondary issues but firm on your key priorities. "
        "You signal openness and build rapport."
    ),
    "risk_averse": (
        "You are a risk-averse negotiator who values certainty over maximum gain. "
        "You accept moderate deals quickly to avoid breakdown and do not gamble on holding out."
    ),
}


class GroqAgent:
    """LLM-powered negotiation agent using Groq."""

    def __init__(self, personality: str = "collaborative", role: str = "agent_a"):
        self.personality = personality
        self.role = role
        self._client = None

    def _get_client(self):
        if self._client is None:
            from langchain_groq import ChatGroq
            self._client = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model_name=settings.GROQ_MODEL,
                temperature=0.4,
                max_tokens=512,
            )
        return self._client

    async def generate_offer(
        self,
        round_num: int,
        scenario_rules,
        offer_history: list,
        opponent_name: str,
    ) -> Tuple[dict, str]:
        scenario_desc = scenario_rules.describe_for_agent(self.role)
        personality_prompt = PERSONALITY_SYSTEM_PROMPTS.get(self.personality, "")
        history_str = self._format_history(offer_history)

        opening = scenario_rules.get_opening_offer(self.role)
        opening_str = json.dumps(opening)

        system = (
            f"{personality_prompt}\n\n"
            f"Scenario: {scenario_desc}\n\n"
            "IMPORTANT RULES:\n"
            "- Never reveal your private limits.\n"
            "- Make realistic, incremental concessions.\n"
            "- Respond with valid JSON in this format:\n"
            '{"offer": {<offer_fields>}, "message": "<your negotiation message>"}\n'
            "- The offer must use the same keys as the opening offer format.\n"
            f"- Opening offer format example: {opening_str}"
        )

        user_msg = (
            f"Round {round_num}. Negotiation history:\n{history_str}\n\n"
            f"Generate your offer for round {round_num}. "
            f"Respond with JSON only."
        )

        try:
            client = self._get_client()
            from langchain_core.messages import SystemMessage, HumanMessage
            response = await client.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])
            data = self._parse_json_response(response.content)
            offer = scenario_rules.clamp_offer(self.role, data.get("offer", opening))
            message = data.get("message", "No message provided.")
            return offer, message
        except Exception as e:
            logger.error(f"GroqAgent generate_offer error: {e}")
            # Fallback to mock
            from app.agents.mock_agent import MockAgent
            fallback = MockAgent(self.personality, self.role)
            return await fallback.generate_offer(round_num, scenario_rules, offer_history, opponent_name)

    async def evaluate_offer(
        self,
        round_num: int,
        opponent_offer: dict,
        scenario_rules,
        offer_history: list,
        opponent_name: str,
    ) -> Tuple[str, Optional[dict], str]:
        scenario_desc = scenario_rules.describe_for_agent(self.role)
        personality_prompt = PERSONALITY_SYSTEM_PROMPTS.get(self.personality, "")
        history_str = self._format_history(offer_history)
        opening = scenario_rules.get_opening_offer(self.role)

        system = (
            f"{personality_prompt}\n\n"
            f"Scenario: {scenario_desc}\n\n"
            "IMPORTANT RULES:\n"
            "- Evaluate the opponent's offer carefully.\n"
            "- Never reveal your private limits.\n"
            "- Decision must be one of: accept, reject, counter.\n"
            "- Respond with valid JSON:\n"
            '{"decision": "accept|reject|counter", "counter_offer": {<offer_fields or null>}, '
            '"message": "<your response message>"}\n'
            "- Only include counter_offer when decision is counter or reject.\n"
            f"- Valid offer keys: {list(opening.keys())}"
        )

        user_msg = (
            f"Round {round_num}. {opponent_name}'s offer: {json.dumps(opponent_offer)}\n"
            f"History:\n{history_str}\n\n"
            "Evaluate and respond with JSON only."
        )

        try:
            client = self._get_client()
            from langchain_core.messages import SystemMessage, HumanMessage
            response = await client.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])
            data = self._parse_json_response(response.content)
            decision = data.get("decision", "counter")
            if decision not in ("accept", "reject", "counter"):
                decision = "counter"
            counter = None
            if decision in ("counter", "reject") and data.get("counter_offer"):
                counter = scenario_rules.clamp_offer(self.role, data["counter_offer"])
            message = data.get("message", "")
            return decision, counter, message
        except Exception as e:
            logger.error(f"GroqAgent evaluate_offer error: {e}")
            from app.agents.mock_agent import MockAgent
            fallback = MockAgent(self.personality, self.role)
            return await fallback.evaluate_offer(round_num, opponent_offer, scenario_rules, offer_history, opponent_name)

    def _format_history(self, history: list) -> str:
        if not history:
            return "No prior history."
        lines = []
        for h in history[-6:]:  # Last 6 entries to keep context manageable
            lines.append(f"  Round {h['round']} ({h['by']}): {json.dumps(h['offer'])}")
        return "\n".join(lines)

    def _parse_json_response(self, content: str) -> dict:
        """Extract JSON from LLM response, handling markdown code blocks."""
        text = content.strip()
        if "```" in text:
            start = text.find("```")
            end = text.rfind("```")
            text = text[start:end].lstrip("`").lstrip("json").strip()
        return json.loads(text)
