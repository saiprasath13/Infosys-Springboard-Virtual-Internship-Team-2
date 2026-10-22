from fastapi import APIRouter
from app.schemas.schemas import VendorPricingConfig, JobOfferConfig, ProjectBudgetConfig

router = APIRouter()


@router.get("/defaults/vendor-pricing")
async def vendor_pricing_defaults():
    return VendorPricingConfig(mode="simulation").model_dump()


@router.get("/defaults/job-offer")
async def job_offer_defaults():
    return JobOfferConfig(mode="simulation").model_dump()


@router.get("/defaults/project-budget")
async def project_budget_defaults():
    return ProjectBudgetConfig(mode="simulation").model_dump()


@router.get("/personalities")
async def list_personalities():
    return [
        {
            "id": "aggressive",
            "label": "Aggressive",
            "description": "Pushes hard for maximum gain. Makes few concessions, anchors high, and applies pressure.",
            "icon": "⚡",
        },
        {
            "id": "collaborative",
            "label": "Collaborative",
            "description": "Seeks mutually beneficial outcomes. Flexible on secondary issues, firm on key priorities.",
            "icon": "🤝",
        },
        {
            "id": "risk_averse",
            "label": "Risk-Averse",
            "description": "Prioritises certainty over maximum gain. Accepts moderate deals quickly to avoid deadlock.",
            "icon": "🛡️",
        },
    ]
