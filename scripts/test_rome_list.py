"""
Script pour tester la récupération de la liste des métiers (au lieu d'un métier spécifique).
"""
import sys
import io
import asyncio
import os
from pathlib import Path

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import httpx

load_dotenv()


async def test_list_endpoints():
    """Test récupération liste des métiers."""

    client_id = os.getenv("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")

    print("╔═══════════════════════════════════════════════╗")
    print("║  Test Liste Métiers API ROME                  ║")
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

    # 2. Tester liste des métiers (sans ID spécifique)
    list_urls = [
        "https://api.francetravail.io/partenaire/rome-metiers/v1/metiers",
        "https://api.francetravail.io/partenaire/rome-metiers/v1/appellation/metier",
        "https://api.francetravail.io/partenaire/rome-fiches-metiers/v1/metiers",
        "https://api.francetravail.io/partenaire/rome-fiches-metiers/v1/fiches",
        "https://api.francetravail.io/partenaire/rome/v4/metier",
        "https://api.francetravail.io/partenaire/rome/v4/appellation/metier",
    ]

    for test_url in list_urls:
        print(f"📡 Test: {test_url}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    test_url,
                    params={"limit": 5},  # Limiter pour tester
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json"
                    },
                    timeout=15.0
                )

                print(f"   Status: {response.status_code}")

                if response.status_code == 200:
                    data = response.json()
                    print(f"   ✅ SUCCESS !")
                    print(f"   Réponse: {str(data)[:200]}...\n")
                    return test_url
                else:
                    print(f"   Réponse: {response.text[:200]}")

        except Exception as e:
            print(f"   ❌ Exception: {type(e).__name__}: {e}")

        print()

    # 3. Test avec scope FICHES
    print("\n🔄 Test avec scope FICHES...\n")

    print("🔑 Ré-authentification avec scope fiches...")
    SCOPE_FICHES = "api_rome-fiches-metiersv1 nomenclatureRome"

    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.post(
                AUTH_URL,
                params={"realm": "/partenaire"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": SCOPE_FICHES
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15.0
            )
            auth_response.raise_for_status()
            token_fiches = auth_response.json()["access_token"]
            print(f"   ✅ Token fiches obtenu\n")
    except Exception as e:
        print(f"   ❌ Erreur auth: {e}")
        return

    fiches_urls = [
        "https://api.francetravail.io/partenaire/rome-fiches-metiers/v1/fiches/M1805",
        "https://api.francetravail.io/partenaire/rome-fiches-metiers/v1/metiers/M1805",
    ]

    for test_url in fiches_urls:
        print(f"📡 Test: {test_url}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    test_url,
                    headers={
                        "Authorization": f"Bearer {token_fiches}",
                        "Accept": "application/json"
                    },
                    timeout=15.0
                )

                print(f"   Status: {response.status_code}")

                if response.status_code == 200:
                    data = response.json()
                    print(f"   ✅ SUCCESS !")
                    print(f"   Code: {data.get('code', 'N/A')}")
                    print(f"   Réponse: {str(data)[:300]}...\n")
                    return test_url
                else:
                    print(f"   Réponse: {response.text[:200]}")

        except Exception as e:
            print(f"   ❌ Exception: {type(e).__name__}: {e}")

        print()

    print("⚠️  Aucune URL fonctionnelle trouvée.")


if __name__ == "__main__":
    asyncio.run(test_list_endpoints())
