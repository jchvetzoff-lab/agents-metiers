"""
Script pour corriger les permissions de la base de données SQLite.

Résout l'erreur : "attempt to write a readonly database"

Usage:
    python scripts/fix_permissions.py
"""
import sys
import os
import stat
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import get_config


def fix_permissions():
    """Corrige les permissions de la base de données et des dossiers."""
    print("=== Correction des Permissions ===\n")

    config = get_config()
    db_path = Path(config.db_path)
    db_dir = db_path.parent

    # 1. Créer les dossiers nécessaires s'ils n'existent pas
    print("1. Verification des dossiers...")

    directories = [
        db_dir,
        Path("data/rapports"),
        Path("data/fiches"),
        Path("data/rome")
    ]

    for directory in directories:
        if not directory.exists():
            print(f"   Creation du dossier : {directory}")
            directory.mkdir(parents=True, exist_ok=True)
        else:
            print(f"   OK Dossier existe : {directory}")

    print()

    # 2. Corriger les permissions du dossier database
    print("2. Correction des permissions du dossier database...")
    try:
        # Lecture + Ecriture + Execution pour le propriétaire et le groupe
        os.chmod(db_dir, stat.S_IRWXU | stat.S_IRWXG | stat.S_IROTH | stat.S_IXOTH)
        print(f"   OK Permissions corrigees : {db_dir}")
    except Exception as e:
        print(f"   ERREUR : {e}")

    print()

    # 3. Corriger les permissions du fichier de base de données
    print("3. Correction des permissions de la base de donnees...")

    if db_path.exists():
        try:
            # Lecture + Ecriture pour le propriétaire et le groupe
            os.chmod(db_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH)
            print(f"   OK Permissions corrigees : {db_path}")

            # Vérifier les permissions
            file_stat = os.stat(db_path)
            mode = stat.filemode(file_stat.st_mode)
            print(f"   Permissions actuelles : {mode}")
        except Exception as e:
            print(f"   ERREUR : {e}")
    else:
        print(f"   ATTENTION : Le fichier n'existe pas encore : {db_path}")
        print(f"   Il sera cree au premier lancement de l'application")

    print()

    # 4. Tester l'écriture
    print("4. Test d'ecriture...")

    if db_path.exists():
        try:
            from database.repository import Repository

            repo = Repository(db_path)
            repo.init_db()

            # Compter les fiches (lecture)
            count = repo.count_fiches()
            print(f"   OK Lecture : {count} fiches trouvees")

            # Tenter une opération d'écriture simple (log audit)
            from database.models import AuditLog, TypeEvenement

            try:
                repo.add_audit_log(AuditLog(
                    type_evenement=TypeEvenement.MODIFICATION,
                    agent="TestPermissions",
                    description="Test des permissions d'ecriture"
                ))
                print(f"   OK Ecriture : Log d'audit cree avec succes")
            except Exception as write_error:
                print(f"   ERREUR Ecriture : {write_error}")
                print(f"\n   SOLUTION Windows :")
                print(f"   1. Fermez tous les programmes qui utilisent la base")
                print(f"   2. Clic droit sur {db_path} > Proprietes > Securite")
                print(f"   3. Verifiez que votre utilisateur a les droits 'Modifier'")

        except Exception as e:
            print(f"   ERREUR Test : {e}")
    else:
        print(f"   SKIP : Base de donnees non creee")

    print("\n=== Termine ===")


if __name__ == "__main__":
    fix_permissions()
