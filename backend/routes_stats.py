"""
Routes for statistics, dashboard, and export.
"""

import csv
import io
import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import text

from database.models import StatutFiche

from .shared import repo
from .helpers import create_db_session_context
from .models import StatsResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/stats", response_model=StatsResponse)
async def get_stats() -> StatsResponse:
    """Get global statistics."""
    try:
        return StatsResponse(
            total=repo.count_fiches(),
            brouillons=repo.count_fiches(StatutFiche.BROUILLON),
            enrichis=repo.count_fiches(StatutFiche.ENRICHI),
            valides=repo.count_fiches(StatutFiche.VALIDE),
            publiees=repo.count_fiches(StatutFiche.PUBLIEE),
        )
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/dashboard/enrichment")
async def get_enrichment_dashboard() -> Dict[str, Any]:
    """Enrichment analytics dashboard data."""
    try:
        from .validation import calculate_completude_score

        status_counts = {
            "total": repo.count_fiches(),
            "brouillons": repo.count_fiches(StatutFiche.BROUILLON),
            "enrichis": repo.count_fiches(StatutFiche.ENRICHI),
            "valides": repo.count_fiches(StatutFiche.VALIDE),
            "publiees": repo.count_fiches(StatutFiche.PUBLIEE),
        }

        enrichment_history = []
        try:
            with create_db_session_context() as session:
                rows = session.execute(
                    text("""SELECT DATE(timestamp) as day, COUNT(*) as cnt
                            FROM audit_logs
                            WHERE type_evenement = 'enrichissement'
                            GROUP BY DATE(timestamp)
                            ORDER BY day DESC
                            LIMIT 30""")
                ).fetchall()
                for row in rows:
                    enrichment_history.append({"date": str(row[0]), "count_enriched": row[1]})
        except Exception as e:
            logger.warning(f"Error fetching enrichment history: {e}")

        score_distribution = [
            {"bucket": "0-20", "count": 0}, {"bucket": "20-40", "count": 0},
            {"bucket": "40-60", "count": 0}, {"bucket": "60-80", "count": 0},
            {"bucket": "80-100", "count": 0},
        ]
        try:
            with create_db_session_context() as session:
                rows = session.execute(
                    text("SELECT validation_ia_score FROM fiches_metiers WHERE validation_ia_score IS NOT NULL")
                ).fetchall()
                for row in rows:
                    sc = row[0]
                    idx = min(sc // 20, 4)
                    score_distribution[idx]["count"] += 1
        except Exception as e:
            logger.warning(f"Error fetching score distribution: {e}")

        field_weakness = {}
        try:
            all_fiches = repo.get_all_fiches()
            for f in all_fiches[:200]:
                score_data = calculate_completude_score(f)
                for field_name, detail in score_data.get("details", {}).items():
                    if field_name not in field_weakness:
                        field_weakness[field_name] = {"total_deficit": 0, "count": 0}
                    deficit = detail["max"] - detail["score"]
                    if deficit > 0:
                        field_weakness[field_name]["total_deficit"] += deficit
                        field_weakness[field_name]["count"] += 1
        except Exception as e:
            logger.warning(f"Error computing weak fields: {e}")

        top_weak_fields = sorted(
            [{"field": k, "avg_deficit": round(v["total_deficit"] / max(v["count"], 1), 1), "count_weak": v["count"]}
             for k, v in field_weakness.items() if v["count"] > 0],
            key=lambda x: x["avg_deficit"], reverse=True
        )[:10]

        return {
            "status_counts": status_counts,
            "enrichment_history": enrichment_history,
            "score_distribution": score_distribution,
            "top_weak_fields": top_weak_fields,
        }
    except Exception as e:
        logger.error(f"Error getting enrichment dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/export/csv")
async def export_csv():
    """Export all published fiches as CSV."""
    from .validation import calculate_completude_score

    try:
        fiches = repo.get_all_fiches(statut=StatutFiche.PUBLIEE)
        output = io.StringIO()
        writer = csv.writer(output, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["code_rome", "nom", "description", "competences", "formations",
                        "salaire_junior", "salaire_confirme", "salaire_senior", "score"])

        for fiche in fiches:
            competences = ";".join([
                c if isinstance(c, str) else (c.get("nom", "") if isinstance(c, dict) else str(c))
                for c in (fiche.competences or [])
            ])
            formations = ";".join([
                f if isinstance(f, str) else (f.get("nom", "") if isinstance(f, dict) else str(f))
                for f in (fiche.formations or [])
            ])
            sal = fiche.salaires
            sal_j = sal.junior.median if sal and hasattr(sal, 'junior') and sal.junior else ""
            sal_c = sal.confirme.median if sal and hasattr(sal, 'confirme') and sal.confirme else ""
            sal_s = sal.senior.median if sal and hasattr(sal, 'senior') and sal.senior else ""
            score = calculate_completude_score(fiche)["score"]
            writer.writerow([fiche.code_rome, fiche.nom_epicene, fiche.description or "",
                           competences, formations, sal_j, sal_c, sal_s, score])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]), media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=fiches_metiers_publiees.csv"}
        )
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/export/json")
async def export_json():
    """Export all published fiches as JSON."""
    from .validation import calculate_completude_score

    try:
        fiches = repo.get_all_fiches(statut=StatutFiche.PUBLIEE)
        result = []
        for fiche in fiches:
            score = calculate_completude_score(fiche)["score"]
            result.append({
                "code_rome": fiche.code_rome,
                "nom_masculin": fiche.nom_masculin,
                "nom_feminin": fiche.nom_feminin,
                "nom_epicene": fiche.nom_epicene,
                "description": fiche.description,
                "description_courte": fiche.description_courte,
                "competences": fiche.competences,
                "competences_transversales": fiche.competences_transversales,
                "formations": fiche.formations,
                "certifications": fiche.certifications,
                "conditions_travail": fiche.conditions_travail,
                "environnements": fiche.environnements,
                "salaires": fiche.salaires.model_dump() if fiche.salaires else None,
                "perspectives": fiche.perspectives.model_dump() if fiche.perspectives else None,
                "secteurs_activite": fiche.secteurs_activite,
                "missions_principales": fiche.missions_principales,
                "acces_metier": fiche.acces_metier,
                "savoirs": fiche.savoirs,
                "score_completude": score,
            })

        return JSONResponse(
            content=result,
            headers={"Content-Disposition": "attachment; filename=fiches_metiers_publiees.json"}
        )
    except Exception as e:
        logger.error(f"Error exporting JSON: {e}")
        raise HTTPException(status_code=500, detail=str(e))
