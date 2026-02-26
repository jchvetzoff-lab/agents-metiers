"""
Test de bout en bout pour le système de variantes.
"""
import sys
import asyncio
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import (
    FicheMetier, MetadataFiche, StatutFiche,
    SalairesMetier, SalaireNiveau, PerspectivesMetier, TendanceMetier,
    LangueSupporte, TrancheAge, FormatContenu, GenreGrammatical
)
from agents.redacteur_fiche import AgentRedacteurFiche
from config import get_config


@pytest.mark.skipif(
    not hasattr(pytest, "mark") or True,
    reason="E2E test — requires Claude API key and pytest-asyncio; run manually with: python tests/test_e2e_variantes.py"
)
async def test_generation_variantes():
    """Test complet de generation de variantes."""
    print("=== Test E2E Generation Variantes ===\n")

    config = get_config()
    repo = Repository(config.db_path)

    # 1. Creer une fiche de test
    print("1. Creation d'une fiche de test...")
    fiche = FicheMetier(
        id="TEST_VAR",
        code_rome="TEST_VAR",
        nom_masculin="Developpeur Python",
        nom_feminin="Developpeuse Python",
        nom_epicene="Developpeur·euse Python",
        description="Le developpeur Python concoit et maintient des applications logicielles. Il analyse les besoins, code les solutions et assure leur qualite.",
        description_courte="Creation d'applications logicielles en Python",
        competences=["Python", "SQL", "Git", "API REST", "Tests unitaires"],
        competences_transversales=["Travail en equipe", "Resolution de problemes", "Communication"],
        formations=["Licence informatique", "Master informatique", "Ecole d'ingenieurs"],
        certifications=["Certification Python"],
        conditions_travail=["Travail en bureau", "Teletravail possible", "Horaires flexibles"],
        environnements=["ESN", "Startup", "Grand groupe"],
        secteurs_activite=["Informatique", "Services numeriques"],
        salaires=SalairesMetier(
            junior=SalaireNiveau(min=30000, max=38000, median=34000),
            confirme=SalaireNiveau(min=38000, max=55000, median=46000),
            senior=SalaireNiveau(min=55000, max=75000, median=65000),
            source="Test"
        ),
        perspectives=PerspectivesMetier(
            tension=0.7,
            tendance=TendanceMetier.STABLE,
            evolution_5ans="Metier en forte demande"
        ),
        metadata=MetadataFiche(
            statut=StatutFiche.PUBLIEE,
            source="Test E2E"
        )
    )

    repo.upsert_fiche(fiche)
    print(f"OK Fiche creee : {fiche.code_rome}\n")

    # 2. Initialiser l'agent redacteur
    print("2. Initialisation de l'agent redacteur...")
    agent = AgentRedacteurFiche(repository=repo, claude_client=None)  # Mode simulation
    print("OK Agent initialise en mode simulation\n")

    # 3. Generer un sous-ensemble de variantes (2 langues x 1 age x 2 formats x 2 genres = 8 variantes)
    print("3. Generation de 8 variantes (FR+EN, adulte, std+FALC, masc+fem)...")

    variantes = await agent.generer_variantes(
        fiche=fiche,
        langues=[LangueSupporte.FR, LangueSupporte.EN],
        tranches_age=[TrancheAge.ADULTE],
        formats=[FormatContenu.STANDARD, FormatContenu.FALC],
        genres=[GenreGrammatical.MASCULIN, GenreGrammatical.FEMININ]
    )

    print(f"OK {len(variantes)} variantes generees\n")

    # 4. Sauvegarder les variantes
    print("4. Sauvegarde des variantes en base de donnees...")
    nb_saved = 0
    for variante in variantes:
        repo.save_variante(variante)
        nb_saved += 1
        print(f"  - {variante.langue.value} | {variante.tranche_age.value} | {variante.format_contenu.value} | {variante.genre.value}")

    print(f"OK {nb_saved} variantes sauvegardees\n")

    # 5. Verifier le comptage
    print("5. Verification...")
    count = repo.count_variantes("TEST_VAR")
    print(f"Nombre de variantes en base : {count}")
    assert count == 8, f"Attendu 8 variantes, trouve {count}"
    print("OK Comptage correct\n")

    # 6. Recuperer une variante specifique
    print("6. Recuperation d'une variante specifique (EN, adulte, FALC, feminin)...")
    variante_test = repo.get_variante(
        code_rome="TEST_VAR",
        langue=LangueSupporte.EN,
        tranche_age=TrancheAge.ADULTE,
        format_contenu=FormatContenu.FALC,
        genre=GenreGrammatical.FEMININ
    )

    assert variante_test is not None, "Variante non trouvee"
    print(f"OK Variante recuperee : {variante_test.nom}")
    print(f"  Description : {variante_test.description[:100]}...\n")

    # 7. Lister toutes les variantes
    print("7. Liste de toutes les variantes pour TEST_VAR...")
    all_variantes = repo.get_all_variantes("TEST_VAR")
    print(f"Total : {len(all_variantes)} variantes")

    for v in all_variantes:
        print(f"  {v.langue.value} | {v.tranche_age.value} | {v.format_contenu.value} | {v.genre.value} => {v.nom}")

    print("\n=== Test E2E reussi ! ===")


if __name__ == "__main__":
    try:
        asyncio.run(test_generation_variantes())
    except AssertionError as e:
        print(f"\nERREUR Echec du test : {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nERREUR Erreur inattendue : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
