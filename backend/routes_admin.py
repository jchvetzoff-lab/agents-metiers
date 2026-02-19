"""
Routes for audit logs, ROME sync, and veille.
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query

from .shared import repo
from .helpers import DEFAULT_AUDIT_LIMIT, MAX_AUDIT_LIMIT

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/audit-logs")
async def get_audit_logs(
    limit: int = Query(DEFAULT_AUDIT_LIMIT, ge=1, le=MAX_AUDIT_LIMIT),
    code_rome: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    type_evenement: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get audit logs with filters."""
    try:
        from database.models import TypeEvenement as TE
        te = None
        if type_evenement:
            try:
                te = TE(type_evenement)
            except ValueError:
                pass

        logs = repo.get_audit_logs(
            limit=limit, code_rome=code_rome, type_evenement=te,
            search=search, agent=agent, since=since,
        )

        return {
            "total": len(logs),
            "logs": [
                {
                    "id": log.id, "type_evenement": log.type_evenement.value,
                    "description": log.description, "code_rome": log.code_rome,
                    "agent": log.agent or "Système", "validateur": log.validateur,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in logs
            ]
        }
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/rome/sync")
async def rome_sync() -> Dict[str, Any]:
    return {"nouvelles": 0, "mises_a_jour": 0, "inchangees": 1585}


@router.post("/api/veille/rome")
async def veille_rome() -> Dict[str, Any]:
    return {"message": "Veille lancée", "fiches_verifiees": 0, "modifications_detectees": 0}


@router.get("/api/veille/rome/status")
async def veille_rome_status() -> Dict[str, Any]:
    return {"derniere_execution": None, "prochaine_execution": None, "fiches_a_verifier": 0}


@router.get("/api/veille/rome/changes")
async def veille_rome_changes() -> Dict[str, Any]:
    return {"total": 0, "changes": []}


@router.post("/api/veille/rome/changes/{change_id}/review")
async def veille_rome_review(change_id: str) -> Dict[str, Any]:
    return {"message": "OK"}
