"""
Script de migration pour ajouter la table variantes_fiches.
"""
from pathlib import Path
import sys

# Ajouter le répertoire parent au path pour pouvoir importer les modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from database.models import Base, VarianteFicheDB
from config import get_config


def migrate():
    """Crée la table variantes_fiches si elle n'existe pas."""
    config = get_config()
    engine = create_engine(f"sqlite:///{config.db_path}")

    print("Migration en cours...")
    print(f"Base de donnees : {config.db_path}")

    # Créer uniquement la table variantes_fiches
    VarianteFicheDB.__table__.create(engine, checkfirst=True)

    print("Table 'variantes_fiches' creee avec succes")
    print(f"Colonnes : code_rome, langue, tranche_age, format_contenu, genre")
    print(f"Index unique composite pour eviter les doublons")


if __name__ == "__main__":
    migrate()
