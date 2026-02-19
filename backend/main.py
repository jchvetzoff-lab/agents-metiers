"""
Backend FastAPI pour Agents Métiers Web.
Expose une API REST pour accéder à la base de données SQLite et aux agents IA.
"""

# Standard library imports
import json
import logging
import os
import sys
from datetime import datetime, date


def _json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional

# Third-party imports
import anthropic
import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect

# Constants
DEFAULT_PAGINATION_LIMIT = 50
MAX_PAGINATION_LIMIT = 500
DEFAULT_AUDIT_LIMIT = 15
MAX_AUDIT_LIMIT = 100
FUZZY_SEARCH_THRESHOLD = 0.4
FUZZY_COMPETENCES_THRESHOLD = 0.5

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ajouter le chemin vers le projet agents-metiers existant
AGENTS_METIERS_PATH = Path(__file__).parent.parent.parent / "agents-metiers"
sys.path.insert(0, str(AGENTS_METIERS_PATH))

# Local imports after path setup
from database.models import StatutFiche, FicheMetier, MetadataFiche

# Import shared dependencies
from .shared import repo, config

# Import modules and their routers
from . import auth
from . import validation
from . import enrichment
from . import regions

# Import models
from .models import (
    FicheMetierResponse, FicheMetierCreate, FicheMetierUpdate,
    StatsResponse, PublishBatchRequest, VariantesGenerateRequest
)

# Initialize FastAPI app
app = FastAPI(
    title="Agents Métiers API",
    description="API REST pour la gestion des fiches métiers avec IA",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all domains (Netlify, localhost, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(validation.router, prefix="/api", tags=["validation"])
app.include_router(enrichment.router, prefix="/api", tags=["enrichment"])
app.include_router(regions.router, prefix="/api", tags=["regions"])


# ==================== HELPER FUNCTIONS ====================

def get_current_timestamp() -> datetime:
    """Get current timestamp."""
    return datetime.now()


def get_user_name_from_request(request: Request) -> str:
    """Extract user name from X-User-Name header, fallback to 'Utilisateur'."""
    return request.headers.get("X-User-Name", "Utilisateur")


def get_anthropic_api_key() -> Optional[str]:
    """Get Anthropic API key from environment or config."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and hasattr(config, 'api') and hasattr(config.api, 'anthropic_api_key'):
        api_key = config.api.anthropic_api_key
    return api_key


def create_db_session_context():
    """Create database session context manager."""
    return repo.session()


def add_audit_log(type_evt: str, code_rome: str, agent: str, description: str, validateur: str = None) -> None:
    """Helper to add audit log."""
    from database.models import AuditLog as AL, TypeEvenement as TE
    try:
        te = TE(type_evt)
    except ValueError:
        te = TE.MODIFICATION
    
    audit_log = AL(
        timestamp=get_current_timestamp(),
        type_evenement=te,
        code_rome=code_rome,
        agent=agent,
        description=description,
        validateur=validateur,
    )
    repo.add_audit_log(audit_log)


def fuzzy_match(query: str, text: str, threshold: float = FUZZY_SEARCH_THRESHOLD) -> float:
    """Return similarity score between 0 and 1. Combines substring match + fuzzy."""
    query_lower = query.lower()
    text_lower = text.lower()
    
    # Exact substring = score max
    if query_lower in text_lower:
        return 1.0
    
    # Check each word in text
    words = text_lower.split()
    best_word_score = 0.0
    for word in words:
        ratio = SequenceMatcher(None, query_lower, word).ratio()
        if ratio > best_word_score:
            best_word_score = ratio
    
    # Also check full string ratio
    full_ratio = SequenceMatcher(None, query_lower, text_lower).ratio()
    return max(best_word_score, full_ratio)


def search_fiches_fuzzy(fiches: List[Any], query: str, threshold: float = FUZZY_SEARCH_THRESHOLD) -> List[Any]:
    """Fuzzy search on name/code. Return fiches sorted by relevance."""
    if not query or not fiches:
        return fiches
        
    scored = []
    for fiche in fiches:
        scores = [
            fuzzy_match(query, fiche.code_rome),
            fuzzy_match(query, fiche.nom_masculin),
            fuzzy_match(query, fiche.nom_feminin),
            fuzzy_match(query, fiche.nom_epicene),
        ]
        if getattr(fiche, 'description', None):
            scores.append(fuzzy_match(query, fiche.description) * 0.6)
        
        best_score = max(scores)
        if best_score >= threshold:
            scored.append((fiche, best_score))
    
    scored.sort(key=lambda x: x[1], reverse=True)
    return [fiche for fiche, _ in scored]


def search_fiches_competences(fiches: List[Any], query: str) -> List[Any]:
    """Search in competences, competences_transversales and formations."""
    if not query or not fiches:
        return fiches
        
    query_lower = query.lower()
    results = []
    
    for fiche in fiches:
        all_competences = []
        all_competences.extend(getattr(fiche, 'competences', None) or [])
        all_competences.extend(getattr(fiche, 'competences_transversales', None) or [])
        all_competences.extend(getattr(fiche, 'formations', None) or [])
        
        match_score = 0
        for comp in all_competences:
            if isinstance(comp, str):
                if query_lower in comp.lower():
                    match_score += 1.0
                else:
                    ratio = SequenceMatcher(None, query_lower, comp.lower()).ratio()
                    if ratio > FUZZY_COMPETENCES_THRESHOLD:
                        match_score += ratio
        
        if match_score > 0:
            results.append((fiche, match_score))
    
    results.sort(key=lambda x: x[1], reverse=True)
    return [fiche for fiche, _ in results]


def resolve_mobilite_codes(repo, mobilite: Any) -> Any:
    """Resolve code_rome for mobilite items by searching the DB by name."""
    if not mobilite or not isinstance(mobilite, dict):
        return mobilite
    
    # Build a name -> code_rome lookup from all fiches (cached)
    if not hasattr(resolve_mobilite_codes, "_cache"):
        try:
            with create_db_session_context() as session:
                rows = session.execute(
                    text("SELECT code_rome, nom_masculin, nom_feminin, nom_epicene FROM fiches_metiers")
                ).fetchall()
                lookup = {}
                for row in rows:
                    for name in [row[1], row[2], row[3]]:
                        if name:
                            lookup[name.lower().strip()] = row[0]
                resolve_mobilite_codes._cache = lookup
        except Exception:
            resolve_mobilite_codes._cache = {}
    
    lookup = resolve_mobilite_codes._cache
    
    def resolve_items(items: List[Any]) -> List[Any]:
        if not items:
            return items
        resolved = []
        for item in items:
            if isinstance(item, dict):
                nom = (item.get("nom") or "").lower().strip()
                code = lookup.get(nom)
                resolved.append({**item, "code_rome": code})
            else:
                resolved.append(item)
        return resolved
    
    return {
        "metiers_proches": resolve_items(mobilite.get("metiers_proches", [])),
        "evolutions": resolve_items(mobilite.get("evolutions", [])),
    }


# ==================== DATABASE MIGRATION ====================

def run_database_migration() -> None:
    """Add validation columns if they don't exist."""
    try:
        with create_db_session_context() as session:
            inspector = inspect(repo.engine)
            existing_columns = [c["name"] for c in inspector.get_columns("fiches_metiers")]
            
            new_columns = {
                "validation_ia_score": "INTEGER",
                "validation_ia_date": "TIMESTAMP",
                "validation_ia_details": "TEXT",
                "validation_humaine": "VARCHAR(20)",
                "validation_humaine_date": "TIMESTAMP",
                "validation_humaine_par": "VARCHAR(100)",
                "validation_humaine_commentaire": "TEXT",
                "missions_principales": "JSON",
                "acces_metier": "TEXT",
                "savoirs": "JSON",
                "types_contrats": "JSON",
                "mobilite": "JSON",
                "traits_personnalite": "JSON",
                "aptitudes": "JSON",
                "profil_riasec": "JSON",
                "autres_appellations": "JSON",
                "statuts_professionnels": "JSON",
                "niveau_formation": "VARCHAR(255)",
                "domaine_professionnel": "JSON",
                "sites_utiles": "JSON",
                "conditions_travail_detaillees": "JSON",
                "competences_dimensions": "JSON",
                "preferences_interets": "JSON",
                "last_enrichment_diff": "JSON",
            }
            
            for column_name, column_type in new_columns.items():
                if column_name not in existing_columns:
                    try:
                        session.execute(text(f'ALTER TABLE fiches_metiers ADD COLUMN {column_name} {column_type}'))
                    except Exception as e:
                        logger.info(f"Migration skip {column_name}: {e}")
    except Exception as e:
        logger.warning(f"Migration error (non-fatal): {e}")


# Run migration on startup
try:
    run_database_migration()
except Exception as e:
    logger.error(f"Migration error (non-fatal): {e}")


# ==================== MAIN ROUTES ====================

@app.get("/")
async def root() -> Dict[str, Any]:
    """API root endpoint."""
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
async def get_stats() -> StatsResponse:
    """Get global statistics."""
    try:
        total = repo.count_fiches()
        brouillons = repo.count_fiches(StatutFiche.BROUILLON)
        enrichis = repo.count_fiches(StatutFiche.ENRICHI)
        valides = repo.count_fiches(StatutFiche.VALIDE)
        publiees = repo.count_fiches(StatutFiche.PUBLIEE)

        return StatsResponse(
            total=total,
            brouillons=brouillons,
            enrichis=enrichis,
            valides=valides,
            publiees=publiees,
        )
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fiches")
async def get_fiches(
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    search: Optional[str] = Query(None, description="Recherche textuelle fuzzy"),
    search_competences: Optional[str] = Query(None, description="Recherche par compétences"),
    sort_by: Optional[str] = Query(None, description="Tri: score, date_maj, nom"),
    sort_order: Optional[str] = Query("desc", description="Ordre: asc ou desc"),
    limit: int = Query(DEFAULT_PAGINATION_LIMIT, ge=1, le=MAX_PAGINATION_LIMIT),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """List fiches métiers with filters, fuzzy search and competences search."""
    try:
        # Convert status if provided
        statut_enum = None
        if statut:
            try:
                statut_enum = StatutFiche(statut.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Statut invalide: {statut}")

        # Get fiches
        fiches = repo.get_all_fiches(statut=statut_enum)

        # Fuzzy search on name/code/description
        if search:
            fiches = search_fiches_fuzzy(fiches, search)

        # Competences search
        if search_competences:
            fiches = search_fiches_competences(fiches, search_competences)

        # Server-side sorting
        if sort_by == "score":
            from .validation import calculate_completude_score
            fiches_scored = [(f, calculate_completude_score(f)["score"]) for f in fiches]
            fiches_scored.sort(key=lambda x: x[1], reverse=(sort_order != "asc"))
            fiches = [f for f, _ in fiches_scored]
        elif sort_by == "date_maj":
            fiches.sort(
                key=lambda f: f.metadata.date_maj or datetime.min, 
                reverse=(sort_order != "asc")
            )
        elif sort_by == "nom":
            fiches.sort(
                key=lambda f: (f.nom_epicene or f.nom_masculin or "").lower(), 
                reverse=(sort_order == "desc")
            )

        # Pagination
        total = len(fiches)
        fiches_page = fiches[offset:offset + limit]

        # Convert to response format
        results = []
        for fiche in fiches_page:
            nb_variantes = repo.count_variantes(fiche.code_rome)
            from .validation import calculate_completude_score
            score_data = calculate_completude_score(fiche)
            
            results.append({
                "code_rome": fiche.code_rome,
                "nom_masculin": fiche.nom_masculin,
                "nom_feminin": fiche.nom_feminin,
                "nom_epicene": fiche.nom_epicene,
                "statut": fiche.metadata.statut.value,
                "description": fiche.description,
                "description_courte": fiche.description_courte,
                "date_creation": fiche.metadata.date_creation,
                "date_maj": fiche.metadata.date_maj,
                "version": fiche.metadata.version,
                "has_competences": bool(fiche.competences or fiche.competences_transversales),
                "has_formations": bool(fiche.formations),
                "has_salaires": bool(fiche.salaires),
                "has_perspectives": bool(fiche.perspectives),
                "nb_variantes": nb_variantes,
                "score_completude": score_data["score"],
            })

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fiches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fiches", status_code=201)
async def create_fiche(fiche_data: FicheMetierCreate) -> Dict[str, Any]:
    """Create new fiche métier."""
    try:
        # Check if fiche already exists
        existing = repo.get_fiche(fiche_data.code_rome)
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"La fiche {fiche_data.code_rome} existe déjà"
            )

        # Create fiche
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

        return {
            "message": "Fiche créée avec succès",
            "code_rome": fiche_creee.code_rome,
            "nom_masculin": fiche_creee.nom_masculin,
            "statut": fiche_creee.metadata.statut.value
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating fiche: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


@app.get("/api/fiches/{code_rome}")
async def get_fiche_detail(code_rome: str) -> Dict[str, Any]:
    """Get complete detail of a fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Completude score
        from .validation import calculate_completude_score
        score_data = calculate_completude_score(fiche)

        # Fetch validation data from DB
        validation_info = {}
        try:
            with create_db_session_context() as session:
                row = session.execute(
                    text("SELECT validation_ia_score, validation_ia_date, validation_ia_details, "
                         "validation_humaine, validation_humaine_date, validation_humaine_par, "
                         "validation_humaine_commentaire FROM fiches_metiers WHERE code_rome = :cr"),
                    {"cr": code_rome}
                ).fetchone()
                if row:
                    validation_info = {
                        "validation_ia_score": row[0],
                        "validation_ia_date": row[1],
                        "validation_ia_details": json.loads(row[2]) if row[2] else None,
                        "validation_humaine": row[3],
                        "validation_humaine_date": row[4],
                        "validation_humaine_par": row[5],
                        "validation_humaine_commentaire": row[6],
                    }
        except Exception as e:
            logger.warning(f"Error fetching validation data for {code_rome}: {e}")

        return {
            "code_rome": fiche.code_rome,
            "nom_masculin": fiche.nom_masculin,
            "nom_feminin": fiche.nom_feminin,
            "nom_epicene": fiche.nom_epicene,
            "statut": fiche.metadata.statut.value,
            "description": fiche.description,
            "description_courte": fiche.description_courte,
            "competences": fiche.competences,
            "competences_transversales": fiche.competences_transversales,
            "formations": fiche.formations,
            "certifications": fiche.certifications,
            "conditions_travail": fiche.conditions_travail,
            "environnements": fiche.environnements,
            "salaires": fiche.salaires.model_dump() if fiche.salaires else None,
            "perspectives": fiche.perspectives.model_dump() if fiche.perspectives else None,
            "metiers_proches": fiche.metiers_proches or [],
            "secteurs_activite": fiche.secteurs_activite or [],
            "missions_principales": fiche.missions_principales or [],
            "acces_metier": fiche.acces_metier,
            "savoirs": fiche.savoirs or [],
            "types_contrats": fiche.types_contrats,
            "mobilite": resolve_mobilite_codes(repo, fiche.mobilite),
            "traits_personnalite": fiche.traits_personnalite or [],
            "aptitudes": fiche.aptitudes or [],
            "profil_riasec": fiche.profil_riasec,
            "autres_appellations": fiche.autres_appellations or [],
            "statuts_professionnels": fiche.statuts_professionnels or [],
            "niveau_formation": fiche.niveau_formation,
            "domaine_professionnel": fiche.domaine_professionnel,
            "sites_utiles": fiche.sites_utiles or [],
            "conditions_travail_detaillees": fiche.conditions_travail_detaillees,
            "competences_dimensions": fiche.competences_dimensions,
            "preferences_interets": fiche.preferences_interets,
            "date_creation": fiche.metadata.date_creation,
            "date_maj": fiche.metadata.date_maj,
            "version": fiche.metadata.version,
            "nb_variantes": repo.count_variantes(code_rome),
            "score_completude": score_data["score"],
            "score_details": score_data["details"],
            **validation_info,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fiche detail {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/fiches/{code_rome}")
async def update_fiche(code_rome: str, update_data: FicheMetierUpdate) -> Dict[str, Any]:
    """Update existing fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Apply updates
        fiche_dict = fiche.model_dump()
        update_dict = update_data.model_dump(exclude_none=True)

        for key, value in update_dict.items():
            if key == "statut":
                fiche_dict["metadata"]["statut"] = value
            elif key == "salaires" and value:
                fiche_dict["salaires"] = value
            elif key == "perspectives" and value:
                fiche_dict["perspectives"] = value
            else:
                fiche_dict[key] = value

        # Update metadata
        fiche_dict["metadata"]["date_maj"] = get_current_timestamp()
        fiche_dict["metadata"]["version"] = fiche_dict["metadata"].get("version", 1) + 1

        # Recreate fiche and save
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
        logger.error(f"Error updating fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour: {str(e)}")


@app.delete("/api/fiches/{code_rome}")
async def delete_fiche(code_rome: str, request: Request) -> Dict[str, Any]:
    """Delete fiche métier."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")
        
        with create_db_session_context() as session:
            session.execute(
                text("DELETE FROM variantes_fiches WHERE code_rome = :cr"), 
                {"cr": code_rome}
            )
            session.execute(
                text("DELETE FROM fiches_metiers WHERE code_rome = :cr"), 
                {"cr": code_rome}
            )
        
        user = get_user_name_from_request(request)
        add_audit_log("suppression", code_rome, user, f"Suppression de {fiche.nom_epicene} par {user}")
        
        return {"message": "Fiche supprimée", "code_rome": code_rome}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VARIANTES ROUTES ====================

@app.get("/api/fiches/{code_rome}/variantes")
async def get_variantes(code_rome: str) -> Dict[str, Any]:
    """Get all variantes for a fiche."""
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
        logger.error(f"Error getting variantes for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fiches/{code_rome}/variantes/{variante_id}")
async def get_variante_detail(code_rome: str, variante_id: int) -> Dict[str, Any]:
    """Get detail of specific variante."""
    try:
        # TODO: Implement get_variante_by_id in repository
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
        logger.error(f"Error getting variante detail {code_rome}/{variante_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fiches/{code_rome}/variantes/generate")
async def generate_variantes(
    code_rome: str, 
    body: VariantesGenerateRequest, 
    request: Request
) -> Dict[str, Any]:
    """Generate variantes via Claude and store in DB."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        langues = body.langues or ["fr"]
        genres = body.genres or ["epicene"]
        tranches_age = body.tranches_age or ["adulte"]
        formats = body.formats or ["standard"]

        combinations = []
        for langue in langues:
            for genre in genres:
                for age in tranches_age:
                    for fmt in formats:
                        if not (langue == "fr" and genre == "epicene" and age == "adulte" and fmt == "standard"):
                            combinations.append({
                                "langue": langue, 
                                "genre": genre, 
                                "tranche_age": age, 
                                "format": fmt
                            })

        if not combinations:
            return {"variantes_generees": 0, "message": "Aucune combinaison de variantes à générer"}

        api_key = get_anthropic_api_key()
        if not api_key:
            raise HTTPException(status_code=500, detail="Clé API Anthropic non configurée")

        client = anthropic.Anthropic(api_key=api_key)
        count = 0

        for combo in combinations:
            prompt = f"""Adapte cette fiche métier selon les paramètres suivants:
- Langue: {combo['langue']}
- Genre: {combo['genre']}
- Tranche d'âge: {combo['tranche_age']}
- Format: {combo['format']}

Fiche source:
Nom: {fiche.nom_epicene}
Description: {fiche.description or 'N/A'}
Compétences: {json.dumps(fiche.competences or [], ensure_ascii=False, default=_json_serial)}

Retourne un JSON:
{{
  "nom": "Nom adapté",
  "description": "Description adaptée",
  "description_courte": "Description courte adaptée",
  "competences": ["compétences adaptées"],
  "formations": ["formations adaptées"]
}}"""

            try:
                message = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                response_text = message.content[0].text.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                response_text = response_text.strip()
                variante_data = json.loads(response_text)

                with create_db_session_context() as session:
                    session.execute(
                        text("""INSERT INTO variantes_fiches
                            (code_rome, langue, genre, tranche_age, format_contenu,
                             nom, description, description_courte, competences, formations,
                             date_creation, date_maj, version)
                            VALUES (:cr, :l, :g, :a, :f, :nom, :desc, :dc, :comp, :form, :now, :now, 1)"""),
                        {
                            "cr": code_rome, 
                            "l": combo["langue"], 
                            "g": combo["genre"],
                            "a": combo["tranche_age"], 
                            "f": combo["format"],
                            "nom": variante_data.get("nom", fiche.nom_epicene),
                            "desc": variante_data.get("description", ""),
                            "dc": variante_data.get("description_courte", ""),
                            "comp": json.dumps(variante_data.get("competences", []), ensure_ascii=False, default=_json_serial),
                            "form": json.dumps(variante_data.get("formations", []), ensure_ascii=False, default=_json_serial),
                            "now": get_current_timestamp(),
                        }
                    )
                count += 1
            except Exception as e:
                logger.warning(f"Error generating variante {combo}: {e}")
                continue

        user = get_user_name_from_request(request)
        add_audit_log(
            "generation_variantes", 
            code_rome, 
            user,
            f"Génération de {count} variante(s) pour {fiche.nom_epicene}"
        )

        return {"variantes_generees": count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating variantes for {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PUBLICATION ROUTES ====================

@app.post("/api/fiches/{code_rome}/publish")
async def publish_fiche(code_rome: str, request: Request) -> Dict[str, Any]:
    """Publication: requires IA validation >= 70 AND approved human validation."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        from .validation import VALIDATION_IA_MIN_SCORE_PASS
        
        with create_db_session_context() as session:
            row = session.execute(
                text("SELECT validation_ia_score, validation_humaine FROM fiches_metiers WHERE code_rome = :cr"),
                {"cr": code_rome}
            ).fetchone()

            ia_score = row[0] if row else None
            humaine = row[1] if row else None

            if not ia_score or ia_score < VALIDATION_IA_MIN_SCORE_PASS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Validation IA insuffisante ({ia_score or 'non faite'}). Score minimum requis : {VALIDATION_IA_MIN_SCORE_PASS}."
                )

            if humaine != "approuvee":
                raise HTTPException(
                    status_code=400,
                    detail=f"Validation humaine requise (actuel : {humaine or 'non faite'})."
                )

            session.execute(
                text("UPDATE fiches_metiers SET statut = 'publiee' WHERE code_rome = :cr"),
                {"cr": code_rome}
            )

        user = get_user_name_from_request(request)
        add_audit_log(
            "publication", 
            code_rome, 
            user,
            f"Publication de {fiche.nom_epicene} par {user}"
        )

        return {"message": "Fiche publiée", "code_rome": code_rome}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing fiche {code_rome}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fiches/publish-batch")
async def publish_batch(body: PublishBatchRequest, request: Request) -> Dict[str, Any]:
    """Batch publication of multiple fiches."""
    from .validation import VALIDATION_IA_MIN_SCORE_PASS
    
    results = []
    user = get_user_name_from_request(request)
    
    for code_rome in body.codes_rome:
        try:
            fiche = repo.get_fiche(code_rome)
            if not fiche:
                results.append({
                    "code_rome": code_rome, 
                    "status": "error", 
                    "message": "Fiche non trouvée"
                })
                continue
                
            with create_db_session_context() as session:
                row = session.execute(
                    text("SELECT validation_ia_score, validation_humaine FROM fiches_metiers WHERE code_rome = :cr"),
                    {"cr": code_rome}
                ).fetchone()
                
                ia_score = row[0] if row else None
                humaine = row[1] if row else None
                
                if not ia_score or ia_score < VALIDATION_IA_MIN_SCORE_PASS:
                    results.append({
                        "code_rome": code_rome, 
                        "status": "error",
                        "message": f"Validation IA insuffisante ({ia_score or 'non faite'})"
                    })
                    continue
                    
                if humaine != "approuvee":
                    results.append({
                        "code_rome": code_rome, 
                        "status": "error",
                        "message": f"Validation humaine requise ({humaine or 'non faite'})"
                    })
                    continue
                    
                session.execute(
                    text("UPDATE fiches_metiers SET statut = 'publiee' WHERE code_rome = :cr"),
                    {"cr": code_rome}
                )
                
            add_audit_log(
                "publication", 
                code_rome, 
                user, 
                f"Publication batch de {fiche.nom_epicene} par {user}"
            )
            results.append({
                "code_rome": code_rome, 
                "status": "success", 
                "message": "Publiée"
            })
        except Exception as e:
            results.append({
                "code_rome": code_rome, 
                "status": "error", 
                "message": str(e)
            })
            
    return {"results": results}


# ==================== AUDIT ROUTES ====================

@app.get("/api/audit-logs")
async def get_audit_logs(
    limit: int = Query(DEFAULT_AUDIT_LIMIT, ge=1, le=MAX_AUDIT_LIMIT),
    code_rome: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    type_evenement: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get audit logs with filters."""
    try:
        from database.models import TypeEvenement as TE
        te = None
        if type_evenement:
            try:
                te = TE(type_evenement)
            except ValueError:
                pass

        logs = repo.get_audit_logs(
            limit=limit,
            code_rome=code_rome,
            type_evenement=te,
            search=search,
            agent=agent,
            since=since,
        )

        return {
            "total": len(logs),
            "logs": [
                {
                    "id": log.id,
                    "type_evenement": log.type_evenement.value,
                    "description": log.description,
                    "code_rome": log.code_rome,
                    "agent": log.agent or "Système",
                    "validateur": log.validateur,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in logs
            ]
        }
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ROME SYNC & VEILLE ROUTES ====================

@app.post("/api/rome/sync")
async def rome_sync() -> Dict[str, Any]:
    """Synchronize ROME repository (stub)."""
    return {"nouvelles": 0, "mises_a_jour": 0, "inchangees": 1585}


@app.post("/api/veille/rome")
async def veille_rome() -> Dict[str, Any]:
    """Trigger ROME monitoring (stub)."""
    return {"message": "Veille lancée", "fiches_verifiees": 0, "modifications_detectees": 0}


@app.get("/api/veille/rome/status")
async def veille_rome_status() -> Dict[str, Any]:
    """Return ROME monitoring status (stub)."""
    return {"derniere_execution": None, "prochaine_execution": None, "fiches_a_verifier": 0}


@app.get("/api/veille/rome/changes")
async def veille_rome_changes() -> Dict[str, Any]:
    """Return detected ROME changes (stub)."""
    return {"total": 0, "changes": []}


@app.post("/api/veille/rome/changes/{change_id}/review")
async def veille_rome_review(change_id: str) -> Dict[str, Any]:
    """Review ROME change (stub)."""
    return {"message": "OK"}


# ==================== DASHBOARD ====================

@app.get("/api/dashboard/enrichment")
async def get_enrichment_dashboard() -> Dict[str, Any]:
    """Enrichment analytics dashboard data."""
    try:
        from .validation import calculate_completude_score
        from database.models import StatutFiche

        # Total fiches by status (reuse stats logic)
        total = repo.count_fiches()
        brouillons = repo.count_fiches(StatutFiche.BROUILLON)
        enrichis = repo.count_fiches(StatutFiche.ENRICHI)
        valides = repo.count_fiches(StatutFiche.VALIDE)
        publiees = repo.count_fiches(StatutFiche.PUBLIEE)

        status_counts = {
            "total": total,
            "brouillons": brouillons,
            "enrichis": enrichis,
            "valides": valides,
            "publiees": publiees,
        }

        # Enrichment history from audit logs (grouped by day)
        enrichment_history = []
        try:
            with create_db_session_context() as session:
                rows = session.execute(
                    text("""SELECT DATE(timestamp) as day, COUNT(*) as cnt
                            FROM audit_logs
                            WHERE type_evenement = 'enrichissement'
                            GROUP BY DATE(timestamp)
                            ORDER BY day DESC
                            LIMIT 30""")
                ).fetchall()
                for row in rows:
                    enrichment_history.append({
                        "date": str(row[0]),
                        "count_enriched": row[1],
                    })
        except Exception as e:
            logger.warning(f"Error fetching enrichment history: {e}")

        # Score distribution
        score_distribution = [
            {"bucket": "0-20", "count": 0},
            {"bucket": "20-40", "count": 0},
            {"bucket": "40-60", "count": 0},
            {"bucket": "60-80", "count": 0},
            {"bucket": "80-100", "count": 0},
        ]
        try:
            with create_db_session_context() as session:
                rows = session.execute(
                    text("SELECT validation_ia_score FROM fiches_metiers WHERE validation_ia_score IS NOT NULL")
                ).fetchall()
                for row in rows:
                    sc = row[0]
                    if sc < 20:
                        score_distribution[0]["count"] += 1
                    elif sc < 40:
                        score_distribution[1]["count"] += 1
                    elif sc < 60:
                        score_distribution[2]["count"] += 1
                    elif sc < 80:
                        score_distribution[3]["count"] += 1
                    else:
                        score_distribution[4]["count"] += 1
        except Exception as e:
            logger.warning(f"Error fetching score distribution: {e}")

        # Top weak fields across all fiches
        field_weakness = {}
        try:
            all_fiches = repo.get_all_fiches()
            for f in all_fiches[:200]:  # Limit to avoid timeout
                score_data = calculate_completude_score(f)
                for field_name, detail in score_data.get("details", {}).items():
                    if field_name not in field_weakness:
                        field_weakness[field_name] = {"total_deficit": 0, "count": 0}
                    deficit = detail["max"] - detail["score"]
                    if deficit > 0:
                        field_weakness[field_name]["total_deficit"] += deficit
                        field_weakness[field_name]["count"] += 1
        except Exception as e:
            logger.warning(f"Error computing weak fields: {e}")

        top_weak_fields = sorted(
            [{"field": k, "avg_deficit": round(v["total_deficit"] / max(v["count"], 1), 1), "count_weak": v["count"]}
             for k, v in field_weakness.items() if v["count"] > 0],
            key=lambda x: x["avg_deficit"],
            reverse=True
        )[:10]

        return {
            "status_counts": status_counts,
            "enrichment_history": enrichment_history,
            "score_distribution": score_distribution,
            "top_weak_fields": top_weak_fields,
        }
    except Exception as e:
        logger.error(f"Error getting enrichment dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EXPORT ====================

@app.get("/api/export/csv")
async def export_csv():
    """Export all published fiches as CSV."""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    from .validation import calculate_completude_score

    try:
        fiches = repo.get_all_fiches(statut=StatutFiche.PUBLIEE)

        output = io.StringIO()
        writer = csv.writer(output, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["code_rome", "nom", "description", "competences", "formations",
                        "salaire_junior", "salaire_confirme", "salaire_senior", "score"])

        for fiche in fiches:
            competences = ";".join([
                c if isinstance(c, str) else (c.get("nom", "") if isinstance(c, dict) else str(c))
                for c in (fiche.competences or [])
            ])
            formations = ";".join([
                f if isinstance(f, str) else (f.get("nom", "") if isinstance(f, dict) else str(f))
                for f in (fiche.formations or [])
            ])
            sal = fiche.salaires
            sal_j = sal.junior.median if sal and hasattr(sal, 'junior') and sal.junior else ""
            sal_c = sal.confirme.median if sal and hasattr(sal, 'confirme') and sal.confirme else ""
            sal_s = sal.senior.median if sal and hasattr(sal, 'senior') and sal.senior else ""
            score = calculate_completude_score(fiche)["score"]

            writer.writerow([
                fiche.code_rome, fiche.nom_epicene, fiche.description or "",
                competences, formations, sal_j, sal_c, sal_s, score
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=fiches_metiers_publiees.csv"}
        )
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/json")
async def export_json():
    """Export all published fiches as JSON."""
    from fastapi.responses import JSONResponse
    from .validation import calculate_completude_score

    try:
        fiches = repo.get_all_fiches(statut=StatutFiche.PUBLIEE)
        result = []
        for fiche in fiches:
            score = calculate_completude_score(fiche)["score"]
            result.append({
                "code_rome": fiche.code_rome,
                "nom_masculin": fiche.nom_masculin,
                "nom_feminin": fiche.nom_feminin,
                "nom_epicene": fiche.nom_epicene,
                "description": fiche.description,
                "description_courte": fiche.description_courte,
                "competences": fiche.competences,
                "competences_transversales": fiche.competences_transversales,
                "formations": fiche.formations,
                "certifications": fiche.certifications,
                "conditions_travail": fiche.conditions_travail,
                "environnements": fiche.environnements,
                "salaires": fiche.salaires.model_dump() if fiche.salaires else None,
                "perspectives": fiche.perspectives.model_dump() if fiche.perspectives else None,
                "secteurs_activite": fiche.secteurs_activite,
                "missions_principales": fiche.missions_principales,
                "acces_metier": fiche.acces_metier,
                "savoirs": fiche.savoirs,
                "score_completude": score,
            })

        return JSONResponse(
            content=result,
            headers={"Content-Disposition": "attachment; filename=fiches_metiers_publiees.json"}
        )
    except Exception as e:
        logger.error(f"Error exporting JSON: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)