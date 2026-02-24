"""
Authentication endpoints: login, register, me.
Uses simple JWT with in-memory user store (or DB if available).
"""
import hashlib
import time
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..auth_middleware import get_current_user, create_jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory user store (replace with DB table in production)
_users: dict[int, dict] = {}
_users_by_email: dict[str, int] = {}
_next_id = 1


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


@router.post("/login")
async def login(req: LoginRequest):
    """Login and return JWT token."""
    global _users, _users_by_email

    user_id = _users_by_email.get(req.email)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    user = _users[user_id]
    if user["password_hash"] != _hash_password(req.password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_jwt({
        "sub": user_id,
        "email": user["email"],
        "name": user["name"],
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,  # 7 days
    })

    return {
        "token": token,
        "user": {"id": user_id, "email": user["email"], "name": user["name"]}
    }


@router.post("/register")
async def register(req: RegisterRequest):
    """Register a new user and return JWT token."""
    global _users, _users_by_email, _next_id

    if req.email in _users_by_email:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    user_id = _next_id
    _next_id += 1

    _users[user_id] = {
        "id": user_id,
        "email": req.email,
        "name": req.name,
        "password_hash": _hash_password(req.password),
    }
    _users_by_email[req.email] = user_id

    token = create_jwt({
        "sub": user_id,
        "email": req.email,
        "name": req.name,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,
    })

    return {
        "token": token,
        "user": {"id": user_id, "email": req.email, "name": req.name}
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current user info from JWT."""
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "name": user.get("name"),
    }
