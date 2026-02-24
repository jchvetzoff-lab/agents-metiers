# Backend FastAPI - Agents Métiers

API REST pour exposer les données et fonctionnalités du système agents-metiers.

## Installation

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

Le backend utilise directement la base de données SQLite du projet `agents-metiers` parent.
Aucune configuration supplémentaire nécessaire si les deux projets sont côte à côte.

## Lancement

```bash
# Mode développement (auto-reload)
uvicorn main:app --reload --port 8000

# Ou directement
python main.py
```

L'API sera accessible sur http://localhost:8000

## Documentation

- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

## Endpoints Principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/stats` | GET | Statistiques globales |
| `/api/fiches` | GET | Liste des fiches (avec filtres) |
| `/api/fiches/{code_rome}` | GET | Détail d'une fiche |
| `/api/fiches/{code_rome}/variantes` | GET | Variantes d'une fiche |
| `/api/audit-logs` | GET | Logs d'activité |

## Paramètres de Requête

### GET /api/fiches

- `statut` : Filtrer par statut (brouillon, en_validation, publiee, archivee)
- `search` : Recherche textuelle (code ROME ou nom)
- `limit` : Nombre de résultats (1-500, défaut: 50)
- `offset` : Pagination (défaut: 0)

Exemple :
```bash
curl "http://localhost:8000/api/fiches?statut=publiee&search=data&limit=10"
```
