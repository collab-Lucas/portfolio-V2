import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'production';

// 🛡️ Sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 📦 Compression avancée
app.use(compression({
  level: 9,
  threshold: 0,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 🚦 Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requêtes par IP
  message: 'Trop de requêtes, réessayez plus tard.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// 📁 Static files avec cache agressif
app.use('/assets', express.static(path.join(__dirname, 'dist/portfolio-v2/browser/assets'), {
  maxAge: '1y', // Cache 1 an pour les assets
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Cache différencié selon le type
    if (path.endsWith('.glb') || path.endsWith('.gltf')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 an
    }
    if (path.endsWith('.avif') || path.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    if (path.endsWith('.pdf')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 jour
    }
  }
}));

// 🗂️ Static build files
app.use(express.static(path.join(__dirname, 'dist/portfolio-v2/browser'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// 🤖 robots.txt optimisé
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /

# Sitemap
Sitemap: ${process.env.SITE_URL || 'https://votre-domaine.com'}/sitemap.xml

# Portfolio Lucas Bonneau`);
});

// 🗺️ Sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.SITE_URL || 'https://votre-domaine.com';
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}#about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}#skills</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}#contact</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>`);
});

// 🏠 SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/portfolio-v2/browser/index.html'));
});

// 🚨 Gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    message: 'Erreur interne du serveur',
    ...(NODE_ENV === 'development' && { error: err.message })
  });
});

// 🚀 Démarrage serveur
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Serving: ${path.join(__dirname, 'dist/portfolio-v2/browser')}`);
  console.log(`🔒 Environnement: ${NODE_ENV}`);
});

// 🛑 Arrêt propre
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt propre...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

export default app;
