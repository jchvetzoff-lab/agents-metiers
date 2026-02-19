"""
Translation routes - AI translation of fiches via Claude.
"""

import json
import logging
import os
from typing import Any, Dict

import anthropic
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from .shared import repo
from .helpers import create_db_session_context, get_anthropic_api_key

router = APIRouter()
logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish (Español)",
    "de": "German (Deutsch)",
    "it": "Italian (Italiano)",
    "pt": "Portuguese (Português)",
    "ar": "Arabic (العربية)",
    "ja": "Japanese (日本語)",
    "zh": "Chinese Simplified (简体中文)",
}


@router.get("/fiches/{code_rome}/translate")
async def translate_fiche(code_rome: str, lang: str = Query(..., description="Target language code")) -> Dict[str, Any]:
    """Translate a fiche into the requested language. Uses cache when available."""
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {lang}. Supported: {', '.join(SUPPORTED_LANGUAGES.keys())}")

    # Get fiche
    fiche = repo.get_fiche(code_rome)
    if not fiche:
        raise HTTPException(status_code=404, detail=f"Fiche {code_rome} not found")

    # Check cache
    with create_db_session_context() as session:
        row = session.execute(
            text("SELECT translations FROM fiches_metiers WHERE code_rome = :cr"),
            {"cr": code_rome}
        ).fetchone()

    cached_translations = {}
    if row and row[0]:
        try:
            cached_translations = json.loads(row[0]) if isinstance(row[0], str) else row[0]
        except (json.JSONDecodeError, TypeError):
            cached_translations = {}

    if lang in cached_translations:
        return {"code_rome": code_rome, "lang": lang, "cached": True, "translation": cached_translations[lang]}

    # Build content to translate
    source_data = {
        "description": fiche.description or "",
        "desc_courte": fiche.description_courte or "",
        "competences": [
            {"nom": c.get("nom", c) if isinstance(c, dict) else str(c), "details": c.get("categorie", "") if isinstance(c, dict) else ""}
            for c in (fiche.competences or [])
        ],
        "formations": [str(f) if not isinstance(f, dict) else f.get("nom", str(f)) for f in (fiche.formations or [])],
        "certifications": [str(c) if not isinstance(c, dict) else c.get("nom", str(c)) for c in (fiche.certifications or [])],
        "conditions_travail": [str(c) if not isinstance(c, dict) else c.get("nom", str(c)) for c in (fiche.conditions_travail or [])],
        "environnements": [str(e) if not isinstance(e, dict) else e.get("nom", str(e)) for e in (fiche.environnements or [])],
        "secteurs_activite": [str(s) if not isinstance(s, dict) else s.get("nom", str(s)) for s in (fiche.secteurs_activite or [])],
        "missions_principales": fiche.missions_principales or [],
        "acces_metier": fiche.acces_metier or "",
        "salaires_labels": {"junior": "Junior", "confirme": "Confirmé", "senior": "Senior"},
        "perspectives_text": fiche.perspectives.evolution_5ans if fiche.perspectives else "",
    }

    source_json = json.dumps(source_data, ensure_ascii=False, indent=2)
    target_language = SUPPORTED_LANGUAGES[lang]

    prompt = f"""Translate the following French job description data into {target_language}. 
Return ONLY a valid JSON object with the exact same structure, all text values translated.
Keep proper nouns, acronyms, and technical terms that are commonly used in the target language.
For competences, translate both "nom" and "details" fields.

Source data:
{source_json}

Return the translated JSON only, no markdown, no explanation."""

    api_key = get_anthropic_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        translated = json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"Translation JSON parse error for {code_rome}/{lang}: {e}")
        raise HTTPException(status_code=500, detail=f"AI translation parse error: {str(e)}")
    except Exception as e:
        logger.error(f"Translation error for {code_rome}/{lang}: {e}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

    # Cache the result
    cached_translations[lang] = translated
    with create_db_session_context() as session:
        session.execute(
            text("UPDATE fiches_metiers SET translations = :t WHERE code_rome = :cr"),
            {"t": json.dumps(cached_translations, ensure_ascii=False), "cr": code_rome}
        )

    return {"code_rome": code_rome, "lang": lang, "cached": False, "translation": translated}
