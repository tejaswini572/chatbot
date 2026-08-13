from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.auth import get_current_user
from services.db import (
    get_widget_configuration,
    update_widget_configuration
)

router = APIRouter()
class WidgetConfiguration(BaseModel):
    primaryColor: str
    botName: str
    welcomeMessage: str
    buttonPosition: str
    widgetSize: str
    avatarUrl: str

@router.get("/widget-config")
def get_config():

    config = get_widget_configuration()

    return config

@router.put("/widget-config")
def save_config(
    config: WidgetConfiguration,
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "admin":
        return {"error": "Only admin can modify widget configuration"}

    update_widget_configuration(config.dict())

    return {
        "message": "Configuration updated successfully"
    }