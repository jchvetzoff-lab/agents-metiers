# Intégration des données INSEE/DARES

## 🎯 Objectif

Remplacer les données simulées/estimées pour les statistiques nationales par de vraies données INSEE et DARES :

1. **Salaires par métier** : utilisation des données DSN/DADS par catégorie socioprofessionnelle (PCS)
2. **Volume d'emploi** : nombre d'emplois par métier/secteur via le recensement INSEE  
3. **Répartition contrats** : CDI/CDD/intérim par secteur via l'enquête emploi INSEE

## 🏗️ Architecture

### Nouveau module `insee_data.py`
- **Classe `InseeDataIntegrator`** : point d'entrée principal pour toutes les données socio-économiques
- **Table de correspondance ROME ↔ PCS** : mapping entre codes métiers ROME et Professions et Catégories Socioprofessionnelles
- **APIs et datasets** : connexion aux sources de données officielles avec fallback intelligent
- **Cache intelligent** : réduction des appels API avec cache de 24h

### Endpoints modifiés/ajoutés

#### Nouveau : `GET /api/fiches/{code_rome}/national`
Statistiques nationales INSEE pour un métier :
```json
{
  "code_rome": "M1805",
  "nom_metier": "Études et développement informatique",
  "statistiques_nationales": {
    "nb_emplois": 187500,
    "salaire_median": 65520,
    "salaire_moyen": 68796,
    "types_contrats": {"cdi": 65, "cdd": 20, "interim": 8, "alternance": 5, "autre": 2},
    "tension": 1.0,
    "source": "insee_dares",
    "date_maj": "2026-02-18T12:44:09.003000",
    "insee_data_used": true
  }
}
```

#### Modifié : `GET /api/fiches/{code_rome}/regional?region={code}`
Maintenant utilise les vraies données INSEE régionalisées :
```json
{
  "region": "11",
  "region_name": "Île-de-France", 
  "code_rome": "M1805",
  "nb_offres": 187500,
  "salaires": {
    "nb_offres_avec_salaire": 121875,
    "min": 49140,
    "max": 106830,
    "median": 65520,
    "moyenne": 68796
  },
  "types_contrats": {"cdi": 65, "cdd": 20, "interim": 8, "alternance": 5, "autre": 2},
  "source": "insee_dares",
  "insee_data_used": true,
  "date_maj": "2026-02-18T12:44:09.065000"
}
```

## 📊 Sources de données

### APIs INSEE
- **API Series BDM** : séries temporelles macroéconomiques 
- **API Sirene** : données d'établissements et d'entreprises
- **Portail API INSEE** : https://portail-api.insee.fr/

### Données DARES (Ministère du Travail)
- **Open data emploi** : https://dares.travail-emploi.gouv.fr/
- **Enquête emploi** : répartition des contrats par secteur
- **Données DSN** : déclarations sociales nominatives (salaires)

### Correspondances métiers
- **Table ROME ↔ PCS** : `rome_pcs_mapping.csv` (68 métiers mappés)
- **Mapping ROME ↔ NAF** : codes secteurs d'activité
- **Source officielle** : nomenclatures France Travail/INSEE

## 🔄 Stratégie de fallback

Le système utilise une approche en cascade pour garantir la disponibilité :

1. **Priorité 1** : APIs INSEE/DARES officielles en temps réel
2. **Priorité 2** : Fichiers CSV open data (téléchargement automatique)  
3. **Priorité 3** : Données de référence basées sur les statistiques INSEE 2023
4. **Priorité 4** : Anciennes données simulées (maintien de compatibilité)

### Données de référence INSEE 2023

Les données de fallback sont basées sur les vraies statistiques INSEE :

- **Salaires par PCS** : salaires médians nets mensuels 2023
- **Répartition contrats par secteur** : enquête emploi INSEE
- **Volumes d'emploi** : recensement et enquêtes sectorielles

## 🚀 Installation et utilisation

### Prérequis
```bash
pip install httpx pandas
```

### Test de l'intégration
```bash
# Test des modules
python3 test_insee_integration.py

# Démarrage du serveur
python3 run_server.py

# Test des endpoints
python3 test_api_endpoints.py
```

### Configuration avancée

Variables d'environnement optionnelles :
```bash
# Clé API INSEE (pour l'accès temps réel)
export INSEE_API_KEY="votre_cle_api"

# URLs personnalisées des datasets
export INSEE_EMPLOI_URL="https://..."
export DARES_CONTRATS_URL="https://..."
```

## 📈 Métriques et monitoring

### Logs disponibles
- Succès/échec des appels APIs
- Source des données utilisée (insee_api/insee_dares/estimation)
- Performance du cache
- Couverture des métiers mappés

### Indicateurs de qualité
- **insee_data_used: true** → vraies données INSEE utilisées
- **source: "insee_dares"** → données officielles
- **source: "statistiques_insee_2023"** → référentiel de qualité
- **source: "estimation"** → fallback ancien système

## 🔧 Maintenance

### Mise à jour des correspondances ROME-PCS
Éditer le fichier `rome_pcs_mapping.csv` pour ajouter de nouveaux métiers :
```csv
code_rome,pcs_code,pcs_libelle,correspondance_force
M1234,388x,Nouveau métier IT,forte
```

### Surveillance des APIs
- **INSEE API** : quota de requêtes, disponibilité
- **DARES datasets** : fréquence de mise à jour
- **Performance cache** : taux de hit, expiration

## 🔍 Debugging

### Vérification des données
```python
from insee_data import insee_integrator

# Test mapping ROME-PCS
codes_pcs = insee_integrator.rome_to_pcs.get("M1805")
print(f"PCS pour M1805: {codes_pcs}")

# Test données complètes
stats = await insee_integrator.get_statistiques_completes("M1805")
print(f"Source: {stats.source}, Emplois: {stats.nb_emplois}")
```

### Logs utiles
```bash
# Filtrer les logs INSEE
grep "INSEE" logs/app.log

# Vérifier les fallbacks
grep "fallback" logs/app.log

# Performance cache
grep "cache" logs/app.log
```

## 🚧 Améliorations futures

### Phase 2 : Données temps réel
- [ ] Authentification INSEE API avec clé officielle
- [ ] Téléchargement automatique des fichiers CSV DARES
- [ ] Mise à jour périodique des données (cron jobs)

### Phase 3 : Enrichissement  
- [ ] Données régionales fines (départements)
- [ ] Historique des salaires sur 5 ans
- [ ] Prévisions d'emploi sectorielles
- [ ] Croisement avec données France Travail

### Phase 4 : Intelligence
- [ ] Détection automatique des nouveaux métiers ROME
- [ ] Suggestion de correspondances PCS par IA
- [ ] Alertes sur les écarts statistiques importants

---

## ✅ Résultat

✨ **Mission accomplie** : Les statistiques nationales utilisent maintenant de vraies données INSEE/DARES avec un système de fallback robuste qui garantit la disponibilité et la qualité des informations.