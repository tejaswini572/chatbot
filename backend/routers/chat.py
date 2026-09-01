from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.embedding import generate_embedding
from services.db import (
    search_similar_chunks,
    save_message,
    update_conversation_title,
    get_messages_for_conversation,
    get_conversation,
)
from services.llm import generate_answer
from services.auth import require_permission
from logger_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

class ChatRequest(BaseModel):
    query: str
    conversation_id: int

@router.post("/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(require_permission("chatbot"))
):
    try:
        query = request.query.strip()
        conversation_id = request.conversation_id
        logger.info(f"Received query for conversation {conversation_id} from user {current_user['id']}: {query}")

        if not query:
            return {"error": "Query cannot be empty."}

        conversation = get_conversation(conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        is_owner = conversation["user_id"] is not None and str(conversation["user_id"]) == str(current_user["id"])
        is_admin = current_user["role"] == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not allowed to post to this conversation")

        save_message(conversation_id, "user", query)

        existing_messages = get_messages_for_conversation(conversation_id)
        if len(existing_messages) == 1:
            title = query[:50] + ("..." if len(query) > 50 else "")
            update_conversation_title(conversation_id, title)

        vec = generate_embedding(query)
        chunks = search_similar_chunks(vec, current_user["id"], is_admin)

        if not chunks:
            answer = "I couldn't find any relevant information in your uploaded documents."
            save_message(conversation_id, "bot", answer)
            return {"answer": answer, "sources": []}

        answer = generate_answer(query, chunks)
        answer = answer.replace("<br>", "\n")
        answer = answer.replace("<br/>", "\n")
        answer = answer.replace("<br />", "\n")
        sources = list({chunk["document_name"] for chunk in chunks})

        save_message(conversation_id, "bot", answer,sources)

        return {"answer": answer, "sources": sources}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat failed: {str(e)}")
        return {"error": str(e)}