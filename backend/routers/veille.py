"""
Veille ROME endpoints: sync, changes, status, trigger.
"""
import logging
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional

from ..deps import repo, config
from ..auth_middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["veille"])


# ==================== ROME SYNC ====================

@router.post("/api/rome/sync")
async def sync_rome(user: dict = Depends(get_current_user)):
    """Synchronise les fiches depuis le référentiel ROME."""
    try:
        from sources.france_travail_rome import FranceTravailRomeClient
        client = FranceTravailRomeClient()
        result = await client.sync_all(repo)
        return {
            "message": "Synchronisation terminée",
            "nouvelles": result.get("nouvelles", 0),
            "mises_a_jour": result.get("mises_a_jour", 0),
            "inchangees": result.get("inchangees", 0),
        }
    except ImportError:
        raise HTTPException(status_code=501, detail="Module de sync ROME non disponible")
    except Exception as e:
        logger.error(f"Erreur sync ROME: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


# ==================== VEILLE ROME ====================

@router.post("/api/veille/rome")
async def trigger_rome_veille(user: dict = Depends(get_current_user)):
    """Déclenche une veille ROME (détection de changements)."""
    try:
        from sources.france_travail_rome import FranceTravailRomeClient
        client = FranceTravailRomeClient()
        result = await client.detect_changes(repo)
        return {
            "total_api": result.get("total_api", 0),
            "nouvelles": result.get("nouvelles", 0),
            "modifiees": result.get("modifiees", 0),
            "supprimees": result.get("supprimees", 0),
            "inchangees": result.get("inchangees", 0),
            "erreurs": result.get("erreurs", 0),
        }
    except ImportError:
        raise HTTPException(status_code=501, detail="Module de veille ROME non disponible")
    except Exception as e:
        logger.error(f"Erreur veille ROME: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.get("/api/veille/rome/changes")
async def get_rome_changes(reviewed: Optional[bool] = Query(None), user: dict = Depends(get_current_user)):
    """Récupère les changements ROME détectés (auth required)."""
    try:
        # Try to use repo method if available, otherwise return empty
        if hasattr(repo, 'get_rome_changes'):
            changes = repo.get_rome_changes(reviewed=reviewed)
        else:
            changes = []

        return {
            "total": len(changes),
            "changes": changes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.post("/api/veille/rome/changes/{change_id}/review")
async def review_rome_change(change_id: int, body: dict, user: dict = Depends(get_current_user)):
    """Review un changement ROME (acknowledge ou re-enrich)."""
    try:
        action = body.get("action", "acknowledge")
        if hasattr(repo, 'review_rome_change'):
            result = repo.review_rome_change(change_id, action)
        else:
            result = {"change_id": change_id, "action": action}

        return {
            "message": f"Changement {change_id} traité",
            "change_id": change_id,
            "code_rome": result.get("code_rome", ""),
            "action": action
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.get("/api/veille/rome/status")
async def get_rome_veille_status(user: dict = Depends(get_current_user)):
    """Statut de la veille ROME (auth required)."""
    try:
        if hasattr(repo, 'get_veille_status'):
            status = repo.get_veille_status()
            return status

        # Fallback
        derniere = repo.get_derniere_veille("rome") if hasattr(repo, 'get_derniere_veille') else None
        return {
            "derniere_execution": derniere.timestamp.isoformat() if derniere else None,
            "derniere_succes": derniere.succes if derniere else None,
            "derniere_details": None,
            "fiches_pending": 0,
            "changements_non_revues": 0,
            "prochaine_execution": "Non planifiée"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")
