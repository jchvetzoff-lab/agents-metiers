"""
Test complet du client ROME avec les bonnes URLs.
"""
import sys
import io
import asyncio
from pathlib import Path

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).parent.parent))

from sources.france_travail_rome import FranceTravailROMEClient
import os
from dotenv import load_dotenv

load_dotenv()


async def test_complete():
    """Test complet des 2 APIs ROME."""

    client = FranceTravailROMEClient(
        client_id=os.getenv("FRANCE_TRAVAIL_CLIENT_ID"),
        client_secret=os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")
    )

    print("=" * 70)
    print("TEST COMPLET CLIENT FRANCE TRAVAIL ROME API")
    print("=" * 70)

    # Test 1: API Metiers - Lire un metier specifique
    print("\n1. TEST API METIERS - Lire un metier (M1805)")
    print("-" * 70)
    try:
        metier = await client.get_metier("M1805")
        if metier:
            print(f"   SUCCESS !")
            print(f"   Code: {metier.get('code')}")
            print(f"   Libelle: {metier.get('libelle')}")
            print(f"   Definition: {metier.get('definition', '')[:150]}...")
            print(f"   Riasec Majeur: {metier.get('riasecMajeur')}")
            print(f"   Transition ecologique: {metier.get('transitionEcologique')}")
        else:
            print("   ERREUR: Metier non trouve")
    except Exception as e:
        print(f"   ERREUR: {type(e).__name__}: {e}")

    # Test 2: API Metiers - Lister quelques metiers
    print("\n2. TEST API METIERS - Lister les 5 premiers metiers")
    print("-" * 70)
    try:
        metiers = await client.get_all_metiers(limit=5)
        print(f"   SUCCESS ! {len(metiers)} metiers recuperes")
        for m in metiers[:3]:
            print(f"   - {m.get('code')}: {m.get('libelle')}")
    except Exception as e:
        print(f"   ERREUR: {type(e).__name__}: {e}")

    # Test 3: API Fiches - Lire une fiche metier
    print("\n3. TEST API FICHES - Lire fiche metier (M1805)")
    print("-" * 70)
    try:
        fiche = await client.get_fiche_metier("M1805")
        if fiche:
            print(f"   SUCCESS !")
            print(f"   Code: {fiche.get('code')}")
            metier_info = fiche.get('metier', {})
            print(f"   Metier: {metier_info.get('libelle')}")

            # Compétences
            competences = fiche.get('groupesCompetencesMobilisees', [])
            print(f"   Groupes de competences: {len(competences)}")
            if competences:
                first_group = competences[0]
                comps = first_group.get('competences', [])
                print(f"   Competences du 1er groupe: {len(comps)}")
                if comps:
                    print(f"     Exemple: {comps[0].get('libelle', 'N/A')}")

            # Savoirs
            savoirs = fiche.get('groupesSavoirs', [])
            print(f"   Groupes de savoirs: {len(savoirs)}")
        else:
            print("   ERREUR: Fiche non trouvee")
    except Exception as e:
        print(f"   ERREUR: {type(e).__name__}: {e}")

    # Test 4: Competences d'un metier
    print("\n4. TEST - Recuperer competences metier (M1805)")
    print("-" * 70)
    try:
        comp_data = await client.get_competences_metier("M1805")
        savoir_faire = comp_data.get('savoir_faire', [])
        savoirs = comp_data.get('savoirs', [])
        print(f"   SUCCESS !")
        print(f"   Savoir-faire: {len(savoir_faire)}")
        print(f"   Savoirs: {len(savoirs)}")
    except Exception as e:
        print(f"   ERREUR: {type(e).__name__}: {e}")

    # Test 5: Appellations d'un metier
    print("\n5. TEST - Recuperer appellations metier (M1805)")
    print("-" * 70)
    try:
        appellations = await client.get_appellations_metier("M1805")
        print(f"   SUCCESS ! {len(appellations)} appellations")
        for app in appellations[:5]:
            print(f"   - {app}")
    except Exception as e:
        print(f"   ERREUR: {type(e).__name__}: {e}")

    print("\n" + "=" * 70)
    print("TESTS TERMINES")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_complete())
