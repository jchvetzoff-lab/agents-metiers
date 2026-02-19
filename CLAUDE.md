# CLAUDE.md — Agents Metiers

> Documentation technique complete du projet. A lire en entier avant toute intervention.

## Vue d'ensemble

**Agents Metiers** est une plateforme de gestion de fiches metiers basee sur le referentiel ROME (Repertoire Operationnel des Metiers et Emplois). Elle permet d'importer, enrichir par IA, valider et publier des fiches metiers detaillees.

- **Backend** : FastAPI (Python 3.11+), deploye sur **Render** (free tier)
- **Frontend** : Next.js 14 (App Router, TypeScript), deploye sur **Vercel**
- **BDD** : PostgreSQL sur Render (prod) / SQLite local (dev)
- **IA** : Anthropic Claude pour l'enrichissement et la validation

---

## URLs de production

| Service | URL |
|---------|-----|
| Backend API | `https://agents-metiers.onrender.com` |
| Frontend | `https://frontend-six-gold-12.vercel.app` |
| Render service ID | `srv-d614620gjchc73d96f5g` |
| GitHub repo | `https://github.com/jchvetzoff-lab/agents-metiers` |

---

## Architecture des fichiers

```
agents-metiers/
├── CLAUDE.md                  # Ce fichier
├── config.py                  # Config minimale (env vars → SimpleNamespace)
├── database/
│   ├── models.py              # SQLAlchemy models + Pydantic schemas (603 lignes)
│   └── repository.py          # Repository pattern, CRUD operations (623 lignes)
├── backend/
│   ├── main.py                # FastAPI app, CORS, startup, health (138 lignes) ✅ clean
│   ├── shared.py              # Singleton repo + config (22 lignes)
│   ├── auth.py                # JWT auth maison (139 lignes)
│   ├── enrichment.py          # Enrichissement Claude AI (532 lignes)
│   ├── validation.py          # Validation IA + scoring qualite (924 lignes)
│   ├── france_travail.py      # Client API France Travail (offres, ROME) (244 lignes)
│   ├── regions.py             # Stats regionales via France Travail API (654 lignes)
│   ├── insee_data.py          # Donnees INSEE 2023 integrees (439 lignes)
│   ├── models.py              # Pydantic request/response models (132 lignes)
│   ├── api_public.py          # API publique v1 avec rate limiting (368 lignes)
│   └── requirements.txt       # Deps Python
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Page d'accueil (hero + KPIs)
│   │   ├── login/page.tsx     # Authentification
│   │   ├── dashboard/page.tsx # Redirect vers /actions
│   │   ├── fiches/
│   │   │   ├── page.tsx       # Liste des fiches (filtres pipeline, tri, recherche)
│   │   │   └── [codeRome]/
│   │   │       ├── page.tsx   # Detail fiche (3149 lignes) ⚠️ monolithique
│   │   │       └── carte/page.tsx  # Carte des metiers (radial layout)
│   │   ├── actions/page.tsx   # Pipeline + actions batch (851 lignes)
│   │   └── guide/page.tsx     # Guide utilisateur
│   ├── components/
│   │   ├── Navbar.tsx         # Navbar fixe, auto-hide au scroll
│   │   ├── LayoutShell.tsx    # Shell global (spacer pour navbar fixe)
│   │   ├── StatusBadge.tsx    # Badges statut (brouillon/enrichi/valide/publiee)
│   │   ├── CareerMap.tsx      # Carte radiale des metiers proches
│   │   ├── FormationPathway.tsx
│   │   ├── SalarySection.tsx
│   │   ├── RecruitementsSection.tsx
│   │   ├── CompetencesSection.tsx
│   │   ├── WorkContextSection.tsx
│   │   ├── ValidationSection.tsx
│   │   ├── MobiliteSection.tsx
│   │   ├── ProfileSection.tsx
│   │   ├── FicheHeader.tsx
│   │   ├── FicheNav.tsx       # Navigation horizontale scrollable (sections)
│   │   ├── ScoreBar.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── MetricCard.tsx
│   │   ├── ScrollToTop.tsx
│   │   ├── AuthGuard.tsx
│   │   └── BackgroundAnimation.tsx
│   ├── lib/
│   │   ├── api.ts             # Client API (787 lignes) — fetch + retry + timeout + cache
│   │   └── utils.ts           # toLabel(), getDisplayName()
│   └── .env.local             # NEXT_PUBLIC_API_URL=https://agents-metiers.onrender.com
```

---

## Pipeline des fiches (workflow)

```
brouillon → enrichi → valide → publiee
                ↑         |
                └─────────┘  (rejet → retour enrichi)
```

### Statuts (enum `StatutFiche`)

| Statut | Description | Actions disponibles |
|--------|-------------|---------------------|
| `brouillon` | Import ROME brut, ~15% completude | Enrichir + Valider IA (un seul bouton) |
| `enrichi` | Enrichi par Claude, ~85-92% | Validation IA, Re-enrichir, Re-enrichir avec commentaire |
| `valide` | Score IA >= 70/100 | Publier, Re-enrichir, Rejeter |
| `publiee` | Visible publiquement | Generer variantes |

### Scoring qualite (`backend/validation.py`)

Le score n'est PAS base sur la presence des champs mais sur la **qualite du contenu** :
- Description : longueur (seuils 100/300/500 chars) → 8 pts max
- Competences : richesse des objets (details > strings simples) → 15 pts max
- Salaires : min/max/median > median seul → 10 pts max
- etc. Total plafonne a 100.
- Brouillon type ~15%, enrichi ~85-92%, 100% quasi impossible.

### Filtres frontend (page Actions + page Fiches)

Les filtres du frontend sont des **filtres virtuels** mappes vers les vrais statuts :

```typescript
const FILTER_TO_STATUTS = {
  tous: undefined,
  a_enrichir: ["brouillon"],
  a_valider: ["enrichi"],
  validation_ia: ["en_validation", "valide"],  // NB: en_validation est legacy
  publiee: ["publiee"],
};
```

---

## Variables d'environnement (backend Render)

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `DATABASE_URL` | URL PostgreSQL Render | Oui (prod) |
| `ANTHROPIC_API_KEY` | Cle API Claude | Oui (enrichissement/validation) |
| `FRANCE_TRAVAIL_CLIENT_ID` | Client ID France Travail | Non (fallback hardcode) |
| `FRANCE_TRAVAIL_CLIENT_SECRET` | Secret France Travail | Non (fallback hardcode) |
| `INSEE_API_TOKEN` | Token API INSEE | Non (fallback data integrees) |
| `API_KEYS` | Cles API publique (comma-sep) | Non (default: `am_dev_key_2026`) |

Le frontend n'a qu'une variable : `NEXT_PUBLIC_API_URL=https://agents-metiers.onrender.com`

---

## Authentification

- Backend genere un JWT maison (pas de lib externe) dans `backend/auth.py`
- Format : `base64(header).base64(payload).sha256(header.payload.secret[:16])`
- Secret : `secrets.token_hex(32)` regenere a chaque restart (sessions perdues au redeploy)
- Endpoints : `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`
- Frontend parse le token avec `parseToken()` dans `lib/api.ts`

---

## Enrichissement (`backend/enrichment.py`)

- Utilise Claude (Anthropic API) avec un prompt detaille demandant 24+ champs
- `max_tokens=8000` pour des reponses completes
- Prompt inclut les donnees existantes de la fiche + commentaire optionnel
- Le commentaire utilisateur est marque `⚠️ INSTRUCTION PRIORITAIRE` dans le prompt
- Apres enrichissement, lance automatiquement la validation IA
- Si score >= 70 → statut passe a `valide`, sinon reste `enrichi`

### Champs enrichis (24 champs JSON)

`description`, `desc_courte`, `competences`, `comp_transversales`, `formations`, `certifications`, `conditions_travail`, `environnements_travail`, `secteurs_activite`, `salaires`, `perspectives`, `metiers_proches`, `missions`, `acces_metier`, `savoirs`, `savoir_faire`, `savoir_etre`, `outils_technologies`, `contraintes`, `avantages`, `tendances`, `chiffres_cles`, `temoignages`, `ressources_utiles`

Chaque champ peut etre un objet riche (ex: `{nom: "...", details: "..."}`) ou un string simple. Le frontend utilise `toLabel()` pour gerer les deux cas.

---

## APIs externes

### France Travail (ex-Pole Emploi)

- **Client** : `backend/france_travail.py`
- **Auth** : OAuth2 client_credentials → `https://entreprise.francetravail.fr/connexion/oauth2/access_token`
- **Scope** : `api_offresdemploiv2 o2dsoffre`
- **Endpoints utilises** :
  - `GET /partenaire/offresdemploi/v2/offres/search` — recherche offres par code ROME
  - Parametres : `codeROME`, `range=0-149`, `maxCreationDate` (20 jours max)
- **Donnees extraites** : nombre d'offres, salaires (min/max/median), types de contrat (CDI/CDD/etc.)
- **Fallback** : Si l'API echoue, genere 12-25 offres factices (clairement marquees)

### INSEE (donnees integrees)

- `backend/insee_data.py` contient des stats INSEE 2023 hardcodees (pas d'appel API)
- Mapping ROME → PCS pour 68 metiers
- Donnees : effectifs, salaire median, taux d'emploi, feminisation
- Pas de token necessaire

---

## Commandes essentielles

### Build & deploy

```bash
# Build frontend
cd /tmp/agents-metiers/agents-metiers/frontend
npx next build 2>&1 | tail -5

# Deploy Vercel
npx vercel --prod --yes

# Push backend (Render auto-deploy sur branche backend-api)
cd /tmp/agents-metiers/agents-metiers
git push origin main && git push origin main:backend-api
```

### Git

```bash
# Toujours pusher sur les deux branches
git push origin main && git push origin main:backend-api

# Render deploie depuis backend-api, Vercel depuis main
```

### Test local frontend

```bash
cd frontend && npm run dev
# MAIS : toujours pointer vers le backend Render, JAMAIS localhost
# .env.local : NEXT_PUBLIC_API_URL=https://agents-metiers.onrender.com
```

---

## Contraintes techniques

### Render free tier
- **Cold starts** : 20-30s apres inactivite
- **Build** : ~10-15 min
- **Timeout** : Pas de hard limit mais les requetes longues (enrichissement) prennent 30-90s
- **Memoire** : Limitee → `pandas` a ete supprime, remplace par `csv` stdlib
- **JWT** : Secret regenere a chaque restart → sessions perdues

### Vercel free tier
- **100 deployments/jour** max
- Auto-deploy sur push si connecte au repo

### Frontend
- **POST timeout** : 180s (enrichissement/validation IA prennent du temps)
- **GET timeout** : 60s
- **Retry** : 2 tentatives avec 2s de delai pour TypeError/AbortError
- **Cache** : 5 min en memoire pour regional/recrutements/offres

---

## Problemes connus / dette technique

1. ~~`backend/main.py` monolithique~~ → **RESOLU** : splitte en routes_fiches, routes_stats, routes_admin (138 lignes)
2. **`frontend/app/fiches/[codeRome]/page.tsx` est gros** (~2984 lignes) — composants extraits (ActionButtons, OffresSection, RegionalSection, HistoriqueSection) mais pas encore integres dans page.tsx
3. ~~JWT secret ephemere~~ → **RESOLU** : lit `JWT_SECRET` depuis env var (fallback random)
4. **Pagination** : limit/offset existent dans l'API mais le tri/recherche charge tout en memoire (acceptable pour ~1600 fiches)
5. ~~Pas de tests~~ → **RESOLU** : 17 tests (auth + validation + scoring), pytest
6. **Pas de CI/CD** au-dela du auto-deploy Render/Vercel

---

## Conventions de code

### Backend
- Pydantic v2 pour les modeles request/response
- SQLAlchemy 2.0 pour l'ORM
- Pattern Repository (`database/repository.py`)
- Config via `SimpleNamespace` (pas de fichier YAML/TOML)
- Serialisation JSON : `_json_serial()` pour gerer les `datetime`

### Frontend
- Next.js 14 App Router (pas de Pages Router)
- `"use client"` sur toutes les pages interactives
- Tailwind CSS, design dark/glassmorphism
- `toLabel(val)` : convertit `{nom: "..."} | string` → string (dans `lib/utils.ts`)
- `StatusBadge` : composant centralise pour les badges de statut
- Navbar fixe avec auto-hide au scroll (`requestAnimationFrame`)
- Responsive mobile-first : cards sur mobile, table sur desktop

---

## Dernier etat (commit a2b24cb)

- 1589 fiches en base (majoritairement brouillons)
- Enrichissement fonctionne (teste sur M1805, A1201)
- Pipeline complet : enrichir → validation IA → validation humaine → publication
- Page Actions avec visualisation pipeline
- Carte des metiers radiale fonctionnelle
- Stats regionales via France Travail API (vraies donnees)
- Design responsive mobile-first
- API publique v1 avec rate limiting et auth par API key

---

## Regles absolues

1. **JAMAIS lancer le backend en local** — toujours utiliser le backend Render
2. **JAMAIS afficher de fausses donnees** sans les marquer clairement comme estimees
3. **Toujours pusher sur les deux branches** : `main` et `backend-api`
4. **Le `.env.local` du frontend** doit pointer vers `https://agents-metiers.onrender.com`
5. **Verifier le build** avant chaque deploy : `npx next build 2>&1 | tail -5`
