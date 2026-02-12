#!/usr/bin/env python3
"""
Synchronisation mensuelle des fiches métiers avec le référentiel ROME France Travail.

Compare les fiches enrichies en base avec les données actuelles de l'API ROME,
détecte les changements (appellations, définition, compétences, savoirs, mobilités),
et re-enrichit les fiches modifiées avec Claude.

Usage:
    python scripts/monthly_rome_sync.py          # Interactif
    python scripts/monthly_rome_sync.py --yes     # Auto (cron job)
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
DELAY_BETWEEN_CALLS = 1  # Secondes entre chaque appel Claude
AUTH_TOKEN = None


# =========================================================================
# Authentication
# =========================================================================

async def login() -> str:
    """Login to the API and return a JWT token."""
    email = os.getenv("AUTH_EMAIL")
    password = os.getenv("AUTH_PASSWORD")
    if not email or not password:
        raise ValueError("AUTH_EMAIL et AUTH_PASSWORD doivent être définis")
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(f"{API_URL}/api/auth/login", json={"email": email, "password": password})
        if r.status_code != 200:
            raise ValueError(f"Login failed: {r.status_code} {r.text}")
        return r.json()["token"]


# =========================================================================
# Fetch enriched fiches from backend
# =========================================================================

async def fetch_enriched_fiches() -> list:
    """Récupère toutes les fiches enrichies (en_validation + publiee) depuis le backend."""
    all_fiches = []
    for statut in ["en_validation", "publiee"]:
        offset = 0
        while True:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.get(
                    f"{API_URL}/api/fiches",
                    params={"statut": statut, "limit": 200, "offset": offset}
                )
                if r.status_code != 200:
                    print(f"   Erreur API fiches (statut={statut}): {r.status_code}")
                    break
                data = r.json()
                results = data.get("results", [])
                all_fiches.extend(results)
                if len(results) < 200:
                    break
                offset += 200
    return all_fiches


async def fetch_fiche_detail(code_rome: str) -> dict:
    """Récupère le détail complet d'une fiche depuis le backend."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{API_URL}/api/fiches/{code_rome}")
        if r.status_code != 200:
            return {}
        return r.json()


# =========================================================================
# France Travail ROME client (reuse existing)
# =========================================================================

from sources.france_travail_rome import FranceTravailROMEClient


# =========================================================================
# Comparison logic
# =========================================================================

def normalize_set(items: list) -> set:
    """Normalise une liste en set de strings lowercase pour comparaison."""
    if not items:
        return set()
    return {str(item).strip().lower() for item in items if item}


def differs_significantly(text_a: str, text_b: str, threshold: float = 0.3) -> bool:
    """Vérifie si deux textes diffèrent significativement.

    Utilise une comparaison simple basée sur les mots uniques.
    threshold: proportion minimale de mots différents pour considérer un changement.
    """
    if not text_a or not text_b:
        return bool(text_a) != bool(text_b)

    words_a = set(text_a.lower().split())
    words_b = set(text_b.lower().split())

    if not words_a and not words_b:
        return False

    union = words_a | words_b
    if not union:
        return False

    diff = len(words_a.symmetric_difference(words_b)) / len(union)
    return diff > threshold


def extract_ft_mobilites(ft_data: dict) -> set:
    """Extrait les mobilités depuis les données France Travail."""
    mobilites = set()
    mob_data = ft_data.get("mobilites", {})

    for item in mob_data.get("rome_mobilite_proches", []):
        code = item.get("code_rome_cible", "")
        if code:
            mobilites.add(code)

    for item in mob_data.get("rome_mobilite_evolutions", []):
        code = item.get("code_rome_cible", "")
        if code:
            mobilites.add(code)

    return mobilites


def extract_our_mobilites(fiche_detail: dict) -> set:
    """Extrait les mobilités depuis nos données."""
    mobilites = set()
    mob_data = fiche_detail.get("mobilite", {})
    if not mob_data or not isinstance(mob_data, dict):
        return mobilites

    for item in mob_data.get("metiers_proches", []):
        if isinstance(item, dict):
            nom = item.get("nom", "")
            if nom:
                mobilites.add(nom.strip().lower())

    for item in mob_data.get("evolutions", []):
        if isinstance(item, dict):
            nom = item.get("nom", "")
            if nom:
                mobilites.add(nom.strip().lower())

    return mobilites


def compare_fiche(our_fiche: dict, our_detail: dict, ft_data: dict) -> list:
    """Compare une fiche locale avec les données France Travail.

    Retourne une liste de champs qui ont changé.
    """
    changes = []

    # 1. Appellations
    ft_appellations = set()
    for app in ft_data.get("appellations", []):
        libelle = app.get("libelle", "")
        if libelle:
            ft_appellations.add(libelle.strip().lower())

    our_appellations = normalize_set(our_detail.get("autres_appellations", []))
    if ft_appellations and ft_appellations != our_appellations:
        # Only flag if there are meaningful differences (new/removed appellations)
        new_in_ft = ft_appellations - our_appellations
        removed_from_ft = our_appellations - ft_appellations
        if new_in_ft or removed_from_ft:
            changes.append(("appellations", f"+{len(new_in_ft)}/-{len(removed_from_ft)}"))

    # 2. Définition / description
    ft_definition = ft_data.get("definition", "")
    our_description = our_detail.get("description", "")
    if ft_definition and differs_significantly(our_description, ft_definition):
        changes.append(("definition", "texte modifié"))

    # 3. Compétences (savoir-faire)
    ft_competences = set()
    competences_data = ft_data.get("competences", {})
    for comp in competences_data.get("savoir_faire", []):
        libelle = comp.get("libelle", "")
        if libelle:
            ft_competences.add(libelle.strip().lower())

    our_competences = normalize_set(our_detail.get("competences", []))
    if ft_competences and ft_competences != our_competences:
        new_comp = ft_competences - our_competences
        if new_comp:
            changes.append(("competences", f"+{len(new_comp)} nouvelles"))

    # 4. Savoirs
    ft_savoirs = set()
    for sav in competences_data.get("savoirs", []):
        libelle = sav.get("libelle", "")
        if libelle:
            ft_savoirs.add(libelle.strip().lower())

    our_savoirs = normalize_set(our_detail.get("savoirs", []))
    if ft_savoirs and ft_savoirs != our_savoirs:
        new_sav = ft_savoirs - our_savoirs
        if new_sav:
            changes.append(("savoirs", f"+{len(new_sav)} nouveaux"))

    # 5. Mobilités (codes ROME des métiers proches / évolutions)
    ft_mobilites = extract_ft_mobilites(ft_data)
    # For mobility, we compare code_rome targets from FT with our mobility names
    # This is a structural comparison — if FT adds/removes mobility paths
    if ft_mobilites:
        our_mob = extract_our_mobilites(our_detail)
        # We can't compare codes vs names directly, so just check if FT count changed significantly
        if abs(len(ft_mobilites) - len(our_mob)) > 2:
            changes.append(("mobilite", f"FT={len(ft_mobilites)} vs nous={len(our_mob)}"))

    return changes


# =========================================================================
# Claude enrichment (reuse from enrich_batch.py)
# =========================================================================

def get_enrichment_prompt(fiche: dict) -> str:
    """Génère le prompt d'enrichissement pour Claude (identique à enrich_batch.py)."""
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
        "tendance": "emergence",
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
- tendance : choisir parmi "emergence", "stable", "disparition" en analysant factuellement :
  * "emergence" si le métier bénéficie du numérique, IA, transition écologique, vieillissement, nouvelles réglementations
  * "stable" UNIQUEMENT si le métier n'est ni en croissance ni en déclin notable
  * "disparition" si le métier est menacé par l'automatisation, IA, délocalisation, évolution réglementaire
  NE PAS mettre "stable" par défaut. Justifier dans evolution_5ans.
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


async def enrich_with_claude(claude_client: anthropic.AsyncAnthropic, fiche: dict) -> dict:
    """Enrichit une fiche avec Claude."""
    prompt = get_enrichment_prompt(fiche)

    response = await claude_client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=6144,
        messages=[{"role": "user", "content": prompt}]
    )

    content = response.content[0].text.strip()

    json_match = re.search(r'\{[\s\S]*\}', content)
    if json_match:
        return json.loads(json_match.group())
    else:
        raise ValueError("Pas de JSON dans la réponse Claude")


async def update_fiche(code_rome: str, enrichment: dict) -> bool:
    """Met à jour la fiche via l'API backend."""
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"} if AUTH_TOKEN else {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.patch(
            f"{API_URL}/api/fiches/{code_rome}",
            headers=headers,
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


# =========================================================================
# Main sync logic
# =========================================================================

async def main():
    print("=" * 70)
    print("  SYNCHRONISATION MENSUELLE ROME - FRANCE TRAVAIL")
    print("=" * 70)
    print(f"  API Backend : {API_URL}")
    print(f"  Date : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()

    # 1. Vérifier les credentials
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERREUR: ANTHROPIC_API_KEY non définie")
        sys.exit(1)
    print("Clé API Anthropic configurée")

    ft_client_id = os.getenv("FRANCE_TRAVAIL_CLIENT_ID")
    ft_client_secret = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")
    if not ft_client_id or not ft_client_secret:
        print("ERREUR: FRANCE_TRAVAIL_CLIENT_ID/SECRET non définis")
        sys.exit(1)
    print("Credentials France Travail configurés")

    # 2. Login JWT au backend
    global AUTH_TOKEN
    try:
        AUTH_TOKEN = await login()
        print("Authentifié sur le backend")
    except Exception as e:
        print(f"ERREUR Login: {e}")
        sys.exit(1)

    # 3. Récupérer nos fiches enrichies
    print(f"\nRécupération des fiches enrichies...")
    our_fiches = await fetch_enriched_fiches()
    print(f"   {len(our_fiches)} fiches enrichies trouvées")

    if not our_fiches:
        print("Aucune fiche enrichie à synchroniser.")
        sys.exit(0)

    # 4. Initialiser le client France Travail
    ft_client = FranceTravailROMEClient(
        client_id=ft_client_id,
        client_secret=ft_client_secret
    )

    # 5. Comparer chaque fiche avec France Travail
    print(f"\nComparaison avec le référentiel ROME France Travail...")
    print("-" * 70)

    fiches_to_update = []
    errors_compare = 0
    start_time = datetime.now()

    for i, fiche in enumerate(our_fiches, 1):
        code_rome = fiche.get("code_rome", "")
        nom = fiche.get("nom_masculin", "")[:35]

        try:
            # Fetch detailed data from our backend
            our_detail = await fetch_fiche_detail(code_rome)

            # Fetch from France Travail
            ft_data = await ft_client.get_fiche_metier(code_rome)

            if not ft_data:
                print(f"[{i:3d}/{len(our_fiches)}] -- {code_rome} - {nom} | Non trouvé sur FT")
                continue

            # Compare
            changes = compare_fiche(fiche, our_detail, ft_data)

            if changes:
                change_summary = ", ".join(f"{c[0]}({c[1]})" for c in changes)
                print(f"[{i:3d}/{len(our_fiches)}] ** {code_rome} - {nom} | Changements: {change_summary}")
                fiches_to_update.append((fiche, our_detail, changes))
            else:
                if i % 20 == 0 or i == len(our_fiches):
                    print(f"[{i:3d}/{len(our_fiches)}] OK Progression... ({len(fiches_to_update)} changements détectés)")

            # Rate limiting for FT API
            await asyncio.sleep(0.3)

        except Exception as e:
            errors_compare += 1
            print(f"[{i:3d}/{len(our_fiches)}] !! {code_rome} - {nom} | Erreur: {str(e)[:60]}")

    elapsed_compare = (datetime.now() - start_time).total_seconds()
    print("-" * 70)
    print(f"\nRESULTAT COMPARAISON:")
    print(f"   Fiches comparées : {len(our_fiches)}")
    print(f"   Changements détectés : {len(fiches_to_update)}")
    print(f"   Erreurs : {errors_compare}")
    print(f"   Durée : {elapsed_compare:.0f}s")

    if not fiches_to_update:
        print("\nAucun changement détecté. Référentiel ROME à jour.")
        print("=" * 70)
        print("  SYNCHRONISATION TERMINÉE")
        print("=" * 70)
        sys.exit(0)

    # 6. Afficher les fiches à mettre à jour
    print(f"\nFiches à re-enrichir ({len(fiches_to_update)}) :")
    for fiche, detail, changes in fiches_to_update:
        change_str = ", ".join(c[0] for c in changes)
        print(f"   - {fiche['code_rome']} : {fiche.get('nom_masculin', '')[:40]} [{change_str}]")

    # 7. Confirmation
    if "--yes" not in sys.argv:
        cost = len(fiches_to_update) * 0.015
        print(f"\nCela va re-enrichir {len(fiches_to_update)} fiches (~${cost:.2f} en tokens Claude).")
        confirm = input("Continuer ? (o/N) : ").strip().lower()
        if confirm != 'o':
            print("Annulé.")
            sys.exit(0)

    # 8. Re-enrichir les fiches modifiées avec Claude
    print(f"\nRe-enrichissement avec Claude...")
    print("-" * 70)

    claude = anthropic.AsyncAnthropic(api_key=api_key)
    enriched = 0
    errors_enrich = 0
    start_enrich = datetime.now()

    for i, (fiche, detail, changes) in enumerate(fiches_to_update, 1):
        code_rome = fiche["code_rome"]
        nom = fiche.get("nom_masculin", "")[:35]

        try:
            enrichment = await enrich_with_claude(claude, fiche)
            success = await update_fiche(code_rome, enrichment)

            if success:
                enriched += 1
                status = "OK"
            else:
                errors_enrich += 1
                status = "!! API"

            elapsed = (datetime.now() - start_enrich).total_seconds()
            rate = i / elapsed if elapsed > 0 else 0
            eta = (len(fiches_to_update) - i) / rate if rate > 0 else 0

            change_str = ", ".join(c[0] for c in changes)
            print(f"[{i:3d}/{len(fiches_to_update)}] {status} {code_rome} - {nom} [{change_str}] | ETA: {eta:.0f}s")

            await asyncio.sleep(DELAY_BETWEEN_CALLS)

        except Exception as e:
            errors_enrich += 1
            print(f"[{i:3d}/{len(fiches_to_update)}] !! {code_rome} - {nom} | Erreur: {str(e)[:50]}")

    # 9. Résumé final
    elapsed_total = (datetime.now() - start_time).total_seconds()
    print("-" * 70)
    print(f"\nRESUME SYNCHRONISATION MENSUELLE")
    print(f"   Fiches enrichies comparées : {len(our_fiches)}")
    print(f"   Changements détectés : {len(fiches_to_update)}")
    print(f"   Re-enrichies avec succès : {enriched}")
    print(f"   Erreurs comparaison : {errors_compare}")
    print(f"   Erreurs enrichissement : {errors_enrich}")
    print(f"   Durée totale : {elapsed_total:.0f}s ({elapsed_total/60:.1f} min)")
    print(f"   Coût estimé : ~${len(fiches_to_update) * 0.015:.2f}")

    # 10. Stats finales
    print(f"\nStats API après synchronisation :")
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{API_URL}/api/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"   Total : {stats.get('total', 'N/A')}")
            print(f"   Brouillons : {stats.get('brouillons', 'N/A')}")
            print(f"   En validation : {stats.get('en_validation', 'N/A')}")
            print(f"   Publiées : {stats.get('publiees', 'N/A')}")

    print("\n" + "=" * 70)
    print("  SYNCHRONISATION TERMINÉE")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
