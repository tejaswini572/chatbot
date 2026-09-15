from typing import Optional
from fastapi import APIRouter ,Depends
from logger_config import get_logger
from services.mongodb import get_widget_conversation_count

from services.db import get_dashboard_stats,get_conversations_over_time,get_messages_over_time
from services.auth import require_permission

router = APIRouter(
    prefix ="/dashboard",
    tags=["Dashboard"]
)
logger = get_logger(__name__)

@router.get("/stats")
async def dashboard_stats(
    date_range: str = "all",
    user_id: Optional[int] = None,
    source: str = "all",
    current_user=Depends(require_permission("dashboard"))
):
    print("Date Range:", date_range)
    print("User ID:", user_id)
    print("Source:", source)
    stats = get_dashboard_stats(
    date_range,
    user_id
)
    if source == "chatbot":
        stats["widget_conversations"] = 0

    elif source == "widget":
        widget_conversations = await get_widget_conversation_count()
        stats["widget_conversations"] = widget_conversations

        stats["total_conversations"] = 0
        stats["total_messages"] = 0

    else:
        widget_conversations = await get_widget_conversation_count()
        stats["widget_conversations"] = widget_conversations

    return stats
@router.get("/conversations-over-time")
async def conversations_over_time(
    date_range: str = "all",
    user_id: Optional[int] = None,
    current_user=Depends(require_permission("dashboard"))
):
    data = get_conversations_over_time(
        date_range,
        user_id
    )

    return {
        "conversations": data
    }

@router.get("/messages-over-time")
async def messages_over_time(
    date_range: str = "all",
    user_id: Optional[int] = None,
    current_user=Depends(require_permission("dashboard"))
):
    data = get_messages_over_time(
        date_range,
        user_id
    )

    return {
        "messages": data
    }