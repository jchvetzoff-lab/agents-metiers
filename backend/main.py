"""
Backend FastAPI pour Agents Métiers Web.
App setup, CORS, and router registration.
"""
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
        "http://localhost:3000",
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
