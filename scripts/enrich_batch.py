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
BATCH_SIZE = 100  # Nombre de fiches à traiter
DELAY_BETWEEN_CALLS = 1  # Secondes entre chaque appel Claude


def get_enrichment_prompt(fiche: dict) -> str:
    """Génère le prompt d'enrichissement pour Claude."""
    nom = fiche.get("nom_masculin", "")
    code_rome = fiche.get("code_rome", "")
    secteurs = fiche.get("secteurs_activite", [])
    domaine = secteurs[0] if secteurs else ""

    return f"""Tu es un expert en ressources humaines et en rédaction de fiches métiers en France.
Génère le contenu complet pour la fiche métier suivante.

Métier : {nom}
Code ROME : {code_rome}
Domaine : {domaine}

Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant ou après) contenant :

{{
    "description": "Description complète du métier en 3-5 phrases. Décris les missions principales, le contexte d'exercice et les responsabilités.",
    "description_courte": "Description en 1 phrase (max 200 caractères).",
    "competences": ["6 à 10 compétences techniques clés du métier"],
    "competences_transversales": ["3 à 5 compétences transversales (soft skills)"],
    "formations": ["3 à 5 formations ou diplômes typiques pour accéder au métier en France"],
    "certifications": ["1 à 3 certifications professionnelles pertinentes, ou liste vide si aucune"],
    "conditions_travail": ["3 à 5 conditions de travail caractéristiques"],
    "environnements": ["2 à 4 types de structures où s'exerce le métier"],
    "salaires": {{
        "junior": {{"min": 25000, "max": 35000, "median": 30000}},
        "confirme": {{"min": 35000, "max": 50000, "median": 42000}},
        "senior": {{"min": 50000, "max": 70000, "median": 58000}}
    }},
    "perspectives": {{
        "tension": 0.6,
        "tendance": "stable",
        "evolution_5ans": "Analyse courte de l'évolution du métier sur 5 ans"
    }}
}}

Notes :
- Les salaires sont en euros brut annuel pour la France.
- "tension" est un float entre 0 (peu de demande) et 1 (très forte demande).
- "tendance" est "emergence", "stable" ou "disparition".
- Sois factuel et précis. Pas de formulations vagues."""


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
        max_tokens=2048,
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
                "competences": enrichment.get("competences"),
                "competences_transversales": enrichment.get("competences_transversales"),
                "formations": enrichment.get("formations"),
                "certifications": enrichment.get("certifications"),
                "conditions_travail": enrichment.get("conditions_travail"),
                "environnements": enrichment.get("environnements"),
                "salaires": enrichment.get("salaires"),
                "perspectives": enrichment.get("perspectives"),
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
