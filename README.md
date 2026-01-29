# Agents Métiers

Système multi-agents pour la gestion automatique des fiches métiers ROME (Répertoire Opérationnel des Métiers et des Emplois).

## Fonctionnalités

- **1 584 fiches métiers** importées du référentiel ROME officiel
- **Enrichissement IA** : génération automatique de descriptions, compétences, salaires via Claude
- **Correction automatique** : orthographe, grammaire, typographie
- **Interface web** : dashboard, recherche, filtres, actions batch

## Démo

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://agents-metiers.streamlit.app)

## Installation locale

```bash
# Cloner le repo
git clone https://github.com/TON_USERNAME/agents-metiers.git
cd agents-metiers

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp secrets.toml.example .streamlit/secrets.toml
# Éditer .streamlit/secrets.toml avec tes clés API

# Lancer l'interface
streamlit run streamlit_app.py
```

## Configuration

Créer un fichier `.env` ou `.streamlit/secrets.toml` :

```
ANTHROPIC_API_KEY=sk-ant-xxx
FRANCE_TRAVAIL_CLIENT_ID=xxx
FRANCE_TRAVAIL_CLIENT_SECRET=xxx
INSEE_API_KEY=xxx
```

## Stack technique

- Python 3.11+
- SQLite + SQLAlchemy
- Streamlit + Plotly
- API Claude (Anthropic)

## Licence

MIT
