#!/usr/bin/env python3
"""
Script de veille automatique du référentiel ROME.
Interroge l'API ROME v4 de France Travail, détecte les changements,
et flagge les fiches modifiées pour review humaine.

Usage:
    python scripts/veille_rome.py

Exécuté chaque lundi à 2h UTC par un cron job Render.
"""
import os
import sys
import json
import hashlib
import time
from datetime import datetime
from pathlib import Path

# Setup path
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from database.repository import Repository
from database.models import (
    RomeSnapshot, RomeChange, HistoriqueVeille, FicheMetier,
    MetadataFiche, StatutFiche,
)
from config import get_config


def get_ft_rome_token() -> str | None:
    """Obtient un token OAuth2 pour l'API ROME Métiers v1."""
    client_id = os.getenv("FT_CLIENT_ID", "")
    client_secret = os.getenv("FT_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        print("ERREUR: FT_CLIENT_ID ou FT_CLIENT_SECRET non configurés")
        return None

    for attempt in range(3):
        try:
            resp = httpx.post(
                "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": "api_rome-metiersv1 nomenclatureRome",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15.0,
            )
            if resp.status_code == 200:
                return resp.json().get("access_token")
            print(f"Token error (tentative {attempt + 1}): HTTP {resp.status_code}")
        except Exception as e:
            print(f"Token error (tentative {attempt + 1}): {e}")
        if attempt < 2:
            time.sleep(5 * (attempt + 1))

    return None


def fetch_all_metiers(token: str) -> list[dict]:
    """Fetch tous les métiers depuis l'API ROME v4 avec pagination."""
    all_metiers = []
    offset = 0
    batch_size = 150
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    while True:
        for attempt in range(3):
            try:
                resp = httpx.get(
                    "https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/metier",
                    params={"limit": batch_size, "offset": offset},
                    headers=headers,
                    timeout=30.0,
                )
                if resp.status_code == 204:
                    return all_metiers
                resp.raise_for_status()
                data = resp.json()
                metiers = data if isinstance(data, list) else data.get("metiers", [])
                if not metiers:
                    return all_metiers
                all_metiers.extend(metiers)
                print(f"  Récupérés {len(all_metiers)} métiers (offset={offset})")
                if len(metiers) < batch_size:
                    return all_metiers
                offset += batch_size
                break  # success, exit retry loop
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    wait = min(30, 10 * (attempt + 1))
                    print(f"  Rate limit, attente {wait}s...")
                    time.sleep(wait)
                elif e.response.status_code >= 500:
                    wait = 5 * (attempt + 1)
                    print(f"  Erreur serveur {e.response.status_code}, retry dans {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"  Erreur HTTP {e.response.status_code}: {e.response.text[:200]}")
                    return all_metiers
            except Exception as e:
                print(f"  Erreur réseau (tentative {attempt + 1}): {e}")
                if attempt < 2:
                    time.sleep(5 * (attempt + 1))
                else:
                    return all_metiers

    return all_metiers


def compute_hash(data: dict) -> str:
    """Calcule un SHA256 du contenu JSON trié."""
    content = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def diff_fields(old_data: dict, new_data: dict) -> list[str]:
    """Retourne la liste des champs qui ont changé."""
    all_keys = set(list(old_data.keys()) + list(new_data.keys()))
    changed = []
    for key in sorted(all_keys):
        if old_data.get(key) != new_data.get(key):
            changed.append(key)
    return changed


def main():
    print("=" * 60)
    print(f"VEILLE ROME - {datetime.now().isoformat()}")
    print("=" * 60)

    # Connexion DB
    config = get_config()
    repo = Repository(
        db_path=config.db_path if not config.database.database_url else None,
        database_url=config.database.database_url,
    )
    repo.init_db()

    # Créer les tables si nécessaire
    from sqlalchemy import inspect as sa_inspect, text
    inspector = sa_inspect(repo.engine)
    tables = inspector.get_table_names()
    with repo.engine.begin() as conn:
        if "rome_snapshots" not in tables:
            conn.execute(text("""
                CREATE TABLE rome_snapshots (
                    code_rome VARCHAR(10) PRIMARY KEY,
                    content_hash VARCHAR(64) NOT NULL,
                    rome_data TEXT NOT NULL,
                    last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
                    last_changed TIMESTAMP
                )
            """))
            print("Créé table rome_snapshots")
        if "rome_changes" not in tables:
            conn.execute(text("""
                CREATE TABLE rome_changes (
                    id SERIAL PRIMARY KEY,
                    code_rome VARCHAR(10) NOT NULL,
                    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    change_type VARCHAR(20) NOT NULL,
                    fields_changed TEXT,
                    details TEXT,
                    old_hash VARCHAR(64),
                    new_hash VARCHAR(64),
                    reviewed BOOLEAN DEFAULT FALSE,
                    reviewed_at TIMESTAMP,
                    reviewed_by VARCHAR(100)
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rome_changes_code ON rome_changes (code_rome)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rome_changes_reviewed ON rome_changes (reviewed)"))
            print("Créé table rome_changes")

        # rome_update_pending column
        existing_cols = {c["name"] for c in inspector.get_columns("fiches_metiers")}
        if "rome_update_pending" not in existing_cols:
            conn.execute(text("ALTER TABLE fiches_metiers ADD COLUMN rome_update_pending BOOLEAN DEFAULT FALSE"))
            print("Ajouté colonne rome_update_pending")

    # Token OAuth2
    print("\n1. Obtention du token OAuth2...")
    token = get_ft_rome_token()
    if not token:
        print("ERREUR: Impossible d'obtenir le token. Arrêt.")
        sys.exit(1)
    print("   Token obtenu")

    # Fetch des métiers
    print("\n2. Récupération des métiers depuis l'API ROME v4...")
    all_metiers = fetch_all_metiers(token)
    print(f"   Total: {len(all_metiers)} métiers récupérés")

    if not all_metiers:
        print("ERREUR: Aucun métier récupéré. Arrêt.")
        sys.exit(1)

    # Charger les hashes existants
    print("\n3. Comparaison avec la base de données...")
    existing_hashes = repo.get_all_rome_snapshot_hashes()
    print(f"   {len(existing_hashes)} snapshots existants en base")

    # Traitement
    nouvelles = 0
    modifiees = 0
    supprimees = 0
    inchangees = 0
    erreurs = 0
    api_codes = set()

    for metier in all_metiers:
        try:
            code_rome = metier.get("code") or metier.get("code_rome", "")
            if not code_rome:
                continue
            api_codes.add(code_rome)

            new_hash = compute_hash(metier)
            old_hash = existing_hashes.get(code_rome)
            content_json = json.dumps(metier, sort_keys=True, ensure_ascii=False)
            now = datetime.now()

            if old_hash is None:
                # Nouvelle fiche
                repo.upsert_rome_snapshot(RomeSnapshot(
                    code_rome=code_rome,
                    content_hash=new_hash,
                    rome_data=content_json,
                    last_checked=now,
                    last_changed=now,
                ))
                repo.add_rome_change(RomeChange(
                    code_rome=code_rome,
                    detected_at=now,
                    change_type="new",
                    new_hash=new_hash,
                    details=json.dumps({"libelle": metier.get("libelle", "")}, ensure_ascii=False),
                ))
                # Créer la fiche en brouillon si elle n'existe pas
                if not repo.get_fiche(code_rome):
                    libelle = metier.get("libelle", code_rome)
                    new_fiche = FicheMetier(
                        id=code_rome,
                        code_rome=code_rome,
                        nom_masculin=libelle,
                        nom_feminin=libelle,
                        nom_epicene=libelle,
                        description="",
                        metadata=MetadataFiche(statut=StatutFiche.BROUILLON, version=1),
                    )
                    repo.create_fiche(new_fiche)
                nouvelles += 1

            elif new_hash != old_hash:
                # Modifiée
                old_snap = repo.get_rome_snapshot(code_rome)
                fields_changed = []
                if old_snap:
                    try:
                        old_data = json.loads(old_snap.rome_data)
                        fields_changed = diff_fields(old_data, metier)
                    except Exception:
                        fields_changed = ["unknown"]

                repo.upsert_rome_snapshot(RomeSnapshot(
                    code_rome=code_rome,
                    content_hash=new_hash,
                    rome_data=content_json,
                    last_checked=now,
                    last_changed=now,
                ))
                repo.add_rome_change(RomeChange(
                    code_rome=code_rome,
                    detected_at=now,
                    change_type="modified",
                    fields_changed=json.dumps(fields_changed, ensure_ascii=False),
                    old_hash=old_hash,
                    new_hash=new_hash,
                    details=json.dumps({
                        "libelle": metier.get("libelle", ""),
                        "nb_champs_modifies": len(fields_changed),
                        "champs": fields_changed[:10],
                    }, ensure_ascii=False),
                ))
                repo.set_rome_update_pending(code_rome, True)
                modifiees += 1
                print(f"   MODIFIÉ: {code_rome} ({len(fields_changed)} champs: {', '.join(fields_changed[:5])})")

            else:
                # Inchangée
                repo.update_rome_snapshot_checked(code_rome)
                inchangees += 1

        except Exception as e:
            print(f"   ERREUR {metier.get('code', '?')}: {e}")
            erreurs += 1

    # Détecter les suppressions
    for code_rome in existing_hashes:
        if code_rome not in api_codes:
            now = datetime.now()
            repo.add_rome_change(RomeChange(
                code_rome=code_rome,
                detected_at=now,
                change_type="deleted",
                old_hash=existing_hashes[code_rome],
                details=json.dumps({"message": "Code ROME absent de l'API"}, ensure_ascii=False),
            ))
            repo.set_rome_update_pending(code_rome, True)
            supprimees += 1
            print(f"   SUPPRIMÉ: {code_rome}")

    # Log dans historique_veille
    repo.add_historique_veille(HistoriqueVeille(
        type_veille="metiers",
        source="rome_v4_api",
        nb_elements_traites=len(all_metiers),
        nb_mises_a_jour=nouvelles + modifiees + supprimees,
        nb_erreurs=erreurs,
        succes=erreurs == 0,
        details=json.dumps({
            "nouvelles": nouvelles,
            "modifiees": modifiees,
            "supprimees": supprimees,
            "inchangees": inchangees,
            "erreurs": erreurs,
        }),
    ))

    # Résumé
    print("\n" + "=" * 60)
    print("RÉSUMÉ VEILLE ROME")
    print("=" * 60)
    print(f"  Total métiers API    : {len(all_metiers)}")
    print(f"  Nouvelles fiches     : {nouvelles}")
    print(f"  Fiches modifiées     : {modifiees}")
    print(f"  Fiches supprimées    : {supprimees}")
    print(f"  Fiches inchangées    : {inchangees}")
    print(f"  Erreurs              : {erreurs}")
    print("=" * 60)

    if erreurs > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
