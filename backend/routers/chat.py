from fastapi import APIRouter
from pydantic import BaseModel
from services.embedding import generate_embedding
from services.db import search_similar_chunks, save_message, update_conversation_title, get_messages_for_conversation
from services.llm import generate_answer
from logger_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

class ChatRequest(BaseModel):
    query: str
    conversation_id: int

@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        query = request.query.strip()
        conversation_id = request.conversation_id
        logger.info(f"Received query for conversation {conversation_id}: {query}")

        if not query:
            return {"error": "Query cannot be empty."}

        
        save_message(conversation_id, "user", query)

    
        existing_messages = get_messages_for_conversation(conversation_id)
        if len(existing_messages) == 1:
            title = query[:50] + ("..." if len(query) > 50 else "")
            update_conversation_title(conversation_id, title)

        vec = generate_embedding(query)
        chunks = search_similar_chunks(vec)

        if not chunks:
            answer = "I couldn't find any relevant information in the uploaded documents."
            save_message(conversation_id, "bot", answer)
            return {"answer": answer, "sources": []}

        answer = generate_answer(query, chunks)
        sources = list({chunk["document_name"] for chunk in chunks})

        # Save bot answer
        save_message(conversation_id, "bot", answer)

        return {"answer": answer, "sources": sources}
    except Exception as e:
        logger.error(f"Chat failed: {str(e)}")
        return {"error": str(e)}