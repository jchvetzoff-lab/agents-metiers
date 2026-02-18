"""
Authentication module - JWT auth, login, register.
"""

import hashlib
import json
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request, Depends

from .models import LoginRequest, RegisterRequest

router = APIRouter()

# JWT Configuration
JWT_SECRET = secrets.token_hex(32)

# Hardcoded test accounts + DB accounts
_TEST_ACCOUNTS = {
    "test@test.com": {"password": "test123", "name": "Test User", "id": 1},
    "admin@jae.fr": {"password": "admin123", "name": "Admin JAE", "id": 2},
}


def get_current_timestamp() -> datetime:
    """Get current timestamp."""
    return datetime.now()


def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


def b64url_encode(data: bytes) -> str:
    """Base64 URL-safe encode."""
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(s: str) -> bytes:
    """Base64 URL-safe decode."""
    import base64
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def make_jwt_token(user_id: int, email: str, name: str) -> str:
    """Create JWT-like token (header.payload.signature) compatible with frontend parseToken."""
    header = b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    exp = int((get_current_timestamp() + timedelta(days=7)).timestamp())
    iat = int(get_current_timestamp().timestamp())
    payload_data = {"sub": user_id, "email": email, "name": name, "exp": exp, "iat": iat}
    payload = b64url_encode(json.dumps(payload_data).encode())
    sig_input = f"{header}.{payload}.{JWT_SECRET[:16]}"
    signature = b64url_encode(hashlib.sha256(sig_input.encode()).digest())
    return f"{header}.{payload}.{signature}"


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT-like token and return payload data."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        # Verify signature
        sig_input = f"{header}.{payload}.{JWT_SECRET[:16]}"
        expected_sig = b64url_encode(hashlib.sha256(sig_input.encode()).digest())
        if signature != expected_sig:
            return None
        payload_data = json.loads(b64url_decode(payload))
        if payload_data.get("exp", 0) < int(get_current_timestamp().timestamp()):
            return None
        return payload_data
    except Exception:
        return None


# ==================== AUTH ROUTES ====================

@router.post("/login")
async def auth_login(body: LoginRequest) -> Dict[str, Any]:
    """Login with email/password."""
    account = _TEST_ACCOUNTS.get(body.email)
    if account and account["password"] == body.password:
        token = make_jwt_token(account["id"], body.email, account["name"])
        return {
            "token": token, 
            "user": {
                "id": account["id"], 
                "email": body.email, 
                "name": account["name"]
            }
        }
    raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")


@router.post("/register")
async def auth_register(body: RegisterRequest) -> Dict[str, Any]:
    """Register a new account (adds to test accounts for this session)."""
    if body.email in _TEST_ACCOUNTS:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    new_id = len(_TEST_ACCOUNTS) + 1
    _TEST_ACCOUNTS[body.email] = {
        "password": body.password, 
        "name": body.name, 
        "id": new_id
    }
    
    return {
        "message": "Compte créé", 
        "user": {
            "id": new_id, 
            "email": body.email, 
            "name": body.name
        }
    }


@router.get("/me")
async def auth_me(request: Request) -> Dict[str, Any]:
    """Get current user from token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    token = auth_header[7:]
    user = verify_jwt_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    
    return {
        "id": user["sub"], 
        "email": user["email"], 
        "name": user["name"]
    }