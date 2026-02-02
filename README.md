# Agents Métiers Web

Application web moderne pour la gestion des fiches métiers avec système multi-agents IA.

## Stack Technique

**Frontend** :
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS 4 + Design System SOJAI
- Framer Motion (animations)
- Recharts (graphiques)

**Backend** :
- FastAPI (Python)
- SQLite (via système existant)
- Agents IA (Claude API)

## Structure

```
agents-metiers-web/
├── frontend/          # Next.js application
└── backend/           # FastAPI REST API
```

## Développement

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Déploiement

- **Frontend** : Vercel (gratuit, auto-deploy)
- **Backend** : Railway, Render ou Fly.io
