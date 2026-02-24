"""
Backend FastAPI pour Agents Métiers Web.
App setup, CORS, and router registration.
"""
import os
import logging
from fastapi import FastAPI

logger = logging.getLogger(__name__)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Agents Métiers API",
    description="API REST pour la gestion des fiches métiers avec IA",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-seven-neon-32.vercel.app",
        "https://agents-metiersjae.fr",
        "https://www.agents-metiersjae.fr",
        *([  "http://localhost:3000"] if os.getenv("ENVIRONMENT", "production") != "production" else []),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.on_event("startup")
async def startup_event():
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
                if "password_hash" not in existing_cols:
                    logger.info("Migrating users table: adding password_hash column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''"))
                if "created_at" not in existing_cols:
                    logger.info("Migrating users table: adding created_at column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
                if "name" not in existing_cols:
                    logger.info("Migrating users table: adding name column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT ''"))

        # Check audit_log table columns
        if "audit_log" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("audit_log")}
            with repo.engine.begin() as conn:
                if "validateur" not in existing_cols:
                    logger.info("Migrating audit_log table: adding validateur column")
                    conn.execute(text("ALTER TABLE audit_log ADD COLUMN validateur VARCHAR(100)"))

        logger.info("Database migration check completed")
    except Exception as e:
        logger.error(f"Failed to init/migrate DB at startup: {e}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    from .deps import repo
    try:
        # Vérifier la connexion DB
        repo.get_all_fiches(limit=1)
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db": str(e)}


@app.get("/api/git-version")
async def git_version():
    """Shows deployed git commit."""
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
