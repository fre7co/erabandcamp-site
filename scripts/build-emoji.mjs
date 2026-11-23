// Емодзі як картинки (однакові на iPhone, Android і Windows).
// Пишіть у HTML звичайні емодзі (🏔️, 🎄 …) і запускайте:  npm run emoji
// Скрипт замінить їх на <img class="e" …> і завантажить потрібні файли в assets/emoji/.
// Щоб змінити емодзі, яке вже стало картинкою, — змініть символ в alt="…" і знову запустіть скрипт.
//
// Набір: SET = 'apple' (за замовчуванням), 'google', 'twitter' (Twemoji, вільна ліцензія CC-BY 4.0) або 'facebook'.
// Увага: графіка Apple належить Apple Inc. і не має відкритої ліцензії для сайтів.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SET = process.env.EMOJI_SET || 'apple';
const VER = '16.0.0';
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets/emoji');
const PAGES = ['index.html', 'privacy/index.html'];
fs.mkdirSync(OUT, { recursive: true });

const data = await (await fetch(`https://cdn.jsdelivr.net/npm/emoji-datasource@${VER}/emoji.json`)).json();
const byChar = new Map();
const toChar = u => String.fromCodePoint(...u.split('-').map(h => parseInt(h, 16)));
for (const e of data) {
  const file = e.image.replace(/\.png$/, '');
  byChar.set(toChar(e.unified), file);
  if (e.non_qualified) byChar.set(toChar(e.non_qualified), file);
}
// лише «справжні» емодзі: кольорові за замовчуванням або з FE0F. Символи ©, ®, ™, ↗, ← тощо не чіпаємо.
// прапори (пара regional indicators) — першими, інакше кожна «літера» прапора ловиться окремо
const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}️)(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*/gu;
const isEmoji = ch => new RegExp(`^(?:${EMOJI_RE.source})$`, 'u').test(ch);
const needed = new Set();

function imgTag(ch, prefix) {
  const file = byChar.get(ch) || byChar.get(ch.replace(/️/g, ''));
  if (!file) { console.warn('⚠ немає картинки для', ch); return null; }
  needed.add(file);
  return `<img class="e" src="${prefix}assets/emoji/${file}.webp" alt="${ch}" width="64" height="64" loading="lazy" fetchpriority="low" decoding="async">`;
}

for (const page of PAGES) {
  const p = path.join(ROOT, page);
  if (!fs.existsSync(p)) continue;
  const prefix = page.includes('/') ? '../' : '';
  let html = fs.readFileSync(p, 'utf8');
  // 1) уже вставлені картинки: оновлюємо src за alt
  html = html.replace(/<img class="e" src="[^"]*" alt="([^"]+)"[^>]*>/g, (m, ch) => (isEmoji(ch) ? imgTag(ch, prefix) || m : ch));
  // 2) «живі» емодзі в тексті (поза тегами, <script>, <style>, коментарями)
  const parts = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>)/);
  html = parts.map(s => (s.startsWith('<') ? s : s.replace(EMOJI_RE, ch => imgTag(ch, prefix) || ch))).join('');
  fs.writeFileSync(p, html);
}

// завантажуємо 64px PNG і зберігаємо як WebP без втрат
for (const file of needed) {
  const out = path.join(OUT, file + '.webp');
  if (fs.existsSync(out) && !process.env.FORCE) continue;
  const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-${SET}@${VER}/img/${SET}/64/${file}.png`;
  const r = await fetch(url);
  if (!r.ok) { console.warn('⚠', r.status, url); continue; }
  await sharp(Buffer.from(await r.arrayBuffer())).webp({ lossless: true }).toFile(out);
}
// прибираємо файли, які більше не використовуються
for (const f of fs.readdirSync(OUT)) if (!needed.has(f.replace(/\.webp$/, ''))) fs.rmSync(path.join(OUT, f));
console.log(`✓ ${needed.size} емодзі (${SET}) → assets/emoji/`);
