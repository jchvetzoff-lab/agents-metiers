"""
Tests unitaires pour le système de variantes de fiches métiers.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import (
    VarianteFiche, LangueSupporte, TrancheAge, FormatContenu, GenreGrammatical,
    FicheMetier, MetadataFiche, StatutFiche
)
from config import get_config


def test_save_and_get_variante():
    """Test de sauvegarde et récupération d'une variante."""
    config = get_config()
    repo = Repository(config.db_path)

    # Créer une variante test
    variante = VarianteFiche(
        code_rome="M1805",
        langue=LangueSupporte.FR,
        tranche_age=TrancheAge.ADULTE,
        format_contenu=FormatContenu.STANDARD,
        genre=GenreGrammatical.MASCULIN,
        nom="Développeur / Développeuse informatique",
        description="Test description pour développeur informatique.",
        competences=["Python", "SQL", "Git"],
        formations=["Licence informatique", "Master informatique"]
    )

    # Sauvegarder
    saved = repo.save_variante(variante)
    print(f"Variante sauvegardee avec ID: {saved.id}")

    # Récupérer
    retrieved = repo.get_variante(
        code_rome="M1805",
        langue=LangueSupporte.FR,
        tranche_age=TrancheAge.ADULTE,
        format_contenu=FormatContenu.STANDARD,
        genre=GenreGrammatical.MASCULIN
    )

    assert retrieved is not None, "Variante non trouvee"
    assert retrieved.nom == variante.nom
    assert retrieved.description == variante.description
    assert len(retrieved.competences) == 3
    print("Test save and get: OK")


def test_upsert_variante():
    """Test de l'upsert (mise à jour si existe)."""
    config = get_config()
    repo = Repository(config.db_path)

    # Première sauvegarde
    variante1 = VarianteFiche(
        code_rome="M1805",
        langue=LangueSupporte.EN,
        tranche_age=TrancheAge.ADULTE,
        format_contenu=FormatContenu.STANDARD,
        genre=GenreGrammatical.MASCULIN,
        nom="Software Developer",
        description="First version",
        competences=["Java", "Python"]
    )
    saved1 = repo.save_variante(variante1)
    version1 = saved1.version

    # Seconde sauvegarde (même clé)
    variante2 = VarianteFiche(
        code_rome="M1805",
        langue=LangueSupporte.EN,
        tranche_age=TrancheAge.ADULTE,
        format_contenu=FormatContenu.STANDARD,
        genre=GenreGrammatical.MASCULIN,
        nom="Software Developer",
        description="Second version UPDATED",
        competences=["Java", "Python", "Docker"]
    )
    saved2 = repo.save_variante(variante2)
    version2 = saved2.version

    assert version2 == version1 + 1, "Version non incrementee"
    assert saved2.description == "Second version UPDATED"
    print("Test upsert: OK")


def test_count_variantes():
    """Test du comptage des variantes."""
    config = get_config()
    repo = Repository(config.db_path)

    # Nettoyer les variantes existantes pour M1805
    # (optionnel, pour des tests propres)
    count_before = repo.count_variantes("M1805")
    print(f"Variantes existantes pour M1805: {count_before}")

    # Ajouter quelques variantes
    for genre in [GenreGrammatical.MASCULIN, GenreGrammatical.FEMININ]:
        for format_contenu in [FormatContenu.STANDARD, FormatContenu.FALC]:
            variante = VarianteFiche(
                code_rome="M1805",
                langue=LangueSupporte.FR,
                tranche_age=TrancheAge.ADULTE,
                format_contenu=format_contenu,
                genre=genre,
                nom=f"Dev {genre.value} {format_contenu.value}",
                description="Test"
            )
            repo.save_variante(variante)

    count_after = repo.count_variantes("M1805")
    print(f"Variantes apres ajouts: {count_after}")
    assert count_after >= 4, "Nombre de variantes insuffisant"
    print("Test count: OK")


def test_get_all_variantes():
    """Test de récupération de toutes les variantes."""
    config = get_config()
    repo = Repository(config.db_path)

    variantes = repo.get_all_variantes("M1805")
    print(f"Nombre total de variantes pour M1805: {len(variantes)}")

    for v in variantes[:3]:  # Afficher les 3 premières
        print(f"  - {v.langue.value} | {v.tranche_age.value} | {v.format_contenu.value} | {v.genre.value} : {v.nom}")

    assert len(variantes) > 0, "Aucune variante trouvee"
    print("Test get_all: OK")


def test_unique_constraint():
    """Test de la contrainte d'unicité."""
    config = get_config()
    repo = Repository(config.db_path)

    # Même variante deux fois (doit faire un upsert)
    variante = VarianteFiche(
        code_rome="TEST01",
        langue=LangueSupporte.FR,
        tranche_age=TrancheAge.ADULTE,
        format_contenu=FormatContenu.STANDARD,
        genre=GenreGrammatical.MASCULIN,
        nom="Test Unique Constraint",
        description="Version 1"
    )

    saved1 = repo.save_variante(variante)
    id1 = saved1.id

    variante.description = "Version 2 UPDATED"
    saved2 = repo.save_variante(variante)
    id2 = saved2.id

    assert id1 == id2, "L'ID devrait etre le meme (upsert)"
    assert saved2.version == saved1.version + 1
    print("Test unique constraint: OK")


if __name__ == "__main__":
    print("=== Tests Unitaires Variantes ===\n")

    try:
        test_save_and_get_variante()
        print()
        test_upsert_variante()
        print()
        test_count_variantes()
        print()
        test_get_all_variantes()
        print()
        test_unique_constraint()
        print("\n=== Tous les tests sont passes ! ===")
    except AssertionError as e:
        print(f"\nEchec du test: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nErreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
