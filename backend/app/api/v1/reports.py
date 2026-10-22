from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Negotiation, NegotiationMessage, Offer
from app.core.security import get_current_user
from app.schemas.schemas import OutcomeReport

router = APIRouter()


@router.get("/{negotiation_id}", response_model=OutcomeReport)
async def get_report(
    negotiation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    if neg.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch offers for concession timeline
    offers_result = await db.execute(
        select(Offer).where(Offer.negotiation_id == negotiation_id).order_by(Offer.created_at)
    )
    offers = offers_result.scalars().all()

    outcome = neg.outcome_data or {}
    concession_timeline = []
    for o in offers:
        concession_timeline.append({
            "round": o.round_number,
            "made_by": o.made_by,
            "offer_data": o.offer_data,
            "status": o.status,
        })

    suggestions = _generate_suggestions(neg, offers)
    turning_points = _find_turning_points(offers)

    return OutcomeReport(
        negotiation_id=neg.id,
        title=neg.title,
        scenario_type=neg.scenario_type,
        mode=neg.mode,
        status=neg.status,
        final_outcome=outcome.get("final_outcome", "Negotiation ended"),
        agreed_terms=outcome.get("agreed_terms"),
        breakdown_reason=outcome.get("breakdown_reason"),
        initial_offer=outcome.get("initial_offer"),
        final_offer=outcome.get("final_offer"),
        total_rounds=neg.current_round,
        concession_timeline=concession_timeline,
        satisfaction_scores=outcome.get("satisfaction_scores"),
        key_turning_points=turning_points,
        suggestions=suggestions,
        completed_at=neg.completed_at,
    )


def _generate_suggestions(neg: Negotiation, offers: List[Offer]) -> List[str]:
    """Generate deterministic improvement suggestions based on negotiation data."""
    if neg.mode != "practice":
        return []
    suggestions = []
    if neg.status == "deadlocked":
        suggestions.append("Consider expanding the negotiation to include non-monetary terms to find common ground.")
        suggestions.append("Making a smaller initial concession earlier can signal willingness to cooperate.")
    if len(offers) > 0:
        human_offers = [o for o in offers if o.made_by == "human"]
        if len(human_offers) > 1:
            first = human_offers[0].offer_data
            last = human_offers[-1].offer_data
            # Generic concession feedback
            suggestions.append("Conceding gradually rather than in large jumps can preserve leverage.")
    if not suggestions:
        suggestions.append("Review the concession timeline to identify opportunities for better positioning.")
    return suggestions


def _find_turning_points(offers: List[Offer]) -> List[str]:
    """Identify key turning points in the negotiation."""
    points = []
    for i, offer in enumerate(offers):
        if offer.status == "accepted":
            points.append(f"Round {offer.round_number}: Offer accepted — agreement reached.")
        elif offer.status == "rejected" and i > 0:
            prev = offers[i - 1]
            if prev.made_by != offer.made_by:
                points.append(f"Round {offer.round_number}: Counter-offer rejected — negotiation became more competitive.")
    return points[:5]  # Cap at 5 turning points
