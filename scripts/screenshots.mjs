// Full-page скріншоти через headless Chrome/Edge з емуляцією ширини (DevTools Protocol).
// Запуск: node scripts/serve.mjs  (в іншому вікні)  →  node scripts/screenshots.mjs [url] [префікс]
// Результат: screenshots/<префікс><ширина>.png
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const url = process.argv[2] || 'http://localhost:8080/';
const prefix = process.argv[3] || '';
const WIDTHS = (process.env.WIDTHS || '360,390,768,1440').split(',').map(Number);
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const bin = BROWSERS.find(b => fs.existsSync(b));
const OUT = path.join(ROOT, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 9333;
const profile = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'ebc-shot-'));
const chrome = spawn(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50 && !targets; i++) { await sleep(200); try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch {} }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
for (const w of WIDTHS) {
  const mobile = w < 768;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url });
  await sleep(1500);
  // прокручуємо сторінку, щоб підвантажились lazy-фото
  await send('Runtime.evaluate', { expression: `(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0)})()`, awaitPromise: true });
  await sleep(800);
  const r = await send('Runtime.evaluate', { expression: `JSON.stringify({h:document.documentElement.scrollHeight,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})`, returnByValue: true });
  const { h, sw, cw } = JSON.parse(r.result.result.value);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await sleep(2500);   // дочекатися анімацій появи (.rv), інакше нижні блоки виходять порожніми
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  const file = path.join(OUT, `${prefix}${w}.png`);
  fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  console.log(`${w}px → ${w}x${h}`, sw > cw ? `⚠ горизонтальний скрол: ${sw} > ${cw}` : 'без горизонтального скролу');
}
ws.close(); chrome.kill();
