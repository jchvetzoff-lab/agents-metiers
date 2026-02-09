"""
Backend FastAPI pour Agents Métiers Web.
Expose une API REST pour accéder à la base de données SQLite et aux agents IA.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import sys
import os
import json
import re
from pathlib import Path

# Ajouter le chemin vers le projet agents-metiers existant
AGENTS_METIERS_PATH = Path(__file__).parent.parent.parent / "agents-metiers"
sys.path.insert(0, str(AGENTS_METIERS_PATH))

from database.repository import Repository
from database.models import StatutFiche, FicheMetier, VarianteFiche, MobiliteMetier, TypesContrats, AuditLog, TypeEvenement
from config import get_config

app = FastAPI(
    title="Agents Métiers API",
    description="API REST pour la gestion des fiches métiers avec IA",
    version="1.0.0"
)

# Configuration CORS pour le frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autoriser tous les domaines (Netlify, localhost, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation du repository
config = get_config()
# Utilise PostgreSQL si DATABASE_URL est défini (production), sinon SQLite (dev)
repo = Repository(
    db_path=config.db_path if not config.database.database_url else None,
    database_url=config.database.database_url
)
repo.init_db()

# Migration : ajouter les nouvelles colonnes si elles n'existent pas
def run_migrations():
    """Ajoute les colonnes manquantes à la table fiches_metiers."""
    from sqlalchemy import text, inspect
    engine = repo.engine
    inspector = inspect(engine)
    existing_cols = {c["name"] for c in inspector.get_columns("fiches_metiers")}
    new_columns = {
        "savoirs": "JSON DEFAULT '[]'",
        "acces_metier": "TEXT",
        "missions_principales": "JSON DEFAULT '[]'",
        "types_contrats": "JSON DEFAULT '{}'",
        "mobilite": "JSON DEFAULT '{}'",
    }
    with engine.begin() as conn:
        for col_name, col_type in new_columns.items():
            if col_name not in existing_cols:
                conn.execute(text(f'ALTER TABLE fiches_metiers ADD COLUMN {col_name} {col_type}'))

try:
    run_migrations()
except Exception as e:
    print(f"Migration warning: {e}")


# ==================== HELPERS ====================

def log_action(type_evt: TypeEvenement, description: str, code_rome: str = None, agent: str = "Frontend", validateur: str = None):
    """Enregistre un audit log."""
    try:
        log = AuditLog(
            type_evenement=type_evt,
            agent=agent,
            code_rome=code_rome,
            description=description,
            validateur=validateur,
        )
        repo.add_audit_log(log)
    except Exception as e:
        print(f"Audit log error: {e}")


# ==================== MODELS ====================

class FicheMetierResponse(BaseModel):
    """Modèle de réponse pour une fiche métier."""
    code_rome: str
    nom_masculin: str
    nom_feminin: str
    nom_epicene: str
    statut: str
    description: Optional[str] = None
    description_courte: Optional[str] = None
    date_creation: datetime
    date_maj: datetime
    version: int
    # Données enrichies
    has_competences: bool = False
    has_formations: bool = False
    has_salaires: bool = False
    has_perspectives: bool = False
    nb_variantes: int = 0


class StatsResponse(BaseModel):
    """Statistiques globales."""
    total: int
    brouillons: int
    en_validation: int
    publiees: int
    archivees: int


# ==================== ROUTES ====================

@app.get("/")
async def root():
    """Page d'accueil de l'API."""
    return {
        "message": "Agents Métiers API",
        "version": "1.0.0",
        "endpoints": {
            "stats": "/api/stats",
            "fiches": "/api/fiches",
            "fiche_detail": "/api/fiches/{code_rome}",
            "variantes": "/api/fiches/{code_rome}/variantes"
        }
    }


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    """Récupère les statistiques globales."""
    try:
        total = repo.count_fiches()
        brouillons = repo.count_fiches(StatutFiche.BROUILLON)
        en_validation = repo.count_fiches(StatutFiche.EN_VALIDATION)
        publiees = repo.count_fiches(StatutFiche.PUBLIEE)
        archivees = repo.count_fiches(StatutFiche.ARCHIVEE)

        return StatsResponse(
            total=total,
            brouillons=brouillons,
            en_validation=en_validation,
            publiees=publiees,
            archivees=archivees
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fiches")
async def get_fiches(
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    search: Optional[str] = Query(None, description="Recherche textuelle"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Liste les fiches métiers avec filtres et pagination."""
    try:
        from sqlalchemy import select, func, or_
        from database.models import FicheMetierDB

        # Convertir le statut si fourni
        statut_enum = None
        if statut:
            try:
                statut_enum = StatutFiche(statut.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Statut invalide: {statut}")

        # Construire la requête SQL directement
        with repo.session() as session:
            query = select(FicheMetierDB)
            count_query = select(func.count(FicheMetierDB.id))

            # Filtre statut
            if statut_enum:
                query = query.where(FicheMetierDB.statut == statut_enum.value)
                count_query = count_query.where(FicheMetierDB.statut == statut_enum.value)

            # Filtre recherche en SQL (ILIKE sur code_rome, nom_masculin, nom_feminin, nom_epicene)
            if search:
                search_pattern = f"%{search}%"
                search_filter = or_(
                    FicheMetierDB.code_rome.ilike(search_pattern),
                    FicheMetierDB.nom_masculin.ilike(search_pattern),
                    FicheMetierDB.nom_feminin.ilike(search_pattern),
                    FicheMetierDB.nom_epicene.ilike(search_pattern),
                )
                query = query.where(search_filter)
                count_query = count_query.where(search_filter)

            # Compter le total AVANT pagination
            total = session.execute(count_query).scalar()

            # Appliquer pagination + tri par date de modification decroissant
            query = query.order_by(FicheMetierDB.date_maj.desc()).limit(limit).offset(offset)
            db_fiches = session.execute(query).scalars().all()

            # Convertir en réponse
            results = []
            for db_fiche in db_fiches:
                fiche = db_fiche.to_pydantic()
                nb_variantes = repo.count_variantes(fiche.code_rome)
                results.append(FicheMetierResponse(
                    code_rome=fiche.code_rome,
                    nom_masculin=fiche.nom_masculin,
                    nom_feminin=fiche.nom_feminin,
                    nom_epicene=fiche.nom_epicene,
                    statut=fiche.metadata.statut.value,
                    description=fiche.description,
                    description_courte=fiche.description_courte,
                    date_creation=fiche.metadata.date_creation,
                    date_maj=fiche.metadata.date_maj,
                    version=fiche.metadata.version,
                    has_competences=bool(fiche.competences or fiche.competences_transversales),
                    has_formations=bool(fiche.formations),
                    has_salaires=bool(fiche.salaires),
                    has_perspectives=bool(fiche.perspectives),
                    nb_variantes=nb_variantes
                ))

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FicheMetierCreate(BaseModel):
    """Modèle pour créer une fiche métier."""
    code_rome: str
    nom_masculin: str
    nom_feminin: str
    nom_epicene: str
    definition: Optional[str] = None
    description: Optional[str] = None


@app.post("/api/fiches", status_code=201)
async def create_fiche(fiche_data: FicheMetierCreate):
    """Crée une nouvelle fiche métier."""
    try:
        # Vérifier si la fiche existe déjà
        existing = repo.get_fiche(fiche_data.code_rome)
        if existing:
            raise HTTPException(status_code=400, detail=f"La fiche {fiche_data.code_rome} existe déjà")

        # Créer la fiche
        from database.models import FicheMetier, MetadataFiche, StatutFiche

        nouvelle_fiche = FicheMetier(
            id=fiche_data.code_rome,  # id = code_rome
            code_rome=fiche_data.code_rome,
            nom_masculin=fiche_data.nom_masculin,
            nom_feminin=fiche_data.nom_feminin,
            nom_epicene=fiche_data.nom_epicene,
            description=fiche_data.definition or fiche_data.description or "",
            metadata=MetadataFiche(
                statut=StatutFiche.BROUILLON,
                version=1
            )
        )

        fiche_creee = repo.create_fiche(nouvelle_fiche)

        log_action(
            TypeEvenement.CREATION,
            f"Création de la fiche {fiche_data.code_rome} ({fiche_data.nom_epicene})",
            code_rome=fiche_data.code_rome,
            agent="Utilisateur",
        )

        return {
            "message": "Fiche créée avec succès",
            "code_rome": fiche_creee.code_rome,
            "nom_masculin": fiche_creee.nom_masculin,
            "statut": fiche_creee.metadata.statut.value
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


@app.get("/api/fiches/{code_rome}")
async def get_fiche_detail(code_rome: str):
    """Récupère le détail complet d'une fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        return {
            "code_rome": fiche.code_rome,
            "nom_masculin": fiche.nom_masculin,
            "nom_feminin": fiche.nom_feminin,
            "nom_epicene": fiche.nom_epicene,
            "statut": fiche.metadata.statut.value,
            "description": fiche.description,
            "description_courte": fiche.description_courte,
            "missions_principales": fiche.missions_principales,
            "acces_metier": fiche.acces_metier,
            "competences": fiche.competences,
            "competences_transversales": fiche.competences_transversales,
            "savoirs": fiche.savoirs,
            "formations": fiche.formations,
            "certifications": fiche.certifications,
            "conditions_travail": fiche.conditions_travail,
            "environnements": fiche.environnements,
            "salaires": fiche.salaires.model_dump() if fiche.salaires else None,
            "perspectives": fiche.perspectives.model_dump() if fiche.perspectives else None,
            "types_contrats": fiche.types_contrats.model_dump() if fiche.types_contrats else None,
            "mobilite": fiche.mobilite.model_dump() if fiche.mobilite else None,
            "secteurs_activite": fiche.secteurs_activite,
            "date_creation": fiche.metadata.date_creation,
            "date_maj": fiche.metadata.date_maj,
            "version": fiche.metadata.version,
            "nb_variantes": repo.count_variantes(code_rome)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FicheMetierUpdate(BaseModel):
    """Modèle pour mettre à jour une fiche métier."""
    description: Optional[str] = None
    description_courte: Optional[str] = None
    missions_principales: Optional[List[str]] = None
    acces_metier: Optional[str] = None
    competences: Optional[List[str]] = None
    competences_transversales: Optional[List[str]] = None
    savoirs: Optional[List[str]] = None
    formations: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    conditions_travail: Optional[List[str]] = None
    environnements: Optional[List[str]] = None
    secteurs_activite: Optional[List[str]] = None
    salaires: Optional[dict] = None
    perspectives: Optional[dict] = None
    types_contrats: Optional[dict] = None
    mobilite: Optional[dict] = None
    statut: Optional[str] = None


@app.patch("/api/fiches/{code_rome}")
async def update_fiche(code_rome: str, update_data: FicheMetierUpdate):
    """Met à jour une fiche métier existante."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Appliquer les mises à jour
        fiche_dict = fiche.model_dump()
        update_dict = update_data.model_dump(exclude_none=True)

        for key, value in update_dict.items():
            if key == "statut":
                fiche_dict["metadata"]["statut"] = value
            elif key in ("salaires", "perspectives", "types_contrats", "mobilite") and value:
                fiche_dict[key] = value
            else:
                fiche_dict[key] = value

        # Mettre à jour les métadonnées
        fiche_dict["metadata"]["date_maj"] = datetime.now()
        fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

        # Recréer la fiche et sauvegarder
        updated_fiche = FicheMetier(**fiche_dict)
        repo.update_fiche(updated_fiche)

        return {
            "message": "Fiche mise à jour",
            "code_rome": code_rome,
            "version": updated_fiche.metadata.version
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour: {str(e)}")


@app.get("/api/fiches/{code_rome}/variantes")
async def get_variantes(code_rome: str):
    """Récupère toutes les variantes d'une fiche."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        variantes = repo.get_all_variantes(code_rome)

        return {
            "code_rome": code_rome,
            "total_variantes": len(variantes),
            "variantes": [
                {
                    "id": v.id,
                    "langue": v.langue.value,
                    "tranche_age": v.tranche_age.value,
                    "format_contenu": v.format_contenu.value,
                    "genre": v.genre.value,
                    "nom": v.nom,
                    "description_courte": v.description_courte,
                    "date_maj": v.date_maj
                }
                for v in variantes
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fiches/{code_rome}/variantes/{variante_id}")
async def get_variante_detail(code_rome: str, variante_id: int):
    """Récupère le détail d'une variante spécifique."""
    try:
        # TODO: Implémenter get_variante_by_id dans le repository
        variantes = repo.get_all_variantes(code_rome)
        variante = next((v for v in variantes if v.id == variante_id), None)

        if not variante:
            raise HTTPException(status_code=404, detail=f"Variante {variante_id} non trouvée")

        return {
            "id": variante.id,
            "code_rome": variante.code_rome,
            "langue": variante.langue.value,
            "tranche_age": variante.tranche_age.value,
            "format_contenu": variante.format_contenu.value,
            "genre": variante.genre.value,
            "nom": variante.nom,
            "description": variante.description,
            "description_courte": variante.description_courte,
            "competences": variante.competences,
            "competences_transversales": variante.competences_transversales,
            "formations": variante.formations,
            "certifications": variante.certifications,
            "conditions_travail": variante.conditions_travail,
            "environnements": variante.environnements,
            "date_creation": variante.date_creation,
            "date_maj": variante.date_maj,
            "version": variante.version
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/audit-logs")
async def get_audit_logs(limit: int = Query(15, ge=1, le=100)):
    """Récupère les logs d'audit."""
    try:
        logs = repo.get_audit_logs(limit=limit)

        return {
            "total": len(logs),
            "logs": [
                {
                    "id": log.id,
                    "type_evenement": log.type_evenement.value,
                    "description": log.description,
                    "code_rome": log.code_rome,
                    "agent": log.agent,
                    "validateur": log.validateur,
                    "timestamp": log.timestamp
                }
                for log in logs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ACTIONS IA ====================

ENRICH_PROMPT = """Tu es un expert en ressources humaines et en rédaction de fiches métiers en France.
Génère le contenu complet pour la fiche métier suivante.

Métier : {nom_masculin} / {nom_feminin}
Code ROME : {code_rome}
{contexte}

Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant ou après) contenant :
{{
    "description": "Description complète du métier en 3-5 phrases, factuelle et professionnelle.",
    "description_courte": "Description en 1 phrase (max 200 caractères).",
    "missions_principales": ["5 à 8 missions principales du métier"],
    "acces_metier": "Texte décrivant comment accéder à ce métier (formations, parcours, prérequis). 2-3 phrases.",
    "competences": ["6 à 10 compétences techniques clés (savoir-faire)"],
    "competences_transversales": ["4 à 6 soft skills / savoir-être"],
    "savoirs": ["5 à 8 connaissances théoriques nécessaires"],
    "formations": ["3 à 5 formations ou diplômes typiques"],
    "certifications": ["1 à 3 certifications professionnelles (ou liste vide si aucune)"],
    "conditions_travail": ["3 à 5 conditions de travail caractéristiques"],
    "environnements": ["2 à 4 types de structures/environnements de travail"],
    "secteurs_activite": ["2 à 4 secteurs d'activité"],
    "salaires": {{
        "junior": {{"min": 25000, "max": 35000, "median": 30000}},
        "confirme": {{"min": 35000, "max": 50000, "median": 42000}},
        "senior": {{"min": 50000, "max": 70000, "median": 58000}}
    }},
    "perspectives": {{
        "tension": 0.6,
        "tendance": "stable",
        "evolution_5ans": "Analyse courte de l'évolution du métier dans les 5 prochaines années.",
        "nombre_offres": 5000,
        "taux_insertion": 0.75
    }},
    "types_contrats": {{
        "cdi": 60,
        "cdd": 20,
        "interim": 15,
        "autre": 5
    }},
    "mobilite": {{
        "metiers_proches": [
            {{"nom": "Métier proche 1", "contexte": "Compétences communes en..."}},
            {{"nom": "Métier proche 2", "contexte": "Compétences communes en..."}}
        ],
        "evolutions": [
            {{"nom": "Évolution possible 1", "contexte": "Après expérience en..."}},
            {{"nom": "Évolution possible 2", "contexte": "Avec formation complémentaire en..."}}
        ]
    }}
}}

Notes :
- Les salaires sont en euros brut annuel pour la France en 2025.
- "tension" est un float entre 0 (peu de demande) et 1 (très forte demande).
- "tendance" est "emergence", "stable" ou "disparition".
- "nombre_offres" est une estimation du nombre d'offres d'emploi par an en France.
- "taux_insertion" est un float entre 0 et 1.
- "types_contrats" : les pourcentages doivent totaliser 100.
- Sois factuel et précis. Pas de formulations vagues."""


@app.post("/api/fiches/{code_rome}/enrich")
def enrich_fiche(code_rome: str):
    """Enrichit une fiche métier avec Claude API."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY non configurée")

        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        contexte = ""
        if fiche.description:
            contexte = f"\nDescription existante : {fiche.description}"

        prompt = ENRICH_PROMPT.format(
            nom_masculin=fiche.nom_masculin,
            nom_feminin=fiche.nom_feminin,
            code_rome=fiche.code_rome,
            contexte=contexte,
        )

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text.strip()
        json_match = re.search(r'\{[\s\S]*\}', content)
        if not json_match:
            raise HTTPException(status_code=500, detail="Réponse Claude invalide (pas de JSON)")

        data = json.loads(json_match.group())

        # Build update dict
        fiche_dict = fiche.model_dump()
        for key in [
            "description", "description_courte", "missions_principales",
            "acces_metier", "competences", "competences_transversales",
            "savoirs", "formations", "certifications", "conditions_travail",
            "environnements", "secteurs_activite",
        ]:
            if key in data:
                fiche_dict[key] = data[key]

        if "salaires" in data:
            fiche_dict["salaires"] = data["salaires"]
        if "perspectives" in data:
            fiche_dict["perspectives"] = data["perspectives"]
        if "types_contrats" in data:
            fiche_dict["types_contrats"] = data["types_contrats"]
        if "mobilite" in data:
            fiche_dict["mobilite"] = data["mobilite"]

        fiche_dict["metadata"]["statut"] = "en_validation"
        fiche_dict["metadata"]["date_maj"] = datetime.now()
        fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

        updated_fiche = FicheMetier(**fiche_dict)
        repo.update_fiche(updated_fiche)

        log_action(
            TypeEvenement.MODIFICATION,
            f"Enrichissement IA de {code_rome} ({fiche.nom_epicene}) - v{updated_fiche.metadata.version}",
            code_rome=code_rome,
            agent="Claude IA",
        )

        return {
            "message": "Fiche enrichie avec succès",
            "code_rome": code_rome,
            "nom": fiche.nom_epicene,
            "version": updated_fiche.metadata.version,
        }

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Erreur parsing JSON Claude: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur enrichissement: {str(e)}")


@app.post("/api/fiches/{code_rome}/publish")
async def publish_fiche(code_rome: str):
    """Publie une fiche métier (change le statut en publiee)."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        fiche_dict = fiche.model_dump()
        fiche_dict["metadata"]["statut"] = "publiee"
        fiche_dict["metadata"]["date_maj"] = datetime.now()
        fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

        updated_fiche = FicheMetier(**fiche_dict)
        repo.update_fiche(updated_fiche)

        log_action(
            TypeEvenement.PUBLICATION,
            f"Publication de {code_rome} ({fiche.nom_epicene})",
            code_rome=code_rome,
            agent="Utilisateur",
        )

        return {
            "message": "Fiche publiée",
            "code_rome": code_rome,
            "statut": "publiee",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur publication: {str(e)}")


class PublishBatchRequest(BaseModel):
    codes_rome: List[str]


@app.post("/api/fiches/publish-batch")
async def publish_batch(request: PublishBatchRequest):
    """Publie plusieurs fiches en masse."""
    results = []
    for code_rome in request.codes_rome:
        try:
            fiche = repo.get_fiche(code_rome)
            if not fiche:
                results.append({"code_rome": code_rome, "status": "error", "message": "Non trouvée"})
                continue

            fiche_dict = fiche.model_dump()
            fiche_dict["metadata"]["statut"] = "publiee"
            fiche_dict["metadata"]["date_maj"] = datetime.now()
            fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

            updated_fiche = FicheMetier(**fiche_dict)
            repo.update_fiche(updated_fiche)
            results.append({"code_rome": code_rome, "status": "ok", "message": "Publiée"})
            log_action(
                TypeEvenement.PUBLICATION,
                f"Publication batch de {code_rome}",
                code_rome=code_rome,
                agent="Utilisateur",
            )
        except Exception as e:
            results.append({"code_rome": code_rome, "status": "error", "message": str(e)})

    ok_count = sum(1 for r in results if r["status"] == "ok")
    return {
        "message": f"{ok_count}/{len(request.codes_rome)} fiches publiées",
        "results": results,
    }


# ==================== VALIDATION ====================

VALIDATE_PROMPT = """Tu es un expert qualité en fiches métiers ROME pour France Travail.
Analyse la fiche métier suivante et fournis un rapport de validation détaillé.

Fiche métier :
- Code ROME : {code_rome}
- Nom : {nom_masculin} / {nom_feminin}
- Description : {description}
- Description courte : {description_courte}
- Missions principales : {missions_principales}
- Accès métier : {acces_metier}
- Compétences techniques : {competences}
- Compétences transversales : {competences_transversales}
- Savoirs : {savoirs}
- Formations : {formations}
- Certifications : {certifications}
- Conditions de travail : {conditions_travail}
- Environnements : {environnements}
- Secteurs d'activité : {secteurs_activite}
- Salaires : {salaires}
- Perspectives : {perspectives}
- Types de contrats : {types_contrats}
- Mobilité : {mobilite}

Évalue la fiche sur les critères suivants :
1. **Complétude** : Toutes les sections sont-elles remplies ? Les listes ont-elles assez d'éléments ?
2. **Exactitude** : Les informations sont-elles factuellement correctes pour la France ?
3. **Cohérence** : Les compétences, formations et salaires sont-ils cohérents entre eux ?
4. **Qualité rédactionnelle** : Orthographe, grammaire, clarté, ton professionnel ?
5. **Pertinence** : Les données correspondent-elles bien au métier décrit ?

Réponds UNIQUEMENT avec un objet JSON valide :
{{
    "score": 85,
    "verdict": "approuvee",
    "resume": "Résumé en 1-2 phrases de la qualité globale.",
    "criteres": {{
        "completude": {{"score": 90, "commentaire": "..."}},
        "exactitude": {{"score": 85, "commentaire": "..."}},
        "coherence": {{"score": 80, "commentaire": "..."}},
        "qualite_redactionnelle": {{"score": 90, "commentaire": "..."}},
        "pertinence": {{"score": 85, "commentaire": "..."}}
    }},
    "problemes": ["Problème 1 à corriger", "Problème 2 à corriger"],
    "suggestions": ["Amélioration suggérée 1", "Amélioration suggérée 2"]
}}

Notes :
- "score" est un entier de 0 à 100 (moyenne des 5 critères).
- "verdict" : "approuvee" (score >= 70), "a_corriger" (score 40-69), "rejetee" (score < 40).
- "problemes" : liste des erreurs factuelles ou lacunes importantes (peut être vide).
- "suggestions" : liste d'améliorations optionnelles (peut être vide).
- Sois exigeant mais juste. Une bonne fiche enrichie devrait obtenir 75-90."""


@app.post("/api/fiches/{code_rome}/validate")
def validate_fiche(code_rome: str):
    """Validation IA : Claude analyse la qualité de la fiche et retourne un rapport."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        if fiche.metadata.statut.value == "brouillon" and not fiche.description:
            raise HTTPException(status_code=400, detail="Fiche non enrichie, impossible de valider un brouillon vide")

        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY non configurée")

        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = VALIDATE_PROMPT.format(
            code_rome=fiche.code_rome,
            nom_masculin=fiche.nom_masculin,
            nom_feminin=fiche.nom_feminin,
            description=fiche.description or "Non renseignée",
            description_courte=fiche.description_courte or "Non renseignée",
            missions_principales=json.dumps(fiche.missions_principales or [], ensure_ascii=False),
            acces_metier=fiche.acces_metier or "Non renseigné",
            competences=json.dumps(fiche.competences or [], ensure_ascii=False),
            competences_transversales=json.dumps(fiche.competences_transversales or [], ensure_ascii=False),
            savoirs=json.dumps(fiche.savoirs or [], ensure_ascii=False),
            formations=json.dumps(fiche.formations or [], ensure_ascii=False),
            certifications=json.dumps(fiche.certifications or [], ensure_ascii=False),
            conditions_travail=json.dumps(fiche.conditions_travail or [], ensure_ascii=False),
            environnements=json.dumps(fiche.environnements or [], ensure_ascii=False),
            secteurs_activite=json.dumps(fiche.secteurs_activite or [], ensure_ascii=False),
            salaires=json.dumps(fiche.salaires.model_dump() if fiche.salaires else {}, ensure_ascii=False),
            perspectives=json.dumps(fiche.perspectives.model_dump() if fiche.perspectives else {}, ensure_ascii=False),
            types_contrats=json.dumps(fiche.types_contrats.model_dump() if fiche.types_contrats else {}, ensure_ascii=False),
            mobilite=json.dumps(fiche.mobilite.model_dump() if fiche.mobilite else {}, ensure_ascii=False),
        )

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text.strip()
        json_match = re.search(r'\{[\s\S]*\}', content)
        if not json_match:
            raise HTTPException(status_code=500, detail="Réponse Claude invalide (pas de JSON)")

        rapport = json.loads(json_match.group())

        log_action(
            TypeEvenement.VALIDATION,
            f"Validation IA de {code_rome} ({fiche.nom_epicene}) - Score: {rapport.get('score', '?')}/100 - Verdict: {rapport.get('verdict', '?')}",
            code_rome=code_rome,
            agent="Claude IA",
        )

        return {
            "message": "Validation IA terminée",
            "code_rome": code_rome,
            "nom": fiche.nom_epicene,
            "rapport": rapport,
        }

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Erreur parsing JSON Claude: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur validation IA: {str(e)}")


class HumanReviewRequest(BaseModel):
    decision: str  # "approuvee", "a_corriger", "rejetee"
    commentaire: Optional[str] = None


@app.post("/api/fiches/{code_rome}/review")
async def review_fiche(code_rome: str, review: HumanReviewRequest):
    """Validation humaine : approuver, demander des corrections, ou rejeter une fiche."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        valid_decisions = ["approuvee", "a_corriger", "rejetee"]
        if review.decision not in valid_decisions:
            raise HTTPException(
                status_code=400,
                detail=f"Décision invalide. Valeurs acceptées: {valid_decisions}"
            )

        fiche_dict = fiche.model_dump()

        if review.decision == "approuvee":
            fiche_dict["metadata"]["statut"] = "publiee"
        elif review.decision == "a_corriger":
            fiche_dict["metadata"]["statut"] = "brouillon"
        elif review.decision == "rejetee":
            fiche_dict["metadata"]["statut"] = "archivee"

        fiche_dict["metadata"]["date_maj"] = datetime.now()
        fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

        updated_fiche = FicheMetier(**fiche_dict)
        repo.update_fiche(updated_fiche)

        statut_labels = {
            "approuvee": "publiee",
            "a_corriger": "brouillon",
            "rejetee": "archivee",
        }

        decision_labels = {
            "approuvee": "Approuvée",
            "a_corriger": "Renvoyée en correction",
            "rejetee": "Rejetée",
        }

        comment_part = f" - Commentaire: {review.commentaire}" if review.commentaire else ""
        log_action(
            TypeEvenement.VALIDATION,
            f"Review humaine de {code_rome} ({fiche.nom_epicene}): {decision_labels[review.decision]}{comment_part}",
            code_rome=code_rome,
            agent="Utilisateur",
            validateur="Utilisateur",
        )

        return {
            "message": f"Fiche {review.decision}",
            "code_rome": code_rome,
            "decision": review.decision,
            "commentaire": review.commentaire,
            "nouveau_statut": statut_labels[review.decision],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur review: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
