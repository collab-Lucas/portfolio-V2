import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import imageminAvif from 'imagemin-avif';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeImages() {
  console.log('🖼️ Starting advanced image optimization...');

  const inputDir = 'src/assets/img/**/*.{jpg,jpeg,png,gif}';
  const outputDir = 'src/assets/img/optimized';

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate WebP versions
    console.log('🔄 Generating WebP images...');
    await imagemin([inputDir], {
      destination: outputDir,
      plugins: [
        imageminWebp({
          quality: 85,
          method: 6, // Best compression
          preset: 'photo'
        })
      ]
    });

    // Generate AVIF versions (next-gen format)
    console.log('🔄 Generating AVIF images...');
    await imagemin([inputDir], {
      destination: outputDir,
      plugins: [
        imageminAvif({
          quality: 80,
          effort: 9 // Maximum effort for best compression
        })
      ]
    });

    // Optimize original JPEG files
    console.log('🔄 Optimizing JPEG images...');
    await imagemin(['src/assets/img/**/*.{jpg,jpeg}'], {
      destination: outputDir,
      plugins: [
        imageminMozjpeg({
          quality: 85,
          progressive: true
        })
      ]
    });

    // Optimize original PNG files
    console.log('🔄 Optimizing PNG images...');
    await imagemin(['src/assets/img/**/*.png'], {
      destination: outputDir,
      plugins: [
        imageminPngquant({
          quality: [0.7, 0.9],
          strip: true
        })
      ]
    });

    // Generate responsive images
    await generateResponsiveImages();

    console.log('✅ Image optimization completed!');
    console.log('📊 Optimization results:');
    
    // Calculate savings
    const originalSize = await getFolderSize('src/assets/img');
    const optimizedSize = await getFolderSize(outputDir);
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Optimized size: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Savings: ${savings}%`);

  } catch (error) {
    console.error('❌ Image optimization failed:', error);
  }
}

async function generateResponsiveImages() {
  console.log('🔄 Generating responsive image sizes...');
  
  try {
    const sharp = await import('sharp');
    const glob = await import('glob');
    
    const images = glob.sync('src/assets/img/**/*.{jpg,jpeg,png}');
    const sizes = [480, 768, 1024, 1200, 1920];
    
    for (const imagePath of images) {
      const filename = path.basename(imagePath, path.extname(imagePath));
      const outputDir = 'src/assets/img/responsive';
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      for (const size of sizes) {
        try {
          await sharp.default(imagePath)
            .resize(size, null, {
              withoutEnlargement: true,
              fit: 'inside'
            })
            .jpeg({ quality: 85, progressive: true })
            .toFile(path.join(outputDir, `${filename}-${size}w.jpg`));
            
          await sharp.default(imagePath)
            .resize(size, null, {
              withoutEnlargement: true,
              fit: 'inside'
            })
            .webp({ quality: 85 })
            .toFile(path.join(outputDir, `${filename}-${size}w.webp`));
        } catch (error) {
          console.warn(`Warning: Could not process ${imagePath} at size ${size}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.warn('Sharp not available, skipping responsive image generation:', error.message);
  }
}

async function getFolderSize(folderPath) {
  let totalSize = 0;
  
  function calculateSize(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        calculateSize(filePath);
      } else {
        totalSize += stats.size;
      }
    });
  }
  
  if (fs.existsSync(folderPath)) {
    calculateSize(folderPath);
  }
  
  return totalSize;
}

// Auto-generation de formats modernes pour toutes les images
async function autoConvertToModernFormats() {
  console.log('🔄 Auto-converting all images to modern formats...');
  
  const inputImages = [
    'src/assets/img/**/*.jpg',
    'src/assets/img/**/*.jpeg', 
    'src/assets/img/**/*.png'
  ];

  // WebP conversion avec options optimisées
  await imagemin(inputImages, {
    destination: 'src/assets/img/webp',
    plugins: [
      imageminWebp({
        quality: 85,
        method: 6,
        preset: 'photo',
        nearLossless: false,
        smartSubsample: true
      })
    ]
  });

  // AVIF conversion pour les navigateurs de pointe
  await imagemin(inputImages, {
    destination: 'src/assets/img/avif',
    plugins: [
      imageminAvif({
        quality: 80,
        effort: 9,
        chromaDeltaQ: -1,
        sharpness: 2
      })
    ]
  });

  console.log('✅ Modern format conversion completed!');
}

// Run optimization
console.log('🚀 Starting image optimization script...');
optimizeImages().then(() => {
  return autoConvertToModernFormats();
}).then(() => {
  console.log('🎉 All image optimizations completed!');
}).catch(error => {
  console.error('❌ Optimization failed:', error);
});

export { optimizeImages, autoConvertToModernFormats };
