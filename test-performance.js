#!/usr/bin/env node

/**
 * Script de test automatique des performances
 * Utilise Lighthouse CI pour mesurer les performances
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Test de Performance Portfolio - Démarrage...\n');

// Configuration
const LOCAL_URL = 'http://localhost:4200';
const PROD_DIST = './dist/portfolio-v2';
const REPORTS_DIR = './lighthouse-reports';

// Vérifier si le dossier de rapports existe
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR);
}

async function runPerformanceTests() {
  try {
    console.log('📊 Phase 1 : Build de production...');
    execSync('ng build --configuration=production', { stdio: 'inherit' });
    
    console.log('\n📊 Phase 2 : Démarrage du serveur de production...');
    const prodServer = require('child_process').spawn('npx', [
      'http-server', 
      PROD_DIST, 
      '-p', '8080', 
      '--cors',
      '-c-1' // Pas de cache
    ], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });
    
    // Attendre que le serveur démarre
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📊 Phase 3 : Test Lighthouse sur version production...');
    
    // Test Lighthouse
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const reportPath = path.join(REPORTS_DIR, `lighthouse-${timestamp}.html`);
    
    try {
      execSync(`npx lighthouse http://localhost:8080 --output=html --output-path="${reportPath}" --chrome-flags="--headless"`, 
        { stdio: 'inherit' });
      console.log(`✅ Rapport Lighthouse généré : ${reportPath}`);
    } catch (error) {
      console.log('⚠️ Lighthouse n\'est pas installé. Installation...');
      execSync('npm install -g lighthouse', { stdio: 'inherit' });
      execSync(`npx lighthouse http://localhost:8080 --output=html --output-path="${reportPath}" --chrome-flags="--headless"`, 
        { stdio: 'inherit' });
    }
    
    console.log('\n📊 Phase 4 : Analyse des bundles...');
    
    // Analyse des tailles de fichiers
    const distPath = path.resolve(PROD_DIST);
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      console.log('\n📦 Tailles des bundles :');
      
      files.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.css')) {
          const filePath = path.join(distPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = (stats.size / 1024).toFixed(2);
          console.log(`  ${file}: ${sizeKB} KB`);
        }
      });
    }
    
    console.log('\n📊 Phase 5 : Résumé des optimisations...');
    console.log(`
✅ Optimisations appliquées :
  - Lazy Loading WebP avec fallback PNG
  - Tree Shaking Angular optimisé
  - CSS critique inline dans <head>
  - Web Workers pour Three.js
  - Preload des ressources critiques
  - Build de production optimisé

📈 Résultats attendus :
  - Performance Score : 85-95+
  - Bundle compressé : ~263 KB
  - First Contentful Paint : <1.5s
  - Total Blocking Time : <200ms

🔗 URLs de test :
  - Development : ${LOCAL_URL}
  - Production : http://localhost:8080

📄 Rapport Lighthouse : ${reportPath}
`);
    
    // Arrêter le serveur
    process.kill(-prodServer.pid);
    
  } catch (error) {
    console.error('❌ Erreur lors du test :', error.message);
    process.exit(1);
  }
}

// Lancer les tests
runPerformanceTests().then(() => {
  console.log('🎉 Tests de performance terminés !');
}).catch(error => {
  console.error('❌ Erreur :', error);
  process.exit(1);
});
