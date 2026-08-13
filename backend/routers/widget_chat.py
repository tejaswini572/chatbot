from fastapi import APIRouter
from pydantic import BaseModel

from services.llm import generate_general_answer
from logger_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

class WidgetChatRequest(BaseModel):
    message:str

@router.post("/widget_chat")
async def widget_chat(request:WidgetChatRequest):
    try:
        message = request.message.strip()

        if not message:
            return {"error" :"Mesage cannot be empty"}

        logger.info(f"Received widget chat message : {message} ")
        answer = generate_general_answer(message)

        return {
            "answer" :answer
        }
    except Exception as e:
        logger.error(f"Widget chat failed: {str(e)}")
        return {"error": str(e)}
        return {
            
            "error": "Something went wrong while processing your message."
        }
