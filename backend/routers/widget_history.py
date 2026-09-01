from fastapi import APIRouter, HTTPException, Depends

from services.mongodb import conversations_collection
from logger_config import get_logger
from services.auth import require_permission

router = APIRouter()
logger = get_logger(__name__)


@router.get("/widget-history/sessions")
async def get_widget_sessions(
     current_user: dict = Depends(
        require_permission("widget_history")
    )

):
    try:
        sessions = await conversations_collection.find(
            {},
            {
                "_id": 0,
                "session_id": 1
            }
        ).to_list(length=None)

        return {
            "sessions": sessions
        }

    except Exception as e:
        logger.error(f"Failed to fetch widget sessions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch widget sessions"
        )


@router.get("/widget-history/sessions/{session_id}")
async def get_widget_session(session_id: str,
    current_user: dict = Depends(
        require_permission("widget_history")
    )):
    try:
        conversation = await conversations_collection.find_one(
            {"session_id": session_id},
            {
                "_id": 0
            }
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )

        return conversation

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Failed to fetch session {session_id}: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch session"
        )