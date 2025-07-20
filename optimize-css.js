import fs from 'fs/promises';
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';

async function optimizeCSS() {
  console.log('🎨 Optimisation CSS...');
  
  try {
    const cssFiles = [
      'src/styles.css',
      'src/app/components/navbar/navbar.component.css'
    ];
    
    for (const file of cssFiles) {
      try {
        const css = await fs.readFile(file, 'utf8');
        
        const result = await postcss([
          autoprefixer,
          cssnano({
            preset: ['default', {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              mergeLonghand: true,
              mergeRules: true
            }]
          })
        ]).process(css, { from: file });
        
        await fs.writeFile(file, result.css);
        console.log(`✅ Optimisé: ${file}`);
        
      } catch (error) {
        console.log(`⚠️  Fichier non trouvé: ${file}`);
      }
    }
    
    console.log('🎉 CSS optimisé !');
    
  } catch (error) {
    console.error('❌ Erreur CSS:', error);
  }
}

optimizeCSS();
