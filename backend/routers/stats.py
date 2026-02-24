"""
Stats and audit-logs endpoints.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from ..deps import repo
from database.models import StatutFiche

router = APIRouter(prefix="/api", tags=["stats"])


class StatsResponse(BaseModel):
    total: int
    brouillons: int
    enrichis: int
    valides: int
    publiees: int


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Récupère les statistiques globales (1 seule requête GROUP BY)."""
    try:
        counts = repo.count_fiches_by_statut()
        return StatsResponse(
            total=sum(counts.values()),
            brouillons=counts.get("brouillon", 0),
            enrichis=counts.get("enrichi", 0),
            valides=counts.get("valide", 0) + counts.get("en_validation", 0),
            publiees=counts.get("publiee", 0) + counts.get("archivee", 0),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")


@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(15, ge=1, le=200),
    search: Optional[str] = Query(None),
    type_evenement: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
):
    """Récupère les logs d'audit avec filtres."""
    try:
        from database.models import TypeEvenement as TE
        te = None
        if type_evenement:
            try:
                te = TE(type_evenement)
            except ValueError:
                pass
        logs = repo.get_audit_logs(
            limit=limit,
            type_evenement=te,
            search=search,
            agent=agent,
            since=since,
        )
        return {
            "total": len(logs),
            "logs": [
                {
                    "id": log.id,
                    "type_evenement": log.type_evenement.value if hasattr(log.type_evenement, 'value') else str(log.type_evenement),
                    "description": log.description,
                    "code_rome": log.code_rome,
                    "agent": log.agent,
                    "validateur": log.validateur,
                    "timestamp": log.timestamp,
                }
                for log in logs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur interne. Veuillez réessayer.")
