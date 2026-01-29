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
| AgentRedacteurFiche | `agents/redacteur_fiche.py` | ✅ Fonctionnel (Claude API) |
| AgentVeilleSalaires | `agents/veille_salaires.py` | ⏸️ Code prêt, attend credentials |
| AgentVeilleMetiers | `agents/veille_metiers.py` | ⏸️ Code prêt, attend credentials |
| Base de données | `database/` | ✅ SQLite fonctionnel |
| Sources de données | `sources/` | ⏸️ Code prêt, attend credentials |
| Interface CLI | `interface/cli.py` | ✅ Fonctionnel |
| Système de journalisation | `logging_system/journal.py` | ✅ Fonctionnel |
| Interface Streamlit | `streamlit_app.py` + `pages/` | ✅ Fonctionnel |

### ✅ Données ROME Importées (27 janv. 2026)

Import du référentiel ROME complet depuis data.gouv.fr (sept. 2025) :
- **1 584 fiches métiers** avec noms masculin/féminin/épicène
- **13 120 appellations** de métiers
- **507 macro-compétences** (référence)
- **15 354 savoirs** (référence)
- **14 grands domaines**, **110 sous-domaines**
- Script : `scripts/import_rome.py`
- Source : https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome

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

## À FAIRE (Prochaines Étapes)

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

### 3. 🔗 Obtenir Credentials France Travail (Priorité Moyenne)
Réessayer la création d'application sur https://francetravail.io :
- URL de redirection : `https://localhost`
- APIs à sélectionner : "API Offres d'emploi", "API ROME"

### 4. 📊 Améliorations Futures (Priorité Basse)
- **AgentAnalyseCompetences** : Compétences transférables entre métiers
- **AgentTraducteur** : Traduction EN/ES des fiches
- **AgentScrapingOffres** : Scraper Indeed/LinkedIn pour salaires
- **API REST (FastAPI)** : Exposer les fiches à d'autres apps
- **Export PDF** : Générer des fiches PDF propres
- **Alertes email** : Notifier quand un métier évolue

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

## Structure du Projet

```
agents-metiers/
├── main.py                 # Point d'entrée CLI
├── streamlit_app.py        # Interface web Streamlit (accueil)
├── pages/                  # Pages Streamlit
│   ├── 1_📊_Dashboard.py   # Stats et graphiques
│   ├── 2_📋_Fiches.py      # Tableau des fiches + recherche
│   └── 3_🔧_Actions.py     # Enrichissement, correction, publication
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
│   ├── demo_data.py        # Créer données de test
│   └── import_rome.py      # Import référentiel ROME depuis XLSX
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
```

## Données Actuelles

- **1 584 fiches ROME** importées depuis data.gouv.fr (sept. 2025)
- Toutes en statut `brouillon` — nécessitent enrichissement par AgentRédacteurFiche
- Données XLSX dans `data/rome/` (arborescence principale, compétences, savoirs)

## Coût Estimé API Claude

| Usage | Coût/mois |
|-------|-----------|
| Test léger (10-20 fiches) | < $0.50 |
| Usage normal (50-100 fiches) | $1-2 |
| Usage intensif (500+ fiches) | $5-10 |

---

## Pour Reprendre le Développement

1. Ouvrir VSCode : `code agents-metiers`
2. Terminal : `Ctrl + ù`
3. Tester : `python main.py stats`

### Prochaine action recommandée :
```bash
# 1. Lancer l'interface Streamlit : streamlit run streamlit_app.py
# 2. Enrichir les fiches via l'interface ou : python main.py enrich-batch --batch-size 10
# Note Windows : préfixer avec PYTHONIOENCODING=utf-8 si erreur d'encodage
```
