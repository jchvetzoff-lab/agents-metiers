# Agents Métiers - Système Multi-Agents pour Fiches Métiers

## Description du Projet

Système multi-agents autonome pour la création et maintenance automatique de fiches métiers en France. Le système collecte des données depuis des sources officielles (ROME, France Travail, INSEE, DARES), génère des versions genrées (masculin, féminin, épicène), et corrige automatiquement l'orthographe.

## État Actuel

### ✅ Composants Terminés

| Composant | Fichier | Statut |
|-----------|---------|--------|
| Orchestrateur | `orchestrator/orchestrator.py` | ✅ Fonctionnel |
| AgentCorrecteurLangue | `agents/correcteur_langue.py` | ✅ Fonctionnel (Claude API) |
| AgentGenerationGenre | `agents/generation_genre.py` | ✅ Fonctionnel (Claude API) |
| AgentRedacteurFiche | `agents/redacteur_fiche.py` | ✅ Fonctionnel (Claude API + Variantes) |
| AgentVeilleSalaires | `agents/veille_salaires.py` | ⏸️ Code prêt, attend credentials |
| AgentVeilleMetiers | `agents/veille_metiers.py` | ⏸️ Code prêt, attend credentials |
| Base de données | `database/` | ✅ SQLite fonctionnel + table variantes |
| Sources de données | `sources/` | ⏸️ Code prêt, attend credentials |
| Interface CLI | `interface/cli.py` | ✅ Fonctionnel |
| Système de journalisation | `logging_system/journal.py` | ✅ Fonctionnel |
| Interface Streamlit | `streamlit_app.py` + `pages/` | ✅ Fonctionnel + sélecteurs variantes |
| **Système Variantes** | `database/models.py` + `repository.py` | ✅ Fonctionnel (90 variantes/fiche) |
| **Export PDF** | `utils/pdf_generator.py` | ✅ Fonctionnel (fpdf2) |
| **Déploiement Cloud** | `.streamlit/` + guides | ✅ Configuré pour Streamlit Cloud |
| **Design System SOJAI** | `.streamlit/style.css` + `utils/ui_helpers.py` | ✅ Appliqué sur toutes les pages (2 fév. 2026) |

### ✅ Design System SOJAI (2 fév. 2026)

Transformation complète de l'interface Streamlit avec le design system professionnel inspiré de [Diagnocat.com](https://diagnocat.com/en).

**Design System Implémenté** :
- **Palette de couleurs** : Violet principal (#4A39C0), Rose accent (#FF3254), Fond violet clair (#F9F8FF)
- **Typographie** : Inter (corps), Playfair Display (titres), hiérarchie typographique professionnelle
- **Espacements** : 60-100px verticaux, 24-40px padding cards, 24px border-radius
- **Animations** : fadeIn, float, shimmer, hover effects (+8px translateY)
- **Composants** : Cards stylées, badges pill, gradients violet-rose, listes à coches

**Fichiers créés** :
- `.streamlit/style.css` (1 121 lignes) — CSS complet avec variables, animations, composants
- `utils/ui_helpers.py` (220 lignes) — 9 helpers réutilisables (sojai_card, metric_card, gradient_text, section_header, etc.)
- `pages/4_📖_Guide.py` (450 lignes) — Page de documentation complète avec tutoriels, FAQ, workflow recommandé

**Pages refactorisées** :
- ✅ `streamlit_app.py` — Page d'accueil avec hero section, métriques stylées, navigation cards
- ✅ `pages/1_📊_Dashboard.py` — Graphiques avec palette SOJAI, métriques stylées, logs élégants
- ✅ `pages/2_📋_Fiches.py` — Badges de statut, indicateurs de tension, cards élégantes, sélecteurs variantes
- ✅ `pages/3_🔧_Actions.py` — Onglets stylés + **NOUVEAU tab "🆕 Créer une fiche"**
- ✅ `pages/4_📖_Guide.py` — **NOUVELLE page** documentation complète

**Commits** :
- `e83cf5f` — Ajout design system SOJAI + Page Guide
- `b39dcb4` — Dashboard + Fiches refactorisés
- `c03a4f6` — Actions + Page d'accueil + finalisations

**Résultat** : Interface 100% professionnelle, fluide et cohérente visuellement.

### ✅ Backend API Déployé sur Render.com (3 fév. 2026)

Déploiement réussi du backend FastAPI en production sur Render.com après plusieurs tentatives infructueuses (Fly.io bloqué, Railway avec problèmes de cache).

**Configuration finale** :
- **Plateforme** : Render.com
- **Région** : Frankfurt (EU Central)
- **URL Production** : https://agents-metiers.onrender.com
- **Environment** : Docker (Dockerfile + docker-entrypoint.sh)
- **Variables** : ANTHROPIC_API_KEY configurée
- **Branch déployée** : `backend-api`

**Endpoints fonctionnels** :
- `/` — API root (version, docs link)
- `/health` — Health check (retourne `{"status":"healthy"}`)
- `/docs` — Documentation Swagger UI interactive
- `/redoc` — Documentation ReDoc
- `/api/fiches` — CRUD fiches métiers
- `/api/variantes` — Gestion des variantes multilingues
- `/api/stats` — Statistiques système
- `/api/actions` — Actions (enrichissement, correction, publication, génération variantes)
- `/api/export` — Export PDF/JSON

**Problèmes résolus** :
- Port dynamique géré via script `docker-entrypoint.sh` (utilise `$PORT` de Render)
- Suppression des fichiers `railway.toml`, `railway.json`, `nixpacks.toml` qui overridaient le Dockerfile
- Configuration Docker explicite au lieu des buildpacks Python auto-détectés

**Performance** :
- ✅ Build time : ~6-10 secondes (cache Docker)
- ✅ Cold start : ~10-15 secondes
- ✅ Latence EU : <100ms depuis la France

**Coût** : Plan gratuit Render (750h/mois, suffisant pour 24/7)

**Repository branche API** : https://github.com/jchvetzoff-lab/agents-metiers/tree/backend-api

**Commits clés** :
- `368a7af` — Remove railway config files to use Dockerfile ENTRYPOINT
- `7855830` — Fix: Use entrypoint script for proper PORT variable handling
- `226d8c9` — Force rebuild with Dockerfile

### ✅ Données ROME Importées (27 janv. 2026)

Import du référentiel ROME complet depuis data.gouv.fr (sept. 2025) :
- **1 584 fiches métiers** avec noms masculin/féminin/épicène
- **13 120 appellations** de métiers
- **507 macro-compétences** (référence)
- **15 354 savoirs** (référence)
- **14 grands domaines**, **110 sous-domaines**
- Script : `scripts/import_rome.py`
- Source : https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome

### ✅ Système de Variantes Multilingues (30 janv. 2026)

Génération automatique de variantes adaptées pour chaque fiche métier :

**Axes de variation** :
- **5 langues** : FR, EN, ES, DE, IT
- **3 tranches d'âge** : 11-15 ans, 15-18 ans, Adultes (18+)
- **2 formats** : Standard, FALC (Facile À Lire et à Comprendre)
- **3 genres** : Masculin, Féminin, Épicène

**Capacités** :
- Jusqu'à **90 variantes** par fiche (5×3×2×3)
- Génération en **1 seul appel API** Claude (optimisé)
- Adaptations intelligentes (diplômes par pays, vocabulaire par âge)
- Respect strict des règles FALC (phrases <15 mots)

**Architecture** :
- Table `variantes_fiches` avec index composite unique
- Repository : CRUD complet (save, get, count, delete)
- Interface Streamlit : sélecteurs visuels + génération batch

**Coût estimé** :
- ~$0.002 par variante
- ~$0.19 pour 90 variantes complètes d'une fiche
- ~$0.08 pour 36 variantes (FR+EN, 3 âges, 2 formats, 3 genres)

**Tests** :
- ✅ Tests unitaires (CRUD, upsert, contrainte unique)
- ✅ Test E2E (génération + sauvegarde + récupération)
- ✅ Mode simulation fonctionnel

Documentation : `VARIANTES_README.md`

### ✅ Déploiement Streamlit Cloud (30 janv. 2026)

Configuration complète pour déploiement automatique :

**Fichiers de configuration** :
- `.streamlit/config.toml` — Thème violet personnalisé
- `.streamlit/secrets.toml.example` — Template pour clés API
- `STREAMLIT_CLOUD_DEPLOY.md` — Guide complet de déploiement
- `QUICKSTART.md` — 4 étapes essentielles

**Déploiement automatique activé** :
- ✅ Chaque `git push origin main` déclenche un redéploiement
- ✅ Mise à jour en ~2-3 minutes
- ✅ Repository GitHub : https://github.com/jchvetzoff-lab/agents-metiers

**Guide rapide** :
1. Créer compte sur https://streamlit.io/cloud
2. Déployer depuis GitHub (`jchvetzoff-lab/agents-metiers`)
3. Configurer secrets (ANTHROPIC_API_KEY)
4. App en ligne !

Documentation : `QUICKSTART.md` et `STREAMLIT_CLOUD_DEPLOY.md`

### ✅ Export PDF des Fiches (30 janv. 2026)

Génération automatique de fiches métiers au format PDF professionnel :

**Caractéristiques** :
- Design professionnel avec thème violet (#4A39C0)
- En-tête et pied de page personnalisés
- Mise en page structurée (sections, listes, métadonnées)
- Support complet des variantes (langue, âge, format, genre)
- Export direct depuis l'interface Streamlit

**Fonctionnalités** :
- **PDF Variante** : Génère le PDF de la variante sélectionnée
  - Nom adapté selon langue et genre
  - Contenu traduit et adapté au public cible
  - Labels multilingues (FR, EN, ES, DE, IT)
  - Informations de la variante (langue, public, format, genre)
- **PDF Fiche Originale** : Génère le PDF de la fiche française complète
  - Version adulte, standard, masculin
  - Toutes les sections (description, compétences, salaires, perspectives)

**Architecture** :
- Module `utils/pdf_generator.py` avec fpdf2
- Classe `FichePDF` pour mise en page cohérente
- Encodage latin-1 pour compatibilité maximale
- Génération à la volée (pas de stockage)

**Interface Streamlit** :
- Bouton "📥 Télécharger PDF" pour chaque variante
- Bouton "📥 Télécharger PDF" pour la fiche originale
- Nom de fichier structuré : `CODE_ROME_langue_age_format_genre.pdf`

**Librairie** : fpdf2 (pure Python, sans dépendances système)

### ⏸️ En Attente de Credentials

- **France Travail API** : francetravail.io inaccessible
  - Alternative : https://api.gouv.fr/producteurs/france-travail
  - Nécessaire pour : AgentVeilleSalaires, AgentVeilleMetiers
- **INSEE API** : Non configuré
  - Nécessaire pour : Données salariales nationales

### 🔧 Configuration Actuelle

```bash
# Fichier .env (créé et configuré)
ANTHROPIC_API_KEY=sk-ant-xxx  # ✅ Configuré
FRANCE_TRAVAIL_CLIENT_ID=     # ❌ À obtenir
FRANCE_TRAVAIL_CLIENT_SECRET= # ❌ À obtenir
INSEE_API_KEY=                # ❌ À obtenir
```

---

## ✅ Fonctionnalités Majeures Terminées

### 1. ✅ Interface Streamlit (Terminée - 29 janv. 2026)
Interface web complète avec :
- **Dashboard** : Graphiques camembert statuts, barres tendances, jauge progression, top 10 tension
- **Fiches** : Tableau paginé, recherche textuelle, filtres par statut, vue détail complète
- **Actions** : Enrichissement batch, correction, publication en 1 clic

Lancer l'interface :
```bash
streamlit run streamlit_app.py
```

### 2. ✅ AgentRédacteurFiche (Terminé - 27 janv. 2026)
Agent fonctionnel : enrichit les fiches ROME ou crée des fiches depuis un nom de métier.
- `python main.py enrich <CODE_ROME>` — enrichir une fiche
- `python main.py enrich-batch --batch-size 10` — enrichir un lot
- `python main.py create-fiche "Prompt Engineer"` — créer de zéro

### 3. ✅ Système de Variantes Multilingues (Terminé - 30 janv. 2026)
Génération automatique de 90 variantes par fiche (5 langues × 3 âges × 2 formats × 3 genres).

**Migration base de données** :
```bash
python scripts/migrate_add_variantes.py
```

**Via interface Streamlit** :
- Page **Fiches** : Sélecteurs pour choisir la variante à afficher
- Page **Actions** > Tab **Variantes** : Générer les variantes en batch

**Tests** :
```bash
python tests/test_variantes.py        # Tests unitaires
python tests/test_e2e_variantes.py    # Test de bout en bout
```

### 4. ✅ Déploiement Streamlit Cloud (Terminé - 30 janv. 2026)
Configuration complète pour déploiement automatique.

**Guide rapide** : Voir `QUICKSTART.md` (4 étapes, 15 minutes)
**Guide complet** : Voir `STREAMLIT_CLOUD_DEPLOY.md`

### 5. ✅ Export PDF des Fiches (Terminé - 30 janv. 2026)
Téléchargement direct des fiches au format PDF professionnel.

**Depuis l'interface Streamlit** :
- Page **Fiches** > Sélectionner une fiche > Bouton "📥 Télécharger PDF"
- Téléchargement de la **variante sélectionnée** (langue, âge, format, genre)
- Téléchargement de la **fiche originale** (FR, adulte, standard, masculin)

**Caractéristiques des PDFs** :
- Design professionnel avec thème violet
- Toutes les sections : description, compétences, formations, salaires, perspectives
- En-tête et pied de page avec date de génération
- Nom de fichier structuré : `CODE_ROME_langue_age_format_genre.pdf`

**Module** : `utils/pdf_generator.py` (fpdf2, pure Python)

### 6. ✅ Design System SOJAI (Terminé - 2 fév. 2026)
Transformation complète de l'interface avec design professionnel inspiré de Diagnocat.

**Implémentation** :
- `.streamlit/style.css` — 1 121 lignes de CSS avec variables, animations, composants
- `utils/ui_helpers.py` — 9 helpers réutilisables (sojai_card, metric_card, gradient_text, etc.)
- `pages/4_📖_Guide.py` — Nouvelle page de documentation complète

**Design System** :
- **Couleurs** : Violet #4A39C0, Rose #FF3254, Fond violet clair #F9F8FF
- **Typographie** : Inter (corps), Playfair Display (titres)
- **Animations** : fadeIn, float, shimmer, hover effects
- **Composants** : Cards (24px radius), badges pill (100px), gradients, listes à coches

**Pages refactorisées** : Accueil, Dashboard, Fiches, Actions, Guide (5 pages)

**Lancer l'interface** :
```bash
streamlit run streamlit_app.py
```

---

## 🚧 Migration Next.js Planifiée (Février 2026)

**Objectif** : Transformer l'interface Streamlit en application web Next.js professionnelle pour remplacer l'aspect "cheap" de Streamlit.

### Architecture Proposée

**Frontend** : Next.js 15 + React 19 + TypeScript
- Framework : Next.js avec App Router
- Styling : Tailwind CSS 4 (design system SOJAI déjà prêt)
- Animations : Framer Motion + GSAP
- Graphiques : Recharts ou Plotly.js
- État : Zustand (si nécessaire)

**Backend** : FastAPI (Python)
- API REST pour exposer la base de données SQLite
- Endpoints : `/api/fiches`, `/api/stats`, `/api/enrichir`, `/api/variantes`
- Conservation de tous les agents existants (aucune modification)
- Migration simple du code existant

**Avantages vs Streamlit** :
- ✅ Design 100% personnalisable, professionnel
- ✅ Animations fluides (Framer Motion, transitions)
- ✅ Navigation SPA instantanée (pas de rechargements)
- ✅ UX moderne et interactive
- ✅ SEO optimisé (SSR)
- ✅ Déploiement gratuit sur Vercel (auto-deploy)

**Structure planifiée** :
```
agents-metiers-web/
├── frontend/              # Next.js app
│   ├── src/
│   │   ├── app/          # Pages (dashboard, fiches, actions, guide)
│   │   ├── components/   # Composants React réutilisables
│   │   ├── lib/          # API client, utils
│   │   └── styles/       # Tailwind + design system SOJAI
│   └── package.json
│
└── backend/               # FastAPI (code Python actuel)
    ├── main.py           # FastAPI app avec routes
    ├── agents/           # Agents existants (inchangés)
    ├── database/         # Repository existant
    └── requirements.txt
```

**Durée estimée** : ~2 jours
- Backend API (FastAPI) : 2-3h
- Frontend Next.js (4 pages) : 1-2 jours
- Tests + déploiement : 2-3h

**Statut** : ⏳ En attente de validation utilisateur

---

## À FAIRE (Prochaines Étapes)

### 1. 🔗 Obtenir Credentials France Travail (Priorité Moyenne)
Réessayer la création d'application sur https://francetravail.io :
- URL de redirection : `https://localhost`
- APIs à sélectionner : "API Offres d'emploi", "API ROME"

### 2. 📊 Améliorations Futures (Priorité Basse)
- **AgentAnalyseCompetences** : Compétences transférables entre métiers
- **AgentScrapingOffres** : Scraper Indeed/LinkedIn pour salaires
- **API REST (FastAPI)** : Exposer les fiches à d'autres apps
- **Alertes email** : Notifier quand un métier évolue
- **Base externe** : PostgreSQL via Supabase pour Streamlit Cloud

---

## Stack Technique

- **Langage** : Python 3.11+
- **Base de données** : SQLite (via SQLAlchemy)
- **Validation** : Pydantic
- **CLI** : Click + Rich
- **Interface Web** : Streamlit + Plotly
- **HTTP** : httpx (async)
- **Scraping** : BeautifulSoup
- **Planification** : APScheduler
- **IA** : API Claude (Anthropic)
- **Export PDF** : fpdf2

## Structure du Projet

```
agents-metiers/
├── main.py                 # Point d'entrée CLI
├── streamlit_app.py        # Interface web Streamlit (accueil)
├── pages/                  # Pages Streamlit (design SOJAI)
│   ├── 1_📊_Dashboard.py   # Stats et graphiques stylés
│   ├── 2_📋_Fiches.py      # Tableau des fiches + recherche + sélecteurs variantes
│   ├── 3_🔧_Actions.py     # Enrichissement, correction, publication, variantes + création
│   └── 4_📖_Guide.py       # Guide complet d'utilisation (NOUVEAU - 2 fév. 2026)
├── config.py               # Configuration globale
├── requirements.txt        # Dépendances
├── .env                    # Variables d'environnement (API keys)
├── orchestrator/           # Coordination des agents
├── agents/                 # Les 5 agents du système
│   ├── base_agent.py
│   ├── correcteur_langue.py   # ✅ Utilise Claude
│   ├── redacteur_fiche.py     # ✅ Utilise Claude (enrichissement)
│   ├── veille_salaires.py     # ⏸️ Attend France Travail
│   ├── veille_metiers.py      # ⏸️ Attend France Travail
│   └── generation_genre.py    # ✅ Utilise Claude
├── database/               # Modèles et accès données
├── sources/                # Clients APIs externes
├── interface/              # CLI et validation
├── logging_system/         # Journalisation
├── scripts/
│   ├── demo_data.py               # Créer données de test
│   ├── import_rome.py             # Import référentiel ROME depuis XLSX
│   └── migrate_add_variantes.py  # Migration : ajout table variantes
├── tests/
│   ├── test_variantes.py          # Tests unitaires variantes
│   └── test_e2e_variantes.py      # Test de bout en bout variantes
├── utils/
│   ├── __init__.py                # Exports module utilitaire
│   ├── ui_helpers.py              # 9 helpers UI SOJAI (NOUVEAU - 2 fév. 2026)
│   └── pdf_generator.py           # Génération PDF (fpdf2)
├── .streamlit/
│   ├── config.toml                # Configuration Streamlit (thème violet)
│   ├── secrets.toml.example       # Template pour secrets
│   └── style.css                  # Design system SOJAI complet (NOUVEAU - 2 fév. 2026)
├── VARIANTES_README.md            # Documentation système variantes
├── STREAMLIT_CLOUD_DEPLOY.md      # Guide complet déploiement Cloud
├── QUICKSTART.md                  # Guide rapide déploiement (4 étapes)
└── data/
    ├── rome/               # Fichiers XLSX ROME (data.gouv.fr)
    ├── fiches/             # Fiches exportées
    └── rapports/           # Logs et rapports
```

## Commandes Disponibles

```bash
# Interface Web Streamlit
streamlit run streamlit_app.py         # Lancer l'interface web (http://localhost:8501)

# Initialisation
python main.py init                    # Créer la base de données
python scripts/demo_data.py            # Créer 8 fiches de test

# Gestion des fiches
python main.py list                    # Lister les fiches
python main.py list --statut publiee   # Filtrer par statut
python main.py show <CODE_ROME>        # Afficher une fiche (ex: M1805)
python main.py search "mot-clé"        # Rechercher

# Enrichissement avec Claude
python main.py enrich <CODE_ROME>      # Enrichir 1 fiche (description, compétences, salaires)
python main.py enrich-batch            # Enrichir un lot de fiches brouillon (--batch-size 5)
python main.py create-fiche "Prompt Engineer"  # Créer une fiche complète depuis un nom

# Correction avec Claude
python main.py check <CODE_ROME>       # Corriger + générer genre (1 fiche)
python main.py check-all               # Traiter toutes les fiches

# Publication
python main.py publish <CODE_ROME>     # Publier 1 fiche
python main.py publish-all             # Publier toutes les fiches

# Administration
python main.py stats                   # Statistiques
python main.py export -o ./export      # Exporter en JSON

# Veille (quand credentials dispo)
python main.py veille                  # Veille complète
python main.py veille --type salaires  # Veille salariale
python main.py veille --type metiers   # Veille métiers
python main.py import-rome             # Importer référentiel ROME

# Variantes (nouveau - 30 janv. 2026)
python scripts/migrate_add_variantes.py  # Migration : créer table variantes
python tests/test_variantes.py           # Tests unitaires variantes
python tests/test_e2e_variantes.py       # Test E2E : génération + sauvegarde

# Utiliser l'interface Streamlit pour générer les variantes :
# → Page "Actions" > Tab "Variantes"
```

## Données Actuelles

- **1 584 fiches ROME** importées depuis data.gouv.fr (sept. 2025)
- Toutes en statut `brouillon` — nécessitent enrichissement par AgentRédacteurFiche
- Données XLSX dans `data/rome/` (arborescence principale, compétences, savoirs)

## Coût Estimé API Claude

### Enrichissement de fiches

| Usage | Coût/mois |
|-------|-----------|
| Test léger (10-20 fiches) | < $0.50 |
| Usage normal (50-100 fiches) | $1-2 |
| Usage intensif (500+ fiches) | $5-10 |

### Génération de variantes

| Scénario | Variantes/fiche | Coût/fiche | 100 fiches |
|----------|-----------------|------------|------------|
| Complètes (90) | 5 lang × 3 âges × 2 fmt × 3 genres | ~$0.19 | ~$19 |
| FR + EN (36) | 2 lang × 3 âges × 2 fmt × 3 genres | ~$0.08 | ~$8 |
| FR uniquement (18) | 1 lang × 3 âges × 2 fmt × 3 genres | ~$0.05 | ~$5 |
| Minimaliste (6) | FR × adulte × std+FALC × 3 genres | ~$0.02 | ~$2 |

**Recommandation** : FR + EN pour ~$8 par 100 fiches

---

## Pour Reprendre le Développement

1. Ouvrir VSCode : `code agents-metiers`
2. Terminal : `Ctrl + ù`
3. Tester : `python main.py stats`

### Prochaines actions recommandées :

**Option 1 : Utilisation locale**
```bash
# 1. Migrer la base de données pour ajouter les variantes
python scripts/migrate_add_variantes.py

# 2. Lancer l'interface Streamlit
streamlit run streamlit_app.py

# 3. Enrichir des fiches (page Actions > Enrichissement)
# 4. Générer des variantes (page Actions > Variantes)
# 5. Consulter les variantes (page Fiches > sélecteurs)
```

**Option 2 : Déploiement Streamlit Cloud**
```bash
# Suivre le guide rapide
cat QUICKSTART.md

# Ou le guide complet
cat STREAMLIT_CLOUD_DEPLOY.md
```

**Note Windows** : Préfixer avec `PYTHONIOENCODING=utf-8` si erreur d'encodage

---

## 📊 Cycle de Mise à Jour des Dates

Chaque fiche possède 2 dates :
- **`date_creation`** : Définie à la création, ne change jamais
- **`date_maj`** : Mise à jour automatiquement à chaque modification

### Déclencheurs de `date_maj`

| Action | Agent/Composant | Mise à jour automatique |
|--------|----------------|-------------------------|
| Création | AgentRedacteurFiche | ✅ `date_creation` + `date_maj` |
| Enrichissement | AgentRedacteurFiche | ✅ `date_maj` + `version++` |
| Correction | AgentCorrecteurLangue | ✅ `date_maj` + `version++` |
| Génération genre | AgentGenerationGenre | ✅ `date_maj` + `version++` |
| Publication | Interface Streamlit | ✅ `date_maj` + `statut` |
| Mise à jour variante | Repository.save_variante() | ✅ `date_maj` + `version++` |

**Mécanisme** : SQLAlchemy `onupdate=datetime.now` + mise à jour manuelle dans `repository.py`

---

## 🚀 État du Projet (3 fév. 2026)

**Système complet et opérationnel** :
- ✅ 1 584 fiches ROME importées
- ✅ Interface Streamlit complète (Dashboard, Fiches, Actions, Guide)
- ✅ **Design System SOJAI** appliqué sur toutes les pages (2 fév. 2026)
- ✅ **Backend API FastAPI déployé sur Render.com** (3 fév. 2026) 🆕
  - URL Production : https://agents-metiers.onrender.com
  - Documentation : https://agents-metiers.onrender.com/docs
  - Région : Frankfurt (EU Central)
- ✅ Enrichissement automatique via Claude API
- ✅ Système de variantes multilingues (90 variantes/fiche)
- ✅ Export PDF professionnel
- ✅ Déploiement Streamlit Cloud configuré
- ✅ Tests unitaires et E2E passants
- ✅ Documentation complète (4 guides)

**Interface professionnelle avec design SOJAI** :
- Pages refactorisées : Accueil, Dashboard, Fiches, Actions, Guide
- Design system complet : 1 121 lignes CSS + 9 helpers UI
- Palette violet/rose, animations fluides, composants élégants

**Architecture déployée** :
- Backend API : Render.com (https://agents-metiers.onrender.com)
- Frontend : À déployer sur Vercel/Netlify (prochaine étape)
- Base de données : SQLite (embarquée dans le backend)

**Repository GitHub** : https://github.com/jchvetzoff-lab/agents-metiers

**Derniers commits** :
- `368a7af` — Remove railway config files to use Dockerfile ENTRYPOINT
- `c03a4f6` — Design SOJAI complet: Actions + Page d'accueil + finalisations
- `b39dcb4` — Design SOJAI: Dashboard + Fiches refactorisés

---

## 🎯 Prochaines Étapes (Février 2026)

### 1. ✅ Backend API (TERMINÉ - 3 fév. 2026)
- ✅ Déploiement sur Render.com
- ✅ Documentation Swagger accessible
- ✅ Endpoints fonctionnels testés

### 2. 🔄 Frontend Next.js (EN COURS)

**Tâches à réaliser** :
1. **Créer le client API** (30 min)
   - Configurer axios/fetch avec l'URL backend
   - Créer les fonctions d'appel API (getFiches, createFiche, etc.)
   - Gérer l'authentification si nécessaire

2. **Connecter les pages** (1-2h)
   - Dashboard : Récupérer stats depuis `/api/stats`
   - Fiches : Liste depuis `/api/fiches`, détail depuis `/api/fiches/{code_rome}`
   - Actions : Appels vers `/api/actions/*`
   - Variantes : Sélection et affichage depuis `/api/variantes`

3. **Déployer sur Vercel** (15 min)
   - Push code frontend sur GitHub
   - Créer projet Vercel depuis le repo
   - Configurer variable d'environnement : `NEXT_PUBLIC_API_URL=https://agents-metiers.onrender.com`
   - Deploy automatique

### 3. 📊 Initialiser la base de données (10 min)
- Importer les 1 584 fiches ROME via l'API
- Endpoint : `POST /api/actions/import-rome`
- Vérifier avec `GET /api/stats`

### 4. 🧪 Tests End-to-End (30 min)
- Créer une fiche depuis le frontend
- Enrichir avec Claude API
- Générer des variantes (FR/EN)
- Exporter en PDF
- Vérifier la persistance des données

### 5. 🚀 Mise en Production (optionnel)
- Configurer un domaine custom (si besoin)
- Activer HTTPS (déjà activé sur Render/Vercel)
- Monitoring et logs (Render Dashboard)
- Backup de la base SQLite (si données importantes)

---

## 📝 Notes de Déploiement

**Render.com (Backend)** :
- Plan gratuit : 750h/mois (suffisant pour 24/7)
- Cold start après 15 min d'inactivité (~10-15s)
- Pour éviter le cold start : Passer au plan Starter ($7/mois)

**Vercel (Frontend recommandé)** :
- Plan gratuit : Largement suffisant
- Deploy automatique depuis GitHub
- Pas de cold start

**Alternative : Netlify (Frontend)** :
- Similaire à Vercel
- Aussi gratuit et performant

**Coûts estimés** :
- Backend Render (gratuit) : $0/mois
- Frontend Vercel (gratuit) : $0/mois
- API Claude (usage) : ~$5-20/mois selon utilisation
- **Total : ~$5-20/mois**
