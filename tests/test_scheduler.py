"""
Tests pour le planificateur de mises à jour mensuelles.
"""
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import (
    FicheMetier, MetadataFiche, StatutFiche,
    SalairesMetier, SalaireNiveau, PerspectivesMetier, TendanceMetier
)
from scheduler.monthly_update import MonthlyUpdateScheduler
from config import get_config


async def test_update_single_fiche():
    """Test de la mise à jour d'une seule fiche."""
    print("=== Test Mise a jour Fiche Unique ===\n")

    config = get_config()
    repo = Repository(config.db_path)

    # Créer une fiche de test publiée
    print("1. Creation d'une fiche de test...")
    fiche = FicheMetier(
        id="TEST_UPDATE",
        code_rome="TEST_UPDATE",
        nom_masculin="Developpeur Test",
        nom_feminin="Developpeuse Test",
        nom_epicene="Dev Test",
        description="Description initiale avant mise a jour",
        competences=["Python", "SQL"],
        formations=["Licence informatique"],
        salaires=SalairesMetier(
            junior=SalaireNiveau(min=30000, max=35000, median=32000),
            source="Test initial"
        ),
        perspectives=PerspectivesMetier(
            tension=0.5,
            tendance=TendanceMetier.STABLE
        ),
        metadata=MetadataFiche(
            statut=StatutFiche.PUBLIEE,
            source="Test"
        )
    )

    repo.upsert_fiche(fiche)
    print(f"OK Fiche creee : {fiche.code_rome}\n")

    # Initialiser le scheduler (mode simulation)
    print("2. Initialisation du scheduler...")
    scheduler = MonthlyUpdateScheduler(repository=repo, claude_client=None)
    print("OK Scheduler initialise en mode simulation\n")

    # Mettre à jour la fiche
    print("3. Mise a jour de la fiche...")
    result = await scheduler.update_single_fiche("TEST_UPDATE")

    if result["status"] == "success":
        print(f"OK Mise a jour reussie pour {result['code_rome']}")
        print(f"   Nom : {result['nom']}\n")
    else:
        print(f"ERREUR : {result.get('error', 'Erreur inconnue')}\n")
        return False

    # Vérifier que la fiche a été mise à jour
    print("4. Verification de la mise a jour...")
    fiche_updated = repo.get_fiche("TEST_UPDATE")

    if fiche_updated.metadata.version > fiche.metadata.version:
        print(f"OK Version incrementee : {fiche.metadata.version} -> {fiche_updated.metadata.version}")
    else:
        print(f"ERREUR Version non incrementee : {fiche_updated.metadata.version}")
        return False

    print("\n=== Test reussi ! ===")
    return True


async def test_monthly_update_batch():
    """Test de la mise à jour mensuelle en batch."""
    print("\n=== Test Mise a jour Mensuelle Batch ===\n")

    config = get_config()
    repo = Repository(config.db_path)

    # Créer 3 fiches de test publiées
    print("1. Creation de 3 fiches de test...")
    for i in range(1, 4):
        fiche = FicheMetier(
            id=f"TEST_BATCH_{i}",
            code_rome=f"TEST_BATCH_{i}",
            nom_masculin=f"Metier Test {i}",
            nom_feminin=f"Metier Test {i}",
            nom_epicene=f"Metier Test {i}",
            description=f"Description {i}",
            competences=["Competence 1"],
            salaires=SalairesMetier(),
            perspectives=PerspectivesMetier(),
            metadata=MetadataFiche(
                statut=StatutFiche.PUBLIEE,
                source="Test Batch"
            )
        )
        repo.upsert_fiche(fiche)

    print("OK 3 fiches creees\n")

    # Initialiser le scheduler
    print("2. Initialisation du scheduler...")
    scheduler = MonthlyUpdateScheduler(repository=repo, claude_client=None)
    print("OK Scheduler initialise\n")

    # Lancer la mise à jour mensuelle
    print("3. Lancement de la mise a jour mensuelle...")
    result = await scheduler.update_all_published_fiches()

    print(f"OK Mise a jour terminee")
    print(f"   Total : {result['nb_total']} fiches")
    print(f"   Mises a jour : {result['nb_mises_a_jour']}")
    print(f"   Erreurs : {result['nb_erreurs']}")
    print(f"   Duree : {result['duration']:.2f}s\n")

    # Vérifier qu'au moins les 3 fiches de test ont été traitées
    if result['nb_total'] >= 3:
        print("OK Au moins 3 fiches publiees trouvees")
    else:
        print(f"ERREUR Seulement {result['nb_total']} fiches trouvees")
        return False

    print("\n=== Test reussi ! ===")
    return True


if __name__ == "__main__":
    try:
        # Test 1 : Mise à jour d'une fiche
        asyncio.run(test_update_single_fiche())

        # Test 2 : Mise à jour batch
        asyncio.run(test_monthly_update_batch())

        print("\n=== Tous les tests sont passes ! ===")

    except AssertionError as e:
        print(f"\nERREUR Echec du test : {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nERREUR Erreur inattendue : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
