
from services.db import get_online_users , get_activity_log
from fastapi import HTTPException , Depends , APIRouter
from services.auth import get_current_user

router = APIRouter()
@router.get("/admin/users")
async def admin_users(current_user: dict = Depends(get_current_user)):

    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")

    return get_online_users()

from services.db import get_online_users, get_activity_log

@router.get("/admin/activity-log")
async def admin_activity_log(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    return get_activity_log()