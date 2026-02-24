"""
Authentication endpoints: login, register, me.
Uses JWT with users persisted in database + bcrypt password hashing.
"""
import time
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..auth_middleware import get_current_user, create_jwt
from ..deps import repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# bcrypt pour le hashing des mots de passe
try:
    import bcrypt
    _HAS_BCRYPT = True
except ImportError:
    import hashlib
    _HAS_BCRYPT = False
    logger.warning("bcrypt non disponible — fallback SHA-256. Installer bcrypt en production.")


def _hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt (ou SHA-256 en fallback)."""
    if _HAS_BCRYPT:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def _verify_password(password: str, password_hash: str) -> bool:
    """Verifie un mot de passe contre son hash."""
    if _HAS_BCRYPT and password_hash.startswith("$2"):
        # Hash bcrypt
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    # Fallback SHA-256 (anciens comptes ou bcrypt non dispo)
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest() == password_hash


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
    try:
        user = repo.get_user_by_email(req.email)
        if user is None:
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

        if not _verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

        # Si l'ancien hash est SHA-256 et bcrypt est dispo, migrer le hash
        if _HAS_BCRYPT and not user["password_hash"].startswith("$2"):
            try:
                new_hash = _hash_password(req.password)
                from database.models import UserDB
                from sqlalchemy import update
                with repo.session() as session:
                    session.execute(
                        update(UserDB)
                        .where(UserDB.id == user["id"])
                        .values(password_hash=new_hash)
                    )
                logger.info(f"Password hash migrated to bcrypt for user {user['email']}")
            except Exception as e:
                logger.warning(f"Failed to migrate password hash: {e}")

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
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur connexion: {str(e)}")


@router.post("/register")
async def register(req: RegisterRequest):
    """Register a new user and return JWT token."""
    try:
        existing = repo.get_user_by_email(req.email)
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est deja utilise")

        password_hash = _hash_password(req.password)
        user = repo.create_user(email=req.email, name=req.name, password_hash=password_hash)

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
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur inscription: {str(e)}")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current user info from JWT."""
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "name": user.get("name"),
    }
