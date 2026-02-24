"""
Script pour tester l'authentification avec l'API ROME de France Travail.
"""
import sys
import io
import asyncio
import os
from pathlib import Path
from datetime import datetime, timedelta

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ajouter le dossier parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import httpx

# Charger les variables d'environnement
load_dotenv()


async def test_auth():
    """Test d'authentification OAuth2 avec les bons scopes."""

    client_id = os.getenv("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")

    if not client_id or not client_secret:
        print("❌ Erreur: FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET doivent être définis dans .env")
        return False

    print("╔═══════════════════════════════════════════════╗")
    print("║  Test Authentification API ROME France Travail  ║")
    print("╚═══════════════════════════════════════════════╝\n")

    print(f"🔑 Client ID: {client_id[:20]}...")
    print(f"🔐 Client Secret: ***{client_secret[-8:]}\n")

    # URLs et scopes
    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"

    # Scopes fournis par France Travail (5 fév. 2026)
    scopes = {
        "API ROME Métiers": "api_rome-metiersv1 nomenclatureRome",
        "API ROME Fiches": "api_rome-fiches-metiersv1 nomenclatureRome"
    }

    success_count = 0

    for api_name, scope in scopes.items():
        print(f"📡 Test {api_name}...")
        print(f"   Scope: {scope}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    AUTH_URL,
                    params={"realm": "/partenaire"},
                    data={
                        "grant_type": "client_credentials",
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "scope": scope
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=15.0
                )

                if response.status_code == 200:
                    data = response.json()
                    token = data.get("access_token", "")
                    expires_in = data.get("expires_in", 0)

                    print(f"   ✅ Authentification réussie !")
                    print(f"   Token: {token[:30]}...{token[-10:]}")
                    print(f"   Expire dans: {expires_in}s (~{expires_in//60} min)\n")
                    success_count += 1
                else:
                    print(f"   ❌ Erreur {response.status_code}")
                    print(f"   Réponse: {response.text}\n")

        except Exception as e:
            print(f"   ❌ Exception: {type(e).__name__}: {e}\n")

    print("=" * 50)
    print(f"📊 Résultat: {success_count}/{len(scopes)} APIs authentifiées\n")

    if success_count == len(scopes):
        print("🎉 Tous les tests réussis ! Les scopes sont corrects.")
        return True
    else:
        print("⚠️  Certains scopes ont échoué. Vérifier les credentials.")
        return False


async def test_api_call():
    """Test d'un appel réel à l'API ROME après authentification."""

    client_id = os.getenv("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")

    print("\n╔═══════════════════════════════════════════════╗")
    print("║  Test Appel API ROME - Récupération Métier   ║")
    print("╚═══════════════════════════════════════════════╝\n")

    # 1. Authentification
    print("1️⃣ Authentification...")
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
        return False

    # 2. Appel API Métiers
    print("2️⃣ Récupération métier M1805 (Développement informatique)...")
    API_URL = "https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/M1805"

    try:
        async with httpx.AsyncClient() as client:
            api_response = await client.get(
                API_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json"
                },
                timeout=15.0
            )
            api_response.raise_for_status()
            data = api_response.json()

            print(f"   ✅ Métier récupéré !")
            print(f"   Code: {data.get('code', 'N/A')}")
            print(f"   Libellé: {data.get('libelle', 'N/A')}")
            print(f"   Riasec: {data.get('riasec', 'N/A')}\n")

            print("🎉 Test API réussi ! Le client fonctionne parfaitement.")
            return True

    except httpx.HTTPStatusError as e:
        print(f"   ❌ Erreur HTTP {e.response.status_code}")
        print(f"   Réponse: {e.response.text}")
        return False
    except Exception as e:
        print(f"   ❌ Exception: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    # Test 1: Authentification
    auth_ok = asyncio.run(test_auth())

    # Test 2: Appel API si auth OK
    if auth_ok:
        asyncio.run(test_api_call())
