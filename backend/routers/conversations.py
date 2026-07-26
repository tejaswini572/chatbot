from fastapi import APIRouter
from services.db import create_conversation, get_all_conversations, get_messages_for_conversation
from logger_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/conversations")
async def new_conversation():
    try:
        conversation_id = create_conversation()
        return {"id": conversation_id, "title": "New chat"}
    except Exception as e:
        logger.error(f"Failed to create conversation: {str(e)}")
        return {"error": str(e)}


@router.get("/conversations")
async def list_conversations():
    try:
        conversations = get_all_conversations()
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Failed to list conversations: {str(e)}")
        return {"error": str(e)}


@router.get("/conversations/{conversation_id}/messages")
async def conversation_messages(conversation_id: int):
    try:
        messages = get_messages_for_conversation(conversation_id)
        return {"messages": messages}
    except Exception as e:
        logger.error(f"Failed to fetch messages: {str(e)}")
        return {"error": str(e)}