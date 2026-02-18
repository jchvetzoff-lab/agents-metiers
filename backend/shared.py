"""
Shared dependencies - Repository and Config.
Provides shared database and configuration access for all modules.
"""

import sys
from pathlib import Path

# Ajouter le chemin vers le projet agents-metiers existant
AGENTS_METIERS_PATH = Path(__file__).parent.parent.parent / "agents-metiers"
sys.path.insert(0, str(AGENTS_METIERS_PATH))

# Local imports after path setup
from database.repository import Repository
from config import get_config

# Initialize configuration and repository
config = get_config()
repo = Repository(
    db_path=config.db_path if not config.database.database_url else None,
    database_url=config.database.database_url
)
repo.init_db()