# Agents Métiers

Système multi-agents IA pour la gestion automatique des fiches métiers ROME.

## 🚀 Version Next.js (Février 2026)

Application web moderne avec interface professionnelle inspirée du design SOJAI.

### Stack Technique

**Frontend** :
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 3 + Design System SOJAI
- Framer Motion (animations)
- Recharts (graphiques)

**Backend** :
- FastAPI (Python)
- SQLite (via système existant)
- Agents IA (Claude Opus 4.5)

### Structure

```
agents-metiers-web/
├── frontend/          # Next.js application
└── backend/           # FastAPI REST API
```

### Développement

**Backend** :
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** :
```bash
cd frontend
npm install
npm run dev
```

**Accès** :
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## 📊 Fonctionnalités

### Système Multi-Agents IA

- **1 584 fiches métiers** du référentiel ROME officiel
- **5 agents spécialisés** :
  - 📝 Rédacteur : Enrichissement des fiches
  - 🔧 Correcteur : Orthographe et grammaire
  - ⚧️ Genre : Versions masculin/féminin/épicène
  - 💰 Salaires : Données du marché
  - 📈 Tendances : Évolution des métiers

### Variantes Multilingues

- **90 variantes** par fiche :
  - 5 langues (FR, EN, ES, DE, IT)
  - 3 tranches d'âge (11-15, 15-18, adultes)
  - 2 formats (Standard, FALC)
  - 3 genres (masculin, féminin, épicène)

### Interface Web

- **Dashboard** : Statistiques en temps réel
- **Fiches** : Recherche, filtres, détails complets
- **Actions** : Enrichissement batch, génération variantes
- **Guide** : Documentation complète

## 🎨 Design System SOJAI

- **Palette** : Violet (#4A39C0), Rose (#FF3254)
- **Animations** : Background fluide, transitions smooth
- **Responsive** : Mobile-first design
- **Accessibilité** : Format FALC disponible

## 🔑 Configuration

Créer un fichier `.env` dans le dossier backend :

```env
ANTHROPIC_API_KEY=sk-ant-xxx
FRANCE_TRAVAIL_CLIENT_ID=xxx
FRANCE_TRAVAIL_CLIENT_SECRET=xxx
INSEE_API_KEY=xxx
```

## 📦 Déploiement

- **Frontend** : Vercel (gratuit, auto-deploy)
- **Backend** : Railway, Render ou Fly.io

## 🔗 Liens

- **Repository** : https://github.com/jchvetzoff-lab/agents-metiers
- **Documentation** : Voir CLAUDE.md pour détails complets
- **By** : JAE Fondation

## 📝 Licence

MIT
