"""Test avec le bon endpoint ROME"""
import sys
import io
import asyncio
import os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import httpx

load_dotenv()

async def test():
    client_id = os.getenv('FRANCE_TRAVAIL_CLIENT_ID')
    client_secret = os.getenv('FRANCE_TRAVAIL_CLIENT_SECRET')

    print("Test avec le BON endpoint")
    print("=" * 60)

    # Auth
    async with httpx.AsyncClient() as client:
        auth_resp = await client.post(
            'https://entreprise.francetravail.fr/connexion/oauth2/access_token',
            params={'realm': '/partenaire'},
            data={
                'grant_type': 'client_credentials',
                'client_id': client_id,
                'client_secret': client_secret,
                'scope': 'api_rome-metiersv1 nomenclatureRome'
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15.0
        )
        token = auth_resp.json()['access_token']
        print('Token obtenu\n')

        # Test avec la BONNE URL : /metiers/metier/{code}
        url = 'https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/metier/M1805'
        print(f'URL testee: {url}\n')

        api_resp = await client.get(
            url,
            headers={
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json'
            },
            timeout=15.0
        )

        print(f'Status: {api_resp.status_code}')

        if api_resp.status_code == 200:
            data = api_resp.json()
            print(f'\nSUCCESS !')
            print(f'Code: {data.get("code")}')
            print(f'Libelle: {data.get("libelle")}')
            print(f'Definition: {data.get("definition", "")[:150]}...')
            print(f'\nCles disponibles: {list(data.keys())[:10]}')
        else:
            print(f'\nErreur: {api_resp.text}')

asyncio.run(test())
