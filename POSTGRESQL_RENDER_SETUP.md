# Configuration PostgreSQL sur Render.com

Ce guide explique comment migrer de SQLite à PostgreSQL sur Render.com pour éviter la perte de données.

## ⚠️ Pourquoi PostgreSQL ?

**Problème avec SQLite sur Render** :
- Render utilise des containers **éphémères**
- Le système de fichiers est **réinitialisé à chaque redéploiement**
- **Toutes les données sont perdues** après chaque push Git ou redémarrage

**Solution PostgreSQL** :
- Base de données **persistante** hébergée séparément
- Données **conservées** entre les redéploiements
- **Performances** meilleures en production

---

## 📋 Étapes de configuration

### 1. Créer une base PostgreSQL sur Render

#### Option A : PostgreSQL Render (Recommandé)

1. Va sur https://dashboard.render.com
2. Clique sur **"New +"** → **"PostgreSQL"**
3. Remplis le formulaire :
   - **Name** : `agents-metiers-db`
   - **Database** : `agents_metiers` (généré auto)
   - **User** : `agents_metiers_user` (généré auto)
   - **Region** : `Frankfurt (EU Central)` (même région que le backend)
   - **Plan** : `Free` (1 GB stockage, suffisant pour commencer)
4. Clique sur **"Create Database"**
5. **Attends 2-3 minutes** que la base soit créée

#### Option B : PostgreSQL externe (Supabase, ElephantSQL, etc.)

Si tu préfères un provider externe :
- **Supabase** : https://supabase.com (Free tier : 500 MB)
- **ElephantSQL** : https://www.elephantsql.com (Free tier : 20 MB)
- **Neon** : https://neon.tech (Free tier : 3 GB)

---

### 2. Récupérer l'URL de connexion

1. Une fois la base créée, clique dessus dans le dashboard
2. Copie l'**Internal Database URL** (commence par `postgresql://`)
   ```
   postgresql://user:password@hostname:5432/database_name
   ```
3. **Garde cette URL précieusement** (ne la partage jamais publiquement !)

---

### 3. Configurer le backend sur Render

1. Va sur ton service backend : https://dashboard.render.com/web/srv-xxx
2. Clique sur **"Environment"** dans le menu gauche
3. Ajoute une nouvelle variable d'environnement :
   - **Key** : `DATABASE_URL`
   - **Value** : Colle l'URL de connexion PostgreSQL
4. Clique sur **"Save Changes"**
5. Le service va **redémarrer automatiquement** (2-3 minutes)

---

### 4. Vérifier que ça fonctionne

#### Test 1 : Vérifier les logs

1. Va dans l'onglet **"Logs"** de ton service
2. Cherche ces lignes au démarrage :
   ```
   INFO: Application startup complete
   INFO: Uvicorn running on http://0.0.0.0:10000
   ```
3. Pas d'erreur de connexion à la base ? **✅ C'est bon !**

#### Test 2 : Appeler l'API

```bash
# Test health check
curl https://agents-metiers.onrender.com/health

# Test stats (doit retourner 0 fiches au début)
curl https://agents-metiers.onrender.com/api/stats
```

#### Test 3 : Créer une fiche test

```bash
curl -X POST https://agents-metiers.onrender.com/api/fiches \
  -H "Content-Type: application/json" \
  -d '{
    "code_rome": "TEST01",
    "nom_masculin": "Test métier",
    "nom_feminin": "Test métier",
    "nom_epicene": "Test métier"
  }'
```

Si ça retourne la fiche créée → **✅ PostgreSQL fonctionne !**

---

### 5. Migrer les données existantes (optionnel)

Si tu as déjà des données dans SQLite local que tu veux migrer :

#### Option A : Script de migration automatique

```bash
cd agents-metiers
python scripts/migrate_sqlite_to_postgres.py
```

Ce script va :
1. Lire toutes les fiches de SQLite local
2. Les insérer dans PostgreSQL via l'API
3. Afficher un rapport de migration

#### Option B : Import via l'API ROME

Utilise plutôt l'API France Travail pour récupérer les 1584 fiches fraîches :

```bash
# Via l'API backend
curl -X POST https://agents-metiers.onrender.com/api/actions/import-rome
```

---

## 🔧 Modifications apportées au code

### 1. `requirements.txt`
```diff
+ psycopg2-binary>=2.9.9  # Pour PostgreSQL (production)
```

### 2. `config.py`
```python
@dataclass
class DatabaseConfig:
    # URL de la base (PostgreSQL en prod, SQLite en dev)
    database_url: Optional[str] = field(
        default_factory=lambda: os.getenv("DATABASE_URL")
    )

    @property
    def connection_string(self) -> str:
        """Retourne la chaîne de connexion appropriée."""
        if self.database_url:
            # PostgreSQL en production
            url = self.database_url
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return url
        else:
            # SQLite en développement
            return f"sqlite:///{self.path}"
```

### 3. `database/repository.py`
```python
def __init__(self, db_path: Optional[Path] = None, database_url: Optional[str] = None, echo: bool = False):
    # Détection automatique PostgreSQL vs SQLite
    if database_url:
        # PostgreSQL
        self.engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
    elif db_path:
        # SQLite
        self.engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False}
        )
```

---

## 📊 Comparaison des plans

| Plan | Stockage | Prix | Recommandation |
|------|----------|------|----------------|
| **Render Free** | 1 GB | $0/mois | ✅ Pour commencer (1584 fiches = ~50 MB) |
| **Render Starter** | 10 GB | $7/mois | Pour production avec variantes |
| **Supabase Free** | 500 MB | $0/mois | Alternative gratuite |
| **Neon Free** | 3 GB | $0/mois | Alternative gratuite avec plus d'espace |

---

## ❓ FAQ

### Q : Mes données SQLite locales seront-elles perdues ?

**Non !** SQLite reste utilisé en développement local. PostgreSQL est uniquement pour la production sur Render.

### Q : Comment revenir en arrière ?

Supprime simplement la variable `DATABASE_URL` de Render, le système repassera automatiquement en SQLite (mais les données seront perdues à chaque redéploiement).

### Q : PostgreSQL est-il compatible avec tout le code ?

**Oui !** SQLAlchemy gère la compatibilité. Le code fonctionne identiquement avec les deux bases.

### Q : Combien de fiches peut stocker le plan gratuit ?

- **1 GB** = environ **50 000 fiches** avec toutes les variantes
- **1 584 fiches ROME** = ~10 MB
- **1 584 fiches + 90 variantes** = ~150 MB

Le plan gratuit est **largement suffisant** !

---

## 🚀 Prochaines étapes

Une fois PostgreSQL configuré :

1. ✅ Les données sont persistantes
2. ✅ Redéploiements sans perte de données
3. ✅ Prêt pour l'enrichissement des 1584 fiches
4. ✅ Prêt pour le frontend en production

**Tu es maintenant prêt pour la production ! 🎉**
