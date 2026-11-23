// Завантажує Unbounded і Manrope з Google Fonts (кирилиця + латиниця) у assets/fonts/
// і генерує assets/fonts/fonts.css. Запуск: node scripts/fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets/fonts');
fs.mkdirSync(OUT, { recursive: true });
const url = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Manrope:wght@400..700&display=swap';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const css = await (await fetch(url, { headers: { 'User-Agent': ua } })).text();
const blocks = css.split('/* ').slice(1);
let outCss = '';
for (const b of blocks) {
  const subset = b.slice(0, b.indexOf(' */'));
  if (subset !== 'cyrillic' && subset !== 'latin') continue;
  const family = /font-family: '([^']+)'/.exec(b)[1];
  const src = /url\((https:[^)]+)\)/.exec(b)[1];
  const name = `${family.toLowerCase()}-${subset}.woff2`;
  if (!fs.existsSync(path.join(OUT, name))) fs.writeFileSync(path.join(OUT, name), Buffer.from(await (await fetch(src)).arrayBuffer()));
  outCss += '/* ' + b.replace(src, name).replace(/\n\s*$/, '') + '\n';
}
// Unbounded приходить двома блоками (700 і 800) з тим самим файлом — лишаємо як є, файл один.
fs.writeFileSync(path.join(OUT, 'fonts.css'), outCss);
console.log(fs.readdirSync(OUT));
