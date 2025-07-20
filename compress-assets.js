import { gzip, brotliCompress, constants } from 'zlib';
import { promisify } from 'util';
import fs from 'fs/promises';
import { glob } from 'glob';

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

async function compressAssets() {
  console.log('📦 Compression des assets...');
  
  try {
    const files = await glob('dist/portfolio-v2/browser/**/*.{js,css,html,json}');
    
    for (const file of files) {
      const content = await fs.readFile(file);
      
      // Gzip compression
      const gzipped = await gzipAsync(content, { level: 9 });
      await fs.writeFile(`${file}.gz`, gzipped);
      
      // Brotli compression (meilleure que gzip)
      const brotlied = await brotliAsync(content, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11
        }
      });
      await fs.writeFile(`${file}.br`, brotlied);
      
      const originalSize = content.length;
      const gzipSize = gzipped.length;
      const brotliSize = brotlied.length;
      
      console.log(`📁 ${file}`);
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
      console.log(`   Gzip: ${(gzipSize / 1024).toFixed(1)}KB (-${Math.round((1 - gzipSize / originalSize) * 100)}%)`);
      console.log(`   Brotli: ${(brotliSize / 1024).toFixed(1)}KB (-${Math.round((1 - brotliSize / originalSize) * 100)}%)`);
    }
    
    console.log('🎉 Compression terminée !');
    
  } catch (error) {
    console.error('❌ Erreur compression:', error);
  }
}

compressAssets();