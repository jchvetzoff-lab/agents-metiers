"""
Enrichment module - IA enrichment via Claude.
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional

import anthropic
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

from .shared import repo, config

router = APIRouter()
logger = logging.getLogger(__name__)


def get_current_timestamp() -> datetime:
    """Get current timestamp."""
    return datetime.now()


def get_user_name_from_request(request: Request) -> str:
    """Extract user name from X-User-Name header, fallback to 'Utilisateur'."""
    return request.headers.get("X-User-Name", "Utilisateur")


def get_anthropic_api_key() -> Optional[str]:
    """Get Anthropic API key from environment or config."""
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


def clamp_value(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max."""
    return max(min_val, min(max_val, value))


# ==================== ENRICHMENT ROUTES ====================

@router.post("/fiches/{code_rome}/enrich")
async def enrich_fiche(code_rome: str, request: Request) -> Dict[str, Any]:
    """IA enrichment via Claude: fill empty fields of a fiche."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Read optional comment
        commentaire = None
        try:
            body = await request.json()
            commentaire = body.get("commentaire", None)
        except Exception:
            pass

        # Read current DB row to check which fields are empty
        current = {}
        column_names = [
            "missions_principales", "acces_metier", "savoirs", "types_contrats",
            "mobilite", "traits_personnalite", "aptitudes", "profil_riasec",
            "autres_appellations", "statuts_professionnels", "niveau_formation",
            "domaine_professionnel", "sites_utiles", "conditions_travail_detaillees",
            "competences_dimensions", "preferences_interets", "secteurs_activite"
        ]
        
        with create_db_session_context() as session:
            row = session.execute(
                text(f"SELECT {', '.join(column_names)} FROM fiches_metiers WHERE code_rome = :cr"),
                {"cr": code_rome}
            ).fetchone()

        if row:
            for i, col in enumerate(column_names):
                val = row[i]
                if isinstance(val, str):
                    try:
                        val = json.loads(val)
                    except Exception:
                        pass
                current[col] = val

        # Build prompt for Claude
        prompt = f"""Tu es un expert des métiers en France. Enrichis cette fiche métier ROME avec des données précises et réalistes.

Code ROME: {code_rome}
Nom: {fiche.nom_epicene}
Description: {fiche.description or 'N/A'}
Compétences existantes: {json.dumps(fiche.competences or [], ensure_ascii=False)}
Formations existantes: {json.dumps(fiche.formations or [], ensure_ascii=False)}
Conditions travail: {json.dumps(fiche.conditions_travail or [], ensure_ascii=False)}
Environnements: {json.dumps(fiche.environnements or [], ensure_ascii=False)}

{f"""⚠️ INSTRUCTION PRIORITAIRE DE L'UTILISATEUR — A RESPECTER IMPERATIVEMENT :
{commentaire}

Tu DOIS modifier les champs concernes selon cette instruction. Ne regenere pas les memes donnees — CHANGE ce qui est demande.""" if commentaire else ''}

Génère un JSON avec TOUS les champs suivants. {f"ATTENTION : l'utilisateur a demandé des modifications specifiques (voir instruction ci-dessus). Applique-les." if commentaire else "Remplis TOUT, même si des données existantes sont fournies ci-dessus."} Sois précis et réaliste pour le marché français:

{{
  "competences": [{{"nom": "Nom compétence", "niveau": "avance", "categorie": "technique"}}],
  "competences_transversales": [{{"nom": "Nom", "importance": "haute"}}],
  "formations": [{{"nom": "Nom formation", "niveau": "Bac+3", "duree": "3 ans", "etablissements": ["Nom etablissement"]}}],
  "certifications": [{{"nom": "Nom certification", "organisme": "Organisme", "obligatoire": false}}],
  "conditions_travail": ["condition 1", "condition 2"],
  "environnements": [{{"nom": "Type environnement", "description": "Description"}}],
  "salaires": {{
    "junior": {{"min": 25000, "max": 32000, "median": 28000}},
    "confirme": {{"min": 35000, "max": 48000, "median": 40000}},
    "senior": {{"min": 48000, "max": 70000, "median": 55000}}
  }},
  "perspectives": {{
    "tension": 0.65,
    "tendance": "hausse",
    "evolution_5ans": "Description evolution",
    "nombre_offres": 5000,
    "taux_insertion": 0.85
  }},
  "missions_principales": ["5-8 missions principales du métier"],
  "acces_metier": "Texte décrivant comment accéder à ce métier (diplômes, expérience, etc.)",
  "savoirs": ["5-10 savoirs théoriques nécessaires"],
  "types_contrats": {{"cdi": 50, "cdd": 25, "interim": 15, "independant": 10}},
  "traits_personnalite": ["5-8 traits de personnalité importants"],
  "aptitudes": [{{"nom": "Nom aptitude", "niveau": 4}}],
  "profil_riasec": {{"realiste": 30, "investigateur": 60, "artistique": 20, "social": 40, "entreprenant": 30, "conventionnel": 50}},
  "autres_appellations": ["3-8 autres noms pour ce métier"],
  "statuts_professionnels": ["Salarié", "Indépendant", etc.],
  "niveau_formation": "Bac+2 à Bac+5",
  "domaine_professionnel": {{"domaine": "Nom du domaine", "sous_domaine": "Sous-domaine", "code_domaine": "M18"}},
  "sites_utiles": [{{"nom": "Nom", "url": "https://...", "description": "Description courte"}}],
  "conditions_travail_detaillees": {{
    "exigences_physiques": ["liste"],
    "horaires": "Description horaires",
    "deplacements": "Fréquence déplacements",
    "environnement": "Description environnement",
    "risques": ["risques spécifiques"]
  }},
  "competences_dimensions": {{"relationnel": 50, "intellectuel": 70, "communication": 60, "management": 30, "realisation": 80, "expression": 40, "physique_sensoriel": 20}},
  "preferences_interets": {{"domaine_interet": "Nom domaine", "familles": [{{"nom": "Famille", "score": 75}}]}},
  "secteurs_activite": ["3-6 secteurs d'activité"],
  "mobilite": {{
    "metiers_proches": [{{"code_rome": "XXXXX", "nom": "Nom métier", "nom_feminin": "Nom féminin", "nom_epicene": "Nom épicène", "contexte": "Pourquoi proche"}}],
    "evolutions": [{{"code_rome": "XXXXX", "nom": "Nom métier", "nom_feminin": "Nom féminin", "nom_epicene": "Nom épicène", "contexte": "Type d'évolution"}}]
  }}
}}

IMPORTANT:
- Valeurs RIASEC et dimensions entre 0 et 100
- Aptitudes niveau entre 1 et 5
- Types contrats en pourcentage (total = 100)
- Codes ROME des métiers proches doivent être des vrais codes
- Réponds UNIQUEMENT avec le JSON, pas de texte autour"""

        # Call Claude API
        api_key = get_anthropic_api_key()
        if not api_key:
            raise HTTPException(status_code=500, detail="Clé API Anthropic non configurée")

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        # Extract JSON from response (handle markdown code blocks)
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        enriched = json.loads(response_text)

        # Normalize tendance values in perspectives
        if "perspectives" in enriched and isinstance(enriched["perspectives"], dict):
            tendance = enriched["perspectives"].get("tendance", "stable")
            valid_tendances = ["emergence", "stable", "disparition", "hausse", "croissance", "baisse", "declin"]
            if tendance not in valid_tendances:
                # Map common AI outputs to valid values
                tendance_map = {
                    "en hausse": "hausse", "en baisse": "baisse", "en croissance": "croissance",
                    "en déclin": "declin", "en émergence": "emergence", "en disparition": "disparition",
                    "forte": "hausse", "positive": "hausse", "négative": "baisse",
                    "stagnation": "stable", "stagnant": "stable",
                }
                enriched["perspectives"]["tendance"] = tendance_map.get(tendance.lower(), "stable")
            # Clamp tension
            if "tension" in enriched["perspectives"]:
                try:
                    enriched["perspectives"]["tension"] = clamp_value(
                        float(enriched["perspectives"]["tension"]), 0.0, 1.0
                    )
                except (ValueError, TypeError):
                    enriched["perspectives"]["tension"] = 0.5

        # Build SQL update for all enriched fields
        update_parts = []
        update_params = {"cr": code_rome, "d": get_current_timestamp()}

        json_fields = [
            "missions_principales", "savoirs", "types_contrats", "mobilite",
            "traits_personnalite", "aptitudes", "profil_riasec",
            "autres_appellations", "statuts_professionnels",
            "domaine_professionnel", "sites_utiles", "conditions_travail_detaillees",
            "competences_dimensions", "preferences_interets", "secteurs_activite",
            "competences", "competences_transversales", "formations",
            "certifications", "conditions_travail", "environnements",
            "salaires", "perspectives"
        ]

        for field_name in json_fields:
            if field_name in enriched:
                update_parts.append(f"{field_name} = :{field_name}")
                update_params[field_name] = json.dumps(enriched[field_name], ensure_ascii=False)

        # String fields
        for field_name in ["acces_metier", "niveau_formation"]:
            if field_name in enriched and enriched[field_name]:
                update_parts.append(f"{field_name} = :{field_name}")
                update_params[field_name] = enriched[field_name]

        if not update_parts:
            raise HTTPException(status_code=500, detail="Aucun champ enrichi par l'IA")

        new_version = fiche.metadata.version + 1
        update_parts.extend([
            "version = :v", "date_maj = :d", "statut = 'enrichi'",
            "validation_ia_score = NULL", "validation_ia_date = NULL",
            "validation_ia_details = NULL", "validation_humaine = NULL",
            "validation_humaine_date = NULL", "validation_humaine_par = NULL",
            "validation_humaine_commentaire = NULL"
        ])
        update_params["v"] = new_version

        with create_db_session_context() as session:
            session.execute(
                text(f"UPDATE fiches_metiers SET {', '.join(update_parts)} WHERE code_rome = :cr"),
                update_params
            )

        user = get_user_name_from_request(request)
        fields_enriched = [f for f in json_fields + ["acces_metier", "niveau_formation"] if f in enriched]
        desc = f"Enrichissement IA de {fiche.nom_epicene} (v{new_version}) par {user} — {len(fields_enriched)} champs enrichis"
        if commentaire:
            desc += f" — Commentaire : {commentaire}"
        add_audit_log("enrichissement", code_rome, user, desc)

        return {
            "message": f"Enrichissement terminé — {len(fields_enriched)} champs enrichis",
            "code_rome": code_rome,
            "nom": fiche.nom_epicene,
            "version": new_version,
            "fields_enriched": fields_enriched,
            "commentaire": commentaire,
        }
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur parsing réponse IA: {str(e)}")
    except Exception as e:
        logger.error(f"Error enriching fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))