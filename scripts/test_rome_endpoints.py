"""
Script pour tester différentes URLs d'endpoints ROME.
"""
import sys
import io
import asyncio
import os
from pathlib import Path

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ajouter le dossier parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import httpx

# Charger les variables d'environnement
load_dotenv()


async def test_endpoints():
    """Test différentes variantes d'URL pour l'API ROME."""

    client_id = os.getenv("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")

    print("╔═══════════════════════════════════════════════╗")
    print("║  Test Endpoints API ROME                      ║")
    print("╚═══════════════════════════════════════════════╝\n")

    # 1. Authentification
    print("🔑 Authentification...")
    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"
    SCOPE = "api_rome-metiersv1 nomenclatureRome"

    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.post(
                AUTH_URL,
                params={"realm": "/partenaire"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": SCOPE
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15.0
            )
            auth_response.raise_for_status()
            token = auth_response.json()["access_token"]
            print(f"   ✅ Token obtenu\n")
    except Exception as e:
        print(f"   ❌ Erreur auth: {e}")
        return

    # 2. Tester différentes URLs
    base_urls = [
        "https://api.francetravail.io/partenaire/rome-metiers/v1/metiers",
        "https://api.francetravail.io/rome-metiers/v1/metiers",
        "https://api.francetravail.io/partenaire/rome/v1/metiers",
        "https://api.francetravail.io/rome/v1/metiers",
        "https://api.francetravail.io/partenaire/v1/rome/metiers",
    ]

    for base_url in base_urls:
        test_url = f"{base_url}/M1805"
        print(f"📡 Test: {test_url}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    test_url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json"
                    },
                    timeout=15.0
                )

                if response.status_code == 200:
                    data = response.json()
                    print(f"   ✅ SUCCESS ! Code: {data.get('code', 'N/A')}")
                    print(f"   Libellé: {data.get('libelle', 'N/A')}")
                    print(f"   URL correcte trouvée: {base_url}\n")
                    return base_url
                else:
                    print(f"   ❌ Erreur {response.status_code}")

        except httpx.HTTPStatusError as e:
            print(f"   ❌ HTTP {e.response.status_code}")
        except Exception as e:
            print(f"   ❌ Exception: {type(e).__name__}")

        print()

    print("⚠️  Aucune URL fonctionnelle trouvée. Vérifier la documentation.")


if __name__ == "__main__":
    asyncio.run(test_endpoints())
