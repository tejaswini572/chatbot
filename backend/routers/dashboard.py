from fastapi import APIRouter ,Depends
from logger_config import get_logger
from services.mongodb import get_widget_conversation_count

from services.db import get_dashboard_stats
from services.auth import require_permission

router = APIRouter(
    prefix ="/dashboard",
    tags=["Dashboard"]
)
logger = get_logger(__name__)

@router.get("/stats")
async def dashboard_stats(
    current_user=Depends(require_permission("dashboard"))
):
    stats = get_dashboard_stats()

    widget_conversations = await get_widget_conversation_count()

    stats["widget_conversations"] = widget_conversations

    return stats
    



