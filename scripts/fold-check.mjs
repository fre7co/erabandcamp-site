// Перевірка «першого екрана» на телефонах: що видно без прокрутки.
// Запуск (сервер має працювати): node scripts/fold-check.mjs [url]
// Результат: screenshots/fold-<ширина>x<висота>.png і таблиця позицій у консолі.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const url = process.argv[2] || 'http://localhost:8080/';
// видима висота з урахуванням панелей браузера (Safari / Instagram)
const DEVICES = [[360, 640, 'малий Android'], [375, 667, 'iPhone SE/8'], [390, 664, 'iPhone 14 в Safari'], [390, 720, 'iPhone 14 в Instagram'], [430, 760, 'iPhone Pro Max'], [768, 950, 'iPad']];
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const bin = BROWSERS.find(b => fs.existsSync(b));
const PORT = 9334;
const profile = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'ebc-fold-'));
const chrome = spawn(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50 && !targets; i++) { await sleep(200); try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch {} }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
fs.mkdirSync(path.join(ROOT, 'screenshots'), { recursive: true });
for (const [w, h, name] of DEVICES) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 768 });
  await send('Page.navigate', { url });
  await sleep(1800);
  const r = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
    const b = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; };
    const ph = document.querySelector('.ph-hero').getBoundingClientRect();
    return JSON.stringify({ bleed: [Math.round(ph.left), Math.round(innerWidth - ph.right)], photo: b('.ph-hero'), h1: b('.hero h1'), cta: b('.hero .btn-lg'), price: b('.price-tag') });
  })()` });
  const pos = JSON.parse(r.result.result.value);
  const ok = k => pos[k] && pos[k][1] <= h ? '✓' : '✗';
  console.log(`${name.padEnd(22)} ${w}x${h}  фото ${ok('photo')} ${pos.photo}  заголовок ${ok('h1')}  кнопка ${ok('cta')} ${pos.cta}відступи фото зліва/справа ${pos.bleed}`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'screenshots', `fold-${w}x${h}.png`), Buffer.from(shot.result.data, 'base64'));
}
ws.close(); chrome.kill();
