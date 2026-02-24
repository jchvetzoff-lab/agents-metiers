# Frontend Next.js - Agents Métiers Web

Application web moderne en Next.js 15 avec design system SOJAI.

## Installation

```bash
npm install
```

## Configuration

Copier `.env.local.example` en `.env.local` et configurer l'URL du backend :

```bash
cp .env.local.example .env.local
```

## Développement

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

## Build Production

```bash
npm run build
npm start
```

## Stack

- **Framework** : Next.js 15 + React 19
- **Langage** : TypeScript
- **Styling** : Tailwind CSS 4
- **Animations** : Framer Motion
- **Graphiques** : Recharts

## Pages

| Route | Description |
|-------|-------------|
| `/` | Page d'accueil |
| `/dashboard` | Statistiques et graphiques |
| `/fiches` | Liste des fiches métiers |
| `/fiches/[codeRome]` | Détail d'une fiche |
| `/actions` | Actions IA (enrichissement, etc.) |
| `/guide` | Guide d'utilisation |

## Design System SOJAI

Le design system est inspiré de Diagnocat avec :
- Palette violet (#4A39C0) et rose (#FF3254)
- Typographie Inter + Playfair Display
- Composants réutilisables (cards, badges, buttons)
- Animations fluides (fadeIn, float, shimmer)
