import pytest
from app.engine.scenarios import (
    VendorPricingRules, JobOfferRules, ProjectBudgetRules, get_scenario_rules
)


def test_vendor_pricing_clamp_buyer():
    rules = VendorPricingRules({
        "starting_price": 100000,
        "buyer_target_price": 80000,
        "buyer_max_price": 95000,
        "vendor_min_price": 85000,
        "quantity": 100,
    })
    # Buyer cannot go above starting price * 1.1
    offer = {"price": 200000, "quantity": 100}
    clamped = rules.clamp_offer("agent_a", offer)
    assert clamped["price"] <= 100000 * 1.1


def test_vendor_pricing_satisfaction():
    rules = VendorPricingRules({
        "starting_price": 100000,
        "buyer_target_price": 80000,
        "buyer_max_price": 95000,
        "vendor_min_price": 85000,
        "quantity": 100,
    })
    satisfaction = rules.compute_satisfaction({"price": 90000})
    assert 0 <= satisfaction["buyer"] <= 100
    assert 0 <= satisfaction["vendor"] <= 100
    assert 0 <= satisfaction["overall"] <= 100


def test_job_offer_clamp():
    rules = JobOfferRules({
        "starting_salary": 900000,
        "candidate_target": 1100000,
        "candidate_min": 1000000,
        "recruiter_budget": 1050000,
    })
    # Recruiter cannot exceed budget significantly
    offer = {"salary": 2000000}
    clamped = rules.clamp_offer("agent_b", offer)
    assert clamped["salary"] <= 1050000 * 1.05


def test_project_budget_allocation():
    rules = ProjectBudgetRules({
        "total_budget": 5000000,
        "alpha_requested": 3000000,
        "beta_requested": 3500000,
        "alpha_minimum": 2000000,
        "beta_minimum": 2000000,
    })
    opening = rules.get_opening_offer("agent_a")
    assert opening["my_allocation"] + opening["opponent_allocation"] == rules.total_budget


def test_project_budget_clamps_human_allocation_in_rupees():
    rules = ProjectBudgetRules({
        "total_budget": 5000000,
        "alpha_requested": 3000000,
        "beta_requested": 3500000,
        "alpha_minimum": 2000000,
        "beta_minimum": 2000000,
    })

    offer = rules.clamp_offer("agent_a", {"my_allocation": 1200000})

    assert offer == {"my_allocation": 2000000, "opponent_allocation": 3000000}


def test_project_budget_counter_respects_counterparty_minimum():
    rules = ProjectBudgetRules({
        "total_budget": 5000000,
        "alpha_requested": 3000000,
        "beta_requested": 3500000,
        "alpha_minimum": 2000000,
        "beta_minimum": 2000000,
    })

    beta_offer = rules.clamp_offer("agent_b", {"my_allocation": 3500000})

    assert beta_offer == {"my_allocation": 3000000, "opponent_allocation": 2000000}


def test_get_scenario_rules_mapping():
    for scenario_type in ["vendor_pricing", "job_offer", "project_budget"]:
        rules = get_scenario_rules(scenario_type, {})
        assert rules is not None
        assert hasattr(rules, "clamp_offer")
        assert hasattr(rules, "compute_satisfaction")
        assert hasattr(rules, "get_opening_offer")


def test_mock_agent_generate_offer():
    import asyncio
    from app.agents.mock_agent import MockAgent
    from app.engine.scenarios import VendorPricingRules

    rules = VendorPricingRules({
        "starting_price": 100000, "buyer_target_price": 80000,
        "buyer_max_price": 95000, "vendor_min_price": 85000, "quantity": 100,
    })
    agent = MockAgent(personality="collaborative", role="agent_a")
    offer, message = asyncio.get_event_loop().run_until_complete(
        agent.generate_offer(1, rules, [], "Vendor")
    )
    assert isinstance(offer, dict)
    assert "[MOCK]" in message


def test_mock_agent_evaluate_accept():
    import asyncio
    from app.agents.mock_agent import MockAgent
    from app.engine.scenarios import VendorPricingRules

    rules = VendorPricingRules({
        "starting_price": 100000, "buyer_target_price": 80000,
        "buyer_max_price": 95000, "vendor_min_price": 85000, "quantity": 100,
    })
    # Risk-averse agent should accept near-target offer
    agent = MockAgent(personality="risk_averse", role="agent_b")
    # Offer very close to what vendor wants
    decision, counter, message = asyncio.get_event_loop().run_until_complete(
        agent.evaluate_offer(5, {"price": 95000, "quantity": 100}, rules, [], "Buyer")
    )
    assert decision in ("accept", "counter", "reject")
    assert "[MOCK]" in message


@pytest.mark.asyncio
async def test_mock_vendor_agent_rejects_offer_below_vendor_minimum():
    from app.agents.mock_agent import MockAgent

    rules = VendorPricingRules({
        "starting_price": 100000,
        "buyer_target_price": 80000,
        "buyer_max_price": 95000,
        "vendor_min_price": 85000,
        "quantity": 100,
    })
    agent = MockAgent(personality="collaborative", role="agent_b")

    decision, _, message = await agent.evaluate_offer(
        1, {"price": 80000, "quantity": 100}, rules, [], "Buyer"
    )

    assert decision != "accept"
    assert "We accept" not in message


@pytest.mark.asyncio
async def test_mock_vendor_agent_accepts_offer_within_both_parties_limits():
    from app.agents.mock_agent import MockAgent

    rules = VendorPricingRules({
        "starting_price": 100000,
        "buyer_target_price": 80000,
        "buyer_max_price": 95000,
        "vendor_min_price": 85000,
        "quantity": 100,
    })
    agent = MockAgent(personality="collaborative", role="agent_b")

    decision, _, _ = await agent.evaluate_offer(
        2, {"price": 90000, "quantity": 100}, rules, [], "Buyer"
    )

    assert decision == "accept"


def test_vendor_pricing_acceptance_obeys_agreement_zone():
    rules = VendorPricingRules({
        "starting_price": 100000,
        "buyer_target_price": 80000,
        "buyer_max_price": 95000,
        "vendor_min_price": 85000,
        "quantity": 100,
    })

    assert not rules.is_offer_acceptable("agent_b", {"price": 80000})
    assert rules.is_offer_acceptable("agent_b", {"price": 90000})
    assert not rules.is_offer_acceptable("agent_a", {"price": 100000})


@pytest.mark.asyncio
async def test_mock_simulation_concedes_from_last_offer_and_persists_agreement():
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import StaticPool

    from app.db.models import (
        Negotiation,
        NegotiationMode,
        NegotiationStatus,
        ScenarioType,
        User,
    )
    from app.db.session import Base
    from app.engine.negotiation_engine import NegotiationEngine

    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
    )
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as db:
        user = User(name="Test", email="simulation@example.com", hashed_password="unused")
        db.add(user)
        await db.flush()
        negotiation = Negotiation(
            user_id=user.id,
            title="Vendor Simulation",
            scenario_type=ScenarioType.VENDOR_PRICING,
            mode=NegotiationMode.SIMULATION,
            status=NegotiationStatus.ACTIVE,
            config={
                "starting_price": 100000,
                "buyer_target_price": 80000,
                "buyer_max_price": 95000,
                "vendor_min_price": 85000,
                "quantity": 100,
                "agent_a_personality": "collaborative",
                "agent_b_personality": "collaborative",
            },
            max_rounds=5,
        )
        db.add(negotiation)
        await db.flush()
        negotiation_id = negotiation.id
        await db.commit()

        await NegotiationEngine(negotiation_id, db)._run_simulation_loop()

        result = await db.execute(
            select(Negotiation)
            .where(Negotiation.id == negotiation_id)
            .execution_options(populate_existing=True)
        )
        completed = result.scalar_one()
        assert completed.status == NegotiationStatus.COMPLETED
        assert completed.outcome_data["agreed_terms"]["price"] >= 85000
        assert completed.outcome_data["agreed_terms"]["price"] <= 95000

    await test_engine.dispose()


def test_assistant_agent_vendor_prompt_extracts_config():
    from app.agents.assistant_agent import AssistantAgent

    agent = AssistantAgent()
    config = agent._build_config_from_prompt(
        "Negotiate a vendor pricing deal. Starting price is 120000 and target price is 90000. Practice mode with human vs AI."
    )

    assert config is not None
    assert config["scenario_type"] == "vendor_pricing"
    assert config["mode"] == "practice"
    assert config["starting_price"] == 120000
    assert config["buyer_target_price"] == 90000


def test_assistant_agent_job_offer_prompt_extracts_config():
    from app.agents.assistant_agent import AssistantAgent

    agent = AssistantAgent()
    config = agent._build_config_from_prompt(
        "I want to negotiate a software engineer job offer with target salary 30 LPA and recruiter budget 28 LPA."
    )

    assert config is not None
    assert config["scenario_type"] == "job_offer"
    assert config["mode"] == "simulation"
    assert config["candidate_target"] == 3000000
    assert config["recruiter_budget"] == 2800000


def test_assistant_agent_handles_custom_party_names_and_round_limits():
    from app.agents.assistant_agent import AssistantAgent

    agent = AssistantAgent()
    config = agent._build_config_from_prompt(
        "Set up a 5-round vendor pricing negotiation between Northwind Supplies and Orbit IT. "
        "Starting price is ₹1.2L and target is ₹90k. Practice mode with human vs AI."
    )

    assert config is not None
    assert config["scenario_type"] == "vendor_pricing"
    assert config["mode"] == "practice"
    assert config["max_rounds"] == 5
    assert config["agent_a_name"] == "You (Human Negotiator)"
    assert config["agent_b_name"] == "AI Counterpart"
    assert config["buyer_target_price"] == 90000


def test_assistant_agent_handles_indian_currency_values_and_ai_vs_ai_mode():
    from app.agents.assistant_agent import AssistantAgent

    agent = AssistantAgent()
    config = agent._build_config_from_prompt(
        "Negotiate a software engineer offer. Salary target is ₹18 LPA and recruiter budget is ₹22L. "
        "AI vs AI with 6 rounds."
    )

    assert config is not None
    assert config["scenario_type"] == "job_offer"
    assert config["mode"] == "simulation"
    assert config["candidate_target"] == 1800000
    assert config["recruiter_budget"] == 2200000
    assert config["max_rounds"] == 6
