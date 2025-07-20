import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Compression middleware avec Brotli et Gzip
app.use(compression({
  level: 9, // Maximum compression
  threshold: 0, // Compress everything
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Middleware pour servir les fichiers précompressés
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const originalUrl = req.url;
  
  // Ignorer les requêtes déjà traitées
  if (originalUrl.endsWith('.br') || originalUrl.endsWith('.gz')) {
    return next();
  }

  const filePath = path.join(__dirname, 'dist/portfolio-v2/browser', originalUrl);
  
  // Vérifier Brotli en premier (meilleure compression)
  if (acceptEncoding.includes('br')) {
    const brotliPath = filePath + '.br';
    if (existsSync(brotliPath)) {
      req.url = originalUrl + '.br';
      res.setHeader('Content-Encoding', 'br');
      res.setHeader('Content-Type', getContentType(originalUrl));
      res.setHeader('Vary', 'Accept-Encoding');
    }
  }
  // Sinon Gzip
  else if (acceptEncoding.includes('gzip')) {
    const gzipPath = filePath + '.gz';
    if (existsSync(gzipPath)) {
      req.url = originalUrl + '.gz';
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', getContentType(originalUrl));
      res.setHeader('Vary', 'Accept-Encoding');
    }
  }
  
  next();
});

// Headers de cache optimisés
app.use((req, res, next) => {
  const url = req.url;
  
  // Cache statique très long pour les assets avec hash
  if (url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  }
  // Cache court pour HTML
  else if (url.match(/\.html$/) || url === '/' || url === '') {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
  }
  // Cache moyen pour autres fichiers
  else {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }

  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP pour Three.js
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));

  next();
});

// Preload headers pour les ressources critiques
app.get(['/', '/index.html'], (req, res, next) => {
  res.setHeader('Link', [
    '</main-*.js>; rel=modulepreload; as=script',
    '</styles-*.css>; rel=preload; as=style',
    '</polyfills-*.js>; rel=modulepreload; as=script'
  ].join(', '));
  next();
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'dist/portfolio-v2/browser'), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  }
}));

// Fallback SPA pour Angular
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/portfolio-v2/browser/index.html'));
});

// Gestionnaire d'erreurs
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  return types[ext] || 'application/octet-stream';
}

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Portfolio server with advanced compression on http://localhost:${PORT}`);
  console.log('📊 Optimizations active:');
  console.log('  ✅ Brotli + Gzip compression');
  console.log('  ✅ Precompressed file serving');
  console.log('  ✅ Advanced caching strategy');
  console.log('  ✅ Security headers');
  console.log('  ✅ Resource preloading');
});

export default app;
