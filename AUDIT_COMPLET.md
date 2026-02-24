# Audit complet agents-metiers — 24 février 2026

## Architecture

| Couche | Fichiers | Lignes | État |
|--------|----------|--------|------|
| Backend main | main.py + deps.py + auth + rate_limiter | 230 | OK — bien splitté |
| Routers | 6 fichiers (fiches, actions, veille, regional, stats, auth) | 1259 | OK |
| Agents IA | 6 fichiers (redacteur, veille_metiers/salaires, correcteur, genre, base) | 2537 | OK |
| Database | models.py + repository.py | 1136 | OK |
| Sources | france_travail, rome_client, dares, insee | ~800 | OK |
| Frontend pages | 7 routes (/, fiches, fiches/[code], actions, dashboard, guide, login) | ~4500 | OK |
| Frontend components | 25+ composants | ~2000 | OK |

## Problèmes critiques (P0)

### 1. JWT_SECRET en dur
**Fichier:** `backend/auth_middleware.py:14`
```python
JWT_SECRET = os.getenv("JWT_SECRET", "agents-metiers-secret-change-in-production")
```
**Risque:** Si `JWT_SECRET` n'est pas défini sur Render, n'importe qui peut forger des tokens.
**Fix:** Vérifier que la variable est définie sur Render. Si absente, refuser de démarrer.

### 2. CORS trop permissif en production
**Fichier:** `backend/main.py`
```python
allow_origins=["https://frontend-seven-neon-32.vercel.app", "http://localhost:3000"]
```
**OK** pour l'instant mais `localhost:3000` doit être retiré en production.

### 3. Autocomplete charge TOUTES les fiches en mémoire
**Fichier:** `backend/routers/fiches.py:206`
```python
fiches = repo.get_all_fiches(limit=10000)
```
**Risque:** Avec 500+ fiches ROME (~530), ça passe. Mais pas scalable au-delà de 5000.
**Fix futur:** Faire la recherche en SQL (ILIKE + unaccent extension PostgreSQL).

### 4. `get_all_fiches` aussi dans la recherche principale
**Fichier:** `backend/routers/fiches.py:141`
Même problème — charge tout en mémoire puis filtre côté Python. OK pour 500 fiches, pas pour 10K.

## Problèmes importants (P1)

### 5. Score complétude ne reflète pas tous les champs
Le `_compute_score` backend vérifie `mobilite` via `hasattr` mais le modèle `FicheMetier` Pydantic n'a pas directement un champ `mobilite` — il a `metiers_proches` et `evolutions` séparés. Vérifier que le score est cohérent avec ce que le frontend affiche.

### 6. Pas de pagination sur get_all_variantes
`repo.get_all_variantes(code_rome)` charge toutes les variantes d'un coup. Si on génère 21 variantes (3 genres × 3 ages × 2 formats + langues), ça va. Au-delà, paginer.

### 7. FranceTravailClient instantié à chaque requête
**Fichier:** `backend/routers/regional.py:66,115,143`
```python
ft_client = FranceTravailClient()
```
Créé dans chaque handler. Devrait être un singleton dans deps.py avec cache de token OAuth2.

### 8. Pas de cache sur les données régionales / offres
Chaque appel refait les requêtes API France Travail. Ajouter un cache TTL (15-60 min).

### 9. Génération PDF inline dans page.tsx (868 lignes)
Déjà identifié mais `lib/generateFichePdf.ts` existe maintenant — vérifier que tout le code PDF a bien été extrait de page.tsx.

### 10. Page fiche detail toujours 1943 lignes
Malgré les extractions, reste le plus gros fichier. La logique de rendu des 13 sections (800+ lignes de JSX) pourrait être splitté en composants par section.

## Problèmes mineurs (P2)

### 11. `backend/node_modules` existait dans le repo
Corrigé dans ce commit (ajouté à .gitignore, supprimé du tracking).

### 12. Pas de health check endpoint
Ajouter `GET /health` qui vérifie la connexion DB.

### 13. Pas de logging structuré
Les erreurs sont logguées avec `logger.error()` mais pas de format JSON pour monitoring.

### 14. Accents dans les messages d'erreur backend
Vérifiés — OK, tous en français avec accents corrects.

### 15. Rate limiter in-memory
`backend/rate_limiter.py` utilise un dict en mémoire. OK pour un seul worker, pas pour multi-worker. À remplacer par Redis si scaling.

### 16. Pas de tests automatisés frontend
Aucun test Jest/Vitest. Ajouter au minimum un smoke test sur les pages critiques.

### 17. Pas de tests backend automatisés
Les anciens tests Streamlit ont été supprimés. Il faudrait des tests pytest pour les routers.

## Points positifs

- Architecture bien découpée (routers, agents, models, repository)
- Workflow 5 étapes cohérent (Centre de contrôle)
- Score complétude calculé côté backend ET frontend
- Autocomplete avec tri par pertinence
- Variantes multilingues/multi-genre/multi-âge
- Données régionales avec fallback estimation
- Auth JWT fonctionnel
- Rate limiting par endpoint
- UI propre, responsive, 13 sections de contenu riches
- Navigation clavier sur autocomplete
- Barre de progression workflow dans la fiche

## Recommandations prioritaires

1. **Définir JWT_SECRET sur Render** (5 min)
2. **Retirer localhost:3000 du CORS en prod** (2 min)
3. **Ajouter GET /health** (5 min)
4. **Singleton FranceTravailClient** avec cache token (30 min)
5. **Cache TTL sur données régionales** (1h)
6. **Vérifier score complétude cohérent** frontend/backend (15 min)
7. **Extraire sections JSX** de page.tsx en composants (2h)
8. **Tests pytest** pour les routers principaux (2h)
