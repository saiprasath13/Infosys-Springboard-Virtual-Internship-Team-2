from __future__ import annotations

import math
from abc import ABC, abstractmethod


class ScenarioRules(ABC):
    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        return True

    @abstractmethod
    def clamp_offer(self, party: str, offer: dict) -> dict:
        ...

    @abstractmethod
    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        ...

    @abstractmethod
    def get_opening_offer(self, party: str) -> dict:
        ...

    @abstractmethod
    def describe_for_agent(self, party: str) -> str:
        ...


def _positive_number(value, name: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name} must be a valid number.")

    if not math.isfinite(number) or number <= 0:
        raise ValueError(f"{name} must be a positive, finite number.")

    return number


class VendorPricingRules(ScenarioRules):
    def __init__(self, config: dict):
        self.starting_price = _positive_number(
            config.get("starting_price", 100000), "Starting price"
        )
        self.buyer_target = _positive_number(
            config.get("buyer_target_price", 80000), "Buyer target price"
        )
        self.buyer_max = _positive_number(
            config.get("buyer_max_price", 95000), "Buyer maximum price"
        )
        self.vendor_min = _positive_number(
            config.get("vendor_min_price", 85000), "Vendor minimum price"
        )
        self.quantity = int(config.get("quantity", 100))

        if self.vendor_min > self.buyer_max:
            raise ValueError(
                f"Vendor minimum price ₹{self.vendor_min:,.2f} exceeds "
                f"buyer maximum price ₹{self.buyer_max:,.2f}. "
                "Negotiation cannot start."
            )
        if self.buyer_target > self.buyer_max:
            raise ValueError(
                "Buyer target price cannot exceed buyer maximum price."
            )
        if self.starting_price < self.vendor_min:
            raise ValueError(
                "Starting price cannot be below vendor minimum price."
            )
        if self.quantity <= 0:
            raise ValueError("Quantity must be greater than zero.")

    def clamp_offer(self, party: str, offer: dict) -> dict:
        result = dict(offer)
        price = _positive_number(
            result.get("price", self.starting_price), "Offer price"
        )

        if party in ("agent_a", "human"):
            price = min(max(price, self.buyer_target * 0.8), self.buyer_max)
        else:
            price = max(price, self.vendor_min)
            price = min(price, self.starting_price * 1.2)

        result["price"] = round(price, 2)
        result["quantity"] = self.quantity
        return result

    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        try:
            price = float(offer.get("price"))
        except (TypeError, ValueError, AttributeError):
            return False

        return (
            math.isfinite(price)
            and self.vendor_min <= price <= self.buyer_max
        )

    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        price = float(agreed_offer["price"])
        buyer_denominator = self.buyer_max - self.buyer_target * 0.8
        vendor_denominator = self.starting_price - self.vendor_min

        buyer_score = (
            max(0, min(100, round(
                100 * (self.buyer_max - price) / buyer_denominator
            )))
            if buyer_denominator > 0 else 50
        )
        vendor_score = (
            max(0, min(100, round(
                100 * (price - self.vendor_min) / vendor_denominator
            )))
            if vendor_denominator > 0 else 50
        )

        return {
            "buyer": buyer_score,
            "vendor": vendor_score,
            "overall": round((buyer_score + vendor_score) / 2),
        }

    def get_opening_offer(self, party: str) -> dict:
        if party in ("agent_a", "human"):
            return {
                "price": self.buyer_target,
                "quantity": self.quantity,
                "delivery_days": 30,
            }
        return {
            "price": self.starting_price,
            "quantity": self.quantity,
            "delivery_days": 45,
        }

    def describe_for_agent(self, party: str) -> str:
        if party in ("agent_a", "human"):
            return (
                f"You are the Buyer. Your target price is "
                f"₹{self.buyer_target:,.0f}. You will not pay more than "
                f"₹{self.buyer_max:,.0f}. Negotiate for the best price, "
                "delivery terms, and payment conditions. "
                "Do NOT reveal your maximum price."
            )
        return (
            f"You are the Vendor. Your minimum acceptable price is "
            f"₹{self.vendor_min:,.0f}. The starting list price is "
            f"₹{self.starting_price:,.0f}. Protect your margin while "
            "closing the deal. Do NOT reveal your floor price."
        )


class JobOfferRules(ScenarioRules):
    def __init__(self, config: dict):
        self.starting_salary = _positive_number(
            config.get("starting_salary", 900000), "Starting salary"
        )
        self.candidate_target = _positive_number(
            config.get("candidate_target", 1100000), "Candidate target salary"
        )
        self.candidate_min = _positive_number(
            config.get("candidate_min", 1000000), "Candidate minimum salary"
        )
        self.recruiter_budget = _positive_number(
            config.get("recruiter_budget", 1050000), "Recruiter budget"
        )

        if self.candidate_min > self.recruiter_budget:
            raise ValueError(
                "Candidate minimum salary exceeds recruiter budget. "
                "Negotiation cannot start."
            )
        if self.candidate_target < self.candidate_min:
            raise ValueError(
                "Candidate target salary cannot be below candidate minimum."
            )
        if self.starting_salary > self.recruiter_budget:
            raise ValueError(
                "Starting salary cannot exceed recruiter budget."
            )

    def clamp_offer(self, party: str, offer: dict) -> dict:
        result = dict(offer)
        salary = _positive_number(
            result.get("salary", self.starting_salary), "Offer salary"
        )

        if party in ("agent_a", "human"):
            salary = min(
                max(salary, self.candidate_min), self.recruiter_budget
            )
        else:
            salary = min(
                max(salary, self.candidate_min), self.recruiter_budget
            )

        result["salary"] = round(salary, 0)
        return result

    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        try:
            salary = float(offer.get("salary"))
        except (TypeError, ValueError, AttributeError):
            return False

        return (
            math.isfinite(salary)
            and self.candidate_min <= salary <= self.recruiter_budget
        )

    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        salary = float(agreed_offer["salary"])

        candidate_denominator = self.candidate_target - self.candidate_min
        recruiter_denominator = (
            self.recruiter_budget - self.candidate_min
        )

        candidate_score = (
            max(0, min(100, round(
                100 * (salary - self.candidate_min)
                / candidate_denominator
            )))
            if candidate_denominator > 0 else 50
        )
        recruiter_score = (
            max(0, min(100, round(
                100 * (self.recruiter_budget - salary)
                / recruiter_denominator
            )))
            if recruiter_denominator > 0 else 50
        )

        return {
            "candidate": candidate_score,
            "recruiter": recruiter_score,
            "overall": round((candidate_score + recruiter_score) / 2),
        }

    def get_opening_offer(self, party: str) -> dict:
        if party in ("agent_a", "human"):
            return {
                "salary": min(self.candidate_target, self.recruiter_budget),
                "joining_days": 60,
                "benefits": ["health_insurance", "pf"],
            }
        return {
            "salary": self.starting_salary,
            "joining_days": 30,
            "benefits": ["health_insurance"],
        }

    def describe_for_agent(self, party: str) -> str:
        if party in ("agent_a", "human"):
            return (
                f"You are the Candidate. Your target salary is "
                f"₹{self.candidate_target / 100000:.1f} LPA. You will not "
                f"accept less than ₹{self.candidate_min / 100000:.1f} LPA. "
                "Negotiate benefits and joining date. Do NOT reveal your minimum."
            )
        return (
            f"You are the Recruiter. Your salary budget is "
            f"₹{self.recruiter_budget / 100000:.1f} LPA. The starting offer "
            f"is ₹{self.starting_salary / 100000:.1f} LPA. "
            "Close the deal without exceeding budget. Do NOT reveal the budget."
        )


class ProjectBudgetRules(ScenarioRules):
    def __init__(self, config: dict):
        self.total_budget = _positive_number(
            config.get("total_budget", 5000000), "Total budget"
        )
        self.alpha_min = _positive_number(
            config.get("alpha_minimum", 2000000), "Alpha minimum"
        )
        self.beta_min = _positive_number(
            config.get("beta_minimum", 2000000), "Beta minimum"
        )
        self.alpha_requested = _positive_number(
            config.get("alpha_requested", 3000000), "Alpha requested amount"
        )
        self.beta_requested = _positive_number(
            config.get("beta_requested", 3500000), "Beta requested amount"
        )

        if self.alpha_min + self.beta_min > self.total_budget:
            raise ValueError(
                "Team minimum allocations exceed the total project budget."
            )
        if self.alpha_requested < self.alpha_min:
            raise ValueError(
                "Alpha requested amount cannot be below Alpha minimum."
            )
        if self.beta_requested < self.beta_min:
            raise ValueError(
                "Beta requested amount cannot be below Beta minimum."
            )

    def clamp_offer(self, party: str, offer: dict) -> dict:
        result = dict(offer)
        allocation = _positive_number(
            result.get("my_allocation", self.total_budget / 2),
            "Allocation",
        )

        if party in ("agent_a", "human"):
            minimum = self.alpha_min
            maximum = min(
                self.alpha_requested, self.total_budget - self.beta_min
            )
        else:
            minimum = self.beta_min
            maximum = min(
                self.beta_requested, self.total_budget - self.alpha_min
            )

        allocation = min(max(allocation, minimum), maximum)
        result["my_allocation"] = round(allocation, 2)
        result["opponent_allocation"] = round(
            self.total_budget - allocation, 2
        )
        return result

    def is_offer_acceptable(self, party: str, offer: dict) -> bool:
        try:
            allocation = float(offer.get("my_allocation"))
        except (TypeError, ValueError, AttributeError):
            return False

        if not math.isfinite(allocation):
            return False

        if party in ("agent_a", "human"):
            alpha = allocation
            beta = self.total_budget - allocation
        else:
            beta = allocation
            alpha = self.total_budget - allocation

        return (
            alpha >= self.alpha_min
            and beta >= self.beta_min
            and math.isclose(
                alpha + beta, self.total_budget, abs_tol=0.01
            )
        )

    def compute_satisfaction(self, agreed_offer: dict) -> dict:
        alpha = float(agreed_offer["my_allocation"])
        beta = self.total_budget - alpha

        alpha_denominator = self.alpha_requested - self.alpha_min
        beta_denominator = self.beta_requested - self.beta_min

        alpha_score = (
            max(0, min(100, round(
                100 * (alpha - self.alpha_min) / alpha_denominator
            )))
            if alpha_denominator > 0 else 50
        )
        beta_score = (
            max(0, min(100, round(
                100 * (beta - self.beta_min) / beta_denominator
            )))
            if beta_denominator > 0 else 50
        )

        return {
            "team_alpha": alpha_score,
            "team_beta": beta_score,
            "overall": round((alpha_score + beta_score) / 2),
        }

    def get_opening_offer(self, party: str) -> dict:
        if party in ("agent_a", "human"):
            alpha = min(
                self.alpha_requested,
                self.total_budget - self.beta_min,
            )
            return {
                "my_allocation": alpha,
                "opponent_allocation": self.total_budget - alpha,
            }

        beta = min(
            self.beta_requested,
            self.total_budget - self.alpha_min,
        )
        return {
            "my_allocation": beta,
            "opponent_allocation": self.total_budget - beta,
        }

    def describe_for_agent(self, party: str) -> str:
        if party in ("agent_a", "human"):
            return (
                f"You represent Team Alpha. Total budget is "
                f"₹{self.total_budget / 100000:.0f} L. Your minimum is "
                f"₹{self.alpha_min / 100000:.0f} L and your requested "
                f"allocation is ₹{self.alpha_requested / 100000:.0f} L. "
                "Negotiate for the best allocation. Do NOT reveal your minimum."
            )
        return (
            f"You represent Team Beta. Total budget is "
            f"₹{self.total_budget / 100000:.0f} L. Your minimum is "
            f"₹{self.beta_min / 100000:.0f} L and your requested allocation "
            f"is ₹{self.beta_requested / 100000:.0f} L. "
            "Negotiate for the best allocation. Do NOT reveal your minimum."
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
        return self.config.get("agent_descriptions", {}).get(
            party, "Negotiate to achieve the best outcome."
        )


def get_scenario_rules(scenario_type: str, config: dict) -> ScenarioRules:
    mapping = {
        "vendor_pricing": VendorPricingRules,
        "job_offer": JobOfferRules,
        "project_budget": ProjectBudgetRules,
    }
    rules_class = mapping.get(scenario_type, CustomScenarioRules)
    return rules_class(config)
