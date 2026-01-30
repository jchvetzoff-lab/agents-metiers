# Déploiement sur Streamlit Cloud

Ce guide explique comment déployer l'application **agents-metiers** sur Streamlit Cloud.

## 📋 Prérequis

- Compte GitHub (✅ vous l'avez déjà)
- Compte Streamlit Cloud (gratuit) : https://streamlit.io/cloud
- Clé API Anthropic Claude (pour fonctionnalités IA)

---

## 🚀 Déploiement Initial

### 1. Créer un compte Streamlit Cloud

1. Allez sur https://streamlit.io/cloud
2. Cliquez sur **Sign up**
3. Connectez-vous avec GitHub

### 2. Déployer l'application

1. Dans Streamlit Cloud, cliquez sur **New app**
2. Sélectionnez votre repository : `jchvetzoff-lab/agents-metiers`
3. Branch : `main`
4. Main file path : `streamlit_app.py`
5. Cliquez sur **Deploy**

L'application va se déployer automatiquement (prend ~5 minutes).

---

## 🔐 Configuration des Secrets

### Streamlit Cloud

1. Dans votre app déployée, cliquez sur **Settings** (⚙️)
2. Cliquez sur **Secrets**
3. Collez le contenu suivant (avec vos vraies clés) :

```toml
[api]
claude_api_key = "sk-ant-votre_vraie_cle_ici"
claude_model = "claude-sonnet-4-20250514"

# Optionnel (pour veille métiers/salaires)
france_travail_client_id = "votre_client_id"
france_travail_client_secret = "votre_client_secret"
insee_api_key = "votre_cle_insee"
```

4. Cliquez sur **Save**
5. L'application redémarre automatiquement

### Obtenir une clé API Claude

1. Créez un compte sur https://console.anthropic.com/
2. Allez dans **Settings** > **API Keys**
3. Cliquez sur **Create Key**
4. Copiez la clé (format : `sk-ant-...`)
5. Collez-la dans les secrets Streamlit Cloud

**Coût** : ~$5 de crédit gratuit pour tester, puis paiement à l'usage (~$0.19 pour 90 variantes d'une fiche).

---

## 🔄 Mises à Jour Automatiques

**Bonne nouvelle** : Streamlit Cloud est maintenant configuré pour se mettre à jour automatiquement !

Chaque fois que vous poussez des modifications vers GitHub (branche `main`) :

1. Streamlit Cloud détecte le changement
2. Redéploie automatiquement l'application
3. L'application se met à jour en ~2-3 minutes

### Pousser des modifications

```bash
# Dans votre terminal
cd agents-metiers

# Ajouter vos modifications
git add .

# Créer un commit
git commit -m "Votre message de commit"

# Pousser vers GitHub (déclenche le déploiement automatique)
git push origin main
```

**C'est tout !** Streamlit Cloud fait le reste automatiquement.

---

## 📊 Migration de la Base de Données

**IMPORTANT** : La base de données locale n'est **pas** poussée vers GitHub (exclue par `.gitignore`).

Quand l'app démarre sur Streamlit Cloud :
1. Une nouvelle base SQLite vide est créée
2. Il faut initialiser les données

### Option 1 : Import manuel via interface

1. Allez dans votre app déployée
2. Utilisez la page **Actions** > **Enrichissement**
3. Importez les fiches ROME depuis l'interface

### Option 2 : Script d'initialisation automatique

Ajoutez ce code dans `streamlit_app.py` (avant `st.title`) :

```python
# Initialisation automatique au premier démarrage
repo = get_repo()
if repo.count_fiches() == 0:
    st.info("Première initialisation en cours...")
    # Importer les données ROME depuis fichiers CSV/JSON distants
```

### Option 3 : Pré-remplir avec données de test

Le script `scripts/demo_data.py` crée automatiquement 8 fiches de démonstration.

---

## 🗂️ Structure de l'Application Cloud

```
Streamlit Cloud
├── Code (depuis GitHub)
│   ├── streamlit_app.py       # Point d'entrée
│   ├── pages/                 # Pages de l'app
│   ├── agents/                # Agents IA
│   ├── database/              # Modèles et repository
│   └── requirements.txt       # Dépendances Python
│
├── Base de données (créée automatiquement)
│   └── database/fiches_metiers.db  # SQLite
│
└── Secrets (configurés manuellement)
    └── ANTHROPIC_API_KEY       # Dans Settings > Secrets
```

---

## ⚙️ Configuration Avancée

### Augmenter les ressources

Par défaut, Streamlit Cloud alloue :
- 1 CPU
- 800 MB RAM
- Stockage limité

Pour plus de ressources :
1. Passez au plan **Pro** ($20/mois)
2. Ou optimisez l'application (cache, pagination)

### Fichier de configuration

Créez `.streamlit/config.toml` (optionnel) :

```toml
[server]
maxUploadSize = 200
enableCORS = false

[theme]
primaryColor = "#4A39C0"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#1A1A2E"
font = "sans serif"
```

---

## 🐛 Dépannage

### L'app ne démarre pas

1. Vérifiez les **logs** dans Streamlit Cloud
2. Vérifiez que `requirements.txt` est à jour
3. Vérifiez que `streamlit_app.py` est à la racine

### Les secrets ne fonctionnent pas

1. Vérifiez le format TOML dans **Settings > Secrets**
2. Pas de guillemets simples, utilisez des doubles : `"sk-ant-..."`
3. Redémarrez l'app manuellement

### L'app est lente

1. Ajoutez du cache : `@st.cache_data` sur les fonctions lourdes
2. Réduisez le nombre de requêtes API
3. Passez au plan Pro pour plus de CPU/RAM

### La base se vide à chaque redémarrage

**Normal** : Streamlit Cloud peut effacer le système de fichiers.

Solutions :
- Utiliser une base externe (PostgreSQL via Supabase)
- Sauvegarder/restaurer depuis S3 ou GitHub
- Accepter que les données soient temporaires (pour démo)

---

## 📱 URL de l'Application

Une fois déployée, votre app sera accessible sur :

```
https://jchvetzoff-lab-agents-metiers-streamlit-app-xxxxxx.streamlit.app
```

Vous pouvez :
- Partager ce lien avec d'autres utilisateurs
- Personnaliser l'URL dans **Settings**
- Ajouter un mot de passe dans **Settings > Sharing**

---

## 🔒 Sécurité

### Bonnes pratiques

✅ **À FAIRE** :
- Secrets dans **Settings > Secrets** (jamais dans le code)
- Base de données locale exclue de Git (`.gitignore`)
- Clés API révoquées si exposées

❌ **À NE PAS FAIRE** :
- Commiter `.env` ou `secrets.toml` dans GitHub
- Partager vos clés API dans le code
- Pousser la base de données vers GitHub

---

## 📊 Monitoring

### Vérifier les déploiements

1. Allez sur https://share.streamlit.io/
2. Cliquez sur votre app
3. Onglet **Activity** : voir l'historique des déploiements
4. Onglet **Logs** : voir les erreurs en temps réel

### Analytics

Streamlit Cloud fournit :
- Nombre de visiteurs
- Temps de chargement
- Erreurs Python

---

## 💰 Coûts

### Streamlit Cloud

- **Gratuit** : 1 app publique
- **Pro** ($20/mois) : Apps privées, plus de ressources

### API Claude

- ~$0.19 pour générer 90 variantes d'une fiche
- ~$0.08 pour enrichir 1 fiche
- $5 de crédit gratuit à l'inscription

**Estimation** : ~$10-20/mois pour un usage normal (50-100 fiches/mois).

---

## 📞 Support

**Problèmes de déploiement** : https://discuss.streamlit.io/

**Code source** : https://github.com/jchvetzoff-lab/agents-metiers

**Documentation Streamlit Cloud** : https://docs.streamlit.io/streamlit-community-cloud

---

## ✅ Checklist de Déploiement

- [ ] Compte Streamlit Cloud créé
- [ ] Repository GitHub connecté
- [ ] App déployée avec succès
- [ ] Secrets configurés (ANTHROPIC_API_KEY)
- [ ] Base de données initialisée
- [ ] Script de migration exécuté (`migrate_add_variantes.py`)
- [ ] Test : enrichir une fiche
- [ ] Test : générer des variantes
- [ ] URL partagée avec les utilisateurs

**Votre app est prête ! 🎉**
