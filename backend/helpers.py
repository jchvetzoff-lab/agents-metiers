"""
Shared helper functions for route modules.
"""

import json
import logging
import os
from datetime import datetime, date
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional

from fastapi import Request
from sqlalchemy import text

from .shared import repo, config

# Constants
DEFAULT_PAGINATION_LIMIT = 50
MAX_PAGINATION_LIMIT = 500
DEFAULT_AUDIT_LIMIT = 15
MAX_AUDIT_LIMIT = 100
FUZZY_SEARCH_THRESHOLD = 0.55
FUZZY_COMPETENCES_THRESHOLD = 0.5

logger = logging.getLogger(__name__)


def _json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def get_current_timestamp() -> datetime:
    return datetime.now()


def get_user_name_from_request(request: Request) -> str:
    return request.headers.get("X-User-Name", "Utilisateur")


def get_anthropic_api_key() -> Optional[str]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and hasattr(config, 'api') and hasattr(config.api, 'anthropic_api_key'):
        api_key = config.api.anthropic_api_key
    return api_key


def create_db_session_context():
    return repo.session()


def add_audit_log(type_evt: str, code_rome: str, agent: str, description: str, validateur: str = None) -> None:
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


def _normalize(s: str) -> str:
    """Remove accents for search matching."""
    import unicodedata
    return "".join(
        c for c in unicodedata.normalize("NFD", s.lower())
        if unicodedata.category(c) != "Mn"
    )


def fuzzy_match(query: str, text: str, threshold: float = FUZZY_SEARCH_THRESHOLD) -> float:
    if not text:
        return 0.0
    query_lower = _normalize(query.strip())
    text_lower = _normalize(text)
    # Exact substring match — highest priority
    if query_lower in text_lower:
        # Bonus if it starts a word
        words = text_lower.split()
        for word in words:
            if word.startswith(query_lower):
                return 1.0
        return 0.95
    # Short queries (<4 chars): only accept substring matches to avoid noise
    if len(query_lower) < 4:
        return 0.0
    # Fuzzy match on individual words
    words = text_lower.split()
    best_word_score = 0.0
    for word in words:
        # Only compare with words of similar length to avoid short-word noise
        if abs(len(word) - len(query_lower)) > max(len(query_lower), 4):
            continue
        ratio = SequenceMatcher(None, query_lower, word).ratio()
        if ratio > best_word_score:
            best_word_score = ratio
    return best_word_score


def search_fiches_fuzzy(fiches: List[Any], query: str, threshold: float = FUZZY_SEARCH_THRESHOLD) -> List[Any]:
    if not query or not fiches:
        return fiches
    scored = []
    for fiche in fiches:
        scores = [
            fuzzy_match(query, fiche.code_rome),
            fuzzy_match(query, fiche.nom_masculin),
            fuzzy_match(query, fiche.nom_feminin),
            fuzzy_match(query, fiche.nom_epicene),
        ]
        if getattr(fiche, 'description', None):
            scores.append(fuzzy_match(query, fiche.description) * 0.6)
        best_score = max(scores)
        if best_score >= threshold:
            scored.append((fiche, best_score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [fiche for fiche, _ in scored]


def search_fiches_competences(fiches: List[Any], query: str) -> List[Any]:
    if not query or not fiches:
        return fiches
    query_lower = query.lower()
    results = []
    for fiche in fiches:
        all_competences = []
        all_competences.extend(getattr(fiche, 'competences', None) or [])
        all_competences.extend(getattr(fiche, 'competences_transversales', None) or [])
        all_competences.extend(getattr(fiche, 'formations', None) or [])
        match_score = 0
        for comp in all_competences:
            if isinstance(comp, str):
                if query_lower in comp.lower():
                    match_score += 1.0
                else:
                    ratio = SequenceMatcher(None, query_lower, comp.lower()).ratio()
                    if ratio > FUZZY_COMPETENCES_THRESHOLD:
                        match_score += ratio
        if match_score > 0:
            results.append((fiche, match_score))
    results.sort(key=lambda x: x[1], reverse=True)
    return [fiche for fiche, _ in results]


def resolve_mobilite_codes(repo, mobilite: Any) -> Any:
    if not mobilite or not isinstance(mobilite, dict):
        return mobilite
    if not hasattr(resolve_mobilite_codes, "_cache"):
        try:
            with create_db_session_context() as session:
                rows = session.execute(
                    text("SELECT code_rome, nom_masculin, nom_feminin, nom_epicene FROM fiches_metiers")
                ).fetchall()
                lookup = {}
                for row in rows:
                    for name in [row[1], row[2], row[3]]:
                        if name:
                            lookup[name.lower().strip()] = row[0]
                resolve_mobilite_codes._cache = lookup
        except Exception:
            resolve_mobilite_codes._cache = {}
    lookup = resolve_mobilite_codes._cache

    def resolve_items(items: List[Any]) -> List[Any]:
        if not items:
            return items
        resolved = []
        for item in items:
            if isinstance(item, dict):
                nom = (item.get("nom") or "").lower().strip()
                code = lookup.get(nom)
                resolved.append({**item, "code_rome": code})
            else:
                resolved.append(item)
        return resolved

    return {
        "metiers_proches": resolve_items(mobilite.get("metiers_proches", [])),
        "evolutions": resolve_items(mobilite.get("evolutions", [])),
    }
