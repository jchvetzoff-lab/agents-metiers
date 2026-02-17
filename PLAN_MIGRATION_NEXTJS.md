# Plan de Migration : Streamlit → Next.js + FastAPI

## Objectif

Migrer agents-metiers de Streamlit vers une architecture moderne :
- **Frontend** : Next.js 16 + React 19 + Tailwind CSS 4 (déployé sur Netlify)
- **Backend** : FastAPI (déployé sur Railway ou Render)

## Architecture Cible

```
┌─────────────────────────────────────────────────────────────┐
│                        NETLIFY                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js Frontend                        │    │
│  │  - Pages : Dashboard, Fiches, Actions, Guide        │    │
│  │  - Composants SOJAI réutilisés                      │    │
│  │  - Tailwind CSS + Framer Motion                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (REST API)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAILWAY / RENDER                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              FastAPI Backend                         │    │
│  │  - Routes CRUD fiches, variantes, audit             │    │
│  │  - Agents IA (enrichissement, correction, etc.)     │    │
│  │  - Export PDF                                        │    │
│  │  - SQLite → PostgreSQL (optionnel)                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1 : Backend FastAPI

### 1.1 Structure du projet backend

```
agents-metiers-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + CORS
│   ├── config.py            # Config existante adaptée
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── fiches.py        # CRUD fiches
│   │   ├── variantes.py     # CRUD variantes
│   │   ├── stats.py         # Dashboard stats
│   │   ├── actions.py       # Enrichissement, correction, publication
│   │   └── export.py        # Export PDF
│   ├── models/              # Pydantic models (depuis database/models.py)
│   ├── services/            # Logique métier (agents existants)
│   └── database/            # Repository existant
├── requirements.txt
├── Procfile                 # Pour Railway/Render
└── .env
```

### 1.2 Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/fiches` | Liste paginée avec filtres |
| GET | `/api/fiches/{code_rome}` | Détail d'une fiche |
| POST | `/api/fiches` | Créer une fiche (depuis nom métier) |
| PUT | `/api/fiches/{code_rome}` | Mettre à jour une fiche |
| DELETE | `/api/fiches/{code_rome}` | Supprimer une fiche |
| GET | `/api/fiches/{code_rome}/variantes` | Liste des variantes |
| POST | `/api/fiches/{code_rome}/variantes` | Générer variantes |
| GET | `/api/stats` | Statistiques dashboard |
| GET | `/api/stats/tendances` | Top 10 métiers en tension |
| GET | `/api/audit` | Logs d'audit |
| POST | `/api/actions/enrich` | Enrichir fiches (batch) |
| POST | `/api/actions/correct` | Corriger fiches (batch) |
| POST | `/api/actions/publish` | Publier fiches (batch) |
| GET | `/api/export/pdf/{code_rome}` | Export PDF |

### 1.3 Fichiers à créer/adapter

1. **`app/main.py`** - Point d'entrée FastAPI avec CORS
2. **`app/routes/fiches.py`** - Wrapper autour de `repository.py`
3. **`app/routes/variantes.py`** - Gestion variantes
4. **`app/routes/stats.py`** - Agrégations pour dashboard
5. **`app/routes/actions.py`** - Appels aux agents existants
6. **`app/routes/export.py`** - Génération PDF

### 1.4 Dépendances supplémentaires

```
fastapi==0.115.0
uvicorn==0.34.0
python-multipart==0.0.20
```

---

## Phase 2 : Frontend Next.js

### 2.1 Structure du projet frontend

```
agents-metiers-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Fonts, metadata
│   │   ├── page.tsx             # Dashboard (accueil)
│   │   ├── fiches/
│   │   │   ├── page.tsx         # Liste des fiches
│   │   │   └── [code]/page.tsx  # Détail fiche + variantes
│   │   ├── actions/
│   │   │   └── page.tsx         # Actions batch
│   │   └── guide/
│   │       └── page.tsx         # Documentation
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx       # Copié de SOJAI
│   │   │   ├── Footer.tsx       # Copié de SOJAI
│   │   │   └── Sidebar.tsx      # Navigation latérale
│   │   ├── ui/
│   │   │   ├── Button.tsx       # Copié de SOJAI
│   │   │   ├── Card.tsx         # Copié de SOJAI
│   │   │   ├── Badge.tsx        # Statuts, tensions
│   │   │   ├── Table.tsx        # Liste fiches
│   │   │   ├── Modal.tsx        # Détail fiche
│   │   │   ├── Select.tsx       # Filtres
│   │   │   └── Tabs.tsx         # Onglets variantes
│   │   ├── fiches/
│   │   │   ├── FicheCard.tsx    # Card résumé fiche
│   │   │   ├── FicheDetail.tsx  # Vue complète
│   │   │   ├── FicheFilters.tsx # Filtres (statut, tension)
│   │   │   └── VariantSelector.tsx # Sélecteur langue/age/format
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx     # KPI cards
│   │   │   ├── StatusChart.tsx  # Pie chart statuts
│   │   │   └── TensionTable.tsx # Top 10 métiers
│   │   └── actions/
│   │       ├── EnrichForm.tsx   # Formulaire enrichissement
│   │       ├── CorrectForm.tsx  # Formulaire correction
│   │       └── PublishForm.tsx  # Formulaire publication
│   ├── hooks/
│   │   ├── useFiches.ts         # React Query hooks
│   │   ├── useStats.ts
│   │   └── useActions.ts
│   ├── lib/
│   │   ├── api.ts               # Client API (fetch wrapper)
│   │   └── constants.ts         # Couleurs, config
│   └── styles/
│       └── globals.css          # Design system SOJAI
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

### 2.2 Pages à implémenter

| Page | Route | Fonctionnalités |
|------|-------|-----------------|
| Dashboard | `/` | Stats, graphiques, activité récente |
| Fiches | `/fiches` | Liste paginée, recherche, filtres |
| Détail Fiche | `/fiches/[code]` | Infos complètes, variantes, export PDF |
| Actions | `/actions` | Enrichissement, correction, publication batch |
| Guide | `/guide` | Documentation, FAQ |

### 2.3 Composants à copier de SOJAI

| Composant | Modifications |
|-----------|---------------|
| `Button.tsx` | Aucune |
| `Card.tsx` | Aucune |
| `FadeInSection.tsx` | Aucune |
| `SectionHeading.tsx` | Adapter pour titres de page |
| `Navbar.tsx` | Changer logo, liens |
| `Footer.tsx` | Adapter contenu |
| `globals.css` | Garder couleurs/animations |

### 2.4 Dépendances frontend

```json
{
  "dependencies": {
    "next": "16.1.5",
    "react": "^19",
    "framer-motion": "^12",
    "@tanstack/react-query": "^5",
    "recharts": "^2.15",
    "zustand": "^5"
  }
}
```

---

## Phase 3 : Déploiement

### 3.1 Backend sur Railway

1. Créer compte Railway (gratuit tier disponible)
2. Connecter repo GitHub `agents-metiers-api`
3. Variables d'environnement :
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (si PostgreSQL)
4. Procfile : `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 3.2 Frontend sur Netlify

1. Connecter repo GitHub `agents-metiers-web`
2. Build command : `npm run build`
3. Publish directory : `.next`
4. Variables d'environnement :
   - `NEXT_PUBLIC_API_URL=https://agents-metiers-api.railway.app`

---

## Ordre d'exécution

### Étape 1 : Backend FastAPI (estimé : priorité haute)
- [ ] Créer structure `agents-metiers-api/`
- [ ] Implémenter `main.py` avec CORS
- [ ] Créer routes CRUD fiches
- [ ] Créer routes variantes
- [ ] Créer routes stats
- [ ] Créer routes actions (enrichir, corriger, publier)
- [ ] Créer route export PDF
- [ ] Tester en local avec Swagger UI
- [ ] Déployer sur Railway

### Étape 2 : Frontend Next.js (estimé : priorité haute)
- [ ] Créer projet Next.js avec Tailwind
- [ ] Copier composants SOJAI (Button, Card, etc.)
- [ ] Copier globals.css (design system)
- [ ] Implémenter layout (Navbar, Sidebar)
- [ ] Créer page Dashboard
- [ ] Créer page Fiches (liste + filtres)
- [ ] Créer page Détail Fiche (variantes incluses)
- [ ] Créer page Actions
- [ ] Créer page Guide
- [ ] Connecter à l'API backend
- [ ] Déployer sur Netlify

### Étape 3 : Finalisation
- [ ] Tests E2E
- [ ] Optimisation performances (lazy loading, pagination)
- [ ] Documentation mise à jour
- [ ] Migration données si nécessaire

---

## Points d'attention

1. **CORS** : Configurer correctement les origines autorisées sur FastAPI
2. **SQLite en prod** : Fonctionne sur Railway mais PostgreSQL recommandé pour la scalabilité
3. **Variables d'environnement** : Ne jamais commiter les clés API
4. **Streaming** : Pour les opérations longues (enrichissement batch), envisager SSE ou WebSocket
5. **Rate limiting** : Protéger les endpoints d'actions contre les abus

---

## Avantages de cette architecture

| Aspect | Streamlit | Next.js + FastAPI |
|--------|-----------|-------------------|
| Performance | Moyenne | Excellente (SSR, caching) |
| SEO | Non | Oui |
| Personnalisation UI | Limitée | Totale |
| Mobile | Passable | Responsive natif |
| Scalabilité | Limitée | Horizontale |
| Coût hosting | Gratuit | Gratuit (tiers gratuits) |
| Maintenance | 1 service | 2 services |

---

## Prochaine action

Confirmer ce plan et je commence par créer le backend FastAPI.
