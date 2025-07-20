import { execSync } from 'child_process';
import fs from 'fs/promises';

export default {
  // 🧹 Pré-déploiement : nettoyage
  async cleanup() {
    console.log('🧹 Nettoyage des assets...');
    
    try {
      // Supprimer les dossiers de duplication
      const duplicates = [
        'src/assets/img/optimized/avif/src',
        'src/assets/img/optimized/responsive/src',
        'src/assets/img/optimized/webp/src'
      ];
      
      for (const dir of duplicates) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
          console.log(`✅ Supprimé: ${dir}`);
        } catch (e) {
          console.log(`⚠️  Non trouvé: ${dir}`);
        }
      }
      
      // Garder seulement les tailles essentielles
      const keepSizes = ['480w', '768w', '1200w'];
      console.log(`📏 Conservation des tailles: ${keepSizes.join(', ')}`);
      
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  },

  // 🏗️ Build optimisé
  async build() {
    console.log('🏗️  Build de production...');
    
    try {
      execSync(`ng build --configuration production --optimization=true --build-optimizer=true --vendor-chunk=false --named-chunks=false --source-map=false --output-hashing=all --delete-output-path=true`, 
        { stdio: 'inherit' }
      );
      
      console.log('✅ Build terminé');
    } catch (error) {
      console.error('❌ Erreur build:', error);
      process.exit(1);
    }
  },

  // 📊 Analyse de taille
  async analyze() {
    console.log('📊 Analyse des bundles...');
    
    try {
      const stats = await fs.readFile('dist/portfolio-v2/browser/stats.json', 'utf8');
      const data = JSON.parse(stats);
      
      console.log(`📦 Taille totale: ${(data.assets.reduce((acc, asset) => acc + asset.size, 0) / 1024 / 1024).toFixed(2)} MB`);
      
      // Top 5 des plus gros fichiers
      const bigAssets = data.assets
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);
        
      console.log('🔝 Top 5 des plus gros assets:');
      bigAssets.forEach((asset, i) => {
        console.log(`${i+1}. ${asset.name}: ${(asset.size / 1024).toFixed(1)} KB`);
      });
      
    } catch (error) {
      console.log('⚠️  Analyse optionnelle échouée');
    }
  }
};
