#!/usr/bin/env python3
"""
Point d'entrée principal du système multi-agents pour les fiches métiers.

Usage:
    python main.py --init          # Initialiser la base de données
    python main.py --import-rome   # Importer le référentiel ROME
    python main.py --veille        # Lancer la veille automatique
    python main.py --check M1805   # Vérifier une fiche spécifique
    python main.py --serve         # Démarrer le service de veille continue

Pour plus d'options: python main.py --help
"""
import asyncio
import sys
from pathlib import Path

# Ajouter le répertoire courant au path pour les imports
sys.path.insert(0, str(Path(__file__).parent))

# Charger les variables d'environnement depuis .env
from dotenv import load_dotenv
load_dotenv()

from interface.cli import cli


def main():
    """Point d'entrée principal."""
    try:
        cli()
    except KeyboardInterrupt:
        print("\nInterruption par l'utilisateur")
        sys.exit(0)
    except Exception as e:
        print(f"Erreur: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
