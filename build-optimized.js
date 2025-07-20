import { execSync } from 'child_process';
import fs from 'fs/promises';

async function buildOptimized() {
  console.log('🚀 Build ultra-optimisé...');
  
  try {
    // 1. Nettoyage préalable
    console.log('🧹 Nettoyage...');
    execSync('node cleanup-assets.js', { stdio: 'inherit' });
    
    // 2. Optimisation CSS
    console.log('🎨 Optimisation CSS...');
    execSync('node optimize-css.js', { stdio: 'inherit' });
    
    // 3. Build Angular avec optimisations maximales
    console.log('⚡ Build Angular...');
    execSync('ng build --configuration production --optimization --named-chunks=false --source-map=false --stats-json', { stdio: 'inherit' });
    
    // 4. Analyse du bundle
    console.log('📊 Analyse du bundle...');
    try {
      execSync('npx webpack-bundle-analyzer dist/portfolio-v2/stats.json --mode static --report dist/bundle-report.html --open-browser false', { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️  Analyse du bundle optionnelle échouée');
    }
    
    // 5. Compression finale
    console.log('📦 Compression finale...');
    execSync('node compress-assets.js', { stdio: 'inherit' });
    
    console.log('🎉 Build optimisé terminé !');
    console.log('📁 Fichiers dans: dist/portfolio-v2/browser/');
    
  } catch (error) {
    console.error('❌ Erreur build:', error.message);
    process.exit(1);
  }
}

buildOptimized();
