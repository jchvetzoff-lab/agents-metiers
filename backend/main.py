"""
Backend FastAPI pour Agents Métiers Web.
Expose une API REST pour accéder à la base de données SQLite et aux agents IA.
"""
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from difflib import SequenceMatcher
import json
import sys
import hashlib
import secrets
from pathlib import Path

# Ajouter le chemin vers le projet agents-metiers existant
AGENTS_METIERS_PATH = Path(__file__).parent.parent.parent / "agents-metiers"
sys.path.insert(0, str(AGENTS_METIERS_PATH))

from database.repository import Repository
from database.models import StatutFiche, FicheMetier, VarianteFiche
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


# ==================== AUTH ====================

# Simple token-based auth with in-DB users
JWT_SECRET = secrets.token_hex(32)

# Hardcoded test account + DB accounts
_TEST_ACCOUNTS = {
    "test@test.com": {"password": "test123", "name": "Test User", "id": 1},
    "admin@jae.fr": {"password": "admin123", "name": "Admin JAE", "id": 2},
}

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def _b64url_encode(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64url_decode(s: str) -> bytes:
    import base64
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)

def _make_token(user_id: int, email: str, name: str) -> str:
    """JWT-like token (header.payload.signature) compatible with frontend parseToken."""
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    exp = int((datetime.now() + timedelta(days=7)).timestamp())
    iat = int(datetime.now().timestamp())
    payload_data = {"sub": user_id, "email": email, "name": name, "exp": exp, "iat": iat}
    payload = _b64url_encode(json.dumps(payload_data).encode())
    sig_input = f"{header}.{payload}.{JWT_SECRET[:16]}"
    signature = _b64url_encode(hashlib.sha256(sig_input.encode()).digest())
    return f"{header}.{payload}.{signature}"

def _verify_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        # Verify signature
        sig_input = f"{header}.{payload}.{JWT_SECRET[:16]}"
        expected_sig = _b64url_encode(hashlib.sha256(sig_input.encode()).digest())
        if signature != expected_sig:
            return None
        payload_data = json.loads(_b64url_decode(payload))
        if payload_data.get("exp", 0) < int(datetime.now().timestamp()):
            return None
        return payload_data
    except Exception:
        return None


class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = "Utilisateur"


@app.post("/api/auth/login")
async def auth_login(body: LoginRequest):
    """Login with email/password."""
    account = _TEST_ACCOUNTS.get(body.email)
    if account and account["password"] == body.password:
        token = _make_token(account["id"], body.email, account["name"])
        return {"token": token, "user": {"id": account["id"], "email": body.email, "name": account["name"]}}
    raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")


@app.post("/api/auth/register")
async def auth_register(body: RegisterRequest):
    """Register a new account (adds to test accounts for this session)."""
    if body.email in _TEST_ACCOUNTS:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    new_id = len(_TEST_ACCOUNTS) + 1
    _TEST_ACCOUNTS[body.email] = {"password": body.password, "name": body.name, "id": new_id}
    return {"message": "Compte créé", "user": {"id": new_id, "email": body.email, "name": body.name}}


@app.get("/api/auth/me")
async def auth_me(request: Request):
    """Get current user from token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = auth_header[7:]
    user = _verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


# ==================== DB MIGRATION ====================

def run_migration():
    """Add validation columns if they don't exist."""
    from sqlalchemy import text, inspect
    with repo.session() as session:
        inspector = inspect(repo.engine)
        existing = [c["name"] for c in inspector.get_columns("fiches_metiers")]
        new_cols = {
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
        }
        for col_name, col_type in new_cols.items():
            if col_name not in existing:
                try:
                    session.execute(text(f'ALTER TABLE fiches_metiers ADD COLUMN {col_name} {col_type}'))
                except Exception as e:
                    print(f"Migration skip {col_name}: {e}")

try:
    run_migration()
except Exception as e:
    print(f"Migration error (non-fatal): {e}")


# ==================== SCORE CALCULATION ====================

def calc_score_completude(fiche) -> Dict[str, Any]:
    """Calculate completude score for a fiche. Returns {score, details}."""
    details = {}

    # description > 100 chars: +8
    desc = fiche.description or ""
    if len(desc) > 100:
        details["description"] = {"score": 8, "max": 8, "commentaire": "Description complète"}
    elif desc:
        details["description"] = {"score": 4, "max": 8, "commentaire": "Description trop courte (< 100 car.)"}
    else:
        details["description"] = {"score": 0, "max": 8, "commentaire": "Description manquante"}

    # description_courte: +5
    dc = fiche.description_courte
    details["description_courte"] = {"score": 5 if dc else 0, "max": 5, "commentaire": "OK" if dc else "Manquante"}

    # competences: +3 each, max 15 (5 items)
    comps = fiche.competences or []
    s = min(len(comps) * 3, 15)
    details["competences"] = {"score": s, "max": 15, "commentaire": f"{len(comps)} compétence(s)"}

    # competences_transversales: +3 each, max 9
    ct = fiche.competences_transversales or []
    s = min(len(ct) * 3, 9)
    details["competences_transversales"] = {"score": s, "max": 9, "commentaire": f"{len(ct)} item(s)"}

    # formations: +3 each, max 12
    forms = fiche.formations or []
    s = min(len(forms) * 3, 12)
    details["formations"] = {"score": s, "max": 12, "commentaire": f"{len(forms)} formation(s)"}

    # certifications: +2 each, max 6
    certs = fiche.certifications or []
    s = min(len(certs) * 2, 6)
    details["certifications"] = {"score": s, "max": 6, "commentaire": f"{len(certs)} certification(s)"}

    # conditions_travail: +2 each, max 6
    cond = fiche.conditions_travail or []
    s = min(len(cond) * 2, 6)
    details["conditions_travail"] = {"score": s, "max": 6, "commentaire": f"{len(cond)} item(s)"}

    # environnements: +2 each, max 6
    envs = fiche.environnements or []
    s = min(len(envs) * 2, 6)
    details["environnements"] = {"score": s, "max": 6, "commentaire": f"{len(envs)} item(s)"}

    # secteurs_activite: +2 each, max 6
    sects = fiche.secteurs_activite or []
    s = min(len(sects) * 2, 6)
    details["secteurs_activite"] = {"score": s, "max": 6, "commentaire": f"{len(sects)} secteur(s)"}

    # salaires: +10 if all 3 medians present
    sal = fiche.salaires
    sal_score = 0
    if sal:
        sal_dict = sal.model_dump() if hasattr(sal, 'model_dump') else (sal if isinstance(sal, dict) else {})
        count = 0
        for level in ["junior", "confirme", "senior"]:
            lvl = sal_dict.get(level, {}) or {}
            if lvl.get("median"):
                count += 1
        sal_score = round(count * 10 / 3)
    details["salaires"] = {"score": sal_score, "max": 10, "commentaire": f"{'Complet' if sal_score == 10 else 'Partiel' if sal_score > 0 else 'Manquant'}"}

    # perspectives: +8 if tension + tendance + evolution_5ans
    persp = fiche.perspectives
    persp_score = 0
    if persp:
        persp_dict = persp.model_dump() if hasattr(persp, 'model_dump') else (persp if isinstance(persp, dict) else {})
        count = 0
        if persp_dict.get("tension") is not None: count += 1
        if persp_dict.get("tendance"): count += 1
        if persp_dict.get("evolution_5ans"): count += 1
        persp_score = round(count * 8 / 3)
    details["perspectives"] = {"score": persp_score, "max": 8, "commentaire": f"{'Complet' if persp_score == 8 else 'Partiel' if persp_score > 0 else 'Manquant'}"}

    # metiers_proches: +2 each, max 6
    mp = fiche.metiers_proches or []
    s = min(len(mp) * 2, 6)
    details["metiers_proches"] = {"score": s, "max": 6, "commentaire": f"{len(mp)} métier(s) proche(s)"}

    # Bonus: missions_principales +5
    missions = getattr(fiche, 'missions_principales', None) or []
    if not missions and hasattr(fiche, '__getitem__'):
        try: missions = fiche.get('missions_principales', []) or []
        except: missions = []
    bonus_missions = 5 if missions else 0
    details["missions_principales"] = {"score": bonus_missions, "max": 5, "commentaire": f"{len(missions)} mission(s)" if missions else "Manquant"}

    # Bonus: acces_metier +4
    acces = getattr(fiche, 'acces_metier', None)
    if not acces and hasattr(fiche, '__getitem__'):
        try: acces = fiche.get('acces_metier')
        except: acces = None
    bonus_acces = 4 if acces else 0
    details["acces_metier"] = {"score": bonus_acces, "max": 4, "commentaire": "Présent" if acces else "Manquant"}

    # Bonus: savoirs +3 each max 6
    savoirs = getattr(fiche, 'savoirs', None) or []
    if not savoirs and hasattr(fiche, '__getitem__'):
        try: savoirs = fiche.get('savoirs', []) or []
        except: savoirs = []
    s = min(len(savoirs) * 3, 6)
    details["savoirs"] = {"score": s, "max": 6, "commentaire": f"{len(savoirs)} savoir(s)"}

    total = sum(d["score"] for d in details.values())
    total = min(total, 100)

    return {"score": total, "details": details}


def calc_score_completude_from_db(fiche_db) -> Dict[str, Any]:
    """Calculate score from a DB row (FicheMetierDB) by reading JSON columns directly."""
    from types import SimpleNamespace

    # Build a simple object with all needed attributes
    obj = SimpleNamespace()
    obj.description = fiche_db.description or ""
    obj.description_courte = fiche_db.description_courte
    obj.competences = fiche_db.competences or []
    obj.competences_transversales = fiche_db.competences_transversales or []
    obj.formations = fiche_db.formations or []
    obj.certifications = fiche_db.certifications or []
    obj.conditions_travail = fiche_db.conditions_travail or []
    obj.environnements = fiche_db.environnements or []
    obj.secteurs_activite = fiche_db.secteurs_activite or []
    obj.metiers_proches = fiche_db.metiers_proches or []

    # Salaires - keep as dict
    sal_data = fiche_db.salaires or {}
    obj.salaires = SimpleNamespace(model_dump=lambda: sal_data) if sal_data else None

    # Perspectives - keep as dict
    persp_data = fiche_db.perspectives or {}
    obj.perspectives = SimpleNamespace(model_dump=lambda: persp_data) if persp_data else None

    # Extra fields that may be in the JSON or not
    # These are typically not columns but may be stored elsewhere
    obj.missions_principales = []
    obj.acces_metier = None
    obj.savoirs = []

    return calc_score_completude(obj)


def calc_quality_score(fiche) -> Dict[str, Any]:
    """Deterministic quality analysis. Returns {score, problemes, suggestions}."""
    problems = []
    suggestions = []
    score = 100

    desc = fiche.description or ""

    # Check description quality
    if len(desc) < 50:
        problems.append("Description trop courte ou absente")
        score -= 30
    elif len(desc) < 200:
        suggestions.append("Enrichir la description (idéalement > 200 caractères)")
        score -= 10

    # Check competences count
    comps = fiche.competences or []
    if len(comps) < 3:
        problems.append(f"Seulement {len(comps)} compétence(s) — minimum recommandé : 5")
        score -= 20
    elif len(comps) < 5:
        suggestions.append("Ajouter des compétences pour atteindre au moins 5")
        score -= 5

    # Check salary realism
    sal = fiche.salaires
    if sal:
        sal_dict = sal.model_dump() if hasattr(sal, 'model_dump') else (sal if isinstance(sal, dict) else {})
        for level in ["junior", "confirme", "senior"]:
            lvl = sal_dict.get(level, {}) or {}
            median = lvl.get("median")
            if median:
                if median < 15000:
                    problems.append(f"Salaire {level} anormalement bas ({median}€)")
                    score -= 10
                elif median > 200000:
                    problems.append(f"Salaire {level} anormalement élevé ({median}€)")
                    score -= 10

        # Check junior < confirme < senior
        j = (sal_dict.get("junior", {}) or {}).get("median", 0) or 0
        c = (sal_dict.get("confirme", {}) or {}).get("median", 0) or 0
        s = (sal_dict.get("senior", {}) or {}).get("median", 0) or 0
        if j and c and j > c:
            problems.append("Salaire junior supérieur au confirmé")
            score -= 10
        if c and s and c > s:
            problems.append("Salaire confirmé supérieur au senior")
            score -= 10

    # Check formations
    forms = fiche.formations or []
    if not forms:
        suggestions.append("Ajouter des formations recommandées")
        score -= 5

    return {"score": max(0, min(100, score)), "problemes": problems, "suggestions": suggestions}


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


def fuzzy_match(query: str, text: str, threshold: float = 0.5) -> float:
    """Retourne un score de similarité entre 0 et 1. Combine substring match + fuzzy."""
    query_lower = query.lower()
    text_lower = text.lower()
    # Exact substring = score max
    if query_lower in text_lower:
        return 1.0
    # Check each word in text
    words = text_lower.split()
    best = 0.0
    for word in words:
        ratio = SequenceMatcher(None, query_lower, word).ratio()
        if ratio > best:
            best = ratio
    # Also check full string ratio
    full_ratio = SequenceMatcher(None, query_lower, text_lower).ratio()
    return max(best, full_ratio)


def search_fiches_fuzzy(fiches: list, query: str, threshold: float = 0.4) -> list:
    """Recherche fuzzy sur nom/code. Retourne les fiches triées par pertinence."""
    scored = []
    for f in fiches:
        scores = [
            fuzzy_match(query, f.code_rome),
            fuzzy_match(query, f.nom_masculin),
            fuzzy_match(query, f.nom_feminin),
            fuzzy_match(query, f.nom_epicene),
        ]
        if f.description:
            scores.append(fuzzy_match(query, f.description) * 0.6)
        best_score = max(scores)
        if best_score >= threshold:
            scored.append((f, best_score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [f for f, _ in scored]


def search_fiches_competences(fiches: list, query: str) -> list:
    """Recherche dans les compétences, compétences transversales et formations."""
    query_lower = query.lower()
    results = []
    for f in fiches:
        all_competences = (f.competences or []) + (f.competences_transversales or []) + (f.formations or [])
        match_score = 0
        for comp in all_competences:
            if query_lower in comp.lower():
                match_score += 1.0
            else:
                ratio = SequenceMatcher(None, query_lower, comp.lower()).ratio()
                if ratio > 0.5:
                    match_score += ratio
        if match_score > 0:
            results.append((f, match_score))
    results.sort(key=lambda x: x[1], reverse=True)
    return [f for f, _ in results]


@app.get("/api/fiches")
async def get_fiches(
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    search: Optional[str] = Query(None, description="Recherche textuelle fuzzy"),
    search_competences: Optional[str] = Query(None, description="Recherche par compétences"),
    sort_by: Optional[str] = Query(None, description="Tri: score, date_maj, nom"),
    sort_order: Optional[str] = Query("desc", description="Ordre: asc ou desc"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Liste les fiches métiers avec filtres, recherche fuzzy et par compétences."""
    try:
        # Convertir le statut si fourni
        statut_enum = None
        if statut:
            try:
                statut_enum = StatutFiche(statut.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Statut invalide: {statut}")

        # Récupérer les fiches
        fiches = repo.get_all_fiches(statut=statut_enum)

        # Recherche fuzzy sur nom/code/description
        if search:
            fiches = search_fiches_fuzzy(fiches, search)

        # Recherche par compétences
        if search_competences:
            fiches = search_fiches_competences(fiches, search_competences)

        # Server-side sorting
        if sort_by == "score":
            fiches_scored = [(f, calc_score_completude(f)["score"]) for f in fiches]
            fiches_scored.sort(key=lambda x: x[1], reverse=(sort_order != "asc"))
            fiches = [f for f, _ in fiches_scored]
        elif sort_by == "date_maj":
            fiches.sort(key=lambda f: f.metadata.date_maj or datetime.min, reverse=(sort_order != "asc"))
        elif sort_by == "nom":
            fiches.sort(key=lambda f: (f.nom_epicene or f.nom_masculin or "").lower(), reverse=(sort_order == "desc"))

        # Pagination
        total = len(fiches)
        fiches_page = fiches[offset:offset + limit]

        # Convertir en réponse
        results = []
        for fiche in fiches_page:
            nb_variantes = repo.count_variantes(fiche.code_rome)
            score_data = calc_score_completude(fiche)
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

        # Score de complétude
        score_data = calc_score_completude(fiche)

        # Fetch validation data from DB
        from sqlalchemy import text
        validation_info = {}
        try:
            with repo.session() as session:
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
        except Exception:
            pass

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
            "mobilite": fiche.mobilite,
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
        raise HTTPException(status_code=500, detail=str(e))


class FicheMetierUpdate(BaseModel):
    """Modèle pour mettre à jour une fiche métier."""
    description: Optional[str] = None
    description_courte: Optional[str] = None
    competences: Optional[List[str]] = None
    competences_transversales: Optional[List[str]] = None
    formations: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    conditions_travail: Optional[List[str]] = None
    environnements: Optional[List[str]] = None
    secteurs_activite: Optional[List[str]] = None
    salaires: Optional[dict] = None
    perspectives: Optional[dict] = None
    statut: Optional[str] = None
    missions_principales: Optional[List[str]] = None
    acces_metier: Optional[str] = None
    savoirs: Optional[List[str]] = None
    types_contrats: Optional[dict] = None
    mobilite: Optional[dict] = None
    traits_personnalite: Optional[List[str]] = None
    aptitudes: Optional[List[dict]] = None
    profil_riasec: Optional[dict] = None
    autres_appellations: Optional[List[str]] = None
    statuts_professionnels: Optional[List[str]] = None
    niveau_formation: Optional[str] = None
    domaine_professionnel: Optional[dict] = None
    sites_utiles: Optional[List[dict]] = None
    conditions_travail_detaillees: Optional[dict] = None
    competences_dimensions: Optional[dict] = None
    preferences_interets: Optional[dict] = None


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
            elif key == "salaires" and value:
                fiche_dict["salaires"] = value
            elif key == "perspectives" and value:
                fiche_dict["perspectives"] = value
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
async def get_audit_logs(
    limit: int = Query(15, ge=1, le=100),
    code_rome: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    type_evenement: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
):
    """Récupère les logs d'audit avec filtres."""
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
        raise HTTPException(status_code=500, detail=str(e))


def _get_user_name(request) -> str:
    """Extract user name from X-User-Name header, fallback to 'Utilisateur'."""
    return request.headers.get("X-User-Name", "Utilisateur")


def _add_audit(type_evt: str, code_rome: str, agent: str, description: str, validateur: str = None):
    """Helper to add audit log."""
    from database.models import AuditLog as AL, TypeEvenement as TE
    try:
        te = TE(type_evt)
    except ValueError:
        te = TE.MODIFICATION
    repo.add_audit_log(AL(
        timestamp=datetime.now(),
        type_evenement=te,
        code_rome=code_rome,
        agent=agent,
        description=description,
        validateur=validateur,
    ))


# ==================== ACTIONS IA ====================


@app.post("/api/fiches/{code_rome}/validate")
async def validate_fiche(code_rome: str, request: Request):
    """Validation IA déterministe : complétude + qualité."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        completude = calc_score_completude(fiche)
        qualite = calc_quality_score(fiche)
        score_final = round((completude["score"] + qualite["score"]) / 2)

        if score_final >= 80:
            verdict = "excellent"
        elif score_final >= 70:
            verdict = "bon"
        elif score_final >= 40:
            verdict = "insuffisant"
        else:
            verdict = "critique"

        resume = f"Score global {score_final}/100 — Complétude {completude['score']}/100, Qualité {qualite['score']}/100"

        rapport = {
            "score": score_final,
            "verdict": verdict,
            "resume": resume,
            "criteres": {
                "completude": {"score": completude["score"], "commentaire": f"Score de complétude : {completude['score']}/100"},
                "qualite": {"score": qualite["score"], "commentaire": f"Score de qualité : {qualite['score']}/100"},
            },
            "problemes": qualite["problemes"],
            "suggestions": qualite["suggestions"],
            "details_completude": completude["details"],
        }

        # Save to DB
        from sqlalchemy import text
        now = datetime.now()
        new_statut = "en_validation" if score_final >= 70 else "brouillon"
        with repo.session() as session:
            session.execute(
                text("UPDATE fiches_metiers SET validation_ia_score = :score, validation_ia_date = :date, "
                     "validation_ia_details = :details, statut = :statut WHERE code_rome = :cr"),
                {"score": score_final, "date": now, "details": json.dumps(rapport), "statut": new_statut, "cr": code_rome}
            )

        user = _get_user_name(request)
        _add_audit("validation_ia", code_rome, user,
                   f"Validation IA lancée par {user} : {verdict} ({score_final}/100) pour {fiche.nom_epicene}")

        return {
            "message": f"Validation IA terminée — {verdict}",
            "code_rome": code_rome,
            "nom": fiche.nom_epicene,
            "rapport": rapport,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReviewRequest(BaseModel):
    decision: str  # "approuver" | "rejeter"
    commentaire: Optional[str] = None


@app.post("/api/fiches/{code_rome}/review")
async def review_fiche(code_rome: str, body: ReviewRequest, request: Request):
    """Validation humaine : approuver ou rejeter."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        if body.decision not in ("approuver", "rejeter"):
            raise HTTPException(status_code=400, detail="Décision invalide (approuver ou rejeter)")

        from sqlalchemy import text
        now = datetime.now()

        if body.decision == "approuver":
            new_statut = "publiee"
            val_humaine = "approuvee"
        else:
            new_statut = "brouillon"
            val_humaine = "rejetee"

        user = _get_user_name(request)
        with repo.session() as session:
            session.execute(
                text("UPDATE fiches_metiers SET validation_humaine = :vh, validation_humaine_date = :date, "
                     "validation_humaine_par = :par, validation_humaine_commentaire = :com, "
                     "statut = :statut WHERE code_rome = :cr"),
                {"vh": val_humaine, "date": now, "par": user, "com": body.commentaire or "",
                 "statut": new_statut, "cr": code_rome}
            )

        _add_audit("validation_humaine", code_rome, user,
                   f"Validation humaine par {user} : {body.decision} pour {fiche.nom_epicene}",
                   validateur=user)

        return {
            "message": f"Fiche {'approuvée' if body.decision == 'approuver' else 'rejetée'}",
            "code_rome": code_rome,
            "decision": body.decision,
            "commentaire": body.commentaire,
            "nouveau_statut": new_statut,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fiches/{code_rome}/enrich")
async def enrich_fiche(code_rome: str, request: Request):
    """Enrichissement IA via Claude : remplit les champs vides d'une fiche."""
    import os
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        # Lire le commentaire optionnel
        commentaire = None
        try:
            body = await request.json()
            commentaire = body.get("commentaire", None)
        except Exception:
            pass

        # Read current DB row to check which fields are empty
        from sqlalchemy import text
        with repo.session() as session:
            row = session.execute(
                text("SELECT missions_principales, acces_metier, savoirs, types_contrats, "
                     "mobilite, traits_personnalite, aptitudes, profil_riasec, "
                     "autres_appellations, statuts_professionnels, niveau_formation, "
                     "domaine_professionnel, sites_utiles, conditions_travail_detaillees, "
                     "competences_dimensions, preferences_interets, secteurs_activite "
                     "FROM fiches_metiers WHERE code_rome = :cr"),
                {"cr": code_rome}
            ).fetchone()

        current = {}
        col_names = ["missions_principales", "acces_metier", "savoirs", "types_contrats",
                     "mobilite", "traits_personnalite", "aptitudes", "profil_riasec",
                     "autres_appellations", "statuts_professionnels", "niveau_formation",
                     "domaine_professionnel", "sites_utiles", "conditions_travail_detaillees",
                     "competences_dimensions", "preferences_interets", "secteurs_activite"]
        if row:
            for i, col in enumerate(col_names):
                val = row[i]
                if isinstance(val, str):
                    try:
                        val = json.loads(val)
                    except Exception:
                        pass
                current[col] = val

        # Build prompt for Claude
        prompt = f"""Tu es un expert des metiers en France. Enrichis cette fiche metier ROME avec des donnees precises et realistes.

Code ROME: {code_rome}
Nom: {fiche.nom_epicene}
Description: {fiche.description or 'N/A'}
Competences existantes: {json.dumps(fiche.competences or [], ensure_ascii=False)}
Formations existantes: {json.dumps(fiche.formations or [], ensure_ascii=False)}
Conditions travail: {json.dumps(fiche.conditions_travail or [], ensure_ascii=False)}
Environnements: {json.dumps(fiche.environnements or [], ensure_ascii=False)}

{f'Instruction supplementaire: {commentaire}' if commentaire else ''}

Genere un JSON avec TOUS les champs suivants. Sois precis et realiste pour le marche francais:

{{
  "missions_principales": ["5-8 missions principales du metier"],
  "acces_metier": "Texte decrivant comment acceder a ce metier (diplomes, experience, etc.)",
  "savoirs": ["5-10 savoirs theoriques necessaires"],
  "types_contrats": {{"cdi": 50, "cdd": 25, "interim": 15, "autre": 10}},
  "traits_personnalite": ["5-8 traits de personnalite importants"],
  "aptitudes": [{{"nom": "Nom aptitude", "niveau": 4}}],
  "profil_riasec": {{"realiste": 30, "investigateur": 60, "artistique": 20, "social": 40, "entreprenant": 30, "conventionnel": 50}},
  "autres_appellations": ["3-8 autres noms pour ce metier"],
  "statuts_professionnels": ["Salarie", "Independant", etc.],
  "niveau_formation": "Bac+2 a Bac+5",
  "domaine_professionnel": {{"domaine": "Nom du domaine", "sous_domaine": "Sous-domaine", "code_domaine": "M18"}},
  "sites_utiles": [{{"nom": "Nom", "url": "https://...", "description": "Description courte"}}],
  "conditions_travail_detaillees": {{
    "exigences_physiques": ["liste"],
    "horaires": "Description horaires",
    "deplacements": "Frequence deplacements",
    "environnement": "Description environnement",
    "risques": ["risques specifiques"]
  }},
  "competences_dimensions": {{"relationnel": 50, "intellectuel": 70, "communication": 60, "management": 30, "realisation": 80, "expression": 40, "physique_sensoriel": 20}},
  "preferences_interets": {{"domaine_interet": "Nom domaine", "familles": [{{"nom": "Famille", "score": 75}}]}},
  "secteurs_activite": ["3-6 secteurs d'activite"],
  "mobilite": {{
    "metiers_proches": [{{"code_rome": "XXXXX", "nom": "Nom metier", "nom_feminin": "Nom feminin", "nom_epicene": "Nom epicene", "contexte": "Pourquoi proche"}}],
    "evolutions": [{{"code_rome": "XXXXX", "nom": "Nom metier", "nom_feminin": "Nom feminin", "nom_epicene": "Nom epicene", "contexte": "Type d'evolution"}}]
  }}
}}

IMPORTANT:
- Valeurs RIASEC et dimensions entre 0 et 100
- Aptitudes niveau entre 1 et 5
- Types contrats en pourcentage (total = 100)
- Codes ROME des metiers proches doivent etre des vrais codes
- Reponds UNIQUEMENT avec le JSON, pas de texte autour"""

        # Call Claude API
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY", config.api.anthropic_api_key if hasattr(config.api, 'anthropic_api_key') else None)
        if not api_key:
            raise HTTPException(status_code=500, detail="Cle API Anthropic non configuree")

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        # Extract JSON from response (handle markdown code blocks)
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        enriched = json.loads(response_text)

        # Build SQL update for all enriched fields
        update_parts = []
        update_params = {"cr": code_rome, "d": datetime.now()}

        json_fields = ["missions_principales", "savoirs", "types_contrats", "mobilite",
                       "traits_personnalite", "aptitudes", "profil_riasec",
                       "autres_appellations", "statuts_professionnels",
                       "domaine_professionnel", "sites_utiles", "conditions_travail_detaillees",
                       "competences_dimensions", "preferences_interets", "secteurs_activite"]

        for field_name in json_fields:
            if field_name in enriched:
                update_parts.append(f"{field_name} = :{field_name}")
                update_params[field_name] = json.dumps(enriched[field_name], ensure_ascii=False)

        # String fields
        for field_name in ["acces_metier", "niveau_formation"]:
            if field_name in enriched and enriched[field_name]:
                update_parts.append(f"{field_name} = :{field_name}")
                update_params[field_name] = enriched[field_name]

        if not update_parts:
            raise HTTPException(status_code=500, detail="Aucun champ enrichi par l'IA")

        new_version = fiche.metadata.version + 1
        update_parts.extend([
            "version = :v", "date_maj = :d",
            "validation_ia_score = NULL", "validation_ia_date = NULL",
            "validation_ia_details = NULL", "validation_humaine = NULL",
            "validation_humaine_date = NULL", "validation_humaine_par = NULL",
            "validation_humaine_commentaire = NULL"
        ])
        update_params["v"] = new_version

        with repo.session() as session:
            session.execute(
                text(f"UPDATE fiches_metiers SET {', '.join(update_parts)} WHERE code_rome = :cr"),
                update_params
            )

        user = _get_user_name(request)
        fields_enriched = [f for f in json_fields + ["acces_metier", "niveau_formation"] if f in enriched]
        desc = f"Enrichissement IA de {fiche.nom_epicene} (v{new_version}) par {user} — {len(fields_enriched)} champs enrichis"
        if commentaire:
            desc += f" — Commentaire : {commentaire}"
        _add_audit("enrichissement", code_rome, user, desc)

        return {
            "message": f"Enrichissement termine — {len(fields_enriched)} champs enrichis",
            "code_rome": code_rome,
            "nom": fiche.nom_epicene,
            "version": new_version,
            "fields_enriched": fields_enriched,
            "commentaire": commentaire,
        }
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Erreur parsing reponse IA: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fiches/{code_rome}/publish")
async def publish_fiche(code_rome: str, request: Request):
    """Publication : requiert validation IA >= 70 ET validation humaine approuvée."""
    try:
        fiche = repo.get_fiche(code_rome)
        if not fiche:
            raise HTTPException(status_code=404, detail=f"Fiche {code_rome} non trouvée")

        from sqlalchemy import text
        with repo.session() as session:
            row = session.execute(
                text("SELECT validation_ia_score, validation_humaine FROM fiches_metiers WHERE code_rome = :cr"),
                {"cr": code_rome}
            ).fetchone()

            ia_score = row[0] if row else None
            humaine = row[1] if row else None

            if not ia_score or ia_score < 70:
                raise HTTPException(status_code=400,
                    detail=f"Validation IA insuffisante ({ia_score or 'non faite'}). Score minimum requis : 70.")

            if humaine != "approuvee":
                raise HTTPException(status_code=400,
                    detail=f"Validation humaine requise (actuel : {humaine or 'non faite'}).")

            session.execute(
                text("UPDATE fiches_metiers SET statut = 'publiee' WHERE code_rome = :cr"),
                {"cr": code_rome}
            )

        user = _get_user_name(request)
        _add_audit("publication", code_rome, user,
                   f"Publication de {fiche.nom_epicene} par {user}")

        return {"message": "Fiche publiée", "code_rome": code_rome}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
