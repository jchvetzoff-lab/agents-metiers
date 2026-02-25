"""
Authentication endpoints: login, register, me.
Uses JWT with users persisted in database + bcrypt password hashing.
"""
import re
import time
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from ..auth_middleware import get_current_user, create_jwt
from ..deps import repo
from ..rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# bcrypt is MANDATORY — no fallback to weak hashing
import bcrypt


def _hash_password(password: str) -> str:
    """Hash a password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its bcrypt hash."""
    if not password_hash.startswith("$2"):
        # Legacy SHA-256 hashes are no longer supported.
        # Users must reset their password.
        logger.warning("Rejected login attempt with legacy SHA-256 hash — user must reset password")
        return False
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _validate_password(password: str) -> None:
    """Validate password strength. Raises HTTPException if too weak."""
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins 8 caractères")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins une majuscule")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins un chiffre")


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request (handles proxies)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


@router.post("/login")
async def login(req: LoginRequest, request: Request):
    """Login and return JWT token."""
    client_ip = _get_client_ip(request)
    try:
        # Rate limit: 10 attempts per 15 minutes per IP
        rate_limiter.check(f"auth:login:{client_ip}", max_requests=10, window_seconds=900)
    except HTTPException:
        raise

    try:
        user = repo.get_user_by_email(req.email)
        if user is None:
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

        if not _verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

        token = create_jwt({
            "sub": user["id"],
            "email": user["email"],
            "name": user["name"],
            "iat": int(time.time()),
            "exp": int(time.time()) + 86400 * 7,  # 7 days
        })

        return {
            "token": token,
            "user": {"id": user["id"], "email": user["email"], "name": user["name"]}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.post("/register")
async def register(req: RegisterRequest, request: Request):
    """Register a new user and return JWT token."""
    client_ip = _get_client_ip(request)
    try:
        # Rate limit: 5 registrations per hour per IP
        rate_limiter.check(f"auth:register:{client_ip}", max_requests=5, window_seconds=3600)
    except HTTPException:
        raise

    try:
        # Validate password strength
        _validate_password(req.password)

        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', req.email):
            raise HTTPException(status_code=422, detail="Format d'email invalide")

        # Validate name
        if not req.name or len(req.name.strip()) < 2:
            raise HTTPException(status_code=422, detail="Le nom doit contenir au moins 2 caractères")

        existing = repo.get_user_by_email(req.email)
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est deja utilise")

        password_hash = _hash_password(req.password)
        user = repo.create_user(email=req.email, name=req.name.strip(), password_hash=password_hash)

        token = create_jwt({
            "sub": user["id"],
            "email": user["email"],
            "name": user["name"],
            "iat": int(time.time()),
            "exp": int(time.time()) + 86400 * 7,
        })

        return {
            "token": token,
            "user": {"id": user["id"], "email": user["email"], "name": user["name"]}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current user info from JWT."""
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "name": user.get("name"),
    }
