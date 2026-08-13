from fastapi import APIRouter, Depends, HTTPException
from services.db import (
    create_conversation,
    get_all_conversations,
    get_messages_for_conversation,
    delete_conversation,
    get_conversation,
)
from services.auth import get_current_user
from logger_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/conversations")
async def new_conversation(current_user: dict = Depends(get_current_user)):
    try:
        conversation_id = create_conversation(current_user["id"])
        return {"id": conversation_id, "title": "New chat"}
    except Exception as e:
        logger.error(f"Failed to create conversation: {str(e)}")
        return {"error": str(e)}


@router.get("/conversations")
async def list_conversations(current_user: dict = Depends(get_current_user)):
    try:
        is_admin = current_user["role"] == "admin"
        conversations = get_all_conversations(current_user["id"], is_admin)
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Failed to list conversations: {str(e)}")
        return {"error": str(e)}


@router.get("/conversations/{conversation_id}/messages")
async def conversation_messages(conversation_id: int, current_user: dict = Depends(get_current_user)):
    try:
        conversation = get_conversation(conversation_id)

        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        is_owner = conversation["user_id"] is not None and str(conversation["user_id"]) == str(current_user["id"])
        is_admin = current_user["role"] == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not allowed to view this conversation")

        messages = get_messages_for_conversation(conversation_id)
        return {"messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch messages: {str(e)}")
        return {"error": str(e)}


@router.delete("/conversations/{conversation_id}")
async def remove_conversation(conversation_id: int, current_user: dict = Depends(get_current_user)):
    try:
        conversation = get_conversation(conversation_id)

        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        is_owner = conversation["user_id"] is not None and str(conversation["user_id"]) == str(current_user["id"])
        is_admin = current_user["role"] == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not allowed to delete this conversation")

        delete_conversation(conversation_id)
        return {"message": "Conversation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {str(e)}")
        return {"error": str(e)}