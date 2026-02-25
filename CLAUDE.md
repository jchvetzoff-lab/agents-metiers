# Agents Métiers — Documentation Technique Complète

> Dernière mise à jour : 25 février 2026

## 1. Vue d'ensemble

Système multi-agents pour la création, enrichissement et maintenance automatique de fiches métiers françaises. L'application collecte des données depuis des sources officielles (ROME, France Travail, INSEE, DARES, La Bonne Alternance), enrichit les fiches via Claude IA, et expose le tout via un frontend Next.js et un backend FastAPI.

**Repository** : https://github.com/jchvetzoff-lab/agents-metiers
**Branche principale** : `main`

---

## 2. Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 16.1.5 (Turbopack), React 19, TypeScript 5.7, Tailwind CSS 3.4, Recharts, Framer Motion, jsPDF |
| **Backend** | FastAPI, Python 3.14, SQLAlchemy, Pydantic |
| **Base de données** | SQLite (dev local), PostgreSQL (production Render) |
| **IA** | Claude API (Anthropic) — modèle `claude-sonnet-4-20250514` |
| **APIs externes** | France Travail (Offres + IMT), La Bonne Alternance, INSEE, DARES, ROME data.gouv.fr |
| **Tests** | Jest 30 (52 tests frontend), pytest (66 tests backend) — 118 tests total |
| **CI** | GitHub Actions (4 jobs : backend-tests, frontend-tests, frontend-build, python-lint) |
| **Déploiement** | Backend : Render.com (Docker) / Frontend : Netlify (auto-deploy) |

---

## 3. Structure du Projet

```
agents-metiers/
├── .env                          # Variables d'environnement (API keys)
├── .github/workflows/ci.yml     # CI GitHub Actions
├── .gitignore
├── config.py                     # Configuration globale (DB, APIs, Veille, Logging)
├── main.py                       # Point d'entrée CLI (Click)
├── requirements.txt              # Dépendances Python (root)
├── Dockerfile                    # Build production (Render)
├── docker-entrypoint.sh          # Script entrypoint ($PORT dynamique)
├── nixpacks.toml                 # Config nixpacks
├── netlify.toml                  # Config Netlify
│
├── backend/                      # API FastAPI
│   ├── main.py                   # App FastAPI + CORS + registration routers
│   ├── deps.py                   # Dépendances injectées (repo, config)
│   ├── requirements.txt          # Dépendances backend spécifiques
│   └── routers/
│       ├── auth.py               # Auth JWT (login, register, me)
│       ├── fiches.py             # CRUD fiches + enrichissement + validation
│       ├── actions.py            # Actions batch (publish-batch, auto-correct)
│       ├── regional.py           # Données régionales + IMT + alternance
│       ├── stats.py              # Statistiques globales
│       └── veille.py             # Veille ROME (sync, changes, review)
│
├── frontend/                     # App Next.js
│   ├── package.json              # Dépendances (next, react, recharts, framer-motion, jspdf)
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── jest.config.ts
│   ├── jest.setup.ts
│   ├── app/
│   │   ├── layout.tsx            # Layout racine
│   │   ├── page.tsx              # Page d'accueil (hero, stats, navigation)
│   │   ├── globals.css           # Styles globaux
│   │   ├── error.tsx             # Error boundary global
│   │   ├── global-error.tsx      # Global error
│   │   ├── login/page.tsx        # Page de connexion
│   │   ├── dashboard/page.tsx    # Dashboard (stats, graphiques)
│   │   ├── fiches/page.tsx       # Liste des fiches (recherche, filtres, pagination)
│   │   ├── fiches/[codeRome]/page.tsx      # ⭐ Page fiche détail (la plus grosse)
│   │   ├── fiches/[codeRome]/carte/page.tsx # Carte des métiers (React Flow)
│   │   ├── actions/page.tsx      # Actions (enrichir, valider, publier, variantes, veille)
│   │   └── guide/page.tsx        # Guide d'utilisation
│   ├── components/
│   │   ├── AlternanceSection.tsx  # Section alternance (La Bonne Alternance)
│   │   ├── AuthGuard.tsx         # Protection de routes auth
│   │   ├── BackgroundAnimation.tsx
│   │   ├── CareerMap.tsx         # Carte parcours métier (React Flow)
│   │   ├── FicheHelpers.tsx      # Helpers fiche (PDF download, section components)
│   │   ├── FormationPathway.tsx  # Parcours de formation
│   │   ├── LayoutShell.tsx       # Shell layout
│   │   ├── MetricCard.tsx        # Card métrique
│   │   ├── Navbar.tsx            # Barre de navigation
│   │   ├── OffresSection.tsx     # Section offres d'emploi
│   │   ├── ProfileCharts.tsx     # Charts RIASEC radar + Compétences dimensions
│   │   ├── RecrutementsSection.tsx # Section recrutements (graphe temporel)
│   │   ├── ScrollToTop.tsx
│   │   ├── SectionErrorBoundary.tsx # Error boundary par section
│   │   ├── SectionHeader.tsx
│   │   ├── StatsSection.tsx      # ⭐ Section statistiques (salaires, contrats, badges IMT)
│   │   ├── StatusBadge.tsx       # Badge de statut
│   │   ├── ValidationIAPanel.tsx  # Panel de validation IA
│   │   ├── ValidationIASummary.tsx # Résumé validation IA
│   │   ├── actions/              # Composants page Actions
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TabBatchProcess.tsx
│   │   │   ├── TabEnrichir.tsx
│   │   │   ├── TabExporter.tsx
│   │   │   ├── TabHistorique.tsx
│   │   │   ├── TabMiseAJour.tsx
│   │   │   ├── TabPublier.tsx
│   │   │   ├── TabSynchronisation.tsx
│   │   │   ├── TabValider.tsx
│   │   │   ├── TabVariantes.tsx
│   │   │   ├── TabVariantesExport.tsx
│   │   │   ├── TabVeilleRome.tsx
│   │   │   ├── VariantesCheckboxes.tsx
│   │   │   └── WorkflowBar.tsx
│   │   ├── fiches/               # Composants fiche détail
│   │   │   ├── ChartHelpers.tsx
│   │   │   ├── ListComponents.tsx
│   │   │   ├── SectionAnchor.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── TensionGauge.tsx
│   │   ├── motion/               # Animations Framer Motion
│   │   │   ├── AnimatedCounter.tsx
│   │   │   ├── FadeInView.tsx
│   │   │   ├── PageTransition.tsx
│   │   │   ├── StaggerContainer.tsx
│   │   │   ├── TiltCard.tsx
│   │   │   └── index.ts
│   │   └── ui/                   # Composants UI génériques
│   │       ├── BackgroundOrbs.tsx
│   │       ├── EmptyState.tsx
│   │       ├── FicheListItem.tsx
│   │       ├── LoadingState.tsx
│   │       ├── ResultBanner.tsx
│   │       └── SectionCard.tsx
│   ├── hooks/
│   │   └── useSearchFiches.ts    # Hook recherche avec debounce
│   ├── lib/
│   │   ├── api.ts                # ⭐ Client API (types + ApiClient class)
│   │   ├── auth.ts               # Token JWT (get/set/remove)
│   │   ├── career-graph.ts       # Données graphe parcours
│   │   ├── formation-levels.ts   # Niveaux de formation
│   │   ├── generateFichePdf.ts   # Génération PDF via jsPDF
│   │   └── translations.ts       # Traductions FR/EN (93KB)
│   └── __tests__/
│       ├── FicheHelpers.test.tsx
│       ├── OffresSection.test.tsx
│       ├── SectionErrorBoundary.test.tsx
│       ├── StatusBadge.test.tsx
│       ├── ValidationIASummary.test.tsx
│       └── translations.test.ts
│
├── agents/                       # Agents IA (Claude API)
│   ├── base_agent.py             # Classe de base des agents
│   ├── redacteur_fiche.py        # ⭐ Rédaction/enrichissement de fiches
│   ├── validateur_fiche.py       # Validation IA des fiches
│   ├── correcteur_langue.py      # Correction orthographique
│   ├── generation_genre.py       # Génération genrée (masc/fem/épicène)
│   ├── veille_metiers.py         # Veille métiers (France Travail)
│   └── veille_salaires.py        # Veille salariale (France Travail)
│
├── sources/                      # Clients APIs externes
│   ├── __init__.py
│   ├── france_travail.py         # ⭐ Client France Travail (Offres + IMT) — OAuth2
│   ├── france_travail_rome.py    # Client ROME France Travail
│   ├── la_bonne_alternance.py    # Client La Bonne Alternance (alternance)
│   ├── dares_client.py           # Client DARES (données emploi)
│   ├── insee_client.py           # Client INSEE
│   └── rome_client.py            # Client ROME (data.gouv.fr)
│
├── database/
│   ├── __init__.py
│   ├── models.py                 # Modèles Pydantic/SQLAlchemy (FicheMetier, Variante, AuditLog, User)
│   ├── repository.py             # Repository CRUD (get, save, search, variantes, audit)
│   └── fiches_metiers.db         # Base SQLite locale (~2 Mo)
│
├── orchestrator/
│   └── orchestrator.py           # Orchestrateur des agents
│
├── interface/
│   ├── cli.py                    # Interface CLI (Click + Rich)
│   └── validation.py             # Validation des données
│
├── scheduler/
│   └── monthly_update.py         # Planificateur de mises à jour
│
├── logging_system/               # Système de journalisation
│
├── utils/
│   ├── ui_helpers.py             # Helpers UI Streamlit (design SOJAI)
│   └── pdf_generator.py          # Générateur PDF (fpdf2)
│
├── scripts/                      # Scripts utilitaires
│   ├── import_rome.py            # Import référentiel ROME depuis XLSX
│   ├── create_test_fiches.py     # Créer des fiches de test
│   ├── demo_data.py              # Données de démonstration
│   ├── migrate_add_variantes.py  # Migration : table variantes
│   ├── migrate_enriched_fields.py # Migration : champs enrichis
│   ├── fix_permissions.py
│   ├── start_scheduler.py
│   └── test_*.py                 # Scripts de test manuels (ROME API)
│
├── tests/                        # Tests backend (pytest)
│   ├── conftest.py               # Fixtures pytest (TestClient, DB en mémoire)
│   ├── test_api_auth.py          # Tests auth (login, register, JWT)
│   ├── test_api_fiches.py        # Tests CRUD fiches
│   ├── test_api_actions.py       # Tests actions (enrich, publish, validate)
│   ├── test_api_misc.py          # Tests misc (stats, regions, health)
│   ├── test_variantes.py         # Tests unitaires variantes
│   ├── test_e2e_variantes.py     # Test E2E variantes
│   └── test_scheduler.py         # Tests scheduler
│
└── data/
    ├── rome/                     # Fichiers XLSX ROME (data.gouv.fr sept. 2025)
    ├── fiches/                   # Fiches exportées
    └── rapports/                 # Logs et rapports
```

---

## 4. Endpoints API Backend

### Auth (`/api/auth/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion (email + password → JWT) |
| POST | `/api/auth/register` | Inscription |
| GET | `/api/auth/me` | Utilisateur courant (Bearer token) |

### Fiches (`/api/fiches/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/fiches` | Liste fiches (pagination, search, filtre statut) |
| GET | `/api/fiches/autocomplete?q=` | Autocomplete recherche |
| GET | `/api/fiches/{code_rome}` | Détail d'une fiche |
| POST | `/api/fiches` | Créer une fiche |
| PATCH | `/api/fiches/{code_rome}` | Modifier une fiche |
| DELETE | `/api/fiches/{code_rome}` | Supprimer une fiche |
| POST | `/api/fiches/{code_rome}/enrich` | Enrichir via Claude IA |
| POST | `/api/fiches/{code_rome}/publish` | Publier une fiche |
| POST | `/api/fiches/publish-batch` | Publier en lot |
| POST | `/api/fiches/{code_rome}/validate` | Validation IA |
| POST | `/api/fiches/{code_rome}/review` | Review humaine |
| POST | `/api/fiches/{code_rome}/auto-correct` | Auto-correction IA |
| GET | `/api/fiches/{code_rome}/variantes` | Liste variantes |
| GET | `/api/fiches/{code_rome}/variantes/{id}` | Détail variante |
| POST | `/api/fiches/{code_rome}/variantes/generate` | Générer variantes |

### Données Régionales & Marché (`/api/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/regions` | Liste des 18 régions françaises |
| GET | `/api/fiches/{code_rome}/regional?region=` | Données régionales (salaires, contrats, tension) |
| GET | `/api/fiches/{code_rome}/recrutements` | Historique recrutements (12 mois) |
| GET | `/api/fiches/{code_rome}/offres` | Offres d'emploi France Travail |
| GET | `/api/fiches/{code_rome}/imt-stats` | Stats IMT (salaires + contrats réels) |
| GET | `/api/fiches/{code_rome}/alternance` | Données alternance (La Bonne Alternance) |

### Veille ROME (`/api/veille/`)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/veille/rome` | Lancer veille ROME |
| GET | `/api/veille/rome/changes` | Liste des changements détectés |
| POST | `/api/veille/rome/changes/{id}/review` | Reviewer un changement |
| GET | `/api/veille/rome/status` | Statut de la veille |

### Stats & Logs
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/stats` | Statistiques globales |
| GET | `/api/audit-logs` | Logs d'audit (filtrables) |

---

## 5. Sources de Données Externes

### France Travail (OAuth2) — `sources/france_travail.py`
- **Auth** : OAuth2 client_credentials, tokens par scope (`api_offresdemploiv2`, `api_infotravailv1`)
- **Format scope** : `application_{client_id} {scope}`
- **Offres d'emploi** : `GET /offresdemploi/v2/offres/search` (par code ROME, région)
- **IMT (Infotravail)** : Découverte de ressources via `organization_show` → `package_show` → `datastore_search`
- **Fallback 3 niveaux** : IMT datastore → analyse offres réelles → estimation IA
- **Salaires depuis offres** : Extraction quartiles depuis `salaire.libelle` des offres
- **Contrats depuis offres** : Comptage CDI/CDD/MIS dans les résultats

### La Bonne Alternance — `sources/la_bonne_alternance.py`
- **API publique** : `https://labonnealternance.apprentissage.beta.gouv.fr/api`
- **Endpoint** : `GET /v1/jobsEtFormations`
- **Params** : `caller`, `romes`, `latitude`, `longitude`, `radius`
- **Retourne** : formations, offres alternance, entreprises accueillantes, niveaux diplômes
- **Coordonnées par défaut** : Paris (48.8566, 2.3522), rayon 100km

### Autres sources
- **ROME data.gouv.fr** — `sources/rome_client.py` : Référentiel ROME complet (1584 fiches)
- **DARES** — `sources/dares_client.py` : Données emploi/marché du travail
- **INSEE** — `sources/insee_client.py` : Données salariales nationales

---

## 6. Agents IA

| Agent | Fichier | Rôle | API |
|-------|---------|------|-----|
| **RedacteurFiche** | `agents/redacteur_fiche.py` | Enrichir une fiche ROME avec tous les champs | Claude |
| **ValidateurFiche** | `agents/validateur_fiche.py` | Valider la qualité d'une fiche (score, critères) | Claude |
| **CorrecteurLangue** | `agents/correcteur_langue.py` | Corriger orthographe/grammaire | Claude |
| **GenerationGenre** | `agents/generation_genre.py` | Générer variantes genrées (masc/fem/épicène) | Claude |
| **VeilleMetiers** | `agents/veille_metiers.py` | Surveiller évolutions métiers | France Travail |
| **VeilleSalaires** | `agents/veille_salaires.py` | Surveiller évolutions salaires | France Travail |

---

## 7. Modèle de Données

### Fiche Métier (table `fiches_metiers`)
Champs principaux :
- **Identité** : `code_rome`, `nom_masculin`, `nom_feminin`, `nom_epicene`, `autres_appellations`
- **Contenu** : `description`, `description_courte`, `missions_principales`, `acces_metier`
- **Compétences** : `competences`, `competences_transversales`, `savoirs`, `traits_personnalite`, `aptitudes`
- **Profil** : `profil_riasec` (6 axes 0-1), `competences_dimensions` (7+ axes), `preferences_interets`
- **Formation** : `formations`, `certifications`, `niveau_formation`
- **Marché** : `salaires` (junior/confirmé/senior), `perspectives` (tension, tendance, offres), `types_contrats`
- **Contexte** : `conditions_travail`, `conditions_travail_detaillees`, `environnements`, `secteurs_activite`, `statuts_professionnels`
- **Mobilité** : `mobilite` (métiers_proches + évolutions)
- **Validation** : `validation_ia_score`, `validation_ia_date`, `validation_ia_details`
- **Méta** : `statut`, `version`, `date_creation`, `date_maj`, `score_completude`, `domaine_professionnel`, `sites_utiles`

### Statuts d'une fiche
```
brouillon → enrichi → valide → publiee
```

### Variante (table `variantes_fiches`)
- 5 langues (FR, EN, ES, DE, IT) × 3 tranches d'âge (11-15, 15-18, 18+) × 2 formats (standard, FALC) × 3 genres = **90 variantes max/fiche**
- Index composite unique : `(code_rome, langue, tranche_age, format_contenu, genre)`

### User (table `users`)
- `id`, `email`, `name`, `password_hash`, `created_at`
- Auth JWT (python-jose)

### AuditLog (table `audit_logs`)
- Trace toutes les actions (création, enrichissement, validation, publication, etc.)

---

## 8. Frontend — Pages

| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `app/page.tsx` | Accueil (hero, stats animées, navigation) |
| `/login` | `app/login/page.tsx` | Connexion |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard (graphiques stats, répartition) |
| `/fiches` | `app/fiches/page.tsx` | Liste fiches (recherche, filtres, pagination) |
| `/fiches/[codeRome]` | `app/fiches/[codeRome]/page.tsx` | ⭐ Fiche détail complète |
| `/fiches/[codeRome]/carte` | `app/fiches/[codeRome]/carte/page.tsx` | Carte parcours métier (React Flow) |
| `/actions` | `app/actions/page.tsx` | Actions (tabs enrichir/valider/publier/variantes/veille) |
| `/guide` | `app/guide/page.tsx` | Guide d'utilisation |

### Page Fiche Détail (`/fiches/[codeRome]`)
La plus grosse page de l'app. Sections :
1. **En-tête** : Nom, statut, score complétude, domaine, autres appellations
2. **Sidebar sticky** : Navigation scroll spy vers toutes les sections
3. **StatsSection** : Salaires (BarChart), contrats (PieChart), tension — avec badges source (Régional / France Travail / IA)
4. **RecrutementsSection** : Graphe recrutements 12 mois
5. **OffresSection** : Liste offres d'emploi réelles
6. **AlternanceSection** : Formations, offres alternance, répartition diplômes (PieChart)
7. **Compétences** : 3 tabs (compétences, savoirs, transversales) + ProfileCharts (RIASEC radar, dimensions)
8. **Contexte** : Conditions travail, environnements, secteurs
9. **Mobilité** : Métiers proches, évolutions possibles (liens croisés)
10. **Validation IA** : Score, critères, problèmes, suggestions

### Chaîne de priorité des données
```
Données régionales (France Travail offres) > IMT réel (France Travail Infotravail) > Estimation IA
```
Badges verts "France Travail" quand les données viennent de l'IMT réel.

---

## 9. Tests

### Backend (66 tests — pytest)
| Fichier | Tests |
|---------|-------|
| `tests/test_api_auth.py` | Auth JWT (login, register, token, me) |
| `tests/test_api_fiches.py` | CRUD fiches (list, detail, create, update, delete) |
| `tests/test_api_actions.py` | Actions (enrich, publish, validate, auto-correct) |
| `tests/test_api_misc.py` | Stats, régions, health, audit logs |
| `tests/test_variantes.py` | Variantes CRUD |
| `tests/test_e2e_variantes.py` | E2E variantes |
| `tests/test_scheduler.py` | Scheduler |

### Frontend (52 tests — Jest 30)
| Fichier | Tests |
|---------|-------|
| `__tests__/FicheHelpers.test.tsx` | Helpers fiche |
| `__tests__/OffresSection.test.tsx` | Section offres |
| `__tests__/SectionErrorBoundary.test.tsx` | Error boundaries |
| `__tests__/StatusBadge.test.tsx` | Badge statut |
| `__tests__/ValidationIASummary.test.tsx` | Résumé validation |
| `__tests__/translations.test.ts` | Traductions |

### Commandes
```bash
# Backend
cd /Users/jeremie/Desktop/Projets/agents-metiers
source venv/bin/activate
python -m pytest tests/ -v

# Frontend
cd frontend
npx jest

# Build
cd frontend
npx next build
```

---

## 10. Configuration & Environnement

### Variables d'environnement (.env)
```bash
ANTHROPIC_API_KEY=sk-ant-...              # API Claude (enrichissement IA)
FRANCE_TRAVAIL_CLIENT_ID=PAR_...          # OAuth2 France Travail
FRANCE_TRAVAIL_CLIENT_SECRET=bdc6...      # OAuth2 France Travail
AUTH_EMAIL=admin@agents-metiers.fr        # Auth admin
AUTH_PASSWORD=enrichment2026              # Auth admin
DATABASE_URL=                             # PostgreSQL (prod seulement)
JWT_SECRET=                               # Secret JWT (prod)
NEXT_PUBLIC_API_URL=                      # URL backend pour le frontend
```

### France Travail OAuth2
- **Portal** : https://francetravail.io
- **Scopes nécessaires** : `api_offresdemploiv2`, `api_infotravailv1`
- Le scope IMT (`api_infotravailv1`) doit être activé manuellement sur le portail développeur

### Config Python (`config.py`)
- `DatabaseConfig` : SQLite local / PostgreSQL prod (auto-detect via DATABASE_URL)
- `APIConfig` : Clés APIs, modèle Claude, timeouts, retries
- `VeilleConfig` : Fréquences de veille, seuils tension, batch size
- `LoggingConfig` : Niveaux, format, rotation fichiers

---

## 11. Déploiement

### Production actuelle

| Service | Plateforme | URL | Config |
|---------|-----------|-----|--------|
| **Backend** | Render.com | https://agents-metiers.onrender.com | Docker, PostgreSQL, plan gratuit |
| **Frontend** | Netlify | Auto-deploy depuis `main` | NEXT_PUBLIC_API_URL configuré |
| **Frontend (alt)** | Vercel | https://frontend-seven-neon-32.vercel.app | — |

### Branches Git
| Branche | Usage |
|---------|-------|
| `main` | Production (déploie auto backend + frontend) |
| `backend-api` | Backend standalone (Render) |
| `frontend-nextjs` | Archive ancien frontend |

### Docker (Backend)
```bash
# docker-entrypoint.sh utilise $PORT de Render
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

### CORS autorisés
- `https://frontend-seven-neon-32.vercel.app`
- `https://agents-metiersjae.fr`
- `https://www.agents-metiersjae.fr`
- `http://localhost:3000` (dev seulement)

---

## 12. Commandes de Développement

```bash
# === BACKEND ===
cd /Users/jeremie/Desktop/Projets/agents-metiers
source venv/bin/activate

# Lancer le backend
uvicorn backend.main:app --reload --port 8000

# Tests backend
python -m pytest tests/ -v
python -m pytest tests/test_api_fiches.py -v  # Spécifique

# CLI (Streamlit legacy)
python main.py stats
python main.py enrich M1805
python main.py enrich-batch --batch-size 10

# === FRONTEND ===
cd frontend

# Dev
npm run dev                    # http://localhost:3000 (Turbopack)

# Build
npm run build

# Tests
npm test                       # Jest (52 tests)
npm run test:watch             # Mode watch
npm run test:ci                # CI + coverage

# === BASE DE DONNÉES ===
# Migration variantes
python scripts/migrate_add_variantes.py

# Migration champs enrichis
python scripts/migrate_enriched_fields.py

# Import ROME
python scripts/import_rome.py

# Données de test
python scripts/demo_data.py
```

---

## 13. Données

- **1 584 fiches ROME** importées depuis data.gouv.fr (sept. 2025)
- Source XLSX dans `data/rome/`
- Base SQLite locale : `database/fiches_metiers.db` (~2 Mo)
- Production : PostgreSQL sur Render

---

## 14. Historique des Évolutions Majeures

| Date | Évolution |
|------|-----------|
| 26 janv. 2026 | Création projet, agents IA, CLI, import ROME |
| 29 janv. 2026 | Interface Streamlit complète |
| 30 janv. 2026 | Variantes multilingues (90/fiche), export PDF, déploiement Streamlit Cloud |
| 2 fév. 2026 | Design System SOJAI (palette violet/rose, animations) |
| 3 fév. 2026 | Backend FastAPI déployé sur Render.com (Docker, PostgreSQL) |
| 7 fév. 2026 | Frontend Next.js (Netlify), page fiche détail style MetierScope |
| Fév. 2026 | Sécurité (auth JWT, CORS, SQL injection), 118 tests, CI GitHub Actions |
| 24 fév. 2026 | Données régionales France Travail (offres, salaires, contrats par région) |
| 25 fév. 2026 | ⭐ Intégration IMT réel (France Travail Infotravail) + La Bonne Alternance |

---

## 15. Points d'Attention

### Credentials France Travail
- Le scope `api_infotravailv1` doit être activé sur https://francetravail.io pour que les stats IMT réelles fonctionnent
- Sans ce scope, les données retombent sur l'analyse des offres réelles puis sur les estimations IA

### Cold Start Render
- Le plan gratuit Render met en veille après 15 min d'inactivité
- Cold start = 30-60 secondes
- Le frontend gère ça avec retry automatique (3 tentatives, timeout 60s GET)

### Python 3.14
- Le venv local utilise Python 3.14 (`/Users/jeremie/Desktop/Projets/agents-metiers/venv`)
- `pydantic-core` ne se build pas avec les pins stricts → installer `fastapi uvicorn python-multipart python-jose` sans pins

### Venv
```bash
# Si le venv est cassé, recréer :
cd /Users/jeremie/Desktop/Projets/agents-metiers
rm -rf venv
python3.14 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn python-multipart python-jose
```
