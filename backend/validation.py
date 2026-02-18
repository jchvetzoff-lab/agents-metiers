"""
Validation module - Score calculation and validation routes.
Handles completude scoring, quality assessment, and IA/human validation.
"""

import json
import logging
from datetime import datetime, timedelta, date


def _json_serial(obj):
    """JSON serializer for objects not serializable by default."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def _dumps(obj, **kwargs):
    """json.dumps with datetime support."""
    kwargs.setdefault("default", _json_serial)
    return json.dumps(obj, **kwargs)
from typing import Any, Dict, List, Optional
from types import SimpleNamespace
from difflib import SequenceMatcher

import anthropic
from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy import text

from .shared import repo, config
from .models import ReviewRequest, ValidationHumaineRequest, AutoCorrectRequest

router = APIRouter()
logger = logging.getLogger(__name__)

# Scoring constants
SCORE_DESCRIPTION_LONG = 8
SCORE_DESCRIPTION_SHORT = 5
SCORE_COMPETENCE_EACH = 3
SCORE_COMPETENCE_MAX = 15
SCORE_COMPETENCE_TRANSVERSALE_EACH = 3
SCORE_COMPETENCE_TRANSVERSALE_MAX = 9
SCORE_FORMATION_EACH = 3
SCORE_FORMATION_MAX = 12
SCORE_CERTIFICATION_EACH = 2
SCORE_CERTIFICATION_MAX = 6
SCORE_CONDITIONS_TRAVAIL_EACH = 2
SCORE_CONDITIONS_TRAVAIL_MAX = 6
SCORE_ENVIRONNEMENT_EACH = 2
SCORE_ENVIRONNEMENT_MAX = 6
SCORE_SECTEUR_ACTIVITE_EACH = 2
SCORE_SECTEUR_ACTIVITE_MAX = 6
SCORE_SALAIRES_MAX = 10
SCORE_PERSPECTIVES_MAX = 8
SCORE_METIERS_PROCHES_EACH = 2
SCORE_METIERS_PROCHES_MAX = 6
SCORE_MISSIONS_PRINCIPALES_BONUS = 5
SCORE_ACCES_METIER_BONUS = 4
SCORE_SAVOIRS_EACH = 3
SCORE_SAVOIRS_MAX = 6

# Quality scoring constants
DESCRIPTION_MIN_LENGTH = 50
DESCRIPTION_GOOD_LENGTH = 200
COMPETENCES_MIN_COUNT = 3
COMPETENCES_RECOMMENDED_COUNT = 5
SALARY_MIN_REALISTIC = 15000
SALARY_MAX_REALISTIC = 200000

# Validation IA constants
VALIDATION_IA_MIN_SCORE_PASS = 70
VALIDATION_IA_MIN_SCORE_GOOD = 80
BATCH_VALIDATION_MAX_ITEMS = 50

FUZZY_SEARCH_THRESHOLD = 0.4
FUZZY_COMPETENCES_THRESHOLD = 0.5


def get_current_timestamp() -> datetime:
    """Get current timestamp."""
    return datetime.now()


def get_user_name_from_request(request: Request) -> str:
    """Extract user name from X-User-Name header, fallback to 'Utilisateur'."""
    return request.headers.get("X-User-Name", "Utilisateur")


def get_anthropic_api_key() -> Optional[str]:
    """Get Anthropic API key from environment or config."""
    import os
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and hasattr(config, 'api') and hasattr(config.api, 'anthropic_api_key'):
        api_key = config.api.anthropic_api_key
    return api_key


def create_db_session_context():
    """Create database session context manager."""
    return repo.session()


def add_audit_log(type_evt: str, code_rome: str, agent: str, description: str, validateur: str = None) -> None:
    """Helper to add audit log."""
    from database.models import AuditLog as AL, TypeEvenement as TE
    try:
        te = TE(type_evt)
    except ValueError:
        te = TE.MODIFICATION
    
    audit_log = AL(
        timestamp=get_current_timestamp(),
        type_evenement=te,
        code_rome=code_rome,
        agent=agent,
        description=description,
        validateur=validateur,
    )
    repo.add_audit_log(audit_log)


def _safe_get_attribute_or_dict_key(obj: Any, key: str) -> Any:
    """Safely get attribute or dict key from object."""
    # Try attribute first
    val = getattr(obj, key, None)
    if val is not None:
        return val
    
    # Try dict access if object supports __getitem__
    if hasattr(obj, '__getitem__'):
        try:
            return obj.get(key) if hasattr(obj, 'get') else obj[key]
        except (KeyError, TypeError):
            pass
    
    return None



def _to_dict(obj):
    """Convert pydantic model, dict, or other to dict safely."""
    if obj is None:
        return {}
    if hasattr(obj, 'model_dump'):
        return obj.model_dump()
    if isinstance(obj, dict):
        return obj
    return {}


def _list_item_quality(item):
    """Score a list item richness: 0.0 (bare string) to 1.0 (detailed object)."""
    if isinstance(item, dict):
        meaningful = sum(1 for k, v in item.items() if v and k != "nom")
        if not item.get("nom"):
            return 0.0
        name_len = len(str(item.get("nom", "")))
        base = 0.5 if name_len > 3 else 0.3
        detail_bonus = min(meaningful * 0.15, 0.5)
        return min(base + detail_bonus, 1.0)
    elif isinstance(item, str):
        if len(item) < 3:
            return 0.0
        if len(item) < 15:
            return 0.3
        return 0.5
    return 0.0


def _score_list_field(items, max_score, ideal_count, field_name):
    """Score a list field based on count AND quality of items."""
    if not items:
        return {"score": 0, "max": max_score, "commentaire": "Manquant"}
    count = len(items)
    count_ratio = min(count / ideal_count, 1.0)
    qualities = [_list_item_quality(it) for it in items]
    avg_quality = sum(qualities) / len(qualities) if qualities else 0.0
    combined = count_ratio * 0.6 + avg_quality * 0.4
    score = max(0, min(round(combined * max_score), max_score))
    quality_label = "detaille" if avg_quality >= 0.7 else ("basique" if avg_quality >= 0.4 else "superficiel")
    return {"score": score, "max": max_score, "commentaire": f"{count} item(s), {quality_label}"}


def calculate_completude_score(fiche: Any) -> Dict[str, Any]:
    """
    Calculate completude score with QUALITY assessment.
    Not just presence -- measures richness, detail, and coherence.
    """
    details = {}

    # DESCRIPTION (max 8) - graded by length
    desc = getattr(fiche, 'description', None) or ""
    if len(desc) >= 500:
        d_score, d_comment = SCORE_DESCRIPTION_LONG, "Description riche"
    elif len(desc) >= 300:
        d_score, d_comment = 6, "Description correcte"
    elif len(desc) >= 100:
        d_score, d_comment = 4, "Description courte"
    elif desc:
        d_score, d_comment = 2, f"Description trop courte ({len(desc)} car.)"
    else:
        d_score, d_comment = 0, "Description manquante"
    details["description"] = {"score": d_score, "max": SCORE_DESCRIPTION_LONG, "commentaire": d_comment}

    # DESCRIPTION COURTE (max 5) - 50-200 chars ideal
    desc_courte = getattr(fiche, 'description_courte', None) or ""
    if 50 <= len(desc_courte) <= 200:
        dc_score, dc_comment = SCORE_DESCRIPTION_SHORT, "OK"
    elif desc_courte and len(desc_courte) > 200:
        dc_score, dc_comment = 3, "Trop longue pour un resume"
    elif desc_courte:
        dc_score, dc_comment = 2, f"Trop courte ({len(desc_courte)} car.)"
    else:
        dc_score, dc_comment = 0, "Manquante"
    details["description_courte"] = {"score": dc_score, "max": SCORE_DESCRIPTION_SHORT, "commentaire": dc_comment}

    # LIST FIELDS - scored by count + quality
    competences = getattr(fiche, 'competences', None) or []
    details["competences"] = _score_list_field(competences, SCORE_COMPETENCE_MAX, 5, "competences")

    comp_trans = getattr(fiche, 'competences_transversales', None) or []
    details["competences_transversales"] = _score_list_field(comp_trans, SCORE_COMPETENCE_TRANSVERSALE_MAX, 3, "comp_trans")

    formations = getattr(fiche, 'formations', None) or []
    details["formations"] = _score_list_field(formations, SCORE_FORMATION_MAX, 4, "formations")

    certifications = getattr(fiche, 'certifications', None) or []
    details["certifications"] = _score_list_field(certifications, SCORE_CERTIFICATION_MAX, 3, "certifications")

    conditions_travail = getattr(fiche, 'conditions_travail', None) or []
    details["conditions_travail"] = _score_list_field(conditions_travail, SCORE_CONDITIONS_TRAVAIL_MAX, 3, "conditions")

    environnements = getattr(fiche, 'environnements', None) or []
    details["environnements"] = _score_list_field(environnements, SCORE_ENVIRONNEMENT_MAX, 3, "environnements")

    secteurs = getattr(fiche, 'secteurs_activite', None) or []
    details["secteurs_activite"] = _score_list_field(secteurs, SCORE_SECTEUR_ACTIVITE_MAX, 3, "secteurs")

    # SALAIRES (max 10) - check ranges not just median
    salaires = getattr(fiche, 'salaires', None)
    sal_score, sal_comment = 0, "Manquant"
    if salaires:
        sal_dict = _to_dict(salaires)
        level_scores = []
        for level in ["junior", "confirme", "senior"]:
            ld = sal_dict.get(level, {}) or {}
            if not ld.get("median"):
                level_scores.append(0)
            elif ld.get("min") and ld.get("max"):
                level_scores.append(1.0)
            else:
                level_scores.append(0.5)
        sal_score = round(sum(level_scores) / 3 * SCORE_SALAIRES_MAX)
        filled = sum(1 for s in level_scores if s > 0)
        if sal_score == SCORE_SALAIRES_MAX:
            sal_comment = "Complet (3 niveaux avec fourchettes)"
        elif sal_score > 0:
            sal_comment = f"Partiel ({filled}/3 niveaux)"
        else:
            sal_comment = "Present mais vide"
    details["salaires"] = {"score": sal_score, "max": SCORE_SALAIRES_MAX, "commentaire": sal_comment}

    # PERSPECTIVES (max 8) - check depth
    perspectives = getattr(fiche, 'perspectives', None)
    persp_score, persp_comment = 0, "Manquant"
    if perspectives:
        persp_dict = _to_dict(perspectives)
        sub_scores = []
        tension = persp_dict.get("tension")
        sub_scores.append(1.0 if isinstance(tension, (int, float)) else 0.0)
        tendance = str(persp_dict.get("tendance") or "")
        sub_scores.append(1.0 if len(tendance) > 2 else 0.0)
        evol = str(persp_dict.get("evolution_5ans") or "")
        if len(evol) > 100:
            sub_scores.append(1.0)
        elif len(evol) > 30:
            sub_scores.append(0.6)
        elif evol:
            sub_scores.append(0.3)
        else:
            sub_scores.append(0.0)
        avg = sum(sub_scores) / len(sub_scores)
        persp_score = round(avg * SCORE_PERSPECTIVES_MAX)
        filled = sum(1 for s in sub_scores if s > 0)
        persp_comment = f"{filled}/3 champs" + (" (detaille)" if avg > 0.7 else "")
    details["perspectives"] = {"score": persp_score, "max": SCORE_PERSPECTIVES_MAX, "commentaire": persp_comment}

    # METIERS PROCHES (max 6)
    metiers_proches = getattr(fiche, 'metiers_proches', None) or []
    details["metiers_proches"] = _score_list_field(metiers_proches, SCORE_METIERS_PROCHES_MAX, 3, "metiers_proches")

    # MISSIONS PRINCIPALES (max 5)
    missions_principales = _safe_get_attribute_or_dict_key(fiche, 'missions_principales') or []
    details["missions_principales"] = _score_list_field(missions_principales, SCORE_MISSIONS_PRINCIPALES_BONUS, 4, "missions")

    # ACCES METIER (max 4) - graded by length
    acces_metier = _safe_get_attribute_or_dict_key(fiche, 'acces_metier') or ""
    if isinstance(acces_metier, dict):
        acces_text = str(acces_metier.get("description", "")) or str(acces_metier)
    else:
        acces_text = str(acces_metier)
    if len(acces_text) >= 200:
        acces_score, acces_comment = SCORE_ACCES_METIER_BONUS, "Detaille"
    elif len(acces_text) >= 50:
        acces_score, acces_comment = 2, "Basique"
    elif acces_text:
        acces_score, acces_comment = 1, "Tres court"
    else:
        acces_score, acces_comment = 0, "Manquant"
    details["acces_metier"] = {"score": acces_score, "max": SCORE_ACCES_METIER_BONUS, "commentaire": acces_comment}

    # SAVOIRS (max 6)
    savoirs = _safe_get_attribute_or_dict_key(fiche, 'savoirs') or []
    details["savoirs"] = _score_list_field(savoirs, SCORE_SAVOIRS_MAX, 3, "savoirs")

    # TOTAL
    total = sum(d["score"] for d in details.values())
    total = max(0, min(total, 100))

    return {"score": total, "details": details}

def calculate_quality_score(fiche: Any) -> Dict[str, Any]:
    """
    Deterministic quality analysis. 
    Returns {score, problemes, suggestions} with detailed quality assessment.
    """
    problems = []
    suggestions = []
    score = 100

    desc = getattr(fiche, 'description', None) or ""

    # Check description quality
    if len(desc) < DESCRIPTION_MIN_LENGTH:
        problems.append("Description trop courte ou absente")
        score -= 30
    elif len(desc) < DESCRIPTION_GOOD_LENGTH:
        suggestions.append(f"Enrichir la description (idéalement > {DESCRIPTION_GOOD_LENGTH} caractères)")
        score -= 10

    # Check competences count
    competences = getattr(fiche, 'competences', None) or []
    if len(competences) < COMPETENCES_MIN_COUNT:
        problems.append(f"Seulement {len(competences)} compétence(s) — minimum recommandé : {COMPETENCES_RECOMMENDED_COUNT}")
        score -= 20
    elif len(competences) < COMPETENCES_RECOMMENDED_COUNT:
        suggestions.append(f"Ajouter des compétences pour atteindre au moins {COMPETENCES_RECOMMENDED_COUNT}")
        score -= 5

    # Check salary realism
    salaires = getattr(fiche, 'salaires', None)
    if salaires:
        sal_dict = salaires.model_dump() if hasattr(salaires, 'model_dump') else (
            salaires if isinstance(salaires, dict) else {}
        )
        for level in ["junior", "confirme", "senior"]:
            level_data = sal_dict.get(level, {}) or {}
            median = level_data.get("median")
            if median:
                if median < SALARY_MIN_REALISTIC:
                    problems.append(f"Salaire {level} anormalement bas ({median}€)")
                    score -= 10
                elif median > SALARY_MAX_REALISTIC:
                    problems.append(f"Salaire {level} anormalement élevé ({median}€)")
                    score -= 10

        # Check junior < confirme < senior progression
        junior_median = (sal_dict.get("junior", {}) or {}).get("median", 0) or 0
        confirme_median = (sal_dict.get("confirme", {}) or {}).get("median", 0) or 0
        senior_median = (sal_dict.get("senior", {}) or {}).get("median", 0) or 0
        
        if junior_median and confirme_median and junior_median > confirme_median:
            problems.append("Salaire junior supérieur au confirmé")
            score -= 10
        if confirme_median and senior_median and confirme_median > senior_median:
            problems.append("Salaire confirmé supérieur au senior")
            score -= 10

    # Check formations
    formations = getattr(fiche, 'formations', None) or []
    if not formations:
        suggestions.append("Ajouter des formations recommandées")
        score -= 5

    return {
        "score": max(0, min(100, score)), 
        "problemes": problems, 
        "suggestions": suggestions
    }


# ==================== VALIDATION ROUTES ====================

@router.post("/fiches/{code_rome}/validate")
async def validate_fiche(code_rome: str, request: Request) -> Dict[str, Any]:
    """Deterministic IA validation: completude + quality."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        completude = calculate_completude_score(fiche)
        qualite = calculate_quality_score(fiche)
        score_final = round((completude["score"] + qualite["score"]) / 2)

        if score_final >= 80:
            verdict = "excellent"
        elif score_final >= 70:
            verdict = "bon"
        elif score_final >= 40:
            verdict = "insuffisant"
        else:
            verdict = "critique"

        resume = (f"Score global {score_final}/100 — "
                 f"Complétude {completude['score']}/100, Qualité {qualite['score']}/100")

        rapport = {
            "score": score_final,
            "verdict": verdict,
            "resume": resume,
            "criteres": {
                "completude": {
                    "score": completude["score"], 
                    "commentaire": f"Score de complétude : {completude['score']}/100"
                },
                "qualite": {
                    "score": qualite["score"], 
                    "commentaire": f"Score de qualité : {qualite['score']}/100"
                },
            },
            "problemes": qualite["problemes"],
            "suggestions": qualite["suggestions"],
            "details_completude": completude["details"],
        }

        # Save to DB
        now = get_current_timestamp()
        new_statut = "en_validation" if score_final >= VALIDATION_IA_MIN_SCORE_PASS else "brouillon"
        
        with create_db_session_context() as session:
            session.execute(
                text("UPDATE fiches_metiers SET validation_ia_score = :score, validation_ia_date = :date, "
                     "validation_ia_details = :details, statut = :statut WHERE code_rome = :cr"),
                {
                    "score": score_final, 
                    "date": now, 
                    "details": _dumps(rapport), 
                    "statut": new_statut, 
                    "cr": code_rome
                }
            )

        user = get_user_name_from_request(request)
        add_audit_log(
            "validation_ia", 
            code_rome, 
            user,
            f"Validation IA lancée par {user} : {verdict} ({score_final}/100) pour {fiche.nom_epicene}"
        )

        return {
            "message": f"Validation IA terminée — {verdict}",
            "code_rome": code_rome,
            "nom": fiche.nom_epicene,
            "rapport": rapport,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiches/{code_rome}/validate-ia")
async def validate_fiche_ia(code_rome: str, request: Request) -> Dict[str, Any]:
    """IA validation with Claude: complete audit of the fiche."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Build strict validation prompt for Claude
        prompt = f"""Tu es un expert en validation de fiches métiers ROME. Analyse cette fiche de manière stricte et exigeante.

Code ROME: {code_rome}
Nom: {fiche.nom_epicene}
Description: {fiche.description or 'VIDE'}
Description courte: {fiche.description_courte or 'VIDE'}
Compétences: {_dumps(fiche.competences or [], ensure_ascii=False)}
Compétences transversales: {_dumps(fiche.competences_transversales or [], ensure_ascii=False)}
Formations: {_dumps(fiche.formations or [], ensure_ascii=False)}
Certifications: {_dumps(fiche.certifications or [], ensure_ascii=False)}
Conditions de travail: {_dumps(fiche.conditions_travail or [], ensure_ascii=False)}
Environnements: {_dumps(fiche.environnements or [], ensure_ascii=False)}
Secteurs d'activité: {_dumps(fiche.secteurs_activite or [], ensure_ascii=False)}
Salaires: {_dumps(fiche.salaires.model_dump() if fiche.salaires else {}, ensure_ascii=False)}
Perspectives: {_dumps(fiche.perspectives.model_dump() if fiche.perspectives else {}, ensure_ascii=False)}

MISSION : Audite cette fiche avec rigueur et exigence. Vérifie :

1. COHÉRENCE DES DONNÉES :
   - Salaires réalistes pour ce métier en France (junior 15k-45k, senior 30k-120k selon le métier)
   - Progression logique junior < confirmé < senior
   - Compétences pertinentes au métier (pas générique)
   - Formations cohérentes avec le niveau requis
   - Secteurs d'activité appropriés

2. COMPLÉTUDE :
   - Description suffisamment détaillée (min 150 caractères)
   - Au moins 5 compétences techniques
   - Formations spécifiques au métier
   - Données de salaires présentes
   - Perspectives d'emploi renseignées

3. QUALITÉ DU CONTENU :
   - Pas de placeholder ou de texte générique
   - Informations précises et spécialisées
   - Vocabulaire professionnel approprié
   - Absence de doublons ou incohérences

ÉVALUATION STRICTE :
- Score < 60 = PROBLÈMES MAJEURS (fiche non validable)
- Score 60-79 = ACCEPTABLE AVEC RÉSERVES (améliorations nécessaires) 
- Score 80+ = BONNE QUALITÉ (validable)

Retourne UNIQUEMENT ce JSON :
{{
  "score_global": 75,
  "verdict": "acceptable_reserves",
  "problemes": [
    {{
      "severite": "erreur",
      "message": "Salaire senior (25k€) inférieur au junior (30k€)"
    }},
    {{
      "severite": "warning", 
      "message": "Seulement 3 compétences listées, recommandé 5+"
    }},
    {{
      "severite": "info",
      "message": "Description courte manquante"
    }}
  ],
  "points_forts": [
    "Formations bien définies",
    "Secteurs d'activité précis"
  ],
  "ameliorations_requises": [
    "Corriger la progression salariale",
    "Ajouter 2-3 compétences spécialisées",
    "Enrichir la description (actuel: 89 caractères)"
  ],
  "criteres_detailles": {{
    "coherence_salaires": {{"score": 30, "max": 40, "commentaire": "Progression illogique"}},
    "completude_competences": {{"score": 12, "max": 20, "commentaire": "3 sur 5+ requis"}},
    "qualite_description": {{"score": 15, "max": 20, "commentaire": "Trop courte"}},
    "pertinence_formations": {{"score": 18, "max": 20, "commentaire": "Bien ciblées"}}
  }}
}}

Sois rigoureux et exigeant. Cette validation détermine si la fiche peut être publiée."""

        # Call Claude API
        api_key = get_anthropic_api_key()
        if not api_key:
            raise HTTPException(status_code=500, detail="Clé API Anthropic non configurée")

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        # Clean response (remove markdown blocks if any)
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        try:
            validation_result = json.loads(response_text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Erreur parsing réponse Claude")

        score = validation_result.get("score_global", 0)
        verdict = validation_result.get("verdict", "erreur")

        # Save to database
        now = get_current_timestamp()
        
        # Change status based on score
        if score >= VALIDATION_IA_MIN_SCORE_PASS:
            new_statut = "valide"  # Validated by IA, ready for human validation
        else:
            new_statut = "enrichi"  # Insufficient score, stays enrichi for re-enrichment

        with create_db_session_context() as session:
            session.execute(
                text("UPDATE fiches_metiers SET validation_ia_score = :score, validation_ia_date = :date, "
                     "validation_ia_details = :details, statut = :statut WHERE code_rome = :cr"),
                {
                    "score": score,
                    "date": now,
                    "details": _dumps(validation_result, ensure_ascii=False),
                    "statut": new_statut,
                    "cr": code_rome
                }
            )

        # Audit log
        user = get_user_name_from_request(request)
        add_audit_log(
            "validation_ia", 
            code_rome, 
            user,
            f"Validation IA par {user} : score {score}/100 ({verdict}) pour {fiche.nom_epicene}"
        )

        return {
            "message": f"Validation IA terminée - Score: {score}/100",
            "code_rome": code_rome,
            "score": score,
            "verdict": verdict,
            "statut": new_statut,
            "details": validation_result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error IA validation for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur validation IA: {str(e)}")


@router.post("/fiches/{code_rome}/validate-human")
async def validate_fiche_human(
    code_rome: str, 
    body: ValidationHumaineRequest, 
    request: Request
) -> Dict[str, Any]:
    """Human validation: approve or reject."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        now = get_current_timestamp()
        user = get_user_name_from_request(request)
        
        if body.approved:
            new_statut = "publiee"  # Human validation = direct publication
            validation_humaine = True
        else:
            new_statut = "enrichi"  # Rejection = return to enrichi for re-enrichment
            validation_humaine = False

        with create_db_session_context() as session:
            session.execute(
                text("UPDATE fiches_metiers SET validation_humaine = :vh, validation_humaine_date = :date, "
                     "validation_humaine_par = :par, validation_humaine_commentaire = :com, "
                     "statut = :statut WHERE code_rome = :cr"),
                {
                    "vh": validation_humaine,
                    "date": now,
                    "par": body.validated_by,
                    "com": body.commentaire or "",
                    "statut": new_statut,
                    "cr": code_rome
                }
            )

        add_audit_log(
            "validation_humaine", 
            code_rome, 
            user,
            f"Validation humaine par {body.validated_by} : {'approuvée' if body.approved else 'rejetée'} pour {fiche.nom_epicene}",
            validateur=body.validated_by
        )

        return {
            "message": f"Fiche {'approuvée' if body.approved else 'rejetée'}",
            "code_rome": code_rome,
            "approved": body.approved,
            "commentaire": body.commentaire,
            "validated_by": body.validated_by,
            "nouveau_statut": new_statut
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error human validation for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiches/{code_rome}/review")
async def review_fiche(code_rome: str, body: ReviewRequest, request: Request) -> Dict[str, Any]:
    """Human validation: approve or reject."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        if body.decision not in ("approuver", "rejeter"):
            raise HTTPException(status_code=400, detail="Décision invalide (approuver ou rejeter)")

        now = get_current_timestamp()

        if body.decision == "approuver":
            new_statut = "publiee"
            val_humaine = "approuvee"
        else:
            new_statut = "brouillon"
            val_humaine = "rejetee"

        user = get_user_name_from_request(request)
        with create_db_session_context() as session:
            session.execute(
                text("UPDATE fiches_metiers SET validation_humaine = :vh, validation_humaine_date = :date, "
                     "validation_humaine_par = :par, validation_humaine_commentaire = :com, "
                     "statut = :statut WHERE code_rome = :cr"),
                {
                    "vh": val_humaine, 
                    "date": now, 
                    "par": user, 
                    "com": body.commentaire or "",
                    "statut": new_statut, 
                    "cr": code_rome
                }
            )

        add_audit_log(
            "validation_humaine", 
            code_rome, 
            user,
            f"Validation humaine par {user} : {body.decision} pour {fiche.nom_epicene}",
            validateur=user
        )

        return {
            "message": f"Fiche {'approuvée' if body.decision == 'approuver' else 'rejetée'}",
            "code_rome": code_rome,
            "decision": body.decision,
            "commentaire": body.commentaire,
            "nouveau_statut": new_statut,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiches/batch-validate-ia")
async def batch_validate_ia(request: Request) -> Dict[str, Any]:
    """Batch IA validation: all enriched fiches without IA validation."""
    try:
        # Get all enriched fiches without IA validation
        with create_db_session_context() as session:
            result = session.execute(
                text("SELECT code_rome, nom_epicene FROM fiches_metiers "
                     "WHERE statut = 'enrichi' AND (validation_ia_score IS NULL OR validation_ia_date IS NULL) "
                     "LIMIT :limit"),
                {"limit": BATCH_VALIDATION_MAX_ITEMS}
            ).fetchall()

        if not result:
            return {
                "message": "Aucune fiche à valider",
                "total": 0,
                "rapport": []
            }

        rapport = []
        user = get_user_name_from_request(request)

        for row in result:
            code_rome, nom = row[0], row[1]
            try:
                # Call individual IA validation endpoint
                validation_result = await validate_fiche_ia(code_rome, request)
                rapport.append({
                    "code_rome": code_rome,
                    "nom": nom,
                    "status": "success",
                    "score": validation_result["score"],
                    "verdict": validation_result["verdict"]
                })
            except Exception as e:
                rapport.append({
                    "code_rome": code_rome,
                    "nom": nom,
                    "status": "error", 
                    "error": str(e)
                })

        successes = len([r for r in rapport if r["status"] == "success"])
        errors = len([r for r in rapport if r["status"] == "error"])

        add_audit_log(
            "validation_ia_batch", 
            "", 
            user,
            f"Validation IA en masse par {user} : {successes} succès, {errors} erreurs sur {len(result)} fiches"
        )

        return {
            "message": f"Validation batch terminée : {successes} succès, {errors} erreurs",
            "total": len(result),
            "successes": successes,
            "errors": errors,
            "rapport": rapport
        }

    except Exception as e:
        logger.error(f"Error batch validate IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiches/{code_rome}/auto-correct")
async def auto_correct_fiche(
    code_rome: str, 
    body: AutoCorrectRequest, 
    request: Request
) -> Dict[str, Any]:
    """Automatic IA correction based on problems and suggestions."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        prompt = f"""Tu es un expert des fiches métiers ROME. Corrige cette fiche en tenant compte des problèmes et suggestions.

Code ROME: {code_rome}
Nom: {fiche.nom_epicene}
Description actuelle: {fiche.description or 'N/A'}
Compétences: {_dumps(fiche.competences or [], ensure_ascii=False)}
Formations: {_dumps(fiche.formations or [], ensure_ascii=False)}
Salaires: {_dumps(fiche.salaires.model_dump() if fiche.salaires else {}, ensure_ascii=False)}

Problèmes identifiés:
{_dumps(body.problemes, ensure_ascii=False)}

Suggestions:
{_dumps(body.suggestions, ensure_ascii=False)}

Retourne UNIQUEMENT un JSON avec les champs corrigés (seulement ceux qui doivent changer):
{{
  "description": "...",
  "competences": ["..."],
  "formations": ["..."],
  "salaires": {{"junior": {{"min": X, "median": X, "max": X}}, "confirme": {{...}}, "senior": {{...}}}}
}}
Ne retourne que les champs modifiés."""

        api_key = get_anthropic_api_key()
        if not api_key:
            raise HTTPException(status_code=500, detail="Clé API Anthropic non configurée")

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        corrections = json.loads(response_text)

        # Apply corrections via existing update mechanism
        update_parts = []
        update_params = {"cr": code_rome}

        if "description" in corrections:
            update_parts.append("description = :description")
            update_params["description"] = corrections["description"]
        if "competences" in corrections:
            update_parts.append("competences = :competences")
            update_params["competences"] = _dumps(corrections["competences"], ensure_ascii=False)
        if "formations" in corrections:
            update_parts.append("formations = :formations")
            update_params["formations"] = _dumps(corrections["formations"], ensure_ascii=False)
        if "salaires" in corrections:
            update_parts.append("salaires = :salaires")
            update_params["salaires"] = _dumps(corrections["salaires"], ensure_ascii=False)

        if update_parts:
            update_parts.append("date_maj = :d")
            update_params["d"] = get_current_timestamp()
            with create_db_session_context() as session:
                session.execute(
                    text(f"UPDATE fiches_metiers SET {', '.join(update_parts)} WHERE code_rome = :cr"),
                    update_params
                )

        user = get_user_name_from_request(request)
        add_audit_log(
            "correction_ia", 
            code_rome, 
            user,
            f"Auto-correction IA de {fiche.nom_epicene} — {len(corrections)} champ(s) corrigé(s)"
        )

        return {
            "message": f"Correction automatique terminée — {len(corrections)} champ(s) corrigé(s)",
            "code_rome": code_rome,
            "corrections": list(corrections.keys()),
        }
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Auto-correct JSON decode error for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur parsing réponse IA: {str(e)}")
    except Exception as e:
        logger.error(f"Error auto-correcting fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))