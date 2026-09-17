"""Authentication router for login, logout, and current user session."""
from fastapi import APIRouter, HTTPException, Response, Request, Depends, status
from pydantic import BaseModel, Field
from backend.app.database.repository import IndustrialRepository
from backend.app.auth.security import (
    verify_password,
    create_access_token,
    generate_csrf_token,
    get_current_user,
    get_current_user_optional,
    AUTH_COOKIE_NAME,
    CSRF_COOKIE_NAME
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
repo = IndustrialRepository()

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)

class UserResponse(BaseModel):
    user_id: str
    username: str
    full_name: str
    role: str
    csrf_token: str

@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response):
    """Authenticate user, set HttpOnly JWT cookie, and issue CSRF token."""
    user = repo.get_user_by_username(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    token = create_access_token(user["user_id"], user["username"], user["role"])
    csrf_token = generate_csrf_token()

    # Set secure HttpOnly cookie
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False, # Set to True if in HTTPS/production
        max_age=24 * 3600
    )
    # Set CSRF cookie (readable by JS to send back in X-CSRF-Token header)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=False,
        max_age=24 * 3600
    )

    return UserResponse(
        user_id=user["user_id"],
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        csrf_token=csrf_token
    )

@router.post("/logout")
def logout(response: Response):
    """Clear authentication session cookies."""
    response.delete_cookie(AUTH_COOKIE_NAME)
    response.delete_cookie(CSRF_COOKIE_NAME)
    return {"message": "Logged out successfully."}

@router.get("/me")
def get_me(request: Request):
    """Return currently logged-in user profile or unauthenticated status."""
    user = get_current_user_optional(request)
    if not user:
        return {"authenticated": False, "user": None}

    csrf_token = request.cookies.get(CSRF_COOKIE_NAME) or generate_csrf_token()
    return {
        "authenticated": True,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"]
        },
        "csrf_token": csrf_token
    }
