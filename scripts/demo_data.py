#!/usr/bin/env python3
"""
Script pour créer des données de démonstration.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.repository import Repository
from database.models import (
    FicheMetier, SalairesMetier, SalaireNiveau,
    PerspectivesMetier, MetadataFiche, TendanceMetier, StatutFiche
)
from config import get_config

# Fiches métiers de démonstration
FICHES_DEMO = [
    {
        "code_rome": "M1805",
        "nom_masculin": "Développeur informatique",
        "nom_feminin": "Développeuse informatique",
        "nom_epicene": "Personne en charge du développement informatique",
        "description": "Conçoit, développe et met au point un projet d'application informatique, de la phase d'étude à son intégration, pour un client ou une entreprise selon des besoins fonctionnels et un cahier des charges.",
        "competences": [
            "Analyser les besoins du client",
            "Concevoir une application web",
            "Développer une application mobile",
            "Programmer en Python, JavaScript, Java",
            "Réaliser des tests et debugging",
            "Rédiger une documentation technique"
        ],
        "formations": [
            "BTS Services informatiques aux organisations",
            "BUT Informatique",
            "Licence pro métiers de l'informatique",
            "Master informatique",
            "École d'ingénieur"
        ],
        "salaires": {
            "junior": {"min": 28000, "max": 38000, "median": 33000},
            "confirme": {"min": 38000, "max": 52000, "median": 45000},
            "senior": {"min": 52000, "max": 75000, "median": 62000}
        },
        "tension": 0.85,
        "tendance": "emergence"
    },
    {
        "code_rome": "M1802",
        "nom_masculin": "Administrateur systèmes et réseaux",
        "nom_feminin": "Administratrice systèmes et réseaux",
        "nom_epicene": "Responsable de l'administration systèmes et réseaux",
        "description": "Administre et assure le fonctionnement et l'exploitation d'un ou plusieurs éléments matériels ou logiciels (serveurs, réseaux, bases de données...) de l'entreprise.",
        "competences": [
            "Administrer un système Linux/Windows",
            "Configurer des équipements réseau",
            "Gérer la sécurité informatique",
            "Superviser les serveurs",
            "Automatiser les tâches d'administration",
            "Gérer les sauvegardes"
        ],
        "formations": [
            "BTS Services informatiques aux organisations",
            "BUT Réseaux et télécommunications",
            "Licence pro administration de systèmes",
            "Master cybersécurité"
        ],
        "salaires": {
            "junior": {"min": 30000, "max": 38000, "median": 34000},
            "confirme": {"min": 40000, "max": 55000, "median": 47000},
            "senior": {"min": 55000, "max": 80000, "median": 65000}
        },
        "tension": 0.78,
        "tendance": "stable"
    },
    {
        "code_rome": "E1101",
        "nom_masculin": "Journaliste",
        "nom_feminin": "Journaliste",
        "nom_epicene": "Professionnel du journalisme",
        "description": "Recueille, vérifie et traite l'information et l'actualité tous domaines confondus. Rédige des articles, des interviews ou des reportages pour la presse écrite, audiovisuelle ou web.",
        "competences": [
            "Rechercher et vérifier l'information",
            "Rédiger des articles",
            "Réaliser des interviews",
            "Maîtriser les outils numériques",
            "Respecter la déontologie journalistique"
        ],
        "formations": [
            "École de journalisme reconnue",
            "Master journalisme",
            "DUT Information-communication",
            "Licence information et communication"
        ],
        "salaires": {
            "junior": {"min": 24000, "max": 32000, "median": 28000},
            "confirme": {"min": 32000, "max": 45000, "median": 38000},
            "senior": {"min": 45000, "max": 70000, "median": 55000}
        },
        "tension": 0.35,
        "tendance": "stable"
    },
    {
        "code_rome": "J1506",
        "nom_masculin": "Infirmier",
        "nom_feminin": "Infirmière",
        "nom_epicene": "Personnel infirmier",
        "description": "Réalise des soins infirmiers, d'hygiène et de confort selon le protocole médical et les règles d'hygiène. Peut coordonner des programmes de santé.",
        "competences": [
            "Réaliser des soins infirmiers",
            "Surveiller l'état de santé des patients",
            "Administrer des traitements",
            "Accompagner les patients",
            "Travailler en équipe pluridisciplinaire"
        ],
        "formations": [
            "Diplôme d'État d'infirmier (DEI)",
            "IFSI - Institut de Formation en Soins Infirmiers"
        ],
        "salaires": {
            "junior": {"min": 26000, "max": 32000, "median": 29000},
            "confirme": {"min": 32000, "max": 42000, "median": 37000},
            "senior": {"min": 42000, "max": 55000, "median": 48000}
        },
        "tension": 0.92,
        "tendance": "emergence"
    },
    {
        "code_rome": "K2104",
        "nom_masculin": "Éducateur spécialisé",
        "nom_feminin": "Éducatrice spécialisée",
        "nom_epicene": "Professionnel de l'éducation spécialisée",
        "description": "Aide au développement et à l'épanouissement de personnes en difficulté sociale, physique ou psychique. Intervient auprès d'enfants, adolescents ou adultes.",
        "competences": [
            "Accompagner les personnes au quotidien",
            "Élaborer des projets éducatifs",
            "Travailler en équipe pluridisciplinaire",
            "Rédiger des rapports de suivi",
            "Animer des activités éducatives"
        ],
        "formations": [
            "Diplôme d'État d'éducateur spécialisé (DEES)",
            "Licence sciences de l'éducation"
        ],
        "salaires": {
            "junior": {"min": 24000, "max": 30000, "median": 27000},
            "confirme": {"min": 30000, "max": 38000, "median": 34000},
            "senior": {"min": 38000, "max": 48000, "median": 42000}
        },
        "tension": 0.72,
        "tendance": "stable"
    },
    {
        "code_rome": "H2502",
        "nom_masculin": "Technicien de maintenance industrielle",
        "nom_feminin": "Technicienne de maintenance industrielle",
        "nom_epicene": "Responsable de la maintenance industrielle",
        "description": "Réalise la maintenance préventive et curative d'équipements de production industrielle. Diagnostique les pannes et effectue les réparations.",
        "competences": [
            "Diagnostiquer une panne",
            "Réaliser des opérations de maintenance",
            "Lire des schémas techniques",
            "Utiliser des appareils de mesure",
            "Respecter les normes de sécurité"
        ],
        "formations": [
            "Bac pro Maintenance des équipements industriels",
            "BTS Maintenance des systèmes",
            "BUT Génie industriel et maintenance"
        ],
        "salaires": {
            "junior": {"min": 26000, "max": 32000, "median": 29000},
            "confirme": {"min": 32000, "max": 42000, "median": 37000},
            "senior": {"min": 42000, "max": 55000, "median": 48000}
        },
        "tension": 0.88,
        "tendance": "stable"
    },
    {
        "code_rome": "D1106",
        "nom_masculin": "Vendeur",
        "nom_feminin": "Vendeuse",
        "nom_epicene": "Personnel de vente",
        "description": "Réalise la vente de produits ou services auprès d'une clientèle de particuliers ou professionnels. Conseille et fidélise la clientèle.",
        "competences": [
            "Accueillir et conseiller la clientèle",
            "Argumenter et conclure une vente",
            "Gérer les stocks",
            "Mettre en valeur les produits",
            "Encaisser les paiements"
        ],
        "formations": [
            "CAP Employé de commerce",
            "Bac pro Commerce",
            "BTS Management commercial opérationnel"
        ],
        "salaires": {
            "junior": {"min": 21000, "max": 26000, "median": 23000},
            "confirme": {"min": 26000, "max": 34000, "median": 30000},
            "senior": {"min": 34000, "max": 45000, "median": 38000}
        },
        "tension": 0.55,
        "tendance": "stable"
    },
    {
        "code_rome": "F1104",
        "nom_masculin": "Dessinateur-projeteur",
        "nom_feminin": "Dessinatrice-projeteuse",
        "nom_epicene": "Responsable du dessin et de la conception technique",
        "description": "Réalise des plans et dessins techniques de pièces ou ensembles mécaniques, de bâtiments ou d'ouvrages. Utilise des logiciels de CAO/DAO.",
        "competences": [
            "Utiliser des logiciels CAO/DAO (AutoCAD, SolidWorks)",
            "Réaliser des plans techniques",
            "Calculer des dimensions",
            "Respecter les normes techniques",
            "Collaborer avec les ingénieurs"
        ],
        "formations": [
            "BTS Conception de produits industriels",
            "BUT Génie mécanique et productique",
            "Licence pro conception"
        ],
        "salaires": {
            "junior": {"min": 28000, "max": 34000, "median": 31000},
            "confirme": {"min": 34000, "max": 45000, "median": 40000},
            "senior": {"min": 45000, "max": 58000, "median": 52000}
        },
        "tension": 0.68,
        "tendance": "stable"
    }
]


def creer_fiche(data: dict) -> FicheMetier:
    """Crée une FicheMetier à partir des données."""
    salaires_data = data.get("salaires", {})

    return FicheMetier(
        id=data["code_rome"],
        code_rome=data["code_rome"],
        nom_masculin=data["nom_masculin"],
        nom_feminin=data["nom_feminin"],
        nom_epicene=data["nom_epicene"],
        description=data.get("description", ""),
        competences=data.get("competences", []),
        formations=data.get("formations", []),
        salaires=SalairesMetier(
            junior=SalaireNiveau(**salaires_data.get("junior", {})),
            confirme=SalaireNiveau(**salaires_data.get("confirme", {})),
            senior=SalaireNiveau(**salaires_data.get("senior", {}))
        ),
        perspectives=PerspectivesMetier(
            tension=data.get("tension", 0.5),
            tendance=TendanceMetier(data.get("tendance", "stable"))
        ),
        metadata=MetadataFiche(
            statut=StatutFiche.PUBLIEE,
            source="Données de démonstration"
        )
    )


def main():
    """Crée les données de démonstration."""
    print("🚀 Création des données de démonstration...")

    config = get_config()
    repo = Repository(config.db_path)
    repo.init_db()

    count = 0
    for data in FICHES_DEMO:
        try:
            fiche = creer_fiche(data)
            repo.upsert_fiche(fiche)
            print(f"  ✓ {fiche.code_rome} - {fiche.nom_masculin}")
            count += 1
        except Exception as e:
            print(f"  ✗ Erreur {data.get('code_rome')}: {e}")

    print(f"\n✅ {count} fiches créées avec succès !")
    print("\nCommandes utiles :")
    print("  python main.py list          # Voir toutes les fiches")
    print("  python main.py show M1805    # Voir le détail d'une fiche")
    print("  python main.py stats         # Voir les statistiques")


if __name__ == "__main__":
    main()
