from fastapi import Depends , HTTPException
from fastapi.security import HTTPBearer , HTTPAuthorizationCredentials
from fastapi import APIRouter
from pydantic import BaseModel , EmailStr , field_validator
from logger_config import get_logger
from services.db import get_user_by_username ,  create_user
import bcrypt
import jwt
import os
from datetime import datetime, timedelta , timezone
from services.db import set_user_online , set_user_offline ,log_activity
from services.db import get_user_permissions


security = HTTPBearer()

def get_current_user(credentials : HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token ,SECRET_KEY , algorithms = [ALGORITHM])
        return {
            "id" : payload["sub"],
            "username" : payload ["username"],
            "role" : payload["role"]
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code = 401 ,detail = "Token has Expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code =401, detail ="Invalid token")

router = APIRouter()
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 1

@router.get("/me")
async def get_user_details(current_user : dict = Depends(get_current_user)):
    return current_user
def create_access_token(user_id, username, role):
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub":str(user_id),
        "username": username,
        "role": role,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm =ALGORITHM)

from  logger_config import get_logger
logger = get_logger(__name__)



def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

class LoginRequest(BaseModel):
    username : str
    password : str

class SignupRequest(BaseModel):
    username : EmailStr
    password : str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

@router.post("/login")
async def login(credentials : LoginRequest):
    try:
        user= get_user_by_username(credentials.username)
        if user is None:
            logger.info(
                f"Failed login attempt for username: {credentials.username}"
            )
            return {"error": "Invalid username or password"}

        if user["is_blocked"]:
            logger.warning(
                f"Blocked user attempted login: {credentials.username}"
    )
            return {"error": "Your account has been blocked by an administrator"}

        if not verify_password(
            credentials.password,
            user["hashed_password"]
):
            logger.info(
                f"Failed login attempt for username: {credentials.username}"
    )
            return {"error": "Invalid username or password"}

        
        token = create_access_token(user["id"] , user ["username"] , user["role"])
        set_user_online(user["id"])
        log_activity(user["id"] ,  user["username"],"login")
        logger.info(f"User '{user['username']}' logged in successfully")

        return {
            "access_token": token,
            "token_type" : "bearer",
            "username" : user["username"],
            "role": user["role"]
        }
    except Exception as e:
        logger.error(f"Login failed : {str(e)}")
        return {"eroor" : str(e)}

@router.post("/signup")
async def signup(credentials: SignupRequest):
    try:
        existing_user = get_user_by_username(credentials.username)
        if existing_user is not None:
            logger.info(f"Signup attempt with existing username : {credentials.username}")
            return {"error": "Username already taken"}

        hashed = hash_password(credentials.password)
        user_id = create_user(credentials.username , hashed , role ="user")

        token = create_access_token(user_id, credentials.username, "user")
        logger.info(f"New user '{credentials.username}' signed up successfully")

        return {
            "access_token": token,
            "token_type": "bearer",
            "username": credentials.username,
            "role": "user"
        }
    except Exception as e:
        logger.error(f"Signup failed: {str(e)}")
        return {"error": str(e)}

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    set_user_offline(current_user["id"])
    log_activity(current_user["id"] , current_user["username"],"logout")
    return {"message": "Logged out successfully"}
def require_permission(permission_name: str):

    def permission_checker(
        current_user: dict = Depends(get_current_user)
    ):
        permissions = get_user_permissions(
            int(current_user["id"])
        )

        if permission_name not in permissions:
            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )

        return current_user

    return permission_checker
@router.get("/permissions")
async def my_permissions(
    current_user: dict = Depends(get_current_user)
):
    return {
        "permissions": get_user_permissions(current_user["id"])
    }
    