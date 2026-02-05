"""
Test complet du pipeline d'enrichissement : API ROME → PostgreSQL → Claude.

Ce script va :
1. Récupérer 5 fiches depuis l'API ROME
2. Les créer dans PostgreSQL (via API backend)
3. Les enrichir avec Claude
4. Afficher les résultats
"""
import sys
import io
import asyncio
import os
from pathlib import Path
from datetime import datetime

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import httpx
from sources.france_travail_rome import FranceTravailROMEClient

load_dotenv()


# Configuration
API_BACKEND_URL = os.getenv("API_BACKEND_URL", "https://agents-metiers.onrender.com")
FICHES_TEST = [
    "M1805",  # Études et développement informatique
    "D1102",  # Boulangerie - viennoiserie
    "J1103",  # Médecin
    "K2111",  # Formation professionnelle
    "N4105",  # Conduite de transport de particuliers
]


async def test_enrichissement_complet():
    """Test complet du pipeline d'enrichissement."""

    print("=" * 80)
    print("TEST PIPELINE ENRICHISSEMENT COMPLET")
    print("=" * 80)
    print(f"Backend API: {API_BACKEND_URL}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()

    # 1. Initialiser le client ROME
    print("1️⃣  INITIALISATION CLIENT API ROME")
    print("-" * 80)

    client_rome = FranceTravailROMEClient(
        client_id=os.getenv("FRANCE_TRAVAIL_CLIENT_ID"),
        client_secret=os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")
    )
    print("✅ Client ROME initialisé")
    print()

    # 2. Récupérer et créer les fiches
    print("2️⃣  IMPORT FICHES DEPUIS API ROME")
    print("-" * 80)

    fiches_creees = []
    fiches_existantes = []

    async with httpx.AsyncClient(timeout=30.0) as http_client:
        for i, code_rome in enumerate(FICHES_TEST, 1):
            print(f"\n[{i}/{len(FICHES_TEST)}] Code ROME: {code_rome}")

            try:
                # Récupérer depuis API ROME
                metier = await client_rome.get_metier(code_rome)
                if not metier:
                    print(f"   ❌ Métier non trouvé dans API ROME")
                    continue

                print(f"   📖 Métier trouvé: {metier.get('libelle')}")

                # Créer dans PostgreSQL via API backend
                fiche_data = {
                    "code_rome": code_rome,
                    "nom_masculin": metier.get("libelle", ""),
                    "nom_feminin": metier.get("libelle", ""),
                    "nom_epicene": metier.get("libelle", ""),
                    "definition": metier.get("definition", ""),
                }

                response = await http_client.post(
                    f"{API_BACKEND_URL}/api/fiches",
                    json=fiche_data
                )

                if response.status_code == 201:
                    print(f"   ✅ Fiche créée dans PostgreSQL")
                    fiches_creees.append(code_rome)
                elif response.status_code == 400 and "existe déjà" in response.text:
                    print(f"   ⏭️  Fiche existe déjà, on continue")
                    fiches_existantes.append(code_rome)
                else:
                    print(f"   ❌ Erreur création: {response.status_code} - {response.text[:100]}")

            except Exception as e:
                print(f"   ❌ Erreur: {type(e).__name__}: {e}")

    print()
    print(f"📊 Résumé import:")
    print(f"   - Créées: {len(fiches_creees)}")
    print(f"   - Existantes: {len(fiches_existantes)}")
    print(f"   - Total à enrichir: {len(fiches_creees) + len(fiches_existantes)}")
    print()

    # 3. Enrichir les fiches
    print("3️⃣  ENRICHISSEMENT AVEC CLAUDE")
    print("-" * 80)

    fiches_a_enrichir = fiches_creees + fiches_existantes

    if not fiches_a_enrichir:
        print("❌ Aucune fiche à enrichir !")
        return

    async with httpx.AsyncClient(timeout=120.0) as http_client:
        for i, code_rome in enumerate(fiches_a_enrichir, 1):
            print(f"\n[{i}/{len(fiches_a_enrichir)}] Enrichissement: {code_rome}")

            try:
                # Lancer l'enrichissement via API backend
                response = await http_client.post(
                    f"{API_BACKEND_URL}/api/actions/enrich",
                    json={"codes_rome": [code_rome]}
                )

                if response.status_code == 200:
                    result = response.json()
                    print(f"   ✅ Enrichissement lancé")
                    print(f"   ⏳ Attendre 30-60 secondes...")

                    # Attendre que l'enrichissement se termine
                    await asyncio.sleep(45)  # Tempo pour Claude

                    # Vérifier le résultat
                    check_response = await http_client.get(
                        f"{API_BACKEND_URL}/api/fiches/{code_rome}"
                    )

                    if check_response.status_code == 200:
                        fiche = check_response.json()
                        description = fiche.get("description", "")
                        competences = fiche.get("competences", [])
                        formations = fiche.get("formations", [])

                        print(f"   📝 Description: {len(description)} caractères")
                        print(f"   💼 Compétences: {len(competences)}")
                        print(f"   🎓 Formations: {len(formations)}")

                        if description and len(description) > 50:
                            print(f"   ✅ Enrichissement réussi !")
                        else:
                            print(f"   ⚠️  Enrichissement partiel")
                    else:
                        print(f"   ❌ Erreur vérification: {check_response.status_code}")

                else:
                    print(f"   ❌ Erreur enrichissement: {response.status_code} - {response.text[:100]}")

            except Exception as e:
                print(f"   ❌ Erreur: {type(e).__name__}: {e}")

    print()

    # 4. Rapport final
    print("4️⃣  RAPPORT FINAL")
    print("-" * 80)

    async with httpx.AsyncClient(timeout=30.0) as http_client:
        try:
            stats_response = await http_client.get(f"{API_BACKEND_URL}/api/stats")
            if stats_response.status_code == 200:
                stats = stats_response.json()
                print(f"\n📊 Statistiques base de données:")
                print(f"   - Total fiches: {stats.get('total', 0)}")
                print(f"   - Brouillons: {stats.get('brouillons', 0)}")
                print(f"   - Publiées: {stats.get('publiees', 0)}")

            # Afficher détails de quelques fiches
            print(f"\n📋 Détails des fiches enrichies:")
            print()

            for code_rome in fiches_a_enrichir[:3]:  # Afficher les 3 premières
                response = await http_client.get(f"{API_BACKEND_URL}/api/fiches/{code_rome}")
                if response.status_code == 200:
                    fiche = response.json()
                    print(f"   🔹 {code_rome} - {fiche.get('nom_masculin', 'N/A')}")
                    print(f"      Statut: {fiche.get('statut', 'N/A')}")
                    description = fiche.get("description", "")
                    if description:
                        print(f"      Description: {description[:150]}...")
                    print(f"      Compétences: {len(fiche.get('competences', []))}")
                    print(f"      Formations: {len(fiche.get('formations', []))}")
                    print()

        except Exception as e:
            print(f"   ❌ Erreur rapport: {type(e).__name__}: {e}")

    print()
    print("=" * 80)
    print("✅ TEST TERMINÉ !")
    print("=" * 80)
    print()
    print("📖 Pour voir les fiches dans le frontend:")
    print(f"   👉 {API_BACKEND_URL.replace('onrender.com', 'vercel.app')}/fiches")
    print()


if __name__ == "__main__":
    asyncio.run(test_enrichissement_complet())
