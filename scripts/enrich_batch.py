#!/usr/bin/env python3
"""
Enrichissement batch des fiches métiers via Claude API.
Récupère les fiches depuis l'API backend, les enrichit avec Claude, puis les met à jour.
"""
import sys
import io
import asyncio
import os
import json
import re
from pathlib import Path
from datetime import datetime

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import httpx
import anthropic

load_dotenv()

# Configuration
API_URL = os.getenv("API_BACKEND_URL", "https://agents-metiers.onrender.com")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "90"))  # Nombre de fiches à traiter
DELAY_BETWEEN_CALLS = 1  # Secondes entre chaque appel Claude


def get_enrichment_prompt(fiche: dict) -> str:
    """Génère le prompt d'enrichissement pour Claude."""
    nom = fiche.get("nom_masculin", "")
    code_rome = fiche.get("code_rome", "")
    secteurs = fiche.get("secteurs_activite", [])
    domaine = secteurs[0] if secteurs else ""

    return f"""Tu es un expert RH et rédacteur de fiches métiers pour France Travail (ROME 4.0).
Génère une fiche COMPLÈTE et PROFESSIONNELLE, style MetierScope.

Métier : {nom}
Code ROME : {code_rome}
Domaine : {domaine}

Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant/après) :

{{
    "description": "Phrase d'accroche élégante (1 phrase, style MetierScope : Le/La [métier], un(e) professionnel(le) de..., garantit/assure...). Suivie de 2-3 phrases de contexte général.",
    "description_courte": "Résumé en 1 phrase (max 180 caractères).",
    "missions_principales": [
        "6 à 8 missions principales du métier, chaque mission commence par un verbe d'action et est une phrase complète décrivant une tâche concrète"
    ],
    "acces_metier": "Paragraphe complet décrivant : niveau de diplôme requis ou si accessible sans diplôme, formations recommandées, expérience demandée, conditions particulières (permis, CACES, habilitations, aptitude médicale, casier judiciaire, etc.). Style France Travail.",
    "competences": [
        "8 à 12 savoir-faire techniques (verbe + complément, ex: Réaliser un diagnostic technique)"
    ],
    "competences_transversales": [
        "5 à 7 savoir-être professionnels (ex: Faire preuve d'autonomie, Faire preuve de rigueur et de précision, Avoir l'esprit d'équipe)"
    ],
    "savoirs": [
        "6 à 10 savoirs/connaissances théoriques (ex: Réglementation sécurité incendie, Techniques de soudage, Droit du travail, Normes qualité ISO)"
    ],
    "formations": [
        "4 à 6 formations/diplômes avec leur niveau (ex: CAP/BEP Électricien, Bac pro MELEC, BTS Électrotechnique, Licence pro Énergie)"
    ],
    "certifications": [
        "1 à 4 certifications professionnelles pertinentes (ex: Habilitation électrique, CACES R489, CQP spécifique, etc.)"
    ],
    "conditions_travail": [
        "5 à 8 conditions incluant : risques professionnels, déplacements, travail en extérieur/intérieur, port EPI, travail en hauteur, horaires atypiques, etc."
    ],
    "environnements": [
        "4 à 6 types de structures/employeurs (ex: Entreprise artisanale, PME/PMI industrielle, Collectivité territoriale, Bureau d'études)"
    ],
    "salaires": {{
        "junior": {{"min": 22000, "max": 28000, "median": 25000}},
        "confirme": {{"min": 28000, "max": 38000, "median": 33000}},
        "senior": {{"min": 38000, "max": 50000, "median": 43000}}
    }},
    "perspectives": {{
        "tension": 0.65,
        "tendance": "stable",
        "evolution_5ans": "Analyse factuelle de l'évolution du métier sur 5 ans : impact du numérique, de la transition écologique, de la réglementation, des évolutions technologiques. 3-4 phrases.",
        "nombre_offres": 2500,
        "taux_insertion": 0.72
    }},
    "types_contrats": {{
        "cdi": 45,
        "cdd": 30,
        "interim": 20,
        "autre": 5
    }},
    "mobilite": {{
        "metiers_proches": [
            {{"nom": "Métier proche 1", "contexte": "Compétences communes : [lesquelles]"}},
            {{"nom": "Métier proche 2", "contexte": "Compétences communes : [lesquelles]"}},
            {{"nom": "Métier proche 3", "contexte": "Compétences communes : [lesquelles]"}},
            {{"nom": "Métier proche 4", "contexte": "Même secteur d'activité"}}
        ],
        "evolutions": [
            {{"nom": "Évolution 1", "contexte": "Après X ans d'expérience et/ou formation complémentaire en [domaine]"}},
            {{"nom": "Évolution 2", "contexte": "Avec obtention du diplôme/certification [lequel]"}},
            {{"nom": "Évolution 3", "contexte": "Par spécialisation en [domaine]"}}
        ]
    }},
    "traits_personnalite": ["9 traits de personnalité idéaux pour ce métier (adjectifs ou noms courts, ex: Patient, Rigoureux, Créatif)"],
    "aptitudes": [
        {{"nom": "Capacité d'analyse", "niveau": 4}},
        {{"nom": "Dextérité manuelle", "niveau": 3}}
    ],
    "competences_dimensions": {{
        "relationnel": 25,
        "intellectuel": 20,
        "communication": 15,
        "management": 10,
        "realisation": 15,
        "expression": 10,
        "physique_sensoriel": 5
    }},
    "profil_riasec": {{
        "realiste": 30,
        "investigateur": 80,
        "artistique": 20,
        "social": 60,
        "entreprenant": 40,
        "conventionnel": 50
    }},
    "autres_appellations": ["3 à 8 appellations alternatives du métier (synonymes, variantes courantes)"],
    "statuts_professionnels": ["Salarié"],
    "niveau_formation": "Bac+5 / Master",
    "domaine_professionnel": {{
        "domaine": "Nom du grand domaine",
        "sous_domaine": "Nom du sous-domaine",
        "code_domaine": "X"
    }},
    "preferences_interets": {{
        "domaine_interet": "Nom du domaine d'intérêt principal",
        "familles": [
            {{"nom": "Famille d'intérêt 1", "description": "Description courte"}},
            {{"nom": "Famille d'intérêt 2", "description": "Description courte"}}
        ]
    }},
    "sites_utiles": [
        {{"nom": "ONISEP", "url": "https://www.onisep.fr", "description": "Orientation scolaire et professionnelle"}},
        {{"nom": "France Travail", "url": "https://www.francetravail.fr", "description": "Offres d'emploi et services"}}
    ],
    "conditions_travail_detaillees": {{
        "exigences_physiques": ["Liste des exigences physiques du métier"],
        "horaires": "Description des horaires typiques",
        "deplacements": "Fréquence et nature des déplacements",
        "environnement": "Description de l'environnement de travail",
        "risques": ["Liste des risques professionnels spécifiques"]
    }}
}}

RÈGLES STRICTES :
- Salaires en euros brut ANNUEL France, réalistes pour 2025.
- tension : float 0-1 (0=peu de demande, 1=très forte demande).
- tendance : "emergence", "stable" ou "disparition".
- types_contrats : pourcentages totalisant 100, réalistes pour le secteur.
- nombre_offres : estimation réaliste du nombre d'offres/an en France.
- taux_insertion : float 0-1, taux d'insertion à 6 mois.
- missions_principales : phrases complètes, concrètes, variées.
- traits_personnalite : exactement 9 traits (adjectifs ou noms courts).
- aptitudes : exactement 11 aptitudes avec niveau 1 (faible) à 5 (excellent).
- competences_dimensions : 7 dimensions totalisant exactement 100.
- profil_riasec : 6 scores entre 0 et 100 (Réaliste, Investigateur, Artistique, Social, Entreprenant, Conventionnel).
- sites_utiles : 2 à 4 sites réels et pertinents pour ce métier (URLs valides).
- statuts_professionnels : parmi "Salarié", "Fonctionnaire", "Indépendant" (1 à 3 items).
- niveau_formation : niveau minimum typique (ex: "CAP/BEP", "Bac", "Bac+2", "Bac+3", "Bac+5").
- code_domaine : une lettre majuscule correspondant au domaine ROME (A à N, etc.).
- Sois FACTUEL, PRÉCIS et PROFESSIONNEL. Pas de formulations vagues ou génériques."""


async def fetch_fiches(limit: int = 100) -> list:
    """Récupère les fiches depuis l'API, triées par code ROME."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{API_URL}/api/fiches",
            params={"limit": 500, "offset": 0}  # Get more to sort
        )
        if response.status_code != 200:
            raise Exception(f"Erreur API: {response.status_code}")

        data = response.json()
        fiches = data.get("results", [])

        # Trier par code_rome (ordre alphabétique)
        fiches.sort(key=lambda f: f.get("code_rome", ""))

        # Filtrer les fiches non enrichies (description courte ou vide)
        fiches_a_enrichir = []
        for f in fiches:
            desc = f.get("description", "")
            # Une fiche non enrichie a une description générique
            if not desc or desc.startswith("Fiche métier ROME") or len(desc) < 100:
                fiches_a_enrichir.append(f)

        return fiches_a_enrichir[:limit]


async def enrich_with_claude(client: anthropic.AsyncAnthropic, fiche: dict) -> dict:
    """Enrichit une fiche avec Claude."""
    prompt = get_enrichment_prompt(fiche)

    response = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=6144,
        messages=[{"role": "user", "content": prompt}]
    )

    content = response.content[0].text.strip()

    # Extraire le JSON
    json_match = re.search(r'\{[\s\S]*\}', content)
    if json_match:
        return json.loads(json_match.group())
    else:
        raise ValueError("Pas de JSON dans la réponse Claude")


async def update_fiche(code_rome: str, enrichment: dict) -> bool:
    """Met à jour la fiche via l'API."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.patch(
            f"{API_URL}/api/fiches/{code_rome}",
            json={
                "description": enrichment.get("description"),
                "description_courte": enrichment.get("description_courte"),
                "missions_principales": enrichment.get("missions_principales"),
                "acces_metier": enrichment.get("acces_metier"),
                "competences": enrichment.get("competences"),
                "competences_transversales": enrichment.get("competences_transversales"),
                "savoirs": enrichment.get("savoirs"),
                "formations": enrichment.get("formations"),
                "certifications": enrichment.get("certifications"),
                "conditions_travail": enrichment.get("conditions_travail"),
                "environnements": enrichment.get("environnements"),
                "salaires": enrichment.get("salaires"),
                "perspectives": enrichment.get("perspectives"),
                "types_contrats": enrichment.get("types_contrats"),
                "mobilite": enrichment.get("mobilite"),
                # Parcoureo-level fields
                "traits_personnalite": enrichment.get("traits_personnalite"),
                "aptitudes": enrichment.get("aptitudes"),
                "competences_dimensions": enrichment.get("competences_dimensions"),
                "profil_riasec": enrichment.get("profil_riasec"),
                "autres_appellations": enrichment.get("autres_appellations"),
                "statuts_professionnels": enrichment.get("statuts_professionnels"),
                "niveau_formation": enrichment.get("niveau_formation"),
                "domaine_professionnel": enrichment.get("domaine_professionnel"),
                "preferences_interets": enrichment.get("preferences_interets"),
                "sites_utiles": enrichment.get("sites_utiles"),
                "conditions_travail_detaillees": enrichment.get("conditions_travail_detaillees"),
                "statut": "en_validation"
            }
        )
        return response.status_code == 200


async def main():
    print("=" * 70)
    print("  ENRICHISSEMENT BATCH DES FICHES METIERS")
    print("=" * 70)
    print(f"  API Backend : {API_URL}")
    print(f"  Modèle Claude : {CLAUDE_MODEL}")
    print(f"  Batch size : {BATCH_SIZE}")
    print(f"  Date : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()

    # Vérifier la clé API
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY non définie !")
        sys.exit(1)
    print(f"✅ Clé API Anthropic configurée")

    # Récupérer les fiches
    print(f"\n📥 Récupération des fiches à enrichir...")
    try:
        fiches = await fetch_fiches(BATCH_SIZE)
        print(f"   {len(fiches)} fiches à enrichir (ordre alphabétique)")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)

    if not fiches:
        print("✅ Toutes les fiches sont déjà enrichies !")
        sys.exit(0)

    # Afficher les premières
    print(f"\n   Premières fiches :")
    for f in fiches[:5]:
        print(f"   - {f['code_rome']} : {f['nom_masculin'][:40]}")
    if len(fiches) > 5:
        print(f"   ... et {len(fiches) - 5} autres")

    # Confirmation
    if "--yes" not in sys.argv:
        print(f"\n⚠️  Cela va consommer environ ${len(fiches) * 0.015:.2f} en tokens Claude.")
        confirm = input("   Continuer ? (o/N) : ").strip().lower()
        if confirm != 'o':
            print("   Annulé.")
            sys.exit(0)

    # Initialiser Claude
    claude = anthropic.AsyncAnthropic(api_key=api_key)

    # Enrichir
    print(f"\n🚀 Enrichissement en cours...")
    print("-" * 70)

    enriched = 0
    errors = 0
    start_time = datetime.now()

    for i, fiche in enumerate(fiches, 1):
        code_rome = fiche["code_rome"]
        nom = fiche["nom_masculin"][:35]

        try:
            # Appeler Claude
            enrichment = await enrich_with_claude(claude, fiche)

            # Mettre à jour via API
            success = await update_fiche(code_rome, enrichment)

            if success:
                enriched += 1
                status = "✅"
            else:
                errors += 1
                status = "⚠️ API"

            # Progress
            elapsed = (datetime.now() - start_time).total_seconds()
            rate = i / elapsed if elapsed > 0 else 0
            eta = (len(fiches) - i) / rate if rate > 0 else 0

            print(f"[{i:3d}/{len(fiches)}] {status} {code_rome} - {nom} | {rate:.1f}/min | ETA: {eta:.0f}s")

            # Délai pour éviter le rate limiting
            await asyncio.sleep(DELAY_BETWEEN_CALLS)

        except Exception as e:
            errors += 1
            print(f"[{i:3d}/{len(fiches)}] ❌ {code_rome} - {nom} | Erreur: {str(e)[:50]}")

    # Résumé
    elapsed = (datetime.now() - start_time).total_seconds()
    print("-" * 70)
    print(f"\n📊 RÉSUMÉ")
    print(f"   Fiches traitées : {len(fiches)}")
    print(f"   Enrichies : {enriched}")
    print(f"   Erreurs : {errors}")
    print(f"   Durée : {elapsed:.0f}s ({elapsed/60:.1f} min)")
    print(f"   Coût estimé : ~${len(fiches) * 0.015:.2f}")

    # Stats finales
    print(f"\n📈 Stats API après enrichissement :")
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{API_URL}/api/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"   Total : {stats['total']}")
            print(f"   Brouillons : {stats['brouillons']}")
            print(f"   En validation : {stats['en_validation']}")
            print(f"   Publiées : {stats['publiees']}")

    print("\n" + "=" * 70)
    print("  ENRICHISSEMENT TERMINÉ")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
