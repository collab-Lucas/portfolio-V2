import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_DIR = join(__dirname, 'dist/portfolio-v2/browser');

const app = express();
app.use(compression());

// Serve robots.txt as plain text from public directory
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(join(__dirname, 'public', 'robots.txt'));
});

app.use(express.static(DIST_DIR));
app.get('*', (req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'));
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Serveur ultra-optimisé sur http://localhost:${PORT}`);
});