# Guide de Migration - Données Enrichies

## 🎯 Objectif
Ce guide explique comment migrer du rendu direct des données enrichies vers les nouveaux composants sécurisés.

## ⚠️ Problème Résolu
**AVANT** (causait des erreurs React) :
```tsx
// ❌ ERREUR : rend [object Object] si item est un objet
{formations.map(formation => <div key={i}>{formation}</div>)}

// ❌ ERREUR : crash si competence est un objet enrichi
<span>{competence}</span>
```

**APRÈS** (sécurisé) :
```tsx
// ✅ CORRECT : gère both strings et objets
{formations.map(formation => <div key={i}>{toLabel(formation)}</div>)}

// ✅ CORRECT : composant sécurisé
<SafeRender data={competence} />
```

## 🛠️ Nouveaux Utilitaires

### 1. Fonction `toLabel()`
```tsx
import { toLabel } from '@/lib/utils';

// Gère automatiquement strings et objets
const displayText = toLabel(item);
// "Compétence" si item = {nom: "Compétence", niveau: "avancé"}
// "Compétence" si item = "Compétence"
```

### 2. Composant `SafeRender`
```tsx
import { SafeRender } from '@/components/SafeRender';

// Rendu sécurisé avec fallback
<SafeRender data={item} fallback="Non spécifié" />
```

### 3. Listes Enrichies
```tsx
import { EnrichedBulletList, EnrichedNumberedList } from '@/components/EnrichedList';

// Liste à puces sécurisée
<EnrichedBulletList 
  items={competences} 
  color="#4F46E5"
  maxItems={5}
  fallback={<p>Aucune compétence</p>}
/>

// Liste numérotée sécurisée
<EnrichedNumberedList 
  items={missions}
  color="#EC4899"
/>
```

## 📋 Exemples de Migration

### Compétences
```tsx
// ❌ ANCIEN CODE
<ul>
  {competences.map((comp, i) => (
    <li key={i}>{comp}</li> // ❌ Erreur si comp est un objet
  ))}
</ul>

// ✅ NOUVEAU CODE
<EnrichedBulletList items={competences} />
```

### Formations
```tsx
// ❌ ANCIEN CODE
<div>
  {formations.map((f, i) => (
    <div key={i}>
      <strong>{f}</strong> // ❌ Erreur si f est un objet
    </div>
  ))}
</div>

// ✅ NOUVEAU CODE
<EnrichedNumberedList items={formations} />

// OU si vous voulez un style custom
<div>
  {formations.map((f, i) => (
    <div key={i}>
      <strong><SafeRender data={f} /></strong>
    </div>
  ))}
</div>
```

### Tags/Secteurs
```tsx
// ❌ ANCIEN CODE
{secteurs.map((s, i) => (
  <span key={i} className="tag">{s}</span> // ❌ Erreur si s est un objet
))}

// ✅ NOUVEAU CODE
<EnrichedTagList 
  items={secteurs}
  variant="colored"
  maxItems={6}
/>
```

### Rendu inline
```tsx
// ❌ ANCIEN CODE
<p>Compétences : {competences.join(', ')}</p> // ❌ Erreur si objets

// ✅ NOUVEAU CODE
<p>Compétences : <EnrichedInlineList items={competences} /></p>
```

## 🔧 Migration Par Étapes

### Étape 1 : Imports
```tsx
// Ajoutez ces imports en haut de vos fichiers
import { toLabel, getDisplayName } from '@/lib/utils';
import { SafeRender } from '@/components/SafeRender';
import { EnrichedBulletList, EnrichedNumberedList } from '@/components/EnrichedList';
```

### Étape 2 : Remplacement Simple
```tsx
// Remplacez tous les {item} par {toLabel(item)}
{formations.map((f, i) => <div key={i}>{toLabel(f)}</div>)}
```

### Étape 3 : Composants Sécurisés
```tsx
// Remplacez par des composants dédiés quand possible
<EnrichedBulletList items={formations} />
```

### Étape 4 : Error Boundaries
```tsx
// Wrappez les composants critiques
import { DataErrorBoundary } from '@/lib/error-boundary';

<DataErrorBoundary fallback={<div>Erreur d'affichage</div>}>
  <MonComposant />
</DataErrorBoundary>
```

## ⚡ Performance

### Optimisations
```tsx
// Utilisez React.memo pour les listes longues
const OptimizedList = React.memo(({ items }) => (
  <EnrichedBulletList items={items} />
));

// Limitez les items pour les grandes listes
<EnrichedBulletList 
  items={items} 
  maxItems={10} 
/>
```

## 🧪 Tests

### Testez vos Composants
```tsx
// Testez avec des données mixtes
const testData = [
  "Formation simple", // string
  { nom: "Formation enrichie", niveau: "Bac+3" }, // objet
  null, // null (doit être filtré)
  { nom: "" }, // objet vide (doit être filtré)
];

render(<EnrichedBulletList items={testData} />);
```

## 🚨 Points d'Attention

### 1. Données Mixtes
```tsx
// Vos données peuvent contenir mix de strings et objets
const competences = [
  "JavaScript", // ancien format
  { nom: "React", niveau: "avancé" }, // nouveau format enrichi
];

// ✅ Les nouveaux composants gèrent automatiquement
<EnrichedBulletList items={competences} />
```

### 2. Aptitudes Spéciales
```tsx
// Les aptitudes ont une structure particulière
interface Aptitude {
  nom: string;
  niveau: number; // 1-5
}

// Utilisez un rendu spécialisé
{fiche.aptitudes?.map((apt, i) => (
  <div key={i}>
    <SafeRender data={apt.nom} />
    <span>Niveau {apt.niveau}/5</span>
  </div>
))}
```

### 3. Noms Genrés
```tsx
// Pour les métiers avec noms genrés
const nomMetier = getDisplayName(metier, filterGenre);
// Utilise nom_feminin, nom_masculin, ou nom_epicene selon le genre
```

## 📊 Monitoring

### Debug en Développement
```tsx
// Les composants loggent automatiquement les erreurs
// Ouvrez la console pour voir les warnings sur données malformées
console.warn("SafeRender: Error rendering data", { data, error });
```

### Production
```tsx
// Ajoutez un service de monitoring d'erreurs
import { DataErrorBoundary } from '@/lib/error-boundary';

<DataErrorBoundary 
  onError={(error, errorInfo) => {
    // Envoyez à votre service de monitoring (Sentry, LogRocket, etc.)
    monitoringService.captureException(error, { extra: errorInfo });
  }}
>
  <VotreComposant />
</DataErrorBoundary>
```

## ✅ Checklist Migration

- [ ] Importer les nouveaux utilitaires
- [ ] Remplacer `{item}` par `{toLabel(item)}` partout
- [ ] Migrer les listes vers `EnrichedBulletList`/`EnrichedNumberedList`
- [ ] Ajouter Error Boundaries aux pages importantes
- [ ] Tester avec données mixtes (strings + objets)
- [ ] Vérifier la console pour les warnings
- [ ] Tester le rendu avec données null/undefined
- [ ] Vérifier le responsive design

## 🎉 Résultat Final

Après migration, votre application sera :
- ✅ **Robuste** : Plus de crashes sur données malformées
- ✅ **Flexible** : Gère both anciens et nouveaux formats
- ✅ **Maintenable** : Code partagé et réutilisable
- ✅ **Performante** : Optimisations pour grandes listes
- ✅ **Debuggable** : Logs d'erreurs informatifs

**Migration recommandée : progressive sur 1-2 sprints** 🚀