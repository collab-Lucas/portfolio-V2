import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env['PORT'] || 4201;

// Compression Brotli et Gzip
app.use(compression({
  level: 9, // Maximum compression
  threshold: 1000, // Compress files larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Headers de sécurité et performance
app.use((req, res, next) => {
  // Cache control optimisé
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }

  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP pour Three.js et performance
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval pour Three.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));

  // HTTP/2 Server Push hints
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Link', [
      '</main.js>; rel=preload; as=script',
      '</styles.css>; rel=preload; as=style',
      '</polyfills.js>; rel=preload; as=script'
    ].join(', '));
  }

  next();
});

// Support AVIF et WebP
app.use('/assets/img', (req, res, next) => {
  const acceptHeader = req.headers.accept || '';
  const originalUrl = req.url;
  
  // Check for AVIF support
  if (acceptHeader.includes('image/avif')) {
    const avifPath = path.join(__dirname, 'dist/portfolio-v2/assets/img/avif', originalUrl.replace(/\.[^.]+$/, '.avif'));
    if (require('fs').existsSync(avifPath)) {
      res.setHeader('Content-Type', 'image/avif');
      return res.sendFile(avifPath);
    }
  }
  
  // Check for WebP support
  if (acceptHeader.includes('image/webp')) {
    const webpPath = path.join(__dirname, 'dist/portfolio-v2/assets/img/webp', originalUrl.replace(/\.[^.]+$/, '.webp'));
    if (require('fs').existsSync(webpPath)) {
      res.setHeader('Content-Type', 'image/webp');
      return res.sendFile(webpPath);
    }
  }
  
  next();
});

// Servir les fichiers statiques avec optimisations
app.use(express.static(path.join(__dirname, 'dist/portfolio-v2'), {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  }
}));

// Preload critical resources
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'dist/portfolio-v2/index.html');
  
  // Add preload headers for critical resources
  res.setHeader('Link', [
    '</main.js>; rel=modulepreload',
    '</styles.css>; rel=preload; as=style',
    '</assets/fonts/font-awesome.min.css>; rel=preload; as=style',
    '</assets/models/navbar_scene.glb>; rel=preload; as=fetch; crossorigin=anonymous'
  ].join(', '));
  
  res.sendFile(indexPath);
});

// Route de fallback pour Angular
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/portfolio-v2/index.html'));
});

// Gestionnaire d'erreurs optimisé
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Portfolio server running on http://localhost:${PORT}`);
  console.log('📊 Optimizations enabled:');
  console.log('  ✅ Brotli/Gzip compression');
  console.log('  ✅ Advanced caching strategy');
  console.log('  ✅ Security headers');
  console.log('  ✅ AVIF/WebP support');
  console.log('  ✅ HTTP/2 Server Push');
  console.log('  ✅ Resource preloading');
});

export default app;
