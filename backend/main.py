"""
Backend FastAPI pour Agents Métiers Web.
App setup, CORS, and router registration.
"""
import os
from fastapi import FastAPI
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


@app.get("/api/debug-enrich/{code_rome}")
async def debug_enrich(code_rome: str):
    """Debug: test enrichment pipeline step by step."""
    from .deps import repo, get_claude_client
    import traceback
    results = {}
    
    # Step 1: get fiche
    try:
        fiche = repo.get_fiche(code_rome)
        results["fiche"] = f"{fiche.nom_masculin}" if fiche else "NOT FOUND"
    except Exception as e:
        results["fiche_error"] = f"{type(e).__name__}: {e}"
        return results
    
    # Step 2: get claude client
    client = get_claude_client()
    results["claude_client"] = "OK" if client else "None"
    if not client:
        return results
    
    # Step 3: try a direct Claude call with the enrichment prompt
    try:
        from config import get_config
        config = get_config()
        results["model"] = config.api.claude_model
        
        # Minimal test prompt
        response = await client.messages.create(
            model=config.api.claude_model,
            max_tokens=200,
            messages=[{"role": "user", "content": f"Donne 3 compétences pour le métier: {fiche.nom_masculin}. Réponds en JSON: {{\"competences\": [\"a\",\"b\",\"c\"]}}"}]
        )
        results["raw_response"] = response.content[0].text[:300]
        results["stop_reason"] = response.stop_reason
        
        # Now try the actual enrichment
        from agents.redacteur_fiche import AgentRedacteurFiche
        agent = AgentRedacteurFiche(repository=repo, claude_client=client)
        contenu = await agent._generer_contenu(
            nom_masculin=fiche.nom_masculin,
            nom_feminin=fiche.nom_feminin,
            code_rome=fiche.code_rome,
            domaine=fiche.secteurs_activite[0] if fiche.secteurs_activite else "",
            description_existante=fiche.description if fiche.description else ""
        )
        if contenu:
            results["contenu_keys"] = list(contenu.keys())
            results["nb_keys"] = len(contenu.keys())
        else:
            results["contenu"] = "None - generation failed"
            # Check agent logs
            import io, logging as _lg
            buf = io.StringIO()
            h = _lg.StreamHandler(buf)
            h.setLevel(_lg.DEBUG)
            agent.logger.addHandler(h)
            results["hint"] = "Check traceback or agent logs"
    except Exception as e:
        results["enrich_error"] = f"{type(e).__name__}: {e}"
        results["traceback"] = traceback.format_exc()[-1500:]
    
    return results


@app.get("/api/debug-claude")
async def debug_claude():
    """Debug: test Claude API call."""
    from .deps import get_claude_client
    client = get_claude_client()
    if not client:
        return {"error": "Claude client is None"}
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=50,
            messages=[{"role": "user", "content": "Say 'hello' in one word."}]
        )
        return {"status": "ok", "response": response.content[0].text}
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}


@app.get("/api/debug-env")
async def debug_env():
    """Debug: check if critical env vars are set."""
    import os
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    return {
        "anthropic_key_set": bool(anthropic_key),
        "anthropic_key_prefix": anthropic_key[:15] + "..." if anthropic_key else "NOT SET",
        "anthropic_key_len": len(anthropic_key),
        "database_url_set": bool(os.getenv("DATABASE_URL", "")),
        "jwt_secret_set": bool(os.getenv("JWT_SECRET", "")),
    }


@app.get("/api/build-id")
async def build_id():
    return {"build": "2026-02-24-v2-fix-recursion"}

@app.get("/api/git-version")
async def git_version():
    """Shows deployed git commit for debugging."""
    import subprocess
    try:
        sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True, timeout=5).strip()
        msg = subprocess.check_output(["git", "log", "-1", "--format=%s"], text=True, timeout=5).strip()
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
