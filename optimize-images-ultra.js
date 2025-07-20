import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';

class ImageOptimizer {
  constructor() {
    this.outputFormats = ['webp', 'avif'];
    this.breakpoints = [320, 640, 768, 1024, 1366, 1920];
    this.quality = {
      webp: 85,
      avif: 70,
      jpeg: 85,
      png: 85
    };
  }

  async optimizeAllImages() {
    console.log('🖼️ Starting advanced image optimization...');
    
    const imageDir = 'src/assets/img';
    const outputDir = 'src/assets/img/optimized';
    
    try {
      await this.ensureDir(outputDir);
      const images = await this.findImages(imageDir);
      
      console.log(`Found ${images.length} images to optimize`);
      
      for (const imagePath of images) {
        // Skip déjà les fichiers dans optimized/
        if (imagePath.includes('/optimized/')) continue;
        
        await this.processImage(imagePath, outputDir);
      }
      
      // Générer le CSS pour les images responsives
      await this.generateResponsiveCSS(outputDir);
      
      console.log('✅ Image optimization complete!');
      
    } catch (error) {
      console.error('❌ Image optimization failed:', error);
    }
  }

  async processImage(inputPath, outputDir) {
    const filename = basename(inputPath, extname(inputPath));
    const relativePath = inputPath.replace('src/assets/img/', '');
    const relativeDir = dirname(relativePath);
    
    console.log(`Processing: ${filename}`);
    
    try {
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      
      // Créer les dossiers nécessaires
      const webpDir = join(outputDir, 'webp', relativeDir);
      const avifDir = join(outputDir, 'avif', relativeDir);
      const responsiveDir = join(outputDir, 'responsive', relativeDir);
      
      await Promise.all([
        this.ensureDir(webpDir),
        this.ensureDir(avifDir),
        this.ensureDir(responsiveDir)
      ]);

      // 1. Formats next-gen (WebP + AVIF)
      await Promise.all([
        // WebP avec compression optimisée
        image.clone()
          .webp({ 
            quality: this.quality.webp,
            effort: 6,
            smartSubsample: true
          })
          .toFile(join(webpDir, `${filename}.webp`)),
        
        // AVIF avec compression maximale
        image.clone()
          .avif({ 
            quality: this.quality.avif,
            effort: 9,
            chromaSubsampling: '4:2:0'
          })
          .toFile(join(avifDir, `${filename}.avif`))
      ]);

      // 2. Images responsives multi-tailles
      const responsivePromises = this.breakpoints
        .filter(width => width <= metadata.width) // Pas d'upscaling
        .map(async (width) => {
          const height = Math.round((metadata.height / metadata.width) * width);
          
          return Promise.all([
            // WebP responsive
            image.clone()
              .resize(width, height, { withoutEnlargement: true })
              .webp({ quality: this.quality.webp, effort: 6 })
              .toFile(join(responsiveDir, `${filename}-${width}w.webp`)),
            
            // AVIF responsive
            image.clone()
              .resize(width, height, { withoutEnlargement: true })
              .avif({ quality: this.quality.avif, effort: 9 })
              .toFile(join(responsiveDir, `${filename}-${width}w.avif`)),
            
            // Fallback JPEG optimisé
            image.clone()
              .resize(width, height, { withoutEnlargement: true })
              .jpeg({ 
                quality: this.quality.jpeg,
                progressive: true,
                mozjpeg: true
              })
              .toFile(join(responsiveDir, `${filename}-${width}w.jpg`))
          ]);
        });

      await Promise.all(responsivePromises);
      
      // 3. Versions ultra-compressées pour le lazy loading
      await this.createPlaceholders(image, filename, responsiveDir);
      
      console.log(`✅ ${filename} - Optimized in 3 formats + ${this.breakpoints.length} sizes`);
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error);
    }
  }

  async createPlaceholders(image, filename, outputDir) {
    // Placeholder ultra-petit (LQIP - Low Quality Image Placeholder)
    await image.clone()
      .resize(20, null, { withoutEnlargement: true })
      .blur(2)
      .webp({ quality: 20 })
      .toFile(join(outputDir, `${filename}-placeholder.webp`));
    
    // Version medium pour chargement progressif
    await image.clone()
      .resize(400, null, { withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(join(outputDir, `${filename}-medium.webp`));
  }

  async generateResponsiveCSS(outputDir) {
    console.log('🎨 Generating responsive image CSS...');
    
    const css = `
/* Images responsives optimisées */
.responsive-img {
  width: 100%;
  height: auto;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.responsive-img[data-loaded="false"] {
  opacity: 0;
}

.responsive-img[data-loaded="true"] {
  opacity: 1;
}

/* Container pour images avec aspect ratio */
.img-container {
  position: relative;
  overflow: hidden;
}

.img-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
              linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
              linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  z-index: -1;
}

/* Aspect ratios communs */
.aspect-16-9 { aspect-ratio: 16/9; }
.aspect-4-3 { aspect-ratio: 4/3; }
.aspect-1-1 { aspect-ratio: 1/1; }
.aspect-3-2 { aspect-ratio: 3/2; }

/* Lazy loading avec blur effect */
.img-lazy {
  filter: blur(20px);
  transition: filter 0.3s ease;
}

.img-lazy.loaded {
  filter: none;
}

/* Media queries pour les breakpoints */
@media (max-width: 320px) {
  .responsive-img { max-width: 320px; }
}

@media (max-width: 640px) {
  .responsive-img { max-width: 640px; }
}

@media (max-width: 768px) {
  .responsive-img { max-width: 768px; }
}

@media (max-width: 1024px) {
  .responsive-img { max-width: 1024px; }
}

@media (max-width: 1366px) {
  .responsive-img { max-width: 1366px; }
}

/* Performance optimizations */
.img-optimized {
  content-visibility: auto;
  contain-intrinsic-size: 200px 150px;
}

/* Picture element styling */
picture {
  display: block;
  line-height: 0;
}

picture img {
  width: 100%;
  height: auto;
}
`;

    await fs.writeFile(join(outputDir, 'responsive-images.css'), css);
    console.log('✅ CSS generated: responsive-images.css');
  }

  async findImages(dir) {
    const images = [];
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        images.push(...await this.findImages(fullPath));
      } else if (/\.(jpg|jpeg|png|gif)$/i.test(item.name)) {
        images.push(fullPath);
      }
    }

    return images;
  }

  async ensureDir(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

// Exécution
const optimizer = new ImageOptimizer();
optimizer.optimizeAllImages();
