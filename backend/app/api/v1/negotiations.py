from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import json
import asyncio

from app.db.session import get_db
from app.db.models import User, Negotiation, NegotiationMessage, Offer, NegotiationStatus, MessageRole
from app.core.security import get_current_user
from app.schemas.schemas import (
    NegotiationCreate, NegotiationUpdate, NegotiationSummary, NegotiationDetail,
    HumanOfferRequest, MessageOut, OfferOut
)
from app.engine.negotiation_engine import NegotiationEngine

router = APIRouter()


def _check_owner(negotiation: Negotiation, user: User):
    if negotiation.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get("", response_model=List[NegotiationSummary])
async def list_negotiations(
    archived: bool = False,
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Negotiation).where(
        Negotiation.user_id == current_user.id,
        Negotiation.is_archived == archived,
    )
    if search:
        stmt = stmt.where(Negotiation.title.ilike(f"%{search}%"))
    stmt = stmt.order_by(Negotiation.updated_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=NegotiationSummary, status_code=201)
async def create_negotiation(
    body: NegotiationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    neg = Negotiation(
        user_id=current_user.id,
        title=body.title,
        scenario_type=body.scenario_type,
        mode=body.mode,
        config=body.config,
        max_rounds=body.max_rounds,
        status=NegotiationStatus.PENDING,
    )
    db.add(neg)
    await db.flush()
    await db.refresh(neg)
    return NegotiationSummary.model_validate(neg)


@router.get("/{negotiation_id}", response_model=NegotiationDetail)
async def get_negotiation(
    negotiation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    _check_owner(neg, current_user)

    messages = await db.execute(
        select(NegotiationMessage).where(NegotiationMessage.negotiation_id == negotiation_id)
        .order_by(NegotiationMessage.created_at)
    )
    offers = await db.execute(
        select(Offer).where(Offer.negotiation_id == negotiation_id)
        .order_by(Offer.created_at)
    )

    summary = NegotiationSummary.model_validate(neg)
    return NegotiationDetail(
        **summary.model_dump(),
        config=neg.config,
        outcome_data=neg.outcome_data,
        messages=[MessageOut.model_validate(m) for m in messages.scalars().all()],
        offers=[OfferOut.model_validate(o) for o in offers.scalars().all()],
    )


@router.patch("/{negotiation_id}", response_model=NegotiationSummary)
async def update_negotiation(
    negotiation_id: int,
    body: NegotiationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Not found")
    _check_owner(neg, current_user)

    if body.title is not None:
        neg.title = body.title
    if body.is_archived is not None:
        neg.is_archived = body.is_archived
    await db.flush()
    await db.refresh(neg)
    return NegotiationSummary.model_validate(neg)


@router.delete("/{negotiation_id}", status_code=204)
async def delete_negotiation(
    negotiation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Not found")
    _check_owner(neg, current_user)
    await db.delete(neg)


@router.post("/{negotiation_id}/start")
async def start_negotiation(
    negotiation_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Not found")
    _check_owner(neg, current_user)

    if neg.status not in (NegotiationStatus.PENDING, NegotiationStatus.PAUSED):
        raise HTTPException(status_code=400, detail=f"Cannot start negotiation in status: {neg.status}")

    neg.status = NegotiationStatus.ACTIVE
    await db.flush()

    # Run engine in background for simulation mode
    if neg.mode == "simulation":
        background_tasks.add_task(NegotiationEngine.run_simulation, negotiation_id)

    return {"status": "started", "negotiation_id": negotiation_id}


@router.post("/{negotiation_id}/pause")
async def pause_negotiation(
    negotiation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Not found")
    _check_owner(neg, current_user)
    neg.status = NegotiationStatus.PAUSED
    await db.flush()
    return {"status": "paused"}


@router.post("/{negotiation_id}/end")
async def end_negotiation(
    negotiation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Not found")
    _check_owner(neg, current_user)
    from datetime import datetime, timezone
    neg.status = NegotiationStatus.CANCELLED
    neg.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return {"status": "ended"}


@router.post("/{negotiation_id}/offer")
async def submit_human_offer(
    negotiation_id: int,
    body: HumanOfferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a human offer in Practice Mode."""
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Not found")
    _check_owner(neg, current_user)

    if neg.status != NegotiationStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Negotiation is not active")
    if neg.mode != "practice":
        raise HTTPException(status_code=400, detail="Only Practice Mode accepts human offers")

    engine = NegotiationEngine(negotiation_id, db)
    response = await engine.process_human_offer(body.offer_data, body.message)
    return response


@router.get("/{negotiation_id}/stream")
async def stream_negotiation(
    negotiation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE stream for live negotiation updates."""
    result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Not found")
    _check_owner(neg, current_user)

    async def event_generator():
        last_message_id = 0
        last_offer_id = 0
        while True:
            await asyncio.sleep(1)
            async with db.begin_nested():
                # Fetch new messages
                new_msgs = await db.execute(
                    select(NegotiationMessage)
                    .where(
                        NegotiationMessage.negotiation_id == negotiation_id,
                        NegotiationMessage.id > last_message_id,
                    )
                    .order_by(NegotiationMessage.created_at)
                )
                msgs = new_msgs.scalars().all()
                for msg in msgs:
                    last_message_id = msg.id
                    data = MessageOut.model_validate(msg).model_dump_json()
                    yield f"event: message\ndata: {data}\n\n"

                # Check status
                neg_result = await db.execute(select(Negotiation).where(Negotiation.id == negotiation_id))
                current_neg = neg_result.scalar_one_or_none()
                if current_neg and current_neg.status in (
                    NegotiationStatus.COMPLETED, NegotiationStatus.DEADLOCKED, NegotiationStatus.CANCELLED
                ):
                    status_data = json.dumps({"status": current_neg.status, "outcome": current_neg.outcome_data})
                    yield f"event: completed\ndata: {status_data}\n\n"
                    break

    return StreamingResponse(event_generator(), media_type="text/event-stream")
