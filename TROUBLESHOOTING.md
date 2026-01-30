# 🔧 Guide de Dépannage

## Problèmes Courants et Solutions

### ❌ Erreur : "attempt to write a readonly database"

**Message d'erreur complet** :
```
sqlite3.OperationalError: attempt to write a readonly database
[SQL: INSERT INTO audit_log ...]
```

**Cause** : Permissions insuffisantes sur le fichier de base de données SQLite.

**Solution rapide** :
```bash
# Exécuter le script de correction automatique
python scripts/fix_permissions.py
```

**Solution manuelle (Windows)** :

1. **Clic droit** sur `database\fiches_metiers.db`
2. **Propriétés** > **Sécurité**
3. **Modifier** > Cochez **"Contrôle total"** pour votre utilisateur
4. **Appliquer** > **OK**

**Solution manuelle (Linux/Mac)** :
```bash
chmod 664 database/fiches_metiers.db
chmod 775 database/
```

---

### ⚠️ Streamlit : Erreur de permissions en production

**Problème** : Sur Streamlit Cloud, la base de données peut être en lecture seule.

**Solutions** :

#### Option 1 : Utiliser une base externe (Recommandé pour production)

```python
# Utiliser PostgreSQL via Supabase ou Railway
# Au lieu de SQLite

# Dans streamlit_app.py
if st.secrets.get("USE_POSTGRES", False):
    # Utiliser PostgreSQL
    db_url = st.secrets["DATABASE_URL"]
else:
    # Utiliser SQLite (local)
    db_url = f"sqlite:///{config.db_path}"
```

#### Option 2 : Désactiver les logs d'audit (mode lecture seule)

Déjà implémenté ! Le code tente d'écrire les logs mais continue même en cas d'erreur.

---

### 🔄 Le planificateur ne démarre pas

**Erreur** : `Module 'scheduler' not found`

**Solution** :
```bash
# Vérifier l'installation
pip install -r requirements.txt

# Vérifier que le module existe
ls scheduler/
```

---

### 🌐 Interface Streamlit ne se charge pas

**Erreur** : Page blanche ou erreur de module

**Solution** :
```bash
# 1. Vérifier les dépendances
pip install -r requirements.txt

# 2. Vérifier la base de données
python scripts/fix_permissions.py

# 3. Relancer Streamlit
streamlit run streamlit_app.py
```

---

### 💰 Coût API trop élevé

**Problème** : Facture Claude API importante

**Solutions** :

1. **Limiter le nombre de fiches** :
   ```python
   # Dans scheduler/monthly_update.py
   # Modifier batch_size
   batch_size = 5  # Au lieu de 10
   ```

2. **Utiliser le mode simulation** :
   ```python
   # Ne pas configurer ANTHROPIC_API_KEY
   # Le système utilisera le mode simulation
   ```

3. **Désactiver les mises à jour automatiques** :
   ```bash
   # Ne pas lancer start_scheduler.py
   # Utiliser uniquement le bouton manuel
   ```

---

### 📊 Base de données corrompue

**Symptômes** : Erreurs aléatoires, données manquantes

**Solution** :
```bash
# 1. Sauvegarder la base actuelle
cp database/fiches_metiers.db database/fiches_metiers.db.backup

# 2. Vérifier l'intégrité
sqlite3 database/fiches_metiers.db "PRAGMA integrity_check;"

# 3. Si corrompue, recréer depuis les exports
python main.py init
python scripts/import_rome.py
```

---

### 🔑 API Claude non configurée

**Erreur** : "API Claude n'est pas configurée"

**Solution** :

1. **Créer le fichier .env** :
   ```bash
   ANTHROPIC_API_KEY=sk-ant-votre_cle_ici
   ```

2. **Obtenir une clé API** :
   - https://console.anthropic.com/
   - Settings > API Keys > Create Key

3. **Vérifier** :
   ```bash
   cat .env | grep ANTHROPIC_API_KEY
   ```

---

### 📝 Variantes non générées

**Problème** : "Cette variante n'existe pas encore"

**Solution** :

1. **Via Streamlit** :
   - Page **Actions** > Tab **Variantes**
   - Sélectionner la fiche
   - Cliquer "Générer X variantes"

2. **Via Python** :
   ```python
   from scheduler.monthly_update import get_scheduler
   from database.repository import Repository
   from config import get_config
   import asyncio

   repo = Repository(get_config().db_path)
   scheduler = get_scheduler(repo)
   # Génération pour une fiche
   asyncio.run(scheduler.update_single_fiche("M1805"))
   ```

---

### 🐌 Streamlit très lent

**Causes** : Trop de données chargées, cache inefficace

**Solutions** :

1. **Utiliser la pagination** (déjà implémenté) :
   - Page Fiches : 25 fiches par page

2. **Vider le cache** :
   ```bash
   # Dans Streamlit
   # Hamburger menu > Clear cache
   ```

3. **Limiter les requêtes** :
   ```python
   # Réduire limit dans get_all_fiches()
   fiches = repo.get_all_fiches(limit=100)  # Au lieu de 500
   ```

---

### 🔄 Mise à jour manuelle échoue

**Erreur** : Timeout ou erreur API

**Solutions** :

1. **Vérifier la connexion internet**

2. **Vérifier le quota API** :
   - https://console.anthropic.com/
   - Usage & billing

3. **Réessayer plus tard** :
   - L'API Claude peut être temporairement surchargée

4. **Vérifier les logs** :
   ```bash
   tail -50 data/rapports/scheduler.log
   ```

---

### 📦 Import ROME échoue

**Erreur** : Fichiers XLSX manquants

**Solution** :

1. **Télécharger les fichiers ROME** :
   - https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome

2. **Placer dans** `data/rome/` :
   ```
   data/rome/
   ├── arborescence_principale.xlsx
   ├── competences.xlsx
   └── savoirs.xlsx
   ```

3. **Relancer l'import** :
   ```bash
   python scripts/import_rome.py
   ```

---

### 🔒 Streamlit Cloud : Secrets non configurés

**Erreur** : "API Key non configurée" sur Streamlit Cloud

**Solution** :

1. Dans Streamlit Cloud, cliquez sur **Settings** (⚙️)
2. Cliquez sur **Secrets**
3. Collez :
   ```toml
   [api]
   claude_api_key = "sk-ant-votre_cle_ici"
   claude_model = "claude-sonnet-4-20250514"
   ```
4. **Save** > L'app redémarre automatiquement

---

## 🆘 Commandes de Diagnostic

### Vérifier l'état du système

```bash
# Statistiques de la base
python main.py stats

# Lister les fiches
python main.py list --statut publiee

# Tester les permissions
python scripts/fix_permissions.py

# Tester le scheduler
python tests/test_scheduler.py

# Tester les variantes
python tests/test_variantes.py
```

### Vérifier les logs

```bash
# Logs du scheduler
tail -50 data/rapports/scheduler.log

# Logs d'audit (via Python)
python -c "from database.repository import Repository; from config import get_config; \
           repo = Repository(get_config().db_path); \
           logs = repo.get_audit_logs(limit=10); \
           [print(f'{log.timestamp} - {log.agent} - {log.description}') for log in logs]"
```

---

## 📞 Support

**Documentation** :
- `CLAUDE.md` — Vue d'ensemble du projet
- `VARIANTES_README.md` — Système de variantes
- `MISE_A_JOUR_AUTO_README.md` — Mises à jour automatiques
- `STREAMLIT_CLOUD_DEPLOY.md` — Déploiement Cloud

**Repository GitHub** :
- https://github.com/jchvetzoff-lab/agents-metiers

**Problème non résolu ?**
- Créez une issue sur GitHub avec :
  - Description du problème
  - Message d'erreur complet
  - Logs pertinents
  - Système d'exploitation

---

## ✅ Checklist de Vérification

Avant de signaler un bug, vérifiez :

- [ ] Les dépendances sont installées (`pip install -r requirements.txt`)
- [ ] Le fichier `.env` existe et contient `ANTHROPIC_API_KEY`
- [ ] Les permissions sont correctes (`python scripts/fix_permissions.py`)
- [ ] La base de données n'est pas corrompue
- [ ] Les logs ne montrent pas d'erreur évidente
- [ ] Vous utilisez la dernière version du code (`git pull origin main`)

---

**Dernière mise à jour** : 30 janvier 2026
