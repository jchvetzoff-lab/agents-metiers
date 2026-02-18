#!/usr/bin/env node
/**
 * Script de vérification pour la migration des données enrichies
 * Usage: node scripts/check-enriched-data.js
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const ISSUES = [];

console.log('🔍 Vérification de la migration des données enrichies...\n');

/**
 * Cherche les patterns problématiques dans un fichier
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(FRONTEND_DIR, filePath);
  
  // Pattern 1: Rendu direct d'objets potentiels
  const directRenderPattern = /\{[^}]*\.(map|filter)\([^)]*\)\s*\.\s*map\([^}]*\s*=>\s*[^}]*\{[^}]*item[^}]*\}[^}]*\)/g;
  let match;
  
  while ((match = directRenderPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    ISSUES.push({
      file: relativePath,
      line: lineNum,
      type: 'POTENTIAL_OBJECT_RENDER',
      code: match[0].trim(),
      severity: 'HIGH',
      description: 'Rendu direct potentiel d\'un objet - vérifiez si toLabel() est nécessaire'
    });
  }
  
  // Pattern 2: Utilisation de {item} sans toLabel
  const itemRenderPattern = /\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}/g;
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.includes('.map(') && itemRenderPattern.test(line)) {
      // Vérifier si toLabel est utilisé dans cette ligne
      if (!line.includes('toLabel(') && !line.includes('SafeRender')) {
        // Exclure les cas évidents (numbers, booleans, etc.)
        if (!line.match(/\{\s*(i|index|idx|length|count|total|id|key)\s*\}/)) {
          ISSUES.push({
            file: relativePath,
            line: index + 1,
            type: 'MISSING_TO_LABEL',
            code: line.trim(),
            severity: 'MEDIUM',
            description: 'Possible rendu direct de données - considérez toLabel() ou SafeRender'
          });
        }
      }
    }
  });
  
  // Pattern 3: Fonction toLabel locale (dupliquée)
  if (content.includes('function toLabel(') && !filePath.includes('utils.ts')) {
    const lineNum = content.indexOf('function toLabel(');
    const lineNumber = content.substring(0, lineNum).split('\n').length;
    
    ISSUES.push({
      file: relativePath,
      line: lineNumber,
      type: 'DUPLICATE_TO_LABEL',
      code: 'function toLabel(',
      severity: 'LOW',
      description: 'Fonction toLabel dupliquée - utilisez l\'import depuis @/lib/utils'
    });
  }
  
  // Pattern 4: Types potentiellement incorrects
  if (content.includes(': string[]') && 
      (content.includes('competences') || content.includes('formations') || content.includes('certifications'))) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes(': string[]') && 
          (line.includes('competences') || line.includes('formations') || line.includes('certifications'))) {
        ISSUES.push({
          file: relativePath,
          line: index + 1,
          type: 'INCORRECT_TYPE',
          code: line.trim(),
          severity: 'LOW',
          description: 'Type possiblement incorrect - considérez EnrichedCompetence[] ou similar'
        });
      }
    });
  }
}

/**
 * Parcourt récursivement les fichiers
 */
function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorer node_modules, .next, etc.
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
        walkDirectory(filePath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      // Ignorer les fichiers de test et de configuration
      if (!file.includes('.test.') && !file.includes('.spec.') && !file.includes('.config.')) {
        checkFile(filePath);
      }
    }
  });
}

// Démarrer la vérification
try {
  walkDirectory(FRONTEND_DIR);
  
  // Afficher les résultats
  console.log(`📊 Résultats de l'audit:\n`);
  
  if (ISSUES.length === 0) {
    console.log('✅ Aucun problème détecté ! Migration réussie.\n');
  } else {
    const grouped = ISSUES.reduce((acc, issue) => {
      acc[issue.severity] = acc[issue.severity] || [];
      acc[issue.severity].push(issue);
      return acc;
    }, {});
    
    ['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      if (grouped[severity]) {
        const icon = severity === 'HIGH' ? '🚨' : severity === 'MEDIUM' ? '⚠️' : '💡';
        console.log(`${icon} ${severity} (${grouped[severity].length} problèmes)\n`);
        
        grouped[severity].forEach(issue => {
          console.log(`  📁 ${issue.file}:${issue.line}`);
          console.log(`  📝 ${issue.description}`);
          console.log(`  📄 ${issue.code}`);
          console.log('');
        });
      }
    });
    
    console.log(`\n📈 Résumé:`);
    console.log(`   - ${grouped.HIGH?.length || 0} problèmes critiques`);
    console.log(`   - ${grouped.MEDIUM?.length || 0} problèmes moyens`);
    console.log(`   - ${grouped.LOW?.length || 0} améliorations suggérées`);
    
    if (grouped.HIGH?.length > 0) {
      console.log(`\n⚠️  Action requise: Corrigez les problèmes critiques avant déploiement.`);
      process.exit(1);
    } else {
      console.log(`\n✅ Pas de problèmes critiques. Migration réussie !`);
    }
  }
  
} catch (error) {
  console.error('❌ Erreur lors de la vérification:', error.message);
  process.exit(1);
}

console.log(`\n🚀 Pour plus d'informations, consultez:`);
console.log(`   - AUDIT_FIXES_SUMMARY.md`);
console.log(`   - MIGRATION_GUIDE.md`);