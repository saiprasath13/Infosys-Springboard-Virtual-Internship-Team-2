"""
Scenario rules — deterministic constraint evaluation for each scenario type.
All hard limits are enforced in Python, not through LLM prompts.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any


class ScenarioRules(ABC):
    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        """Return whether the counterparty's offer satisfies this party's hard limits."""
        return True

    @abstractmethod
    def clamp_offer(self, party: str, offer: dict) -> dict:
        """Clamp offer values to valid range for the given party."""
        ...

    @abstractmethod
    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        """Compute objective satisfaction score for each party."""
        ...

    @abstractmethod
    def get_opening_offer(self, party: str) -> dict:
        """Return a reasonable opening offer for the given party."""
        ...

    @abstractmethod
    def describe_for_agent(self, party: str) -> str:
        """System-prompt description of the scenario for the agent."""
        ...


class VendorPricingRules(ScenarioRules):
    def __init__(self, config: dict):
        self.starting_price = float(config.get("starting_price", 100000))
        self.buyer_target = float(config.get("buyer_target_price", 80000))
        self.buyer_max = float(config.get("buyer_max_price", 95000))
        self.vendor_min = float(config.get("vendor_min_price", 85000))
        self.quantity = int(config.get("quantity", 100))

    def clamp_offer(self, party: str, offer: dict) -> dict:
        result = dict(offer)
        price = float(result.get("price", self.starting_price))
        if party in ("agent_a", "human"):  # buyer
            price = min(max(price, self.buyer_target * 0.8), self.starting_price * 1.1)
        else:  # vendor
            price = min(max(price, self.vendor_min), self.starting_price * 1.2)
        result["price"] = round(price, 2)
        result["quantity"] = self.quantity
        return result

    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        price = float(offer.get("price", self.starting_price))
        return self.vendor_min <= price <= self.buyer_max

    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        price = float(agreed_offer.get("price", self.starting_price))
        buyer_score = max(0, min(100, round(
            100 * (self.buyer_max - price) / (self.buyer_max - self.buyer_target * 0.8)
        )))
        vendor_score = max(0, min(100, round(
            100 * (price - self.vendor_min) / (self.starting_price - self.vendor_min)
        )))
        return {"buyer": buyer_score, "vendor": vendor_score, "overall": round((buyer_score + vendor_score) / 2)}

    def get_opening_offer(self, party: str) -> dict:
        if party in ("agent_a", "human"):
            return {"price": self.buyer_target, "quantity": self.quantity, "delivery_days": 30}
        return {"price": self.starting_price, "quantity": self.quantity, "delivery_days": 45}

    def describe_for_agent(self, party: str) -> str:
        if party in ("agent_a", "human"):
            return (
                f"You are the Buyer. Your target price is ₹{self.buyer_target:,.0f}. "
                f"You will not pay more than ₹{self.buyer_max:,.0f}. "
                f"Negotiate for the best price, delivery terms, and payment conditions. "
                f"Do NOT reveal your maximum acceptable price."
            )
        return (
            f"You are the Vendor. Your minimum acceptable price is ₹{self.vendor_min:,.0f}. "
            f"The starting list price is ₹{self.starting_price:,.0f}. "
            f"Protect your margin while closing the deal. "
            f"Do NOT reveal your floor price."
        )


class JobOfferRules(ScenarioRules):
    def __init__(self, config: dict):
        self.starting_salary = float(config.get("starting_salary", 900000))
        self.candidate_target = float(config.get("candidate_target", 1100000))
        self.candidate_min = float(config.get("candidate_min", 1000000))
        self.recruiter_budget = float(config.get("recruiter_budget", 1050000))

    def clamp_offer(self, party: str, offer: dict) -> dict:
        result = dict(offer)
        salary = float(result.get("salary", self.starting_salary))
        if party in ("agent_a", "human"):  # candidate
            salary = min(max(salary, self.starting_salary * 0.9), self.candidate_target * 1.2)
        else:  # recruiter
            salary = min(max(salary, self.starting_salary * 0.8), self.recruiter_budget * 1.05)
        result["salary"] = round(salary, 0)
        return result

    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        salary = float(offer.get("salary", self.starting_salary))
        return self.candidate_min <= salary <= self.recruiter_budget

    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        salary = float(agreed_offer.get("salary", self.starting_salary))
        candidate_score = max(0, min(100, round(
            100 * (salary - self.candidate_min) / (self.candidate_target - self.candidate_min)
        ))) if self.candidate_target != self.candidate_min else 50
        recruiter_score = max(0, min(100, round(
            100 * (self.recruiter_budget - salary) / (self.recruiter_budget - self.starting_salary)
        ))) if self.recruiter_budget != self.starting_salary else 50
        return {
            "candidate": candidate_score,
            "recruiter": recruiter_score,
            "overall": round((candidate_score + recruiter_score) / 2),
        }

    def get_opening_offer(self, party: str) -> dict:
        if party in ("agent_a", "human"):
            return {"salary": self.candidate_target, "joining_days": 60, "benefits": ["health_insurance", "pf"]}
        return {"salary": self.starting_salary, "joining_days": 30, "benefits": ["health_insurance"]}

    def describe_for_agent(self, party: str) -> str:
        if party in ("agent_a", "human"):
            return (
                f"You are the Candidate. Your target salary is ₹{self.candidate_target/100000:.1f} LPA. "
                f"You will not accept less than ₹{self.candidate_min/100000:.1f} LPA. "
                f"Also negotiate benefits and joining date. Do NOT reveal your minimum."
            )
        return (
            f"You are the Recruiter. Your salary budget is ₹{self.recruiter_budget/100000:.1f} LPA. "
            f"The starting offer is ₹{self.starting_salary/100000:.1f} LPA. "
            f"Close the deal without exceeding budget. Do NOT reveal the budget ceiling."
        )


class ProjectBudgetRules(ScenarioRules):
    def __init__(self, config: dict):
        self.total_budget = float(config.get("total_budget", 5000000))
        self.alpha_min = float(config.get("alpha_minimum", 2000000))
        self.beta_min = float(config.get("beta_minimum", 2000000))
        self.alpha_requested = float(config.get("alpha_requested", 3000000))
        self.beta_requested = float(config.get("beta_requested", 3500000))

    def clamp_offer(self, party: str, offer: dict) -> dict:
        result = dict(offer)
        my_alloc = float(result.get("my_allocation", self.total_budget / 2))
        if party in ("agent_a", "human"):
            my_alloc = min(
                max(my_alloc, self.alpha_min),
                self.alpha_requested,
                self.total_budget - self.beta_min,
            )
        else:
            my_alloc = min(
                max(my_alloc, self.beta_min),
                self.beta_requested,
                self.total_budget - self.alpha_min,
            )
        result["my_allocation"] = round(my_alloc, 0)
        result["opponent_allocation"] = round(self.total_budget - my_alloc, 0)
        return result

    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        allocation = float(offer.get("my_allocation", self.total_budget / 2))
        if party in ("agent_a", "human"):
            beta_allocation = allocation
            alpha_allocation = self.total_budget - allocation
        else:
            alpha_allocation = allocation
            beta_allocation = self.total_budget - allocation
        return alpha_allocation >= self.alpha_min and beta_allocation >= self.beta_min

    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        alpha = float(agreed_offer.get("my_allocation", self.total_budget / 2))
        beta = self.total_budget - alpha
        alpha_score = max(0, min(100, round(
            100 * (alpha - self.alpha_min) / (self.alpha_requested - self.alpha_min)
        ))) if self.alpha_requested != self.alpha_min else 50
        beta_score = max(0, min(100, round(
            100 * (beta - self.beta_min) / (self.beta_requested - self.beta_min)
        ))) if self.beta_requested != self.beta_min else 50
        return {"team_alpha": alpha_score, "team_beta": beta_score, "overall": round((alpha_score + beta_score) / 2)}

    def get_opening_offer(self, party: str) -> dict:
        if party in ("agent_a", "human"):
            return {"my_allocation": self.alpha_requested, "opponent_allocation": self.total_budget - self.alpha_requested}
        return {"my_allocation": self.beta_requested, "opponent_allocation": self.total_budget - self.beta_requested}

    def describe_for_agent(self, party: str) -> str:
        if party in ("agent_a", "human"):
            return (
                f"You represent Team Alpha. The total project budget is ₹{self.total_budget/100000:.0f} L. "
                f"You need at least ₹{self.alpha_min/100000:.0f} L. Your ideal allocation is ₹{self.alpha_requested/100000:.0f} L. "
                f"Negotiate for maximum allocation. Do NOT reveal your minimum requirement."
            )
        return (
            f"You represent Team Beta. The total project budget is ₹{self.total_budget/100000:.0f} L. "
            f"You need at least ₹{self.beta_min/100000:.0f} L. Your ideal allocation is ₹{self.beta_requested/100000:.0f} L. "
            f"Negotiate for maximum allocation. Do NOT reveal your minimum requirement."
        )


class CustomScenarioRules(ScenarioRules):
    """Fallback rules for custom scenarios defined via the AI assistant."""
    def __init__(self, config: dict):
        self.config = config

    def clamp_offer(self, party: str, offer: dict) -> dict:
        return offer

    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        return {"overall": 50}

    def get_opening_offer(self, party: str) -> dict:
        return self.config.get("opening_offer", {})

    def describe_for_agent(self, party: str) -> str:
        return self.config.get("agent_descriptions", {}).get(party, "Negotiate to achieve the best outcome.")


def get_scenario_rules(scenario_type: str, config: dict) -> ScenarioRules:
    mapping = {
        "vendor_pricing": VendorPricingRules,
        "job_offer": JobOfferRules,
        "project_budget": ProjectBudgetRules,
    }
    cls = mapping.get(scenario_type, CustomScenarioRules)
    return cls(config)
