"""
Backend FastAPI pour Agents Métiers Web.
App setup, CORS, and router registration.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

logger = logging.getLogger(__name__)
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware

from .auth_middleware import get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    await _startup()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="Agents Métiers API",
    description="API REST pour la gestion des fiches métiers avec IA",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration — restricted methods and headers for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-seven-neon-32.vercel.app",
        "https://agents-metiersjae.fr",
        "https://www.agents-metiersjae.fr",
        *(["http://localhost:3000"] if os.getenv("ENVIRONMENT", "production") != "production" else []),
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Register routers
from .routers.auth import router as auth_router
from .routers.stats import router as stats_router
from .routers.actions import publish_batch_router
from .routers.fiches import router as fiches_router
from .routers.actions import router as actions_router
from .routers.veille import router as veille_router
from .routers.regional import router as regional_router

# Order matters: publish-batch must come before {code_rome} catch-all
app.include_router(auth_router)
app.include_router(stats_router)
app.include_router(publish_batch_router)
app.include_router(actions_router)
app.include_router(fiches_router)
app.include_router(veille_router)
app.include_router(regional_router)


async def _startup():
    """Ensure all DB tables exist at startup, with column migration."""
    from .deps import repo
    try:
        repo.init_db()
        logger.info("Database tables verified/created at startup")

        # Migrate existing tables: add missing columns
        from sqlalchemy import text, inspect
        inspector = inspect(repo.engine)

        # Check users table columns
        if "users" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("users")}
            with repo.engine.begin() as conn:
                if "created_at" not in existing_cols:
                    logger.info("Migrating users table: adding created_at column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP"))
                if "name" not in existing_cols:
                    logger.info("Migrating users table: adding name column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT ''"))

                # Migrate from legacy "hashed_password" column to "password_hash"
                # (old code mapped password_hash → hashed_password SQL column)
                if "hashed_password" in existing_cols and "password_hash" not in existing_cols:
                    logger.info("Migrating users table: renaming hashed_password → password_hash")
                    conn.execute(text("ALTER TABLE users RENAME COLUMN hashed_password TO password_hash"))
                elif "hashed_password" in existing_cols and "password_hash" in existing_cols:
                    # Both exist: copy data from hashed_password into password_hash if password_hash is empty
                    logger.info("Migrating users table: merging hashed_password data into password_hash")
                    conn.execute(text(
                        "UPDATE users SET password_hash = hashed_password "
                        "WHERE (password_hash IS NULL OR password_hash = '') "
                        "AND hashed_password IS NOT NULL AND hashed_password != ''"
                    ))

        # Check audit_log table columns
        if "audit_log" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("audit_log")}
            with repo.engine.begin() as conn:
                if "validateur" not in existing_cols:
                    logger.info("Migrating audit_log table: adding validateur column")
                    conn.execute(text("ALTER TABLE audit_log ADD COLUMN validateur VARCHAR(100)"))

        # Migrate legacy statut values in fiches (parameterized queries — no SQL injection)
        with repo.engine.begin() as conn:
            for old_val, new_val in [("en_validation", "valide"), ("archivee", "publiee")]:
                try:
                    result = conn.execute(
                        text("UPDATE fiches SET statut = :new_val WHERE statut = :old_val"),
                        {"new_val": new_val, "old_val": old_val}
                    )
                    if result.rowcount > 0:
                        logger.info(f"Migrated {result.rowcount} fiches from '{old_val}' to '{new_val}'")
                except Exception as e:
                    logger.warning(f"Statut migration {old_val}->{new_val}: {e}")

        # Clean up expired refresh tokens on startup
        try:
            deleted = repo.cleanup_expired_tokens()
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired/revoked refresh tokens")
        except Exception as e:
            logger.warning(f"Refresh token cleanup failed: {e}")

        # Clean up old rate limiter entries
        from .rate_limiter import rate_limiter
        rate_limiter.cleanup()

        logger.info("Database migration check completed")
    except Exception as e:
        logger.error(f"Failed to init/migrate DB at startup: {e}")


@app.get("/health")
async def health():
    """Health check endpoint (public, minimal info)."""
    from .deps import repo
    try:
        repo.get_all_fiches(limit=1)
        return {"status": "ok"}
    except Exception as e:
        logger.warning(f"Health check DB issue: {e}")
        return {"status": "degraded"}


@app.get("/health/detailed")
async def health_detailed(user: dict = Depends(get_current_user)):
    """Detailed health check (auth required)."""
    from .deps import repo
    try:
        repo.get_all_fiches(limit=1)
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db": "connection error", "error": str(e)}


@app.get("/api/git-version")
async def git_version(user: dict = Depends(get_current_user)):
    """Shows deployed git commit (auth required)."""
    # Prefer build-time GIT_SHA env var (no subprocess in production)
    git_sha = os.getenv("GIT_SHA", "")
    git_msg = os.getenv("GIT_MSG", "")
    if git_sha:
        return {"commit": git_sha, "message": git_msg}

    import asyncio
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "rev-parse", "--short", "HEAD",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
        sha = stdout.decode().strip()
        proc2 = await asyncio.create_subprocess_exec(
            "git", "log", "-1", "--format=%s",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout2, _ = await asyncio.wait_for(proc2.communicate(), timeout=5)
        msg = stdout2.decode().strip()
        return {"commit": sha, "message": msg}
    except Exception:
        return {"commit": "unknown", "message": "git not available"}


@app.get("/")
async def root():
    return {
        "message": "Agents Métiers API",
        "version": "1.0.0",
        "endpoints": {
            "stats": "/api/stats",
            "fiches": "/api/fiches",
            "fiche_detail": "/api/fiches/{code_rome}",
            "variantes": "/api/fiches/{code_rome}/variantes"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
