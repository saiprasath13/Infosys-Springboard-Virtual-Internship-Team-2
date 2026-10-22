from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Users ─────────────────────────────────────────────────────────────────────

class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ── Negotiations ──────────────────────────────────────────────────────────────

class NegotiationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    scenario_type: str
    mode: str
    config: dict
    max_rounds: int = Field(default=10, ge=3, le=30)


class NegotiationUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    is_archived: Optional[bool] = None


class NegotiationSummary(BaseModel):
    id: int
    title: str
    scenario_type: str
    mode: str
    status: str
    current_round: int
    max_rounds: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NegotiationDetail(NegotiationSummary):
    config: dict
    outcome_data: Optional[dict] = None
    messages: List["MessageOut"] = []
    offers: List["OfferOut"] = []


# ── Messages ──────────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    round_number: Optional[int] = None
    metadata_: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Offers ────────────────────────────────────────────────────────────────────

class OfferOut(BaseModel):
    id: int
    round_number: int
    made_by: str
    offer_data: dict
    status: str
    rationale: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HumanOfferRequest(BaseModel):
    offer_data: dict
    message: Optional[str] = None


# ── Scenarios ─────────────────────────────────────────────────────────────────

class ScenarioConfig(BaseModel):
    """Base scenario config"""
    scenario_type: str
    mode: str
    max_rounds: int = 10
    agent_a_personality: str = "collaborative"
    agent_b_personality: str = "aggressive"
    agent_a_name: str = "Party A"
    agent_b_name: str = "Party B"


class VendorPricingConfig(ScenarioConfig):
    scenario_type: str = "vendor_pricing"
    agent_a_name: str = "Buyer"
    agent_b_name: str = "Vendor"
    starting_price: float = 100000.0
    buyer_target_price: float = 80000.0
    buyer_max_price: float = 95000.0
    vendor_min_price: float = 85000.0
    quantity: int = 100
    delivery_days: int = 30
    payment_terms: str = "Net 30"


class JobOfferConfig(ScenarioConfig):
    scenario_type: str = "job_offer"
    agent_a_name: str = "Candidate"
    agent_b_name: str = "Recruiter"
    starting_salary: float = 900000.0   # ₹9 LPA
    candidate_target: float = 1100000.0  # ₹11 LPA
    candidate_min: float = 1000000.0    # ₹10 LPA
    recruiter_budget: float = 1050000.0 # ₹10.5 LPA
    benefits: List[str] = ["health_insurance", "pf", "gratuity"]
    joining_days: int = 30


class ProjectBudgetConfig(ScenarioConfig):
    scenario_type: str = "project_budget"
    agent_a_name: str = "Team Alpha"
    agent_b_name: str = "Team Beta"
    total_budget: float = 5000000.0
    alpha_requested: float = 3000000.0
    beta_requested: float = 3500000.0
    alpha_minimum: float = 2000000.0
    beta_minimum: float = 2000000.0
    priority_weights: dict = {"alpha": 0.5, "beta": 0.5}


# ── Reports ───────────────────────────────────────────────────────────────────

class OutcomeReport(BaseModel):
    negotiation_id: int
    title: str
    scenario_type: str
    mode: str
    status: str
    final_outcome: str
    agreed_terms: Optional[dict] = None
    breakdown_reason: Optional[str] = None
    initial_offer: Optional[dict] = None
    final_offer: Optional[dict] = None
    total_rounds: int
    concession_timeline: List[dict] = []
    satisfaction_scores: Optional[dict] = None
    key_turning_points: List[str] = []
    suggestions: List[str] = []
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Assistant ─────────────────────────────────────────────────────────────────

class AssistantMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AssistantChatRequest(BaseModel):
    negotiation_id: Optional[int] = None
    message: str
    history: List[AssistantMessage] = []


class AssistantChatResponse(BaseModel):
    reply: str
    negotiation_id: Optional[int] = None
    extracted_config: Optional[dict] = None
    ready_to_start: bool = False


# Fix forward refs
NegotiationDetail.model_rebuild()
TokenResponse.model_rebuild()
