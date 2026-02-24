"""
IA action endpoints: enrich, validate, review, auto-correct, publish, variantes/generate.
"""
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..deps import repo, get_claude_client
from ..auth_middleware import get_current_user
from ..rate_limiter import rate_limiter
from database.models import StatutFiche, FicheMetier, TypeEvenement

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fiches", tags=["actions"])


class ReviewRequest(BaseModel):
    decision: str  # "approve" | "reject" | "request_changes"
    commentaire: Optional[str] = None


class AutoCorrectRequest(BaseModel):
    problemes: List[str]
    suggestions: List[str]


class VariantesGenerateRequest(BaseModel):
    genres: Optional[List[str]] = None
    tranches_age: Optional[List[str]] = None
    formats: Optional[List[str]] = None
    langues: Optional[List[str]] = None


class PublishBatchRequest(BaseModel):
    codes_rome: List[str]


class EnrichRequest(BaseModel):
    instructions: Optional[str] = None


# ==================== ENRICH ====================

@router.post("/{code_rome}/enrich")
async def enrich_fiche(code_rome: str, req: Optional[EnrichRequest] = None, user: dict = Depends(get_current_user)):
    """Enrichit une fiche via Claude API."""
    rate_limiter.check(f"enrich:{code_rome}", max_requests=10)

    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Extraire les instructions optionnelles
        instructions = req.instructions if req else None

        claude_client = get_claude_client()
        from agents.redacteur_fiche import AgentRedacteurFiche
        agent = AgentRedacteurFiche(repository=repo, claude_client=claude_client)
        fiche_enrichie = await agent.enrichir_fiche(fiche, instructions=instructions)
        repo.update_fiche(fiche_enrichie)

        return {
            "message": "Fiche enrichie avec succès",
            "code_rome": code_rome,
            "nom": fiche_enrichie.nom_masculin,
            "version": fiche_enrichie.metadata.version,
            "instructions_utilisees": instructions is not None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur enrichissement {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VALIDATE ====================

@router.post("/{code_rome}/validate")
async def validate_fiche(code_rome: str, user: dict = Depends(get_current_user)):
    """Valide une fiche via Claude API (scoring qualité)."""
    rate_limiter.check(f"validate:{code_rome}", max_requests=20)

    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        claude_client = get_claude_client()

        # Utiliser le nouvel agent validateur
        from agents.validateur_fiche import AgentValidateurFiche
        agent = AgentValidateurFiche(repository=repo, claude_client=claude_client)
        rapport = await agent.valider_fiche(fiche)

        # Mettre à jour la fiche avec les résultats de validation
        fiche_dict = fiche.model_dump()
        fiche_dict["validation_ia_score"] = rapport["score"]
        fiche_dict["validation_ia_date"] = datetime.now()
        fiche_dict["validation_ia_details"] = rapport

        # Changer le statut selon le score
        if rapport["score"] >= 70:
            fiche_dict["metadata"]["statut"] = StatutFiche.EN_VALIDATION.value
        elif rapport["score"] < 50:
            fiche_dict["metadata"]["statut"] = StatutFiche.BROUILLON.value
        # Score entre 50-69 : garder le statut actuel

        fiche_dict["metadata"]["date_maj"] = datetime.now()
        updated_fiche = FicheMetier(**fiche_dict)
        repo.update_fiche(updated_fiche)

        # Log audit de la validation
        try:
            from database.models import TypeEvenement, AuditLog
            audit = AuditLog(
                type_evenement=TypeEvenement.VALIDATION,
                code_rome=code_rome,
                agent="AgentValidateurFiche",
                description=f"Validation IA terminée - Score: {rapport['score']}/100, Verdict: {rapport['verdict']}",
            )
            repo.add_audit_log(audit)
        except Exception as e:
            logger.warning(f"Audit log failed: {e}")

        return {
            "message": "Validation terminée",
            "code_rome": code_rome,
            "nom": fiche.nom_masculin,
            "nouveau_statut": updated_fiche.metadata.statut.value,
            "rapport": rapport
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== REVIEW ====================

@router.post("/{code_rome}/review")
async def review_fiche(code_rome: str, req: ReviewRequest, user: dict = Depends(get_current_user)):
    """Revue manuelle d'une fiche (approve/reject)."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        fiche_dict = fiche.model_dump()

        if req.decision == "approve":
            fiche_dict["metadata"]["statut"] = StatutFiche.PUBLIEE.value
        elif req.decision == "reject":
            fiche_dict["metadata"]["statut"] = StatutFiche.BROUILLON.value
        elif req.decision == "request_changes":
            fiche_dict["metadata"]["statut"] = StatutFiche.EN_VALIDATION.value
        else:
            raise HTTPException(status_code=400, detail=f"Décision invalide: {req.decision}")

        fiche_dict["metadata"]["date_maj"] = datetime.now()
        updated = FicheMetier(**fiche_dict)
        repo.update_fiche(updated)

        return {
            "message": f"Fiche {req.decision}",
            "code_rome": code_rome,
            "decision": req.decision,
            "commentaire": req.commentaire,
            "nouveau_statut": updated.metadata.statut.value
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AUTO-CORRECT ====================

@router.post("/{code_rome}/auto-correct")
async def auto_correct_fiche(code_rome: str, req: AutoCorrectRequest, user: dict = Depends(get_current_user)):
    """Auto-correction d'une fiche via Claude API."""
    rate_limiter.check(f"auto-correct:{code_rome}", max_requests=10)

    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        claude_client = get_claude_client()
        if not claude_client:
            raise HTTPException(status_code=503, detail="Claude API non disponible")

        from config import get_config
        config = get_config()

        prompt = f"""Corrige la fiche métier suivante en tenant compte des problèmes et suggestions.

Fiche: {fiche.nom_masculin} ({code_rome})
Description actuelle: {fiche.description}
Compétences: {fiche.competences}

Problèmes identifiés:
{chr(10).join(f"- {p}" for p in req.problemes)}

Suggestions:
{chr(10).join(f"- {s}" for s in req.suggestions)}

Retourne un JSON avec les champs corrigés: description, competences, formations (listes de strings)."""

        # Streaming + retry (cohérent avec les autres agents)
        import asyncio
        max_retries = 3
        response = None
        for attempt in range(max_retries + 1):
            try:
                async with claude_client.messages.stream(
                    model=config.api.claude_model,
                    max_tokens=4096,
                    messages=[{"role": "user", "content": prompt}]
                ) as stream:
                    response = await stream.get_final_message()
                break
            except Exception as api_err:
                err_str = str(api_err)
                if ("529" in err_str or "overloaded" in err_str.lower()) and attempt < max_retries:
                    wait = 10 * (attempt + 1)
                    logger.warning(f"Claude overloaded (auto-correct), retry {attempt+1}/{max_retries} in {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                raise

        import json, re
        content = response.content[0].text.strip()
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            corrections = json.loads(json_match.group())
            fiche_dict = fiche.model_dump()
            for key in ("description", "competences", "formations", "competences_transversales"):
                if key in corrections:
                    fiche_dict[key] = corrections[key]
            fiche_dict["metadata"]["date_maj"] = datetime.now()
            fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1
            updated = FicheMetier(**fiche_dict)
            repo.update_fiche(updated)

            return {
                "message": "Fiche auto-corrigée",
                "code_rome": code_rome,
                "nom": updated.nom_masculin,
                "version": updated.metadata.version
            }
        else:
            raise HTTPException(status_code=500, detail="Claude n'a pas retourné de JSON valide")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur auto-correction {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PUBLISH ====================

@router.post("/{code_rome}/publish")
async def publish_fiche(code_rome: str, user: dict = Depends(get_current_user)):
    """Publie une fiche (change le statut en 'publiee')."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        fiche_dict = fiche.model_dump()
        fiche_dict["metadata"]["statut"] = StatutFiche.PUBLIEE.value
        fiche_dict["metadata"]["date_maj"] = datetime.now()
        updated = FicheMetier(**fiche_dict)
        repo.update_fiche(updated)

        return {
            "message": "Fiche publiée",
            "code_rome": code_rome
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VARIANTES GENERATE ====================

@router.post("/{code_rome}/variantes/generate")
async def generate_variantes(code_rome: str, req: VariantesGenerateRequest, user: dict = Depends(get_current_user)):
    """Génère des variantes via Claude API."""
    rate_limiter.check(f"variantes-generate:{code_rome}", max_requests=5)

    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        claude_client = get_claude_client()
        from agents.redacteur_fiche import AgentRedacteurFiche
        from database.models import LangueSupporte, TrancheAge, FormatContenu, GenreGrammatical

        agent = AgentRedacteurFiche(repository=repo, claude_client=claude_client)

        langues = [LangueSupporte(l) for l in req.langues] if req.langues else None
        tranches = [TrancheAge(t) for t in req.tranches_age] if req.tranches_age else None
        formats = [FormatContenu(f) for f in req.formats] if req.formats else None
        genres = [GenreGrammatical(g) for g in req.genres] if req.genres else None

        variantes = await agent.generer_variantes(
            fiche, langues=langues, tranches_age=tranches, formats=formats, genres=genres
        )

        for v in variantes:
            repo.save_variante(v)

        return {
            "message": f"{len(variantes)} variantes générées",
            "code_rome": code_rome,
            "variantes_generees": len(variantes)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur génération variantes {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PUBLISH BATCH ====================
# Note: this must be registered BEFORE the {code_rome} catch-all routes
# It's on /api/fiches/publish-batch so we use a separate router prefix

publish_batch_router = APIRouter(prefix="/api/fiches", tags=["actions"])


@publish_batch_router.post("/publish-batch")
async def publish_batch(req: PublishBatchRequest, user: dict = Depends(get_current_user)):
    """Publie plusieurs fiches en batch."""
    results = []
    for code_rome in req.codes_rome:
        try:
            fiche = repo.get_fiche(code_rome)
            if not fiche:
                results.append({"code_rome": code_rome, "status": "error", "message": "Fiche non trouvée"})
                continue

            fiche_dict = fiche.model_dump()
            fiche_dict["metadata"]["statut"] = StatutFiche.PUBLIEE.value
            fiche_dict["metadata"]["date_maj"] = datetime.now()
            updated = FicheMetier(**fiche_dict)
            repo.update_fiche(updated)
            results.append({"code_rome": code_rome, "status": "published", "message": "Publiée"})
        except Exception as e:
            results.append({"code_rome": code_rome, "status": "error", "message": str(e)})

    return {
        "message": f"{sum(1 for r in results if r['status'] == 'published')} fiches publiées",
        "results": results
    }
