# 🚀 Démarrage Rapide - Streamlit Cloud

## Les 4 Étapes pour Déployer

### Étape 1️⃣ : Créer un compte Streamlit Cloud (5 min)

1. Allez sur **https://streamlit.io/cloud**
2. Cliquez sur **Sign up**
3. Connectez-vous avec votre compte **GitHub**

---

### Étape 2️⃣ : Déployer l'application (2 min)

1. Dans Streamlit Cloud, cliquez sur **New app** (bouton violet)
2. Remplissez le formulaire :
   - **Repository** : `jchvetzoff-lab/agents-metiers`
   - **Branch** : `main`
   - **Main file path** : `streamlit_app.py`
3. Cliquez sur **Deploy!**

⏳ Attendez ~5 minutes pendant le déploiement initial

---

### Étape 3️⃣ : Obtenir une clé API Claude (5 min)

1. Allez sur **https://console.anthropic.com/**
2. Créez un compte (gratuit)
3. Allez dans **Settings** → **API Keys**
4. Cliquez sur **Create Key**
5. **Copiez la clé** (format : `sk-ant-...`)

💰 Vous recevez **$5 de crédit gratuit** pour tester

---

### Étape 4️⃣ : Configurer les secrets (3 min)

1. Dans votre app Streamlit Cloud déployée, cliquez sur **⚙️ Settings** (en haut à droite)
2. Cliquez sur **Secrets** dans le menu de gauche
3. **Collez ce texte** (remplacez par votre vraie clé) :

```toml
[api]
claude_api_key = "sk-ant-COLLEZ_VOTRE_VRAIE_CLE_ICI"
claude_model = "claude-sonnet-4-20250514"
```

4. Cliquez sur **Save**
5. L'app redémarre automatiquement (30 secondes)

---

## ✅ C'est Terminé !

Votre application est maintenant **en ligne** et **accessible publiquement**.

L'URL sera quelque chose comme :
```
https://jchvetzoff-lab-agents-metiers-xxxxxx.streamlit.app
```

---

## 🔄 Déploiement Automatique

À partir de maintenant, **chaque fois que vous faites** :

```bash
git add .
git commit -m "Votre message"
git push origin main
```

→ Streamlit Cloud redéploie automatiquement votre app en 2-3 minutes ! 🎉

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- **STREAMLIT_CLOUD_DEPLOY.md** — Guide complet avec dépannage
- **VARIANTES_README.md** — Documentation du système de variantes

---

**Temps total : ~15 minutes**
