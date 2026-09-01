from fastapi import APIRouter
from pydantic import BaseModel
from services.mongodb import conversations_collection

from services.llm import generate_general_answer
from logger_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

class WidgetChatRequest(BaseModel):
    message:str
    session_id: str

@router.post("/widget_chat")
async def widget_chat(request:WidgetChatRequest):
    try:
        message = request.message.strip()
        session_id = request.session_id.strip()
        if not message:
            return {"error" :"Mesage cannot be empty"}
        
        if not session_id:
            return {"error": "Session ID is required"}

        logger.info(
            f"Received widget chat message from session {session_id}: {message}"
        )
        answer = generate_general_answer(message)

        await conversations_collection.update_one(
            {
                "session_id" :session_id},
                {
                    "$setOnInsert": {
                        "session_id" : session_id
                    },
                    "$push":{
                    "messages" :
                    {
                        "sender": "user",
                        "text": message
                    }
                }
            },
            upsert = True
        )

        await conversations_collection.update_one(
            {"session_id":  session_id},
            {
                "$push" : {
                    "messages" :{
                        "sender" : "bot",
                        "text" : answer
                    }
                }
            }
        )
        return {
            "answer" :answer,
            "session_id" : session_id
        }
    except Exception as e:
        logger.error(f"Widget chat failed: {str(e)}")
        return {"error": str(e)}
        return {
            
            "error": "Something went wrong while processing your message."
        }
