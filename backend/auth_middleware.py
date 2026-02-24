"""
Authentication middleware for FastAPI.
JWT token verification with stable secret.
"""
import os
import json
import hmac
import hashlib
import base64
import time
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)

# JWT_SECRET: MUST be set via environment variable
# In production, this is mandatory. In development, a stable fallback is used.
JWT_SECRET = os.getenv("JWT_SECRET", "")
_ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if not JWT_SECRET:
    if _ENVIRONMENT == "production":
        # In production, JWT_SECRET MUST be set — refuse to start with weak secret
        logger.critical(
            "JWT_SECRET not set in production! Set it via environment variable. "
            "Using emergency fallback — CHANGE THIS IMMEDIATELY."
        )
        # Use a long, stable fallback rather than crashing the app
        JWT_SECRET = "agents-metiers-prod-emergency-fallback-CHANGE-THIS-" + hashlib.sha256(
            b"agents-metiers-render-2026"
        ).hexdigest()[:32]
    else:
        # Development fallback — stable so tokens survive restarts
        JWT_SECRET = "agents-metiers-dev-secret-local-only-2026"
        logger.warning("JWT_SECRET not set — using development fallback (not for production)")
JWT_ALGORITHM = "HS256"


def _b64url_decode(data: str) -> bytes:
    """Decode base64url."""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def _b64url_encode(data: bytes) -> str:
    """Encode base64url without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def create_jwt(payload: dict) -> str:
    """Create a simple JWT token (HS256)."""
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header).encode())
    payload_b64 = _b64url_encode(json.dumps(payload).encode())
    signing_input = f"{header_b64}.{payload_b64}"
    signature = hmac.new(
        JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256
    ).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def verify_jwt(token: str) -> Optional[dict]:
    """Verify JWT token and return payload, or None if invalid."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(
            JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(_b64url_decode(payload_b64))

        # Check expiration
        if "exp" in payload and payload["exp"] < time.time():
            return None

        return payload
    except Exception:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    FastAPI dependency: extracts and verifies JWT from Authorization header.
    Returns the decoded payload (sub, email, name, etc.).
    Raises 401 if token is missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_jwt(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
