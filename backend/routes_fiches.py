"""
Routes for fiches métiers CRUD, variantes, and publication.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

import anthropic
from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from database.models import StatutFiche, FicheMetier, MetadataFiche

from .shared import repo
from .helpers import (
    _json_serial, get_current_timestamp, get_user_name_from_request,
    get_anthropic_api_key, create_db_session_context, add_audit_log,
    search_fiches_fuzzy, search_fiches_competences, resolve_mobilite_codes,
    DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT,
)
from .models import FicheMetierCreate, FicheMetierUpdate, PublishBatchRequest, VariantesGenerateRequest

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/fiches")
async def get_fiches(
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    search: Optional[str] = Query(None, description="Recherche textuelle fuzzy"),
    search_competences: Optional[str] = Query(None, description="Recherche par compétences"),
    sort_by: Optional[str] = Query(None, description="Tri: score, date_maj, nom"),
    sort_order: Optional[str] = Query("desc", description="Ordre: asc ou desc"),
    limit: int = Query(DEFAULT_PAGINATION_LIMIT, ge=1, le=MAX_PAGINATION_LIMIT),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """List fiches métiers with filters, fuzzy search and competences search."""
    try:
        statut_enum = None
        if statut:
            try:
                statut_enum = StatutFiche(statut.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Statut invalide: {statut}")

        fiches = repo.get_all_fiches(statut=statut_enum)

        if search:
            fiches = search_fiches_fuzzy(fiches, search)
        if search_competences:
            fiches = search_fiches_competences(fiches, search_competences)

        if sort_by == "score":
            from .validation import calculate_completude_score
            fiches_scored = [(f, calculate_completude_score(f)["score"]) for f in fiches]
            fiches_scored.sort(key=lambda x: x[1], reverse=(sort_order != "asc"))
            fiches = [f for f, _ in fiches_scored]
        elif sort_by == "date_maj":
            fiches.sort(key=lambda f: f.metadata.date_maj or datetime.min, reverse=(sort_order != "asc"))
        elif sort_by == "nom":
            fiches.sort(key=lambda f: (f.nom_epicene or f.nom_masculin or "").lower(), reverse=(sort_order == "desc"))

        total = len(fiches)
        fiches_page = fiches[offset:offset + limit]

        results = []
        for fiche in fiches_page:
            nb_variantes = repo.count_variantes(fiche.code_rome)
            from .validation import calculate_completude_score
            score_data = calculate_completude_score(fiche)
            results.append({
                "code_rome": fiche.code_rome,
                "nom_masculin": fiche.nom_masculin,
                "nom_feminin": fiche.nom_feminin,
                "nom_epicene": fiche.nom_epicene,
                "statut": fiche.metadata.statut.value,
                "description": fiche.description,
                "description_courte": fiche.description_courte,
                "date_creation": fiche.metadata.date_creation,
                "date_maj": fiche.metadata.date_maj,
                "version": fiche.metadata.version,
                "has_competences": bool(fiche.competences or fiche.competences_transversales),
                "has_formations": bool(fiche.formations),
                "has_salaires": bool(fiche.salaires),
                "has_perspectives": bool(fiche.perspectives),
                "nb_variantes": nb_variantes,
                "score_completude": score_data["score"],
            })

        return {"total": total, "limit": limit, "offset": offset, "results": results}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fiches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/fiches", status_code=201)
async def create_fiche(fiche_data: FicheMetierCreate) -> Dict[str, Any]:
    """Create new fiche métier."""
    try:
        # Auto-generate code for custom fiches (not in official ROME)
        if not fiche_data.code_rome or not fiche_data.code_rome.strip():
            import time
            fiche_data.code_rome = f"CUSTOM-{int(time.time() * 1000) % 100000:05d}"
        fiche_data.code_rome = fiche_data.code_rome.strip()
        existing = repo.get_fiche(fiche_data.code_rome)
        if existing:
            raise HTTPException(status_code=400, detail=f"La fiche {fiche_data.code_rome} existe déjà")

        nouvelle_fiche = FicheMetier(
            id=fiche_data.code_rome,
            code_rome=fiche_data.code_rome,
            nom_masculin=fiche_data.nom_masculin,
            nom_feminin=fiche_data.nom_feminin,
            nom_epicene=fiche_data.nom_epicene,
            description=fiche_data.definition or fiche_data.description or "",
            metadata=MetadataFiche(statut=StatutFiche.BROUILLON, version=1)
        )
        fiche_creee = repo.create_fiche(nouvelle_fiche)
        return {
            "message": "Fiche créée avec succès",
            "code_rome": fiche_creee.code_rome,
            "nom_masculin": fiche_creee.nom_masculin,
            "statut": fiche_creee.metadata.statut.value
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating fiche: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


@router.get("/api/fiches/{code_rome}")
async def get_fiche_detail(code_rome: str) -> Dict[str, Any]:
    """Get complete detail of a fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        from .validation import calculate_completude_score
        score_data = calculate_completude_score(fiche)

        validation_info = {}
        try:
            with create_db_session_context() as session:
                row = session.execute(
                    text("SELECT validation_ia_score, validation_ia_date, validation_ia_details, "
                         "validation_humaine, validation_humaine_date, validation_humaine_par, "
                         "validation_humaine_commentaire FROM fiches_metiers WHERE code_rome = :cr"),
                    {"cr": code_rome}
                ).fetchone()
                if row:
                    validation_info = {
                        "validation_ia_score": row[0],
                        "validation_ia_date": row[1],
                        "validation_ia_details": json.loads(row[2]) if row[2] else None,
                        "validation_humaine": row[3],
                        "validation_humaine_date": row[4],
                        "validation_humaine_par": row[5],
                        "validation_humaine_commentaire": row[6],
                    }
        except Exception as e:
            logger.warning(f"Error fetching validation data for {code_rome}: {e}")

        return {
            "code_rome": fiche.code_rome,
            "nom_masculin": fiche.nom_masculin,
            "nom_feminin": fiche.nom_feminin,
            "nom_epicene": fiche.nom_epicene,
            "statut": fiche.metadata.statut.value,
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
            "metiers_proches": fiche.metiers_proches or [],
            "secteurs_activite": fiche.secteurs_activite or [],
            "missions_principales": fiche.missions_principales or [],
            "acces_metier": fiche.acces_metier,
            "savoirs": fiche.savoirs or [],
            "types_contrats": fiche.types_contrats,
            "mobilite": resolve_mobilite_codes(repo, fiche.mobilite),
            "traits_personnalite": fiche.traits_personnalite or [],
            "aptitudes": fiche.aptitudes or [],
            "profil_riasec": fiche.profil_riasec,
            "autres_appellations": fiche.autres_appellations or [],
            "statuts_professionnels": fiche.statuts_professionnels or [],
            "niveau_formation": fiche.niveau_formation,
            "domaine_professionnel": fiche.domaine_professionnel,
            "sites_utiles": fiche.sites_utiles or [],
            "conditions_travail_detaillees": fiche.conditions_travail_detaillees,
            "competences_dimensions": fiche.competences_dimensions,
            "preferences_interets": fiche.preferences_interets,
            "date_creation": fiche.metadata.date_creation,
            "date_maj": fiche.metadata.date_maj,
            "version": fiche.metadata.version,
            "nb_variantes": repo.count_variantes(code_rome),
            "score_completude": score_data["score"],
            "score_details": score_data["details"],
            **validation_info,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fiche detail {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/fiches/{code_rome}")
async def update_fiche(code_rome: str, update_data: FicheMetierUpdate) -> Dict[str, Any]:
    """Update existing fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        fiche_dict = fiche.model_dump()
        update_dict = update_data.model_dump(exclude_none=True)
        for key, value in update_dict.items():
            if key == "statut":
                fiche_dict["metadata"]["statut"] = value
            elif key == "salaires" and value:
                fiche_dict["salaires"] = value
            elif key == "perspectives" and value:
                fiche_dict["perspectives"] = value
            else:
                fiche_dict[key] = value

        fiche_dict["metadata"]["date_maj"] = get_current_timestamp()
        fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

        updated_fiche = FicheMetier(**fiche_dict)
        repo.update_fiche(updated_fiche)
        return {"message": "Fiche mise à jour", "code_rome": code_rome, "version": updated_fiche.metadata.version}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour: {str(e)}")


@router.delete("/api/fiches/{code_rome}")
async def delete_fiche(code_rome: str, request: Request) -> Dict[str, Any]:
    """Delete fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")
        with create_db_session_context() as session:
            session.execute(text("DELETE FROM variantes_fiches WHERE code_rome = :cr"), {"cr": code_rome})
            session.execute(text("DELETE FROM fiches_metiers WHERE code_rome = :cr"), {"cr": code_rome})
        user = get_user_name_from_request(request)
        add_audit_log("suppression", code_rome, user, f"Suppression de {fiche.nom_epicene} par {user}")
        return {"message": "Fiche supprimée", "code_rome": code_rome}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VARIANTES ====================

@router.get("/api/fiches/{code_rome}/variantes")
async def get_variantes(code_rome: str) -> Dict[str, Any]:
    """Get all variantes for a fiche."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")
        variantes = repo.get_all_variantes(code_rome)
        return {
            "code_rome": code_rome,
            "total_variantes": len(variantes),
            "variantes": [
                {
                    "id": v.id, "langue": v.langue.value, "tranche_age": v.tranche_age.value,
                    "format_contenu": v.format_contenu.value, "genre": v.genre.value,
                    "nom": v.nom, "description_courte": v.description_courte, "date_maj": v.date_maj
                }
                for v in variantes
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting variantes for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/fiches/{code_rome}/variantes/{variante_id}")
async def get_variante_detail(code_rome: str, variante_id: int) -> Dict[str, Any]:
    """Get detail of specific variante."""
    try:
        variantes = repo.get_all_variantes(code_rome)
        variante = next((v for v in variantes if v.id == variante_id), None)
        if not variante:
            raise HTTPException(status_code=404, detail=f"Variante {variante_id} non trouvée")
        return {
            "id": variante.id, "code_rome": variante.code_rome,
            "langue": variante.langue.value, "tranche_age": variante.tranche_age.value,
            "format_contenu": variante.format_contenu.value, "genre": variante.genre.value,
            "nom": variante.nom, "description": variante.description,
            "description_courte": variante.description_courte,
            "competences": variante.competences,
            "competences_transversales": variante.competences_transversales,
            "formations": variante.formations, "certifications": variante.certifications,
            "conditions_travail": variante.conditions_travail,
            "environnements": variante.environnements,
            "date_creation": variante.date_creation, "date_maj": variante.date_maj,
            "version": variante.version
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting variante detail {code_rome}/{variante_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/fiches/{code_rome}/variantes/generate")
async def generate_variantes(code_rome: str, body: VariantesGenerateRequest, request: Request) -> Dict[str, Any]:
    """Generate variantes via Claude and store in DB."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        langues = body.langues or ["fr"]
        genres = body.genres or ["epicene"]
        tranches_age = body.tranches_age or ["adulte"]
        formats = body.formats or ["standard"]

        combinations = []
        for langue in langues:
            for genre in genres:
                for age in tranches_age:
                    for fmt in formats:
                        if not (langue == "fr" and genre == "epicene" and age == "adulte" and fmt == "standard"):
                            combinations.append({"langue": langue, "genre": genre, "tranche_age": age, "format": fmt})

        if not combinations:
            return {"variantes_generees": 0, "message": "Aucune combinaison de variantes à générer"}

        api_key = get_anthropic_api_key()
        if not api_key:
            raise HTTPException(status_code=500, detail="Clé API Anthropic non configurée")

        client = anthropic.Anthropic(api_key=api_key)
        count = 0

        for combo in combinations:
            prompt = f"""Adapte cette fiche métier selon les paramètres suivants:
- Langue: {combo['langue']}
- Genre: {combo['genre']}
- Tranche d'âge: {combo['tranche_age']}
- Format: {combo['format']}

Fiche source:
Nom: {fiche.nom_epicene}
Description: {fiche.description or 'N/A'}
Compétences: {json.dumps(fiche.competences or [], ensure_ascii=False, default=_json_serial)}

Retourne un JSON:
{{
  "nom": "Nom adapté",
  "description": "Description adaptée",
  "description_courte": "Description courte adaptée",
  "competences": ["compétences adaptées"],
  "formations": ["formations adaptées"]
}}"""

            try:
                message = client.messages.create(
                    model="claude-sonnet-4-20250514", max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                response_text = message.content[0].text.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                response_text = response_text.strip()
                variante_data = json.loads(response_text)

                with create_db_session_context() as session:
                    session.execute(
                        text("""INSERT INTO variantes_fiches
                            (code_rome, langue, genre, tranche_age, format_contenu,
                             nom, description, description_courte, competences, formations,
                             date_creation, date_maj, version)
                            VALUES (:cr, :l, :g, :a, :f, :nom, :desc, :dc, :comp, :form, :now, :now, 1)"""),
                        {
                            "cr": code_rome, "l": combo["langue"], "g": combo["genre"],
                            "a": combo["tranche_age"], "f": combo["format"],
                            "nom": variante_data.get("nom", fiche.nom_epicene),
                            "desc": variante_data.get("description", ""),
                            "dc": variante_data.get("description_courte", ""),
                            "comp": json.dumps(variante_data.get("competences", []), ensure_ascii=False, default=_json_serial),
                            "form": json.dumps(variante_data.get("formations", []), ensure_ascii=False, default=_json_serial),
                            "now": get_current_timestamp(),
                        }
                    )
                count += 1
            except Exception as e:
                logger.warning(f"Error generating variante {combo}: {e}")
                continue

        user = get_user_name_from_request(request)
        add_audit_log("generation_variantes", code_rome, user, f"Génération de {count} variante(s) pour {fiche.nom_epicene}")
        return {"variantes_generees": count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating variantes for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PUBLICATION ====================

@router.post("/api/fiches/{code_rome}/publish")
async def publish_fiche(code_rome: str, request: Request) -> Dict[str, Any]:
    """Publication: requires IA validation >= 70 AND approved human validation."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        from .validation import VALIDATION_IA_MIN_SCORE_PASS

        with create_db_session_context() as session:
            row = session.execute(
                text("SELECT validation_ia_score, validation_humaine FROM fiches_metiers WHERE code_rome = :cr"),
                {"cr": code_rome}
            ).fetchone()
            ia_score = row[0] if row else None
            humaine = row[1] if row else None

            if not ia_score or ia_score < VALIDATION_IA_MIN_SCORE_PASS:
                raise HTTPException(status_code=400, detail=f"Validation IA insuffisante ({ia_score or 'non faite'}). Score minimum requis : {VALIDATION_IA_MIN_SCORE_PASS}.")
            if humaine != "approuvee":
                raise HTTPException(status_code=400, detail=f"Validation humaine requise (actuel : {humaine or 'non faite'}).")

            session.execute(text("UPDATE fiches_metiers SET statut = 'publiee' WHERE code_rome = :cr"), {"cr": code_rome})

        user = get_user_name_from_request(request)
        add_audit_log("publication", code_rome, user, f"Publication de {fiche.nom_epicene} par {user}")
        return {"message": "Fiche publiée", "code_rome": code_rome}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/fiches/publish-batch")
async def publish_batch(body: PublishBatchRequest, request: Request) -> Dict[str, Any]:
    """Batch publication of multiple fiches."""
    from .validation import VALIDATION_IA_MIN_SCORE_PASS

    results = []
    user = get_user_name_from_request(request)

    for code_rome in body.codes_rome:
        try:
            fiche = repo.get_fiche(code_rome)
            if not fiche:
                results.append({"code_rome": code_rome, "status": "error", "message": "Fiche non trouvée"})
                continue
            with create_db_session_context() as session:
                row = session.execute(
                    text("SELECT validation_ia_score, validation_humaine FROM fiches_metiers WHERE code_rome = :cr"),
                    {"cr": code_rome}
                ).fetchone()
                ia_score = row[0] if row else None
                humaine = row[1] if row else None
                if not ia_score or ia_score < VALIDATION_IA_MIN_SCORE_PASS:
                    results.append({"code_rome": code_rome, "status": "error", "message": f"Validation IA insuffisante ({ia_score or 'non faite'})"})
                    continue
                if humaine != "approuvee":
                    results.append({"code_rome": code_rome, "status": "error", "message": f"Validation humaine requise ({humaine or 'non faite'})"})
                    continue
                session.execute(text("UPDATE fiches_metiers SET statut = 'publiee' WHERE code_rome = :cr"), {"cr": code_rome})
            add_audit_log("publication", code_rome, user, f"Publication batch de {fiche.nom_epicene} par {user}")
            results.append({"code_rome": code_rome, "status": "success", "message": "Publiée"})
        except Exception as e:
            results.append({"code_rome": code_rome, "status": "error", "message": str(e)})

    return {"results": results}
