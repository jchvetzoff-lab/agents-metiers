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
├── pages/                  # Pages Streamlit
│   ├── 1_📊_Dashboard.py   # Stats et graphiques
│   ├── 2_📋_Fiches.py      # Tableau des fiches + recherche + sélecteurs variantes
│   └── 3_🔧_Actions.py     # Enrichissement, correction, publication, variantes
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
│   └── pdf_generator.py           # Génération PDF (fpdf2)
├── .streamlit/
│   ├── config.toml                # Configuration Streamlit (thème violet)
│   └── secrets.toml.example       # Template pour secrets
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

## 🚀 État du Projet (30 janv. 2026)

**Système complet et opérationnel** :
- ✅ 1 584 fiches ROME importées
- ✅ Interface Streamlit complète (Dashboard, Fiches, Actions)
- ✅ Enrichissement automatique via Claude API
- ✅ Système de variantes multilingues (90 variantes/fiche)
- ✅ Déploiement Streamlit Cloud configuré
- ✅ Tests unitaires et E2E passants
- ✅ Documentation complète (3 guides)

**Prêt pour production** avec API Claude configurée.

**Repository GitHub** : https://github.com/jchvetzoff-lab/agents-metiers
