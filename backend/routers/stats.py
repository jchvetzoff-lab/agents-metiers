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
    en_validation: int
    publiees: int
    archivees: int


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Récupère les statistiques globales."""
    try:
        return StatsResponse(
            total=repo.count_fiches(),
            brouillons=repo.count_fiches(StatutFiche.BROUILLON),
            enrichis=repo.count_fiches(StatutFiche.ENRICHI),
            valides=repo.count_fiches(StatutFiche.VALIDE),
            en_validation=repo.count_fiches(StatutFiche.EN_VALIDATION),
            publiees=repo.count_fiches(StatutFiche.PUBLIEE),
            archivees=repo.count_fiches(StatutFiche.ARCHIVEE),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))
