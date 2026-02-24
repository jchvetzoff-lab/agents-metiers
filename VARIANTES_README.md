# Système de Variantes de Fiches Métiers

Implémentation complète du système de génération automatique de variantes multilingues, multi-âges et multi-formats des fiches métiers.

## 📊 Vue d'ensemble

Le système permet de générer jusqu'à **90 variantes** par fiche métier selon 4 axes :

| Axe | Options | Nombre |
|-----|---------|--------|
| **Langues** | FR, EN, ES, DE, IT | 5 |
| **Tranches d'âge** | 11-15 ans, 15-18 ans, Adultes (18+) | 3 |
| **Formats** | Standard, FALC | 2 |
| **Genres** | Masculin, Féminin, Épicène | 3 |

**Total maximum** : 5 × 3 × 2 × 3 = **90 variantes par fiche**

---

## 🏗️ Architecture

### 1. Base de Données

**Nouvelle table** : `variantes_fiches`

```sql
CREATE TABLE variantes_fiches (
    id INTEGER PRIMARY KEY,
    code_rome TEXT NOT NULL,
    langue TEXT NOT NULL,        -- fr, en, es, de, it
    tranche_age TEXT NOT NULL,   -- 11-15, 15-18, 18+
    format_contenu TEXT NOT NULL, -- standard, falc
    genre TEXT NOT NULL,         -- masculin, feminin, epicene
    nom TEXT NOT NULL,
    description TEXT,
    description_courte TEXT,
    competences JSON,
    competences_transversales JSON,
    formations JSON,
    certifications JSON,
    conditions_travail JSON,
    environnements JSON,
    date_creation DATETIME,
    date_maj DATETIME,
    version INTEGER,
    UNIQUE(code_rome, langue, tranche_age, format_contenu, genre)
);
```

**Index composite unique** : Empêche les doublons, permet l'upsert automatique.

### 2. Modèles Pydantic

**Nouveaux enums** dans `database/models.py` :
- `LangueSupporte` : FR, EN, ES, DE, IT
- `TrancheAge` : 11-15, 15-18, 18+
- `FormatContenu` : standard, falc
- `GenreGrammatical` : masculin, feminin, epicene (déjà existant)

**Nouveau modèle** : `VarianteFiche`
```python
class VarianteFiche(BaseModel):
    code_rome: str
    langue: LangueSupporte
    tranche_age: TrancheAge
    format_contenu: FormatContenu
    genre: GenreGrammatical
    nom: str
    description: str
    competences: List[str]
    # ...
```

### 3. Repository

**Nouvelles méthodes** dans `database/repository.py` :

```python
def save_variante(variante: VarianteFiche) -> VarianteFiche
    # Sauvegarde ou met à jour (upsert)

def get_variante(code_rome, langue, tranche_age, format_contenu, genre) -> Optional[VarianteFiche]
    # Récupère une variante spécifique

def count_variantes(code_rome: str) -> int
    # Compte les variantes d'une fiche

def get_all_variantes(code_rome: str) -> List[VarianteFiche]
    # Récupère toutes les variantes

def delete_variantes(code_rome: str) -> int
    # Supprime toutes les variantes d'une fiche
```

---

## 🤖 Agent Rédacteur

### Nouvelle méthode

`agents/redacteur_fiche.py` :

```python
async def generer_variantes(
    fiche: FicheMetier,
    langues: List[LangueSupporte] = None,
    tranches_age: List[TrancheAge] = None,
    formats: List[FormatContenu] = None,
    genres: List[GenreGrammatical] = None
) -> List[VarianteFiche]
```

**Principe** :
- Génère toutes les variantes en **1 seul appel API Claude**
- Économie de tokens vs appels séparés
- max_tokens=16000 pour supporter jusqu'à 90 variantes
- Mode simulation disponible si Claude non configuré

**Prompt intelligent** :
- Adaptation linguistique (diplômes selon pays)
- Adaptation âge (vocabulaire simplifié pour jeunes)
- Respect strict des règles FALC (<15 mots/phrase)
- Genre épicène (tournures neutres)

---

## 🖥️ Interface Streamlit

### Page Fiches (modifiée)

**Sélecteurs de variantes** ajoutés :

```
🌍 Langue       👥 Public        📝 Format       ⚧ Genre
🇫🇷 Français     👔 Adultes       📝 Standard    ♂️ Masculin
🇬🇧 English      🎓 15-18 ans     📖 FALC        ♀️ Féminin
...             👦 11-15 ans                     ⚧ Épicène
```

**Affichage** :
- Si variante existe → Contenu adapté affiché
- Si variante absente → Message + lien vers page Actions

### Page Actions (nouveau tab)

**Tab "🌐 Variantes"** :

1. Sélection de la fiche (fiches publiées uniquement)
2. Affichage du nombre de variantes existantes
3. Multiselects pour choisir les axes :
   - Langues (default: FR + EN)
   - Tranches d'âge (default: Adultes)
   - Formats (default: Standard + FALC)
   - Genres (default: tous)
4. Calcul automatique du nombre de variantes
5. Estimation du coût API (~$0.002/variante)
6. Bouton "Générer X variantes"
7. Barre de progression pendant la génération

---

## 📝 Tests

### Tests unitaires

`tests/test_variantes.py` :

```bash
python tests/test_variantes.py
```

**Tests** :
- Sauvegarde et récupération
- Upsert (mise à jour si existe)
- Comptage
- Récupération de toutes les variantes
- Contrainte d'unicité

### Test E2E

`tests/test_e2e_variantes.py` :

```bash
python tests/test_e2e_variantes.py
```

**Scénario complet** :
1. Création fiche test
2. Initialisation agent
3. Génération 8 variantes (FR+EN × adulte × std+FALC × masc+fem)
4. Sauvegarde en base
5. Vérifications

**Résultat** : ✅ Tous les tests passent

---

## 🚀 Utilisation

### 1. Migration de la base de données

```bash
cd agents-metiers
python scripts/migrate_add_variantes.py
```

**Sortie attendue** :
```
Migration en cours...
Base de donnees : C:\Users\...\fiches_metiers.db
Table 'variantes_fiches' creee avec succes
Colonnes : code_rome, langue, tranche_age, format_contenu, genre
Index unique composite pour eviter les doublons
```

### 2. Interface Streamlit

```bash
streamlit run streamlit_app.py
```

**Workflow** :

1. **Enrichir une fiche** (page Actions → tab Enrichissement)
   - Sélectionner une fiche brouillon
   - Cliquer "Lancer l'enrichissement"
   - Fiche passe en statut "En validation"

2. **Publier la fiche** (page Actions → tab Publication)
   - Sélectionner la fiche enrichie
   - Cliquer "Publier"
   - Fiche passe en statut "Publiée"

3. **Générer les variantes** (page Actions → tab Variantes)
   - Sélectionner la fiche publiée
   - Choisir les axes (langues, âges, formats, genres)
   - Cliquer "Générer X variantes"
   - Attendre la génération (barre de progression)

4. **Consulter les variantes** (page Fiches)
   - Cliquer sur une fiche
   - Utiliser les 4 selectbox pour choisir la variante
   - Le contenu s'affiche automatiquement

---

## 💰 Coûts API Claude

### Estimation par fiche

**Modèle** : Claude Sonnet 4
- Input : $3 / 1M tokens
- Output : $15 / 1M tokens

| Scénario | Variantes | Coût/fiche | 1584 fiches |
|----------|-----------|------------|-------------|
| **Complètes** (90) | 5 lang × 3 âges × 2 fmt × 3 genres | ~$0.19 | ~$300 |
| **FR + EN** (36) | 2 lang × 3 âges × 2 fmt × 3 genres | ~$0.08 | ~$127 |
| **FR uniquement** (18) | 1 lang × 3 âges × 2 fmt × 3 genres | ~$0.05 | ~$79 |
| **Minimaliste** (6) | FR × adulte × std+FALC × 3 genres | ~$0.02 | ~$32 |

**Recommandation** : Générer FR + EN (36 variantes/fiche) pour ~$130 total.

---

## 🎯 Règles d'Adaptation

### Par Langue

- **FR** : Français standard
- **EN** : Anglais britannique, diplômes adaptés (Bac+3 → Bachelor's degree)
- **ES, DE, IT** : Adaptation selon système éducatif local

### Par Tranche d'Âge

- **11-15 ans** :
  - Phrases <20 mots
  - Vocabulaire simple (niveau primaire/collège)
  - Exemples concrets et encourageants
  - Éviter le jargon technique

- **15-18 ans** :
  - Phrases <25 mots
  - Vocabulaire jeune
  - Focus sur les études et débouchés
  - Exemples inspirants

- **18+ (Adultes)** :
  - Langage professionnel
  - Exhaustivité
  - Technicité selon le métier

### Par Format

- **Standard** : Rédaction classique

- **FALC** (Facile À Lire et à Comprendre) :
  - **Phrases <15 mots** (règle stricte)
  - Vocabulaire niveau CM1-CM2
  - 1 idée par phrase
  - Pas de jargon
  - Pas de mots complexes

### Par Genre

- **Masculin** : "Le développeur utilise..."
- **Féminin** : "La développeuse utilise..."
- **Épicène** : "La personne qui exerce ce métier utilise..."

---

## 📂 Fichiers Modifiés

### Phase 1 : Fondations

1. ✅ `database/models.py` — Enums, VarianteFiche, VarianteFicheDB
2. ✅ `database/repository.py` — Méthodes CRUD variantes
3. ✅ `scripts/migrate_add_variantes.py` — Script de migration

### Phase 2 : Agent

4. ✅ `agents/redacteur_fiche.py` — Méthode generer_variantes()

### Phase 3 : Interface

5. ✅ `pages/2_📋_Fiches.py` — Sélecteurs variantes + affichage
6. ✅ `pages/3_🔧_Actions.py` — Tab "Variantes"

### Tests

7. ✅ `tests/test_variantes.py` — Tests unitaires
8. ✅ `tests/test_e2e_variantes.py` — Test de bout en bout

---

## ✅ Checklist de Validation

- [x] Migration DB exécutée avec succès
- [x] Tests unitaires passent (test_variantes.py)
- [x] Test E2E passe (8 variantes générées et récupérées)
- [x] Génération en mode simulation fonctionne
- [x] Interface Streamlit - Page Fiches avec sélecteurs
- [x] Interface Streamlit - Page Actions avec tab Variantes
- [x] Sauvegarde et récupération variantes
- [x] Contrainte d'unicité (upsert)
- [ ] Test avec API Claude réelle (nécessite clé API)
- [ ] Validation qualité traductions (nécessite API)
- [ ] Validation qualité FALC (phrases <15 mots)

---

## 🔄 Prochaines Étapes (Optionnel)

### Améliorations possibles

1. **Génération batch** : Générer variantes pour plusieurs fiches d'un coup
2. **Export variantes** : Exporter toutes les variantes d'une fiche en JSON/CSV
3. **Statistiques** : Dashboard des variantes (nb par langue, par âge, etc.)
4. **Cache** : Mise en cache Streamlit pour accès plus rapide
5. **Validation manuelle** : Workflow de validation des variantes avant publication

### Commandes CLI (à implémenter)

```bash
# Générer variantes pour une fiche
python main.py generer-variantes M1805 --langues fr,en --formats standard,falc

# Générer variantes pour toutes les fiches publiées
python main.py generer-variantes-batch --batch-size 10

# Compter les variantes
python main.py stats-variantes

# Supprimer les variantes d'une fiche
python main.py delete-variantes M1805
```

---

## 📞 Support

**Questions / Bugs** : Consulter les logs dans `data/rapports/`

**Tests** :
```bash
# Tests unitaires
python tests/test_variantes.py

# Test E2E
python tests/test_e2e_variantes.py
```

**Vérification base de données** :
```python
from database.repository import Repository
from config import get_config

repo = Repository(get_config().db_path)
print(f"Variantes pour M1805: {repo.count_variantes('M1805')}")
```

---

## 📊 État d'Implémentation

**Phase 1** : ✅ Terminée (Fondations)
**Phase 2** : ✅ Terminée (Agent)
**Phase 3** : ✅ Terminée (Interface Streamlit)
**Tests** : ✅ Passent (simulation)

**Système prêt à l'emploi** avec mode simulation.
Pour utilisation production : configurer `ANTHROPIC_API_KEY` dans `.env`.

---

*Dernière mise à jour* : 30 janvier 2026
