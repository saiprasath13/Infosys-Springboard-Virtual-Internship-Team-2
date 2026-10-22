from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Negotiation
from app.core.security import get_current_user
from app.schemas.schemas import AssistantChatRequest, AssistantChatResponse
from app.agents.assistant_agent import AssistantAgent

router = APIRouter()


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    body: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI Negotiation Assistant — conversational setup."""
    agent = AssistantAgent()
    response = await agent.chat(
        user_message=body.message,
        history=body.history,
        user_id=current_user.id,
        negotiation_id=body.negotiation_id,
        db=db,
    )
    return response
