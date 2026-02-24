"""
Script pour tester exhaustivement toutes les variantes d'endpoints ROME possibles.
"""
import sys
import io
import asyncio
import os
from pathlib import Path
from itertools import product

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import httpx

load_dotenv()


async def bruteforce_endpoints():
    """Test exhaustif de toutes les combinaisons d'endpoints possibles."""

    client_id = os.getenv("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")

    print("╔════════════════════════════════════════════════════╗")
    print("║  Bruteforce Endpoints API ROME - Test Exhaustif   ║")
    print("╚════════════════════════════════════════════════════╝\n")

    # 1. Authentification avec les deux scopes
    print("🔑 Authentification...\n")
    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"

    tokens = {}

    for scope_name, scope in [
        ("METIERS", "api_rome-metiersv1 nomenclatureRome"),
        ("FICHES", "api_rome-fiches-metiersv1 nomenclatureRome")
    ]:
        try:
            async with httpx.AsyncClient() as client:
                auth_response = await client.post(
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
                auth_response.raise_for_status()
                tokens[scope_name] = auth_response.json()["access_token"]
                print(f"   ✅ Token {scope_name} obtenu")
        except Exception as e:
            print(f"   ❌ Erreur auth {scope_name}: {e}")
            return

    print(f"\n{'='*60}\n")

    # 2. Définir toutes les variantes possibles
    bases = [
        "https://api.francetravail.io",
    ]

    prefixes = [
        "/partenaire",
        "",
    ]

    api_names_metiers = [
        "/rome-metiers",
        "/rome/metiers",
        "/rome",
        "/rome-4-0-metiers",
        "/rome4",
    ]

    api_names_fiches = [
        "/rome-fiches-metiers",
        "/rome/fiches-metiers",
        "/rome/fiches",
        "/rome-4-0-fiches-metiers",
        "/rome4/fiches",
    ]

    versions = [
        "/v1",
        "/v4",
        "",
    ]

    resources_metiers = [
        "/metier",
        "/metiers",
        "/appellation/metier",
        "/appellation",
    ]

    resources_fiches = [
        "/fiche",
        "/fiches",
        "/fiche-metier",
    ]

    code_variants = [
        "/M1805",
        "?code=M1805",
        "?codeRome=M1805",
        "?rome=M1805",
        "",  # Sans code pour tester liste
    ]

    successful_urls = []
    tested_count = 0

    # 3. Tester API METIERS
    print("📡 Test API METIERS\n")

    for base, prefix, api_name, version, resource, code in product(
        bases, prefixes, api_names_metiers, versions, resources_metiers, code_variants
    ):
        url = f"{base}{prefix}{api_name}{version}{resource}{code}"
        tested_count += 1

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {tokens['METIERS']}",
                        "Accept": "application/json"
                    },
                    timeout=10.0
                )

                if response.status_code == 200:
                    data = response.json()
                    print(f"\n🎉 SUCCESS !")
                    print(f"   URL: {url}")
                    print(f"   Status: {response.status_code}")
                    print(f"   Réponse: {str(data)[:300]}...")
                    successful_urls.append(("METIERS", url, data))

                    # Afficher les clés de la réponse pour comprendre la structure
                    if isinstance(data, dict):
                        print(f"   Clés: {list(data.keys())}")
                    elif isinstance(data, list) and len(data) > 0:
                        print(f"   Liste de {len(data)} éléments")
                        if isinstance(data[0], dict):
                            print(f"   Clés du 1er élément: {list(data[0].keys())}")
                    print()

        except httpx.HTTPStatusError:
            pass  # Ignorer les erreurs HTTP (404, 403, etc.)
        except Exception:
            pass  # Ignorer toutes les erreurs

        # Progress indicator
        if tested_count % 50 == 0:
            print(f"   ... {tested_count} URLs testées")

    print(f"\n{'='*60}\n")

    # 4. Tester API FICHES
    print("📡 Test API FICHES\n")

    tested_fiches = 0
    for base, prefix, api_name, version, resource, code in product(
        bases, prefixes, api_names_fiches, versions, resources_fiches, code_variants
    ):
        url = f"{base}{prefix}{api_name}{version}{resource}{code}"
        tested_fiches += 1

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {tokens['FICHES']}",
                        "Accept": "application/json"
                    },
                    timeout=10.0
                )

                if response.status_code == 200:
                    data = response.json()
                    print(f"\n🎉 SUCCESS !")
                    print(f"   URL: {url}")
                    print(f"   Status: {response.status_code}")
                    print(f"   Réponse: {str(data)[:300]}...")
                    successful_urls.append(("FICHES", url, data))

                    if isinstance(data, dict):
                        print(f"   Clés: {list(data.keys())}")
                    elif isinstance(data, list) and len(data) > 0:
                        print(f"   Liste de {len(data)} éléments")
                        if isinstance(data[0], dict):
                            print(f"   Clés du 1er élément: {list(data[0].keys())}")
                    print()

        except httpx.HTTPStatusError:
            pass
        except Exception:
            pass

        if tested_fiches % 50 == 0:
            print(f"   ... {tested_fiches} URLs testées")

    # 5. Résumé final
    print(f"\n{'='*60}")
    print(f"📊 RÉSUMÉ FINAL")
    print(f"{'='*60}\n")
    print(f"   URLs testées: {tested_count + tested_fiches}")
    print(f"   URLs réussies: {len(successful_urls)}\n")

    if successful_urls:
        print("✅ URLs FONCTIONNELLES TROUVÉES:\n")
        for api_type, url, data in successful_urls:
            print(f"   [{api_type}] {url}")
            print(f"            Preview: {str(data)[:100]}...")
            print()
    else:
        print("❌ Aucune URL fonctionnelle trouvée.")
        print("\n💡 Suggestions:")
        print("   1. Vérifier que l'application a bien accès aux APIs ROME")
        print("   2. Contacter le support France Travail pour la documentation exacte")
        print("   3. Vérifier les scopes OAuth2")


if __name__ == "__main__":
    asyncio.run(bruteforce_endpoints())
