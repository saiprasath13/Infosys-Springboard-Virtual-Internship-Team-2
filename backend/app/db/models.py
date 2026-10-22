from datetime import datetime, timezone
from typing import Optional, List
import enum

from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey,
    Enum as SAEnum, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    negotiations: Mapped[List["Negotiation"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class ScenarioType(str, enum.Enum):
    VENDOR_PRICING = "vendor_pricing"
    JOB_OFFER = "job_offer"
    PROJECT_BUDGET = "project_budget"
    CUSTOM = "custom"


class NegotiationMode(str, enum.Enum):
    SIMULATION = "simulation"  # AI vs AI
    PRACTICE = "practice"      # Human vs AI


class NegotiationStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    DEADLOCKED = "deadlocked"
    CANCELLED = "cancelled"


class PersonalityType(str, enum.Enum):
    AGGRESSIVE = "aggressive"
    COLLABORATIVE = "collaborative"
    RISK_AVERSE = "risk_averse"


class Negotiation(Base):
    __tablename__ = "negotiations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    scenario_type: Mapped[ScenarioType] = mapped_column(SAEnum(ScenarioType))
    mode: Mapped[NegotiationMode] = mapped_column(SAEnum(NegotiationMode))
    status: Mapped[NegotiationStatus] = mapped_column(SAEnum(NegotiationStatus), default=NegotiationStatus.PENDING)
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # Full scenario config
    current_round: Mapped[int] = mapped_column(Integer, default=0)
    max_rounds: Mapped[int] = mapped_column(Integer, default=10)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    outcome_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="negotiations")
    messages: Mapped[List["NegotiationMessage"]] = relationship(back_populates="negotiation", cascade="all, delete-orphan", order_by="NegotiationMessage.created_at")
    offers: Mapped[List["Offer"]] = relationship(back_populates="negotiation", cascade="all, delete-orphan", order_by="Offer.created_at")


class MessageRole(str, enum.Enum):
    SYSTEM = "system"
    AGENT_A = "agent_a"
    AGENT_B = "agent_b"
    HUMAN = "human"
    ASSISTANT = "assistant"  # AI setup assistant


class NegotiationMessage(Base):
    __tablename__ = "negotiation_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    negotiation_id: Mapped[int] = mapped_column(Integer, ForeignKey("negotiations.id"), index=True)
    role: Mapped[MessageRole] = mapped_column(SAEnum(MessageRole))
    content: Mapped[str] = mapped_column(Text)
    round_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    negotiation: Mapped["Negotiation"] = relationship(back_populates="messages")


class OfferStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTERED = "countered"


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    negotiation_id: Mapped[int] = mapped_column(Integer, ForeignKey("negotiations.id"), index=True)
    round_number: Mapped[int] = mapped_column(Integer)
    made_by: Mapped[str] = mapped_column(String(50))  # "agent_a", "agent_b", "human"
    offer_data: Mapped[dict] = mapped_column(JSON)  # Domain-specific offer fields
    status: Mapped[OfferStatus] = mapped_column(SAEnum(OfferStatus), default=OfferStatus.PENDING)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    negotiation: Mapped["Negotiation"] = relationship(back_populates="offers")
