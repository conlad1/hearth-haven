import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const outputPath = path.join(publicDir, 'sitemap.xml');

const baseUrl = 'https://the-hearth-project.org';
const today = new Date().toISOString().split('T')[0];

const routes = [
  '/',
  '/impact',
  '/login',
  '/register',
  '/cases',
  '/donate',
  '/donors',
  '/outreach',
  '/privacy',
  '/terms',
  '/teapot',
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes
    .map((route) => `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${route === '/' ? '1.0' : '0.7'}</priority>\n  </url>`)
    .join('\n') +
  `\n</urlset>\n`;

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, xml, 'utf8');
console.log(`Sitemap generated: ${outputPath}`);
