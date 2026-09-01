from fastapi import HTTPException, Depends, APIRouter
from pydantic import BaseModel, field_validator
from services.auth import (require_permission, 
                            hash_password,
)

from services.db import (
    get_all_users,
    update_user_role,
    set_user_blocked,
    get_all_roles,
    get_permissions_for_role,
    get_activity_log,
    update_user_password,
    delete_user,
    get_all_permissions,
    get_user_permissions,
    update_user_permissions,
    create_admin_user,
)

router = APIRouter()
class ResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 6:
            raise ValueError(
                "Password must be at least 6 characters long"
            )

        return value
class UserPermissionsRequest(BaseModel):
    permission_ids: list[int]
class CreateUserRequest(BaseModel):
    username: str
    password: str
    role_id: int
    permission_ids: list[int]

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 6:
            raise ValueError(
                "Password must be at least 6 characters long"
            )
        return value
# ============================================================
# USERS
# ============================================================

@router.get("/admin/users")
async def admin_users(
    current_user: dict = Depends(
        require_permission("users")
    )
):
    return get_all_users()


@router.put("/admin/users/{user_id}/role")
async def change_user_role(
    user_id: int,
    role_id: int,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    updated = update_user_role(
        user_id,
        role_id
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="User or role not found"
        )

    return {
        "message": "User role updated successfully"
    }


@router.put("/admin/users/{user_id}/block")
async def block_user(
    user_id: int,
    blocked: bool,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    updated = set_user_blocked(
        user_id,
        blocked
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": (
            "User blocked successfully"
            if blocked
            else "User unblocked successfully"
        )
    }
@router.put("/admin/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    request: ResetPasswordRequest,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    if int(current_user["id"]) == user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot reset your own password from this menu"
        )

    hashed_password = hash_password(
        request.new_password
    )

    updated = update_user_password(
        user_id,
        hashed_password
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "Password reset successfully"
    }
@router.delete("/admin/users/{user_id}")
async def remove_user(
    user_id: int,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    if int(current_user["id"]) == user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    deleted = delete_user(user_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "User deleted successfully"
    }


# ============================================================
# ACTIVITY LOGS
# ============================================================

@router.get("/admin/activity-log")
async def admin_activity_log(
    current_user: dict = Depends(
        require_permission("activity_logs")
    )
):
    return get_activity_log()


# ============================================================
# ROLES
# ============================================================

@router.get("/admin/roles")
async def admin_roles(
    current_user: dict = Depends(
        require_permission("users")
    )
):
    return get_all_roles()


@router.get("/admin/roles/{role_id}/permissions")
async def admin_role_permissions(
    role_id: int,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    return {
        "permissions":
            get_permissions_for_role(role_id)
    }
@router.get("/admin/permissions")
async def admin_permissions(
    current_user: dict = Depends(
        require_permission("users")
    )
):
    return get_all_permissions()

@router.get("/admin/users/{user_id}/permissions")
async def admin_user_permissions(
    user_id: int,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    permissions = get_user_permissions(user_id)

    return {
        "permissions": permissions
    }
@router.put("/admin/users/{user_id}/permissions")
async def change_user_permissions(
    user_id: int,
    request: UserPermissionsRequest,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    if int(current_user["id"]) == user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot modify your own permissions"
        )

    updated = update_user_permissions(
        user_id,
        request.permission_ids
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "User permissions updated successfully"
    }
@router.post("/admin/users")
async def create_user_by_admin(
    request: CreateUserRequest,
    current_user: dict = Depends(
        require_permission("users")
    )
):
    hashed_password = hash_password(
        request.password
    )

    result = create_admin_user(
        request.username,
        hashed_password,
        request.role_id,
        request.permission_ids
    )

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    if result is False:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )

    return {
        "message": "User created successfully",
        "user_id": result
    }