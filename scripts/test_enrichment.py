"""
Script pour tester l'enrichissement d'une fiche avec l'agent rédacteur.
"""
import sys
import asyncio
import io
from pathlib import Path

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ajouter le dossier parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

import os
from dotenv import load_dotenv

from database.repository import Repository
from agents.redacteur_fiche import AgentRedacteurFiche

# Charger les variables d'environnement
load_dotenv()


async def test_enrichment(code_rome: str):
    """
    Teste l'enrichissement d'une fiche.

    Args:
        code_rome: Code ROME de la fiche à enrichir
    """
    # Config
    db_path = Path(__file__).parent.parent / "database" / "fiches_metiers.db"
    repo = Repository(db_path=str(db_path))

    print(f"🔍 Récupération de la fiche {code_rome}...")

    # Vérifier que la fiche existe
    fiche = repo.get_fiche(code_rome)
    if not fiche:
        print(f"❌ Fiche {code_rome} non trouvée !")
        return

    print(f"✅ Fiche trouvée : {fiche.nom_masculin}")
    print(f"   Code : {fiche.code_rome}")
    if fiche.description:
        print(f"   Description : {fiche.description[:100]}...")

    # Créer l'agent
    print(f"\n🤖 Initialisation de l'agent rédacteur...")
    agent = AgentRedacteurFiche(repository=repo)

    # Enrichir la fiche
    print(f"\n✨ Enrichissement en cours...")
    print(f"   (Cela peut prendre 30-60 secondes)\n")

    try:
        # Enrichir avec l'objet fiche, pas le code
        fiche_enrichie = await agent.enrichir_fiche(fiche)

        # Sauvegarder dans la base
        repo.update_fiche(fiche_enrichie)

        print(f"\n🎉 Enrichissement terminé !\n")
        print(f"📄 Résultat :")
        print(f"   Code ROME : {fiche_enrichie.code_rome}")
        print(f"   Nom : {fiche_enrichie.nom_masculin}")

        if fiche_enrichie.description:
            print(f"\n📝 Description ({len(fiche_enrichie.description)} caractères) :")
            print(f"   {fiche_enrichie.description[:200]}...")

        if fiche_enrichie.description_courte:
            print(f"\n📋 Description courte :")
            print(f"   {fiche_enrichie.description_courte}")

        if fiche_enrichie.competences:
            print(f"\n💼 Compétences ({len(fiche_enrichie.competences)}) :")
            for comp in fiche_enrichie.competences[:5]:
                print(f"   • {comp}")
            if len(fiche_enrichie.competences) > 5:
                print(f"   ... et {len(fiche_enrichie.competences) - 5} autres")

        if fiche_enrichie.formations:
            print(f"\n🎓 Formations ({len(fiche_enrichie.formations)}) :")
            for form in fiche_enrichie.formations[:3]:
                print(f"   • {form}")

        if fiche_enrichie.secteurs_activite:
            print(f"\n🏭 Secteurs d'activité ({len(fiche_enrichie.secteurs_activite)}) :")
            for sect in fiche_enrichie.secteurs_activite[:3]:
                print(f"   • {sect}")

        print(f"\n✅ Fiche enrichie avec succès !")
        print(f"   Voir sur le frontend : http://localhost:3000/fiches/{code_rome}")

    except Exception as e:
        print(f"\n❌ Erreur lors de l'enrichissement :")
        print(f"   {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Code ROME à enrichir (par défaut : Développeur informatique)
    code = sys.argv[1] if len(sys.argv) > 1 else "M1805"

    print(f"╔═══════════════════════════════════════╗")
    print(f"║  Test Enrichissement Agent Rédacteur  ║")
    print(f"╚═══════════════════════════════════════╝\n")

    asyncio.run(test_enrichment(code))
