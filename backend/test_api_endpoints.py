#!/usr/bin/env python3
"""
Test des endpoints API avec intégration INSEE.
"""

import asyncio
import json
import httpx
from pathlib import Path

BASE_URL = "http://127.0.0.1:8001"

async def test_endpoint(client, endpoint, description):
    """Test un endpoint spécifique."""
    print(f"\n🔍 Test: {description}")
    print(f"   GET {endpoint}")
    
    try:
        response = await client.get(endpoint)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Succès (200) - {len(json.dumps(data))} caractères")
            
            # Afficher quelques informations clés
            if "statistiques_nationales" in data:
                stats = data["statistiques_nationales"]
                print(f"      📊 Emplois: {stats.get('nb_emplois', 'N/A')}")
                print(f"      💰 Salaire médian: {stats.get('salaire_median', 'N/A')}€")
                print(f"      📈 Source: {stats.get('source', 'N/A')}")
                print(f"      🏛️ Données INSEE: {stats.get('insee_data_used', 'N/A')}")
            
            elif "region_name" in data:
                print(f"      🗺️  Région: {data.get('region_name', 'N/A')}")
                print(f"      💼 Offres: {data.get('nb_offres', 'N/A')}")
                if data.get("salaires"):
                    sal = data["salaires"]
                    print(f"      💰 Salaire médian: {sal.get('median', 'N/A')}€")
                print(f"      📈 Source: {data.get('source', 'N/A')}")
                print(f"      🏛️ Données INSEE: {data.get('insee_data_used', 'N/A')}")
                
        else:
            print(f"   ❌ Erreur ({response.status_code})")
            print(f"      {response.text}")
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")


async def main():
    """Fonction principale de test."""
    print("🧪 Tests des endpoints API avec intégration INSEE")
    print("="*60)
    
    # Configuration du client HTTP
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # Tester les endpoints base
        await test_endpoint(client, f"{BASE_URL}/", "Page d'accueil API")
        
        await test_endpoint(client, f"{BASE_URL}/api/regions", "Liste des régions")
        
        # Test des nouveaux endpoints INSEE
        codes_rome_test = ["M1805", "D1402", "J1102", "F1703"]
        
        for code_rome in codes_rome_test:
            
            # Test statistiques nationales
            await test_endpoint(
                client, 
                f"{BASE_URL}/api/fiches/{code_rome}/national",
                f"Statistiques nationales INSEE - {code_rome}"
            )
            
            # Test données régionales avec INSEE
            regions_test = ["11", "84", "93"]  # IDF, Auvergne-Rhône-Alpes, PACA
            
            for region in regions_test:
                await test_endpoint(
                    client, 
                    f"{BASE_URL}/api/fiches/{code_rome}/regional?region={region}",
                    f"Données régionales INSEE - {code_rome} région {region}"
                )
        
        print(f"\n{'='*60}")
        print("✅ Tests terminés")
        print("💡 Si vous voyez 'insee_data_used: True', l'intégration fonctionne !")
        print("💡 Si vous voyez 'source: insee_dares', les vraies données sont utilisées")


if __name__ == "__main__":
    print("⚠️  Assurez-vous que le serveur tourne sur http://127.0.0.1:8001")
    print("   Démarrez-le avec: python3 run_server.py")
    print()
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Arrêt des tests")
    except Exception as e:
        print(f"❌ Erreur: {e}")