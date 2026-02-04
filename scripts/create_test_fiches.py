"""
Script pour créer des fiches de test dans la base de données.
"""
import sys
import io
from pathlib import Path

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ajouter le dossier parent au path pour importer les modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.models import FicheMetier, MetadataFiche, StatutFiche
from database.repository import Repository

# Fiches de test (codes ROME réels)
FICHES_TEST = [
    {
        "code_rome": "M1805",
        "nom_masculin": "Études et développement informatique",
        "nom_feminin": "Études et développement informatique",
        "nom_epicene": "Études et développement informatique",
    },
    {
        "code_rome": "D1102",
        "nom_masculin": "Boulanger / Boulangère",
        "nom_feminin": "Boulangère",
        "nom_epicene": "Personne exerçant la boulangerie",
    },
    {
        "code_rome": "J1103",
        "nom_masculin": "Médecin",
        "nom_feminin": "Médecin",
        "nom_epicene": "Médecin",
    },
    {
        "code_rome": "K2111",
        "nom_masculin": "Professeur / Professeure des écoles",
        "nom_feminin": "Professeure des écoles",
        "nom_epicene": "Enseignant·e des écoles",
    },
    {
        "code_rome": "N4105",
        "nom_masculin": "Conducteur / Conductrice de bus",
        "nom_feminin": "Conductrice de bus",
        "nom_epicene": "Personne conduisant un bus",
    },
    {
        "code_rome": "I1203",
        "nom_masculin": "Électricien / Électricienne",
        "nom_feminin": "Électricienne",
        "nom_epicene": "Professionnel·le de l'électricité",
    },
    {
        "code_rome": "K1801",
        "nom_masculin": "Conseiller / Conseillère clientèle",
        "nom_feminin": "Conseillère clientèle",
        "nom_epicene": "Personne conseillant la clientèle",
    },
    {
        "code_rome": "E1103",
        "nom_masculin": "Graphiste",
        "nom_feminin": "Graphiste",
        "nom_epicene": "Graphiste",
    },
]


def create_test_fiches():
    """Crée les fiches de test dans la base de données."""
    # Chemin vers la base de données
    db_path = Path(__file__).parent.parent / "database" / "fiches_metiers.db"
    repo = Repository(db_path=str(db_path))

    created = []
    skipped = []

    print("🚀 Création des fiches de test...\n")

    for data in FICHES_TEST:
        code = data["code_rome"]

        # Vérifier si la fiche existe déjà
        existing = repo.get_fiche(code)
        if existing:
            print(f"⏭️  {code} - Existe déjà, ignorée")
            skipped.append(code)
            continue

        # Créer la fiche
        fiche = FicheMetier(
            code_rome=code,
            nom_masculin=data["nom_masculin"],
            nom_feminin=data["nom_feminin"],
            nom_epicene=data["nom_epicene"],
            metadata=MetadataFiche(
                statut=StatutFiche.BROUILLON,
                version=1,
            ),
        )

        repo.create_fiche(fiche)
        created.append(code)
        print(f"✅ {code} - {data['nom_masculin']}")

    print(f"\n📊 Résumé :")
    print(f"   • Créées : {len(created)}")
    print(f"   • Ignorées : {len(skipped)}")
    print(f"   • Total : {len(created) + len(skipped)}")

    if created:
        print(f"\n🎯 Fiches créées avec succès !")
        print(f"   Tu peux maintenant les enrichir avec Claude.")
    else:
        print(f"\n⚠️  Toutes les fiches existent déjà.")


if __name__ == "__main__":
    create_test_fiches()
