"""
Backend FastAPI pour Agents Métiers Web.
Expose une API REST pour accéder à la base de données SQLite et aux agents IA.
"""

import logging
import sys
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect

from .shared import repo
from .helpers import create_db_session_context

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ajouter le chemin vers le projet agents-metiers existant
AGENTS_METIERS_PATH = Path(__file__).parent.parent.parent / "agents-metiers"
sys.path.insert(0, str(AGENTS_METIERS_PATH))


# ==================== DATABASE MIGRATION ====================

def run_database_migration() -> None:
    """Add validation columns if they don't exist."""
    try:
        with create_db_session_context() as session:
            inspector = inspect(repo.engine)
            existing_columns = [c["name"] for c in inspector.get_columns("fiches_metiers")]

            new_columns = {
                "validation_ia_score": "INTEGER",
                "validation_ia_date": "TIMESTAMP",
                "validation_ia_details": "TEXT",
                "validation_humaine": "VARCHAR(20)",
                "validation_humaine_date": "TIMESTAMP",
                "validation_humaine_par": "VARCHAR(100)",
                "validation_humaine_commentaire": "TEXT",
                "missions_principales": "JSON",
                "acces_metier": "TEXT",
                "savoirs": "JSON",
                "types_contrats": "JSON",
                "mobilite": "JSON",
                "traits_personnalite": "JSON",
                "aptitudes": "JSON",
                "profil_riasec": "JSON",
                "autres_appellations": "JSON",
                "statuts_professionnels": "JSON",
                "niveau_formation": "VARCHAR(255)",
                "domaine_professionnel": "JSON",
                "sites_utiles": "JSON",
                "conditions_travail_detaillees": "JSON",
                "competences_dimensions": "JSON",
                "preferences_interets": "JSON",
                "last_enrichment_diff": "JSON",
            }

            for column_name, column_type in new_columns.items():
                if column_name not in existing_columns:
                    try:
                        session.execute(text(f'ALTER TABLE fiches_metiers ADD COLUMN {column_name} {column_type}'))
                    except Exception as e:
                        logger.info(f"Migration skip {column_name}: {e}")
    except Exception as e:
        logger.warning(f"Migration error (non-fatal): {e}")


# Run migration on startup
try:
    run_database_migration()
except Exception as e:
    logger.error(f"Migration error (non-fatal): {e}")


# ==================== APP SETUP ====================

app = FastAPI(
    title="Agents Métiers API",
    description="API REST pour la gestion des fiches métiers avec IA",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing module routers
from . import auth, validation, enrichment, regions
from .api_public import public_api_router

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(validation.router, prefix="/api", tags=["validation"])
app.include_router(enrichment.router, prefix="/api", tags=["enrichment"])
app.include_router(regions.router, prefix="/api", tags=["regions"])
app.include_router(public_api_router)

# Include refactored route modules
from .routes_fiches import router as fiches_router
from .routes_stats import router as stats_router
from .routes_admin import router as admin_router

app.include_router(fiches_router, tags=["fiches"])
app.include_router(stats_router, tags=["stats"])
app.include_router(admin_router, tags=["admin"])


# ==================== HEALTH ====================

@app.get("/")
async def root() -> Dict[str, Any]:
    """API root endpoint."""
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


# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
