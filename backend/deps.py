"""
Shared dependencies for routers (repo, config, claude client).
"""
import re
import sys
from pathlib import Path
from fastapi import HTTPException

# Ensure agents-metiers is on the path
AGENTS_METIERS_PATH = Path(__file__).parent.parent
sys.path.insert(0, str(AGENTS_METIERS_PATH))

from database.repository import Repository
from config import get_config

config = get_config()
repo = Repository(
    db_path=config.db_path if not config.database.database_url else None,
    database_url=config.database.database_url
)
repo.init_db()


_claude_client = None
_claude_client_initialized = False


def get_claude_client():
    """Get async Anthropic client (singleton)."""
    global _claude_client, _claude_client_initialized
    if _claude_client_initialized:
        return _claude_client

    import logging
    logger = logging.getLogger(__name__)
    try:
        import anthropic
        _claude_client = anthropic.AsyncAnthropic()
        logger.info("Claude client created successfully")
    except Exception as e:
        logger.error(f"Failed to create Claude client: {e}")
        _claude_client = None

    _claude_client_initialized = True
    return _claude_client


# ---------- France Travail client singleton ----------
_ft_client = None
_ft_client_initialized = False


def get_france_travail_client():
    """Get FranceTravailClient (singleton — preserves OAuth token cache)."""
    global _ft_client, _ft_client_initialized
    if _ft_client_initialized:
        return _ft_client

    import logging
    logger = logging.getLogger(__name__)
    try:
        from sources.france_travail import FranceTravailClient
        _ft_client = FranceTravailClient()
        logger.info("FranceTravailClient created (singleton)")
    except Exception as e:
        logger.error(f"Failed to create FranceTravailClient: {e}")
        _ft_client = None

    _ft_client_initialized = True
    return _ft_client


# ---------- La Bonne Alternance client singleton ----------
_lba_client = None
_lba_client_initialized = False


def get_lba_client():
    """Get LaBonneAlternanceClient (singleton)."""
    global _lba_client, _lba_client_initialized
    if _lba_client_initialized:
        return _lba_client

    import logging
    logger = logging.getLogger(__name__)
    try:
        from sources.la_bonne_alternance import LaBonneAlternanceClient
        _lba_client = LaBonneAlternanceClient()
        logger.info("LaBonneAlternanceClient created (singleton)")
    except Exception as e:
        logger.error(f"Failed to create LaBonneAlternanceClient: {e}")
        _lba_client = None

    _lba_client_initialized = True
    return _lba_client


# ---------- Validation helpers ----------
_CODE_ROME_PATTERN = re.compile(r'^[A-Z]\d{4}$')


def validate_code_rome(code_rome: str) -> str:
    """Validate code_rome format. Returns the value or raises 422."""
    if not _CODE_ROME_PATTERN.match(code_rome):
        raise HTTPException(
            status_code=422,
            detail="Le code ROME doit être au format une lettre majuscule suivie de 4 chiffres (ex: M1805)"
        )
    return code_rome
