import { promises as fs } from 'fs';
import { join, extname } from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

async function compressAssets() {
  const distPath = 'dist/portfolio-v2/browser';
  
  console.log('🗜️ Starting asset compression...');
  
  try {
    // Vérifier que le dossier dist existe
    await fs.access(distPath);
    
    const files = await getAllFiles(distPath);
    const compressibleFiles = files.filter(file => 
      ['.js', '.css', '.html', '.json', '.svg'].includes(extname(file))
    );

    console.log(`Found ${compressibleFiles.length} files to compress`);

    let processed = 0;
    for (const file of compressibleFiles) {
      await Promise.all([
        compressFile(file, 'gzip'),
        compressFile(file, 'brotli')
      ]);
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${compressibleFiles.length} files`);
      }
    }

    console.log('✅ Asset compression complete!');
    
    // Calculer les économies totales
    await calculateSavings(compressibleFiles);
    
  } catch (error) {
    console.error('❌ Compression failed:', error.message);
    process.exit(1);
  }
}

async function getAllFiles(dir) {
  const files = [];
  
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...await getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return files;
}

async function compressFile(filePath, algorithm) {
  try {
    const content = await fs.readFile(filePath);
    const extension = algorithm === 'gzip' ? '.gz' : '.br';
    
    let compressed;
    if (algorithm === 'gzip') {
      compressed = await gzip(content, { level: 9 });
    } else {
      compressed = await brotliCompress(content, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length
        }
      });
    }

    await fs.writeFile(filePath + extension, compressed);
    
    const originalSize = content.length;
    const compressedSize = compressed.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`${algorithm.toUpperCase()}: ${filePath.split(/[/\\]/).pop()} - ${savings}% saved`);
  } catch (error) {
    console.error(`Error compressing ${filePath}:`, error.message);
  }
}

async function calculateSavings(files) {
  let originalTotal = 0;
  let compressedTotal = 0;

  for (const file of files) {
    try {
      const original = await fs.readFile(file);
      const compressed = await fs.readFile(file + '.br');
      
      originalTotal += original.length;
      compressedTotal += compressed.length;
    } catch (error) {
      // Ignorer les erreurs de fichiers manquants
    }
  }

  const totalSavings = ((originalTotal - compressedTotal) / originalTotal * 100).toFixed(1);
  
  console.log('\n📊 Compression Summary:');
  console.log(`Original size: ${(originalTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Compressed size: ${(compressedTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total savings: ${totalSavings}%`);
}

compressAssets();
