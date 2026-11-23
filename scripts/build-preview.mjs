// Збирає тимчасову копію сайту для Cloudflare (preview) у .preview/
// Відмінності від продакшну: noindex (X-Robots-Tag + robots.txt), щоб preview не потрапив у Google.
// Запуск: node scripts/build-preview.mjs  →  npx wrangler deploy -c deploy/cloudflare/wrangler.toml
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.preview');
fs.rmSync(OUT, { recursive: true, force: true });
const skip = new Set(['assets/photos-raw', 'assets/reviews-raw', 'assets/brand', 'assets/img/manifest.json']);
function copy(rel) {
  const src = path.join(ROOT, rel);
  if (skip.has(rel.replace(/\\/g, '/'))) return;
  if (fs.statSync(src).isDirectory()) { for (const f of fs.readdirSync(src)) copy(path.join(rel, f)); return; }
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.copyFileSync(src, path.join(OUT, rel));
}
['index.html', 'favicon.ico', 'privacy', 'assets'].forEach(copy);
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(OUT, '_headers'), [
  '/*',
  '  X-Robots-Tag: noindex, nofollow',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Cache-Control: no-cache',
  '/assets/*',
  '  Cache-Control: public, max-age=86400',
  '',
].join('\n'));
fs.writeFileSync(path.join(OUT, '_redirects'), '/privacy-policy /privacy/ 301\n/privacy-policy/ /privacy/ 301\n');
console.log('preview →', OUT);
