# 🔄 Système de Mise à Jour Automatique

## Vue d'Ensemble

Le système de mise à jour automatique permet de maintenir les fiches métiers à jour avec les dernières données (salaires, tendances, offres d'emploi).

**2 modes disponibles** :
1. **Automatique** : Mise à jour mensuelle de toutes les fiches publiées (planifiée)
2. **Manuel** : Mise à jour à la demande d'une fiche spécifique (bouton)

---

## 🎯 Fonctionnalités

### 1️⃣ Mise à Jour Automatique Mensuelle

**Planification** :
- 📅 Exécution : **1er de chaque mois à 2h00**
- 🎯 Cible : **Toutes les fiches publiées**
- 📦 Batch : 10 fiches à la fois (évite la surcharge)
- 📊 Logs : Détaillés dans `data/rapports/scheduler.log`

**Ce qui est mis à jour** :
- ✅ Descriptions enrichies
- ✅ Compétences actualisées
- ✅ Formations et certifications
- ✅ Salaires estimés
- ✅ Perspectives d'évolution
- ✅ Tendances du marché

**Automatique** :
- ✅ `date_maj` mise à jour
- ✅ `version` incrémentée
- ✅ Log d'audit créé

---

### 2️⃣ Mise à Jour Manuelle (Bouton)

**Localisation** : Page **Fiches** > Détail d'une fiche

**Bouton** : `🔄 Mettre à jour maintenant`

**Utilisation** :
1. Sélectionnez une fiche dans la liste
2. Cliquez sur le bouton "🔄 Mettre à jour maintenant"
3. Attendez ~5 secondes
4. La fiche est automatiquement rechargée avec les nouvelles données

**Coût estimé** : ~$0.08 par fiche

---

## 🚀 Démarrage

### Option 1 : Planificateur en Arrière-Plan (Recommandé)

Pour activer les mises à jour mensuelles automatiques :

```bash
# Démarrer le planificateur
python scripts/start_scheduler.py
```

**Sortie attendue** :
```
=== Démarrage du planificateur de mises à jour mensuelles ===
API Claude configurée et disponible
Planificateur démarré avec succès
Prochaine exécution : 1er du mois prochain à 2h00
Appuyez sur Ctrl+C pour arrêter
```

**Arrêter** : `Ctrl + C`

### Option 2 : Via Streamlit (Interface)

Le bouton manuel est déjà intégré dans l'interface Streamlit :

```bash
streamlit run streamlit_app.py
```

1. Allez sur la page **Fiches**
2. Sélectionnez une fiche
3. Cliquez sur `🔄 Mettre à jour maintenant`

---

## ⚙️ Configuration

### Prérequis

1. **API Claude configurée** :
   ```bash
   # Fichier .env
   ANTHROPIC_API_KEY=sk-ant-votre_cle_ici
   ```

2. **Dépendances installées** :
   ```bash
   pip install -r requirements.txt
   ```

### Modifier la Planification

Par défaut : **1er du mois à 2h00**

Pour modifier, éditez `scheduler/monthly_update.py` ligne 40 :

```python
# Exemple : Tous les lundis à 9h
self.scheduler.add_job(
    func=self._run_monthly_update,
    trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
    # ...
)

# Exemple : Tous les jours à minuit
self.scheduler.add_job(
    func=self._run_monthly_update,
    trigger=CronTrigger(hour=0, minute=0),
    # ...
)
```

**Syntaxe CronTrigger** :
- `day=1` : 1er du mois
- `day_of_week='mon'` : Tous les lundis
- `hour=2` : 2h du matin
- `minute=0` : Minute 0

---

## 📊 Monitoring

### Logs

Les logs du planificateur sont enregistrés dans :
```
data/rapports/scheduler.log
```

**Contenu** :
- Heure de démarrage/arrêt
- Nombre de fiches traitées
- Succès/Erreurs
- Durée d'exécution

**Exemple** :
```
2026-01-30 02:00:00 - INFO - Mise à jour mensuelle : 1584/1584 fiches mises à jour en 4200s
2026-01-30 03:10:00 - INFO - Erreurs: 5
```

### Logs d'Audit

Consultez l'historique complet dans la base de données :

```python
from database.repository import Repository
from config import get_config

repo = Repository(get_config().db_path)
logs = repo.get_audit_logs(agent="MonthlyUpdateScheduler", limit=10)

for log in logs:
    print(f"{log.timestamp} - {log.description}")
```

**Ou via Streamlit** :
- Page **Actions** > Onglet "📜 Dernières actions"

---

## 💰 Coûts

### Mise à Jour Mensuelle (Toutes les fiches)

| Nombre de fiches | Coût estimé |
|------------------|-------------|
| 100 fiches | ~$8 |
| 500 fiches | ~$40 |
| 1584 fiches (ROME complet) | ~$127 |

**Calcul** : ~$0.08 par fiche

### Mise à Jour Manuelle (1 fiche)

| Action | Coût |
|--------|------|
| 1 fiche | ~$0.08 |
| 10 fiches | ~$0.80 |

---

## 🧪 Tests

### Test Unitaire

```bash
python tests/test_scheduler.py
```

**Tests inclus** :
- ✅ Mise à jour d'une fiche unique
- ✅ Mise à jour batch (3 fiches)
- ✅ Vérification incrémentation version
- ✅ Logs d'audit

### Test Manuel

1. **Créer une fiche de test** :
   ```bash
   python scripts/demo_data.py
   ```

2. **Lancer le scheduler** :
   ```bash
   python scripts/start_scheduler.py
   ```

3. **Vérifier les logs** :
   ```bash
   tail -f data/rapports/scheduler.log
   ```

---

## ❓ FAQ

### Le planificateur fonctionne-t-il sur Streamlit Cloud ?

⚠️ **Non, pas directement.** Streamlit Cloud redémarre périodiquement les apps, ce qui arrête le planificateur.

**Solutions** :
1. **Utiliser le bouton manuel** dans l'interface Streamlit
2. **Déployer le planificateur séparément** (serveur, Heroku, AWS Lambda)
3. **Utiliser Streamlit Cloud + Trigger externe** (GitHub Actions, cron job)

### Puis-je forcer une mise à jour immédiate ?

✅ **Oui, 2 méthodes** :

**Méthode 1 : Via Python**
```python
import asyncio
from database.repository import Repository
from scheduler.monthly_update import get_scheduler
from config import get_config

repo = Repository(get_config().db_path)
scheduler = get_scheduler(repo, claude_client=None)  # Mode simulation
asyncio.run(scheduler.update_all_published_fiches())
```

**Méthode 2 : Via Streamlit**
- Page **Fiches** > Cliquez sur le bouton `🔄 Mettre à jour maintenant` pour chaque fiche

### Que se passe-t-il si une mise à jour échoue ?

Le planificateur :
- ✅ Continue avec les fiches suivantes (pas de blocage)
- ✅ Log l'erreur dans `scheduler.log`
- ✅ Crée un log d'audit avec les détails
- ✅ Retente lors de la prochaine exécution mensuelle

### Comment désactiver les mises à jour automatiques ?

Simplement **ne pas démarrer** le script `start_scheduler.py`.

Le bouton manuel reste disponible dans l'interface Streamlit.

---

## 🔧 Dépannage

### Erreur : "Module 'scheduler' not found"

```bash
# Vérifier que le module existe
ls scheduler/

# Réinstaller les dépendances
pip install -r requirements.txt
```

### Erreur : "API Claude non configurée"

```bash
# Vérifier le fichier .env
cat .env | grep ANTHROPIC_API_KEY

# Ajouter la clé si manquante
echo "ANTHROPIC_API_KEY=sk-ant-votre_cle" >> .env
```

### Le planificateur ne s'exécute pas

1. **Vérifier les logs** :
   ```bash
   tail -50 data/rapports/scheduler.log
   ```

2. **Vérifier que le planificateur est démarré** :
   ```bash
   ps aux | grep start_scheduler
   ```

3. **Vérifier la configuration cron** :
   - Assurez-vous que l'heure est correcte
   - Vérifiez le fuseau horaire

---

## 📚 Fichiers Importants

| Fichier | Description |
|---------|-------------|
| `scheduler/monthly_update.py` | Planificateur principal |
| `scheduler/__init__.py` | Exports du module |
| `scripts/start_scheduler.py` | Script de démarrage |
| `tests/test_scheduler.py` | Tests unitaires |
| `data/rapports/scheduler.log` | Logs d'exécution |

---

## 🎯 Workflow Complet

```
┌─────────────────────────────────────────────┐
│ 1. PLANIFICATION (APScheduler)              │
│    Déclenche le 1er du mois à 2h00         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. RÉCUPÉRATION (Repository)                │
│    Toutes les fiches publiées              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. BATCH (10 fiches à la fois)              │
│    Évite la surcharge API                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. ENRICHISSEMENT (AgentRedacteurFiche)     │
│    Mise à jour via Claude API               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 5. SAUVEGARDE (Repository)                  │
│    date_maj + version++ + log audit         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 6. LOGS (scheduler.log + audit_log)         │
│    Résumé de l'exécution                    │
└─────────────────────────────────────────────┘
```

---

**Système opérationnel et testé !** ✅

Pour toute question : Consultez `CLAUDE.md` ou les logs dans `data/rapports/`.
