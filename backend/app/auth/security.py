"""Security, password hashing (Argon2id), JWT, and RBAC middleware dependencies."""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash
from fastapi import Request, HTTPException, status, Depends
from backend.app.config import settings
from backend.app.database.user_audit_telemetry_repository import UserRepository

ph = PasswordHasher()
repo = UserRepository()

AUTH_COOKIE_NAME = "copilot_auth"
CSRF_COOKIE_NAME = "copilot_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"

def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return ph.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return ph.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHash):
        return False

def create_access_token(user_id: str, username: str, role: str) -> str:
    """Create signed JWT access token."""
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def generate_csrf_token() -> str:
    """Generate cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)

def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Extract authenticated user if present in cookies or Authorization header; otherwise None."""
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user = repo.get_user_by_id(payload["sub"])
    return user

def get_current_user(request: Request) -> Dict[str, Any]:
    """Require valid authenticated user."""
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def require_roles(allowed_roles: List[str]):
    """Enforce role-based access control (RBAC)."""
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires role in {allowed_roles}, but current user has role '{user.get('role')}'"
            )
        return user
    return role_checker
