#!/usr/bin/env python3
"""
Script de démarrage du serveur FastAPI avec intégration INSEE.
"""

import uvicorn
import sys
from pathlib import Path

# Ajouter le chemin du projet
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

if __name__ == "__main__":
    print("🚀 Démarrage du serveur Agents Métiers avec intégration INSEE...")
    print("📊 Nouveaux endpoints disponibles:")
    print("   - GET /api/fiches/{code_rome}/national")
    print("   - GET /api/fiches/{code_rome}/regional?region={code}")
    print("💾 Source des données: INSEE/DARES avec fallback intelligent")
    print()
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1", 
        port=8001,  # Port différent pour éviter les conflits
        reload=True,
        log_level="info"
    )