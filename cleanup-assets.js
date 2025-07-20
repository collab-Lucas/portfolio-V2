import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

async function cleanupAssets() {
  console.log('🧹 Nettoyage des assets redondants...');
  
  try {
    // Supprimer les dossiers de duplication
    const duplicatePaths = [
      'src/assets/img/optimized/avif/src/assets/img/avif',
      'src/assets/img/optimized/avif/src/assets/img/optimized',
      'src/assets/img/optimized/avif/src/assets/img/brands',
      'src/assets/img/optimized/responsive/src/assets/img/avif',
      'src/assets/img/optimized/responsive/src/assets/img/optimized',
      'src/assets/img/optimized/responsive/src/assets/img/brands',
      'src/assets/img/optimized/webp/src/assets/img'
    ];
    
    for (const duplicatePath of duplicatePaths) {
      try {
        await fs.rm(duplicatePath, { recursive: true, force: true });
        console.log(`✅ Supprimé: ${duplicatePath}`);
      } catch (error) {
        console.log(`⚠️  Dossier introuvable: ${duplicatePath}`);
      }
    }
    
    // Réorganiser les images optimisées
    const optimizedImages = await glob('src/assets/img/optimized/**/*.avif');
    const targetDir = 'src/assets/img/webp';
    
    await fs.mkdir(targetDir, { recursive: true });
    
    // Garder seulement les meilleures versions
    const keepPatterns = [
      '*-480w.avif',   // Mobile
      '*-768w.avif',   // Tablet
      '*-1200w.avif',  // Desktop
      '*-1920w.avif'   // HD
    ];
    
    for (const pattern of keepPatterns) {
      const files = await glob(`src/assets/img/optimized/**/${pattern}`);
      for (const file of files) {
        const filename = path.basename(file);
        const newPath = path.join(targetDir, filename);
        try {
          await fs.copyFile(file, newPath);
          console.log(`📁 Copié: ${filename}`);
        } catch (error) {
          console.log(`❌ Erreur copie: ${filename}`);
        }
      }
    }
    
    // Supprimer l'ancien dossier optimized
    await fs.rm('src/assets/img/optimized', { recursive: true, force: true });
    console.log('✅ Ancien dossier optimized supprimé');
    
    console.log('🎉 Nettoyage terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

cleanupAssets();
