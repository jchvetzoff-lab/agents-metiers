# Agents Métiers Frontend

Interface Next.js pour le système de fiches métiers.

## Stack

- **Framework**: Next.js 16 + React 19
- **Styling**: Tailwind CSS 4
- **State**: React Query (TanStack Query)
- **Icons**: Lucide React

## Installation

```bash
npm install
```

## Configuration

1. Copier `.env.local.example` vers `.env.local`
2. Configurer l'URL de l'API backend

```bash
cp .env.local.example .env.local
```

## Développement

```bash
# Lancer le serveur de développement
npm run dev

# L'application sera disponible sur http://localhost:3000
```

## Production

```bash
# Build
npm run build

# Lancer en production
npm start
```

## Déploiement Netlify

1. Connecter le repository GitHub
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Variables d'environnement:
   - `NEXT_PUBLIC_API_URL`: URL de l'API backend

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Statistiques et vue d'ensemble |
| Fiches | `/fiches` | Liste des fiches métiers |
| Détail Fiche | `/fiches/[code]` | Détail d'une fiche |
| Actions | `/actions` | Enrichissement et publication |
| Guide | `/guide` | Documentation |

## Design System

Basé sur le design SOJAI avec:
- Palette violet/rose (#4A39C0, #FF3254)
- Cards avec border-radius 16-20px
- Badges pill-shaped
- Animations fadeIn et hover

## Structure

```
src/
├── app/
│   ├── page.tsx           # Dashboard
│   ├── layout.tsx         # Layout avec sidebar
│   ├── globals.css        # Design system
│   ├── fiches/
│   │   ├── page.tsx       # Liste
│   │   └── [code]/page.tsx # Détail
│   ├── actions/page.tsx
│   └── guide/page.tsx
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx
│   ├── ui/
│   │   ├── Badge.tsx
│   │   ├── StatCard.tsx
│   │   └── TensionBar.tsx
│   └── Providers.tsx
└── lib/
    └── api.ts             # Client API
```
