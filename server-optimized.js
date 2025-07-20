const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Compression Gzip/Brotli
app.use(compression({
  level: 9,
  threshold: 1000,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Headers de performance et sécurité
app.use((req, res, next) => {
  // Cache control optimisé par type de fichier
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
  
  // CSP optimisé pour Three.js
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'"
  ].join('; '));

  next();
});

// Preload headers pour les ressources critiques
app.get('/', (req, res, next) => {
  res.setHeader('Link', [
    '</main.js>; rel=modulepreload',
    '</styles.css>; rel=preload; as=style',
    '</assets/models/navbar_scene.glb>; rel=preload; as=fetch; crossorigin=anonymous'
  ].join(', '));
  next();
});

// Servir les fichiers statiques avec optimisations
app.use(express.static(path.join(__dirname, 'dist/portfolio-v2/browser'), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
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

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Portfolio optimisé sur http://localhost:${PORT}`);
  console.log('📊 Optimisations actives:');
  console.log('  ✅ Compression Gzip/Brotli');
  console.log('  ✅ Cache control avancé');
  console.log('  ✅ Headers de sécurité');
  console.log('  ✅ Preload des ressources critiques');
  console.log('  ✅ CSP optimisé pour Three.js');
});

module.exports = app;
