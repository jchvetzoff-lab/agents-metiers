"""
Authentication endpoints: login, register, refresh, logout, me.
Uses JWT access tokens (HttpOnly cookie) + opaque refresh tokens (DB-stored, revocable).
"""
import os
import re
import time
import secrets
import hashlib
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel

from ..auth_middleware import get_current_user, create_jwt
from ..deps import repo
from ..rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# bcrypt is MANDATORY — no fallback to weak hashing
import bcrypt

# Cookie configuration
_ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
_IS_PROD = _ENVIRONMENT == "production"
_COOKIE_DOMAIN = ".agents-metiersjae.fr" if _IS_PROD else None
_ACCESS_TOKEN_TTL = 900  # 15 minutes
_REFRESH_TOKEN_TTL_DAYS = 7

# Cookie names
ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


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
    """Extract client IP from request.

    Uses the actual TCP connection IP (request.client.host) to prevent
    X-Forwarded-For spoofing. When behind a trusted reverse proxy,
    configure uvicorn --forwarded-allow-ips to handle this correctly.
    """
    return request.client.host if request.client else "unknown"


def _hash_refresh_token(token: str) -> str:
    """Hash a refresh token with SHA-256 for DB storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def _generate_refresh_token() -> str:
    """Generate a cryptographically secure opaque refresh token."""
    return secrets.token_urlsafe(48)


def _create_access_token(user: dict) -> str:
    """Create a short-lived JWT access token."""
    return create_jwt({
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "iat": int(time.time()),
        "exp": int(time.time()) + _ACCESS_TOKEN_TTL,
    })


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set HttpOnly cookies for access and refresh tokens."""
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        httponly=True,
        secure=_IS_PROD,
        samesite="lax",
        domain=_COOKIE_DOMAIN,
        path="/",
        max_age=_ACCESS_TOKEN_TTL,
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=_IS_PROD,
        samesite="lax",
        domain=_COOKIE_DOMAIN,
        path="/api/auth",  # Only sent to auth endpoints
        max_age=_REFRESH_TOKEN_TTL_DAYS * 86400,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Clear auth cookies."""
    response.delete_cookie(ACCESS_COOKIE, path="/", domain=_COOKIE_DOMAIN)
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth", domain=_COOKIE_DOMAIN)


def _issue_tokens(user: dict, response: Response) -> dict:
    """Issue access + refresh tokens, set cookies, save refresh to DB."""
    access_token = _create_access_token(user)
    refresh_raw = _generate_refresh_token()
    refresh_hash = _hash_refresh_token(refresh_raw)
    expires_at = datetime.now() + timedelta(days=_REFRESH_TOKEN_TTL_DAYS)

    repo.save_refresh_token(
        token_hash=refresh_hash,
        user_id=user["id"],
        expires_at=expires_at,
    )

    _set_auth_cookies(response, access_token, refresh_raw)

    return {
        "token": access_token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]}
    }


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


@router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response):
    """Login and return JWT token + set HttpOnly cookies."""
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

        return _issue_tokens(user, response)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.post("/register")
async def register(req: RegisterRequest, request: Request, response: Response):
    """Register a new user and return JWT token + set HttpOnly cookies."""
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

        return _issue_tokens(user, response)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh the access token using a valid refresh token from cookie."""
    refresh_raw = request.cookies.get(REFRESH_COOKIE)
    if not refresh_raw:
        raise HTTPException(status_code=401, detail="Refresh token manquant")

    refresh_hash = _hash_refresh_token(refresh_raw)
    stored = repo.get_refresh_token(refresh_hash)

    if stored is None:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token invalide ou revoque")

    if stored["expires_at"] < datetime.now():
        repo.revoke_refresh_token(refresh_hash)
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token expire")

    # Revoke old refresh token (rotation — each refresh token is single-use)
    repo.revoke_refresh_token(refresh_hash)

    # Fetch user to ensure account still exists
    user = repo.get_user_by_id(stored["user_id"])
    if user is None:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    return _issue_tokens(user, response)


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout: revoke refresh token and clear cookies."""
    refresh_raw = request.cookies.get(REFRESH_COOKIE)
    if refresh_raw:
        refresh_hash = _hash_refresh_token(refresh_raw)
        repo.revoke_refresh_token(refresh_hash)

    _clear_auth_cookies(response)
    return {"message": "Deconnecte"}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current user info from JWT."""
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "name": user.get("name"),
    }
