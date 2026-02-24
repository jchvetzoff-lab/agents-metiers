"""
Migration : ajouter les colonnes enrichies à la table fiches_metiers.
Exécuter une fois sur la DB PostgreSQL de production.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("DATABASE_URL non défini. Utilisation de la DB locale.")
    DATABASE_URL = "sqlite:///database/fiches_metiers.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

COLUMNS_TO_ADD = [
    ("missions_principales", "JSON"),
    ("acces_metier", "TEXT"),
    ("savoirs", "JSON"),
    ("autres_appellations", "JSON"),
    ("traits_personnalite", "JSON"),
    ("aptitudes", "JSON"),
    ("profil_riasec", "JSON"),
    ("competences_dimensions", "JSON"),
    ("domaine_professionnel", "JSON"),
    ("preferences_interets", "JSON"),
    ("sites_utiles", "JSON"),
    ("conditions_travail_detaillees", "JSON"),
    ("statuts_professionnels", "JSON"),
    ("niveau_formation", "VARCHAR(100)"),
    ("types_contrats", "JSON"),
    ("rome_update_pending", "INTEGER DEFAULT 0"),
    # Colonnes de validation IA
    ("validation_ia_score", "INTEGER"),
    ("validation_ia_date", "DATETIME"),
    ("validation_ia_details", "JSON"),
]

def migrate():
    with engine.connect() as conn:
        for col_name, col_type in COLUMNS_TO_ADD:
            try:
                conn.execute(text(f"ALTER TABLE fiches_metiers ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"  + {col_name} ({col_type})")
            except Exception as e:
                conn.rollback()
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"  = {col_name} (déjà existant)")
                else:
                    print(f"  ! {col_name} — erreur : {e}")
    print("\nMigration terminée.")

if __name__ == "__main__":
    migrate()
