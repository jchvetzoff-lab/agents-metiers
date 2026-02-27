# Agents Métiers — CLAUDE.md

> Dernière mise à jour : 27 février 2026

## Projet

Système multi-agents pour créer, enrichir et maintenir des fiches métiers françaises.
Collecte données officielles (ROME, France Travail, INSEE, La Bonne Alternance), enrichit via Claude IA, expose via Next.js + FastAPI.

**Repo** : `github.com/jchvetzoff-lab/agents-metiers` | **Branche** : `main`

## Stack

| Couche | Tech |
|--------|------|
| Frontend | Next.js 16.1, React 19, TypeScript 5.7, Tailwind 3.4, Recharts, jsPDF |
| Backend | FastAPI, Python 3.14, SQLAlchemy, Pydantic |
| DB | SQLite (dev) / PostgreSQL (prod) |
| IA | Claude API — `claude-sonnet-4-20250514` |
| APIs | France Travail (OAuth2), La Bonne Alternance, INSEE, DARES |
| Tests | Jest (frontend) + pytest (backend) |

## Infrastructure & Déploiement

| Service | Plateforme | URL |
|---------|-----------|-----|
| Backend | Hetzner VPS | `api.agents-metiersjae.fr` (port 10000) |
| Frontend | Vercel | `agents-metiersjae.fr` |
| DB prod | PostgreSQL | via `DATABASE_URL` dans `.env` |

**Serveur** : `root@77.42.74.239`
**SSH** : `ssh -i /Users/jeremie/.ssh/id_ed25519 root@77.42.74.239`
**Projet serveur** : `/opt/agents-metiers`
**Data volume** : `/opt/agents-metiers-data:/app/data`
**Container** : `agents-metiers` (Docker, port 10000)

### Déployer le backend

```bash
ssh -i /Users/jeremie/.ssh/id_ed25519 root@77.42.74.239
cd /opt/agents-metiers && git pull origin main
source .env
GIT_SHA=$(git rev-parse --short HEAD)
GIT_MSG=$(git log -1 --format=%s)
docker build --build-arg GIT_SHA=$GIT_SHA --build-arg GIT_MSG="$GIT_MSG" -t agents-metiers:latest .
docker stop agents-metiers && docker rm agents-metiers
docker run -d --name agents-metiers --restart unless-stopped \
  -p 10000:10000 -v /opt/agents-metiers-data:/app/data \
  -e JWT_SECRET="$JWT_SECRET" -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e FRANCE_TRAVAIL_CLIENT_ID="$FRANCE_TRAVAIL_CLIENT_ID" \
  -e FRANCE_TRAVAIL_CLIENT_SECRET="$FRANCE_TRAVAIL_CLIENT_SECRET" \
  -e DATABASE_URL="$DATABASE_URL" -e ENVIRONMENT=production \
  -e DATA_DIR=/app/data -e GIT_SHA=$GIT_SHA -e GIT_MSG="$GIT_MSG" \
  agents-metiers:latest
```

Le frontend Vercel se déploie automatiquement au push sur `main`.

## Structure clé

```
agents-metiers/
├── backend/main.py              # App FastAPI + CORS + routers
├── backend/routers/
│   ├── auth.py                  # JWT login/register/me + refresh tokens HttpOnly
│   ├── fiches.py                # CRUD fiches + enrichissement + validation
│   ├── actions.py               # Publish, auto-correct, batch
│   ├── regional.py              # Données régionales + IMT + alternance
│   ├── stats.py                 # Stats globales
│   └── veille.py                # Veille ROME
├── frontend/
│   ├── app/fiches/[codeRome]/page.tsx  # Page fiche détail (la plus grosse)
│   ├── components/                      # ~40 composants React
│   ├── lib/api.ts                       # Client API typé (ApiClient class)
│   ├── lib/generateFichePdf.ts          # Génération PDF jsPDF
│   └── lib/auth.ts                      # Gestion tokens JWT
├── agents/                      # Agents IA Claude
│   ├── redacteur_fiche.py       # Enrichissement fiches
│   ├── validateur_fiche.py      # Validation IA (score + plan amélioration)
│   ├── generation_genre.py      # Variantes genrées
│   └── correcteur_langue.py     # Correction orthographique
├── sources/                     # Clients APIs externes
│   ├── france_travail.py        # OAuth2 France Travail (offres + IMT)
│   ├── france_travail_rome.py   # ROME France Travail
│   └── la_bonne_alternance.py   # Alternance
├── database/
│   ├── models.py                # Pydantic/SQLAlchemy (FicheMetier, Variante, User, AuditLog)
│   └── repository.py            # CRUD repository
├── tests/                       # pytest backend
├── config.py                    # Config globale
└── Dockerfile
```

## Commandes dev

```bash
# Backend
cd /Users/jeremie/Desktop/Projets/agents-metiers
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000
python -m pytest tests/ -v --ignore=tests/test_scheduler.py

# Frontend
cd frontend
npm run dev          # localhost:3000
npx next build       # build prod
npm test             # Jest
```

## Sécurité

- **Auth** : JWT + refresh tokens HttpOnly, bcrypt passwords
- **Rate limiting** : persistant (fichier), par user+endpoint
- **Validation** : `validate_code_rome()` sur tous les endpoints avec code_rome
- **CORS** : whitelist (`agents-metiersjae.fr`, `localhost:3000`)
- **Secrets** : JAMAIS dans le code — uniquement dans `.env` (gitignored)
- **Input** : Pydantic `Field(max_length=...)`, troncage prompt IA à 500 chars

## Credentials France Travail

- **Portail** : https://francetravail.io → Mes applications → "agentsmetiersjae"
- **Auth** : OAuth2 client_credentials, realm `/partenaire`
- **Scopes** : `api_offresdemploiv2 o2dsoffre`, `api_infotravailv1`
- **Format scope** : `application_{client_id} {scope}`
- Les credentials sont dans `/opt/agents-metiers/.env` sur le serveur (JAMAIS dans git)
- Si `invalid_client` → credentials révoqués, régénérer sur le portail

## Modèle de données (FicheMetier)

Statuts : `brouillon → enrichi → valide → publiee`

Champs clés : `code_rome`, `nom_epicene`, `description`, `missions_principales`, `competences`, `competences_transversales`, `savoirs`, `formations`, `certifications`, `salaires` (junior/confirmé/senior), `perspectives` (tension, tendance, offres), `types_contrats`, `profil_riasec`, `competences_dimensions`, `preferences_interets`, `mobilite`, `conditions_travail_detaillees`, `sites_utiles`, `validation_ia_score/date/details`

Variantes : 5 langues × 3 tranches d'âge × 2 formats × 3 genres = 90 max/fiche

## Endpoints principaux

- `POST /api/auth/login` — JWT login
- `GET /api/fiches` — Liste (pagination, search, filtre statut)
- `GET /api/fiches/{code_rome}` — Détail fiche
- `POST /api/fiches/{code_rome}/enrich` — Enrichir via Claude
- `POST /api/fiches/{code_rome}/validate` — Validation IA (score + plan amélioration)
- `POST /api/fiches/{code_rome}/auto-correct` — Auto-correction
- `POST /api/fiches/{code_rome}/publish` — Publier (efface validation_ia_*)
- `POST /api/fiches/publish-batch` — Publier en lot
- `GET /api/fiches/{code_rome}/offres` — Offres France Travail
- `GET /api/fiches/{code_rome}/recrutements` — Historique 12 mois
- `GET /api/fiches/{code_rome}/regional?region=` — Données régionales
- `GET /api/fiches/{code_rome}/alternance` — La Bonne Alternance
- `POST /api/fiches/{code_rome}/variantes/generate` — Générer variantes

## Points d'attention

- **France Travail scope IMT** : `api_infotravailv1` doit être activé sur le portail pour les stats réelles. Sans lui → fallback analyse offres → estimation IA
- **Priorité données** : Régional FT > IMT réel > Estimation IA
- **Python 3.14** : venv local, `pydantic-core` ne build pas avec pins stricts
- **Publication** : efface `validation_ia_score/date/details` pour fiche propre
- **PDF** : généré côté client (jsPDF), ordre = Cover → Infos → Profil → Compétences → Domaine → Contextes → Stats → Sites → Mobilité
- **Validation IA** : retourne `plan_amelioration` par critère < 80 (priorité, quoi/comment corriger, impact score)

## Venv cassé ?

```bash
cd /Users/jeremie/Desktop/Projets/agents-metiers
rm -rf venv && python3.14 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn python-multipart python-jose
```
