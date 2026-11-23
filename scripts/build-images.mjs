// Готує зображення для сайту: WebP 800 і 1600 px, og.jpg, світлий логотип, favicon.
// Запуск:  npm install  →  npm run images
// Щоб замінити фото: покладіть файл у assets/photos-raw/ і змініть "src" у PHOTOS нижче.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'assets/photos-raw');
const OUT = path.join(ROOT, 'assets/img');
const BRAND = path.join(ROOT, 'assets/brand');
fs.mkdirSync(OUT, { recursive: true });

// slot: файл у photos-raw; ratio — пропорції обрізки (ширина/висота);
// position — що лишати в кадрі ('centre', 'north', 'south'...);
// focusY — для вертикальних фото: де центр кадру по висоті (0 = верх, 1 = низ)
// tall — ще й вертикальна версія 4:5 (<слот>-tall-800.webp) для карток-сторіз на телефоні; tallY — її центр по висоті
// focusX / tallX — те саме по горизонталі для широких фото (0 = лівий край, 1 = правий)
// art — «розумна» обрізка для карток із текстом поверх фото: box = [x0, y0, x1, y1] — головне в кадрі (частки від 0 до 1),
//   F — у яку верхню частку кадру воно має вміститися (нижче йде текст картки). Якщо фото не вистачає, край
//   добудовується розмитим продовженням (воно потрапляє під темний градієнт). Вихід: <слот>-800/1600.webp, 4:3.
// sq — квадратна версія для телефона (<слот>-sq-800.webp): фото зверху картки, текст під ним; box — що тримати в кадрі.
// Без ratio і обрізки — фото як є (вертикальне), лише зменшене до 800 px і до своєї ширини.
// m — кадр для телефона (<слот>-m-800.webp): [x0, y0, x1, y1] частки фото, ширина 800 px, пропорції як у кадру.
const PHOTOS = {
  // перший екран (13.11.2026, фото від клієнта): уся група на схилі під синім небом; вертикальне 1178×1550 —
  // кадр 4:3 від неба над головами до снігу під дівчиною, що лежить попереду (група — у нижніх 2/3 кадру)
  // og — кадр 1200×630 для прев'ю в месенджерах: [x0, y0, x1, y1] частки фото
  'hero-slope': { src: 'hero-group-slope.jpg', ratio: 4 / 3, focusY: 0.53, q: 70, og: [0, 0.39, 1, 0.79] },
  // попереднє фото першого екрана: { src: 'christmas-market-group.jpg', ratio: 4 / 3, brighten: 1.08, q: 60, denoise: true }
  // фото від клієнта (13.11.2026, скрін сторіз): двоє тримають сноуборд, третій у кріпленнях стоїть на голові.
  // Вертикальне, а картка 4:3 — кадр від дошки до черевиків, по боках добудовано розмитий сніг/небо (як у p-tubing).
  // Той самий 4:3 кадр і для телефона (у картці на телефоні фото теж 4:3)
  'p-snowx': { src: 'snowboard-handstand.webp', ratio: 4 / 3, art: { box: [0, 0.222, 1, 0.753], F: 1, T: 0, padX: 0, extend: 'both', feather: 0.08 } },
  // Карусель «Кімнати шале» (#rooms): кадри з відео клієнта (13.11.2026, вертикальні 1080×1920 → 3:4)
  'r-table':    { src: 'chalet-room-table.jpg',     ratio: 3 / 4, focusY: 0.55, widths: [600] },
  'r-attic':    { src: 'chalet-room-attic.jpg',     ratio: 3 / 4, focusY: 0.5,  widths: [600] },
  'r-two':      { src: 'chalet-room-two.jpg',       ratio: 3 / 4, focusY: 0.55, widths: [600] },
  'r-window':   { src: 'chalet-room-window.jpg',    ratio: 3 / 4, focusY: 0.55, widths: [600] },
  'r-group':    { src: 'chalet-room-group.jpg',     ratio: 3 / 4, focusY: 0.55, widths: [600] },
  'r-bath':     { src: 'chalet-bathroom.jpg',       ratio: 3 / 4, focusY: 0.55, widths: [600] },
  'r-foosball': { src: 'chalet-games-foosball.jpg', ratio: 3 / 4, focusY: 0.55, widths: [600] },
  'r-pingpong': { src: 'chalet-games-pingpong.jpg', ratio: 3 / 4, focusY: 0.45, widths: [600] },
  // 13.11.2026, фото від клієнта. Картки програми на компʼютері квадратні — для них файли *-sq-800 (квадрат),
  // на телефоні (фото 4:3 над текстом) — *-800
  'p-board':   { src: 'snowboard-handstand-hq.webp', ratio: 4 / 3, art: { box: [0, 0.02, 1, 0.92], F: 1, T: 0, padX: 0, extend: 'both', feather: 0.08 }, sq: [0, 0, 1, 1] },   // «4000+ м»: дошка над головами, третій стоїть на голові
  'p-toblerone': { src: 'toblerone-matterhorn.webp', ratio: 4 / 3, focusY: 0.554, sq: [0, 0.6, 1, 0.73] },   // «4000+ м» (13.11.2026, від клієнта): Toblerone на тлі Матергорна; плитка у верхній третині квадрата, над текстом картки
  'p-hood':    { src: 'hoodie-back-mountains.webp', ratio: 4 / 3, focusY: 0.45 },   // худі ERA BAND CAMP зі спини на тлі гір (телефон, 4:3)
  'p-hood-sq': { src: 'hoodie-back-mountains.webp', region: [0.11, 0.2, 0.89, 0.98], widths: [800] },   // компʼютер: квадрат ближче, напис угорі над текстом картки
  'p-gva-jet':  { src: 'geneva-jet-deau-aerial.webp', ratio: 4 / 3, focusY: 0.5, sq: [0, 0, 1, 1] },   // Женева згори: фонтан Jet d'Eau, пароплав
  'mentor-ski': { src: 'mentors-girls-slope.webp' },   // блок «Для батьків», друге фото: команда з дівчатами на схилі (квадрат; на компʼютері CSS тримає обличчя)
  'f-lunch2':   { src: 'food-lunch-chicken-borscht.webp', ratio: 1, focusY: 0.5, widths: [640] },   // курка з картоплею і борщ
  'f-breakfast2': { src: 'food-breakfast-croissant.webp', ratio: 1, focusY: 0.5, widths: [640] },   // омлет, круасан, овочі
  'p-choco-bar': { src: 'chocolate-bar-boy.webp', ratio: 4 / 3, focusY: 0.375, sq: [0, 0, 1, 1] },   // фото від клієнта (13.11.2026): хлопець «кусає» велетенську плитку шоколаду; кадр від верху, обличчя над текстом
  'p-xmas-party': { src: 'christmas-party-glasses.webp', ratio: 4 / 3, focusY: 0.58, sq: [0, 0, 1, 1] },   // фото від клієнта (13.11.2026): три дівчини в різдвяних окулярах і шапках
  'p-xmas-mtn': { src: 'christmas-mountains-friends-snow.jpg', ratio: 4 / 3, art: { box: [0.15, 0.12, 0.85, 0.6], F: 0.55 }, sq: [0.1, 0, 0.95, 0.85] },   // Unsplash, Vishy — друзі сміються в снігу, позаду гори
  'p-pool':  { src: 'pool-underwater-girls.webp', ratio: 4 / 3, focusY: 0.561, sq: [0, 0.42, 1, 0.61] },   // фото від клієнта (13.11.2026, скрін галереї): дві дівчини під водою показують «peace»; обличчя у верхній половині, нижче — текст
  'p-gva-market': { src: 'geneva-christmas-market.jpg', ratio: 4 / 3, focusX: 0.5, sq: [0.25, 0.1, 0.8, 0.9] },   // Unsplash, Meizhi Lang — різдвяний ярмарок у Женеві
  evening:   { src: 'evening-red-hoodies.jpg',  ratio: 4 / 3,  focusY: 0.42, tall: true, tallY: 0.48 },
  chalet:    { src: 'chalet-annabelle-winter.webp', ratio: 4 / 3, position: 'centre' },
  'p-lindt-tickets': { src: 'lindt-tickets-fountain.webp', ratio: 4 / 3, focusY: 0.60, sq: [0, 0.08, 1, 0.85] },   // фото від клієнта: квитки Lindt Home of Chocolate на тлі шоколадного фонтану
  'p-tubing': { src: 'snow-tubing-friends.webp', ratio: 4 / 3, art: { box: [0.05, 0.15, 0.95, 0.68], F: 0.55, extend: 'both' }, sq: [0.03, 0.3, 0.97, 0.98] },   // фото від клієнта: друзі на тюбінгах; праворуч добудовано сніг
  'p-hoodie': { src: 'hoodie-teens-pink-grey.webp', region: [0.11, 0, 0.9, 0.62] },   // фото худі від клієнта: рожеве й сіре; кадр від шапок до низу худі (без джинсів)
  'p-hoodie-sq': { src: 'hoodie-teens-pink-grey.webp', region: [0.05, 0, 0.95, 0.72], widths: [800] },   // картка худі в програмі: квадрат від шапок до джинсів
  'p-disco': { src: 'disco-glow-party.jpg',     ratio: 4 / 3,  art: { box: [0.1, 0.34, 0.98, 0.72], F: 0.5, padX: 0 }, sq: [0.25, 0.3, 0.95, 0.8] },   // Unsplash, Fernando José
  mentor1:   { src: 'mentor-slope-selfie.jpg',  ratio: 4 / 3,  position: 'centre' },
  mentor2:   { src: 'mentor-hug.jpg',           ratio: 4 / 3,  focusY: 0.36 },
  team:      { src: 'team-real.jpg',            ratio: 4 / 3,  focusY: 0.55 },   // фото команди від клієнта (HEIC → JPG)
  // Блок «Харчування» (#food): фото від клієнта (13.11.2026, скріни сторіз попередніх змін; вирізано без шапки й наліпок).
  // Головне — вертикальне (висока плитка), решта — квадрати; widths — свої розміри (плитки невеликі, 1600 не потрібно)
  'f-balcony': { src: 'food-balcony-breakfast.webp', widths: [640, 920] },   // сніданок на балконі з видом на Альпи
  'f-salmon':  { src: 'food-salmon-dinner.webp',     ratio: 1, focusX: 0.45, widths: [640] },
  'f-finland': { src: 'food-finland-breakfast.webp', ratio: 1, focusY: 0.36, widths: [640] },   // лосось, тости з авокадо, вівсянка
  'f-cake':    { src: 'food-cocoa-cake.webp',        ratio: 1, focusX: 0.55, widths: [640] },
  'f-fruit':   { src: 'food-passion-mango.webp',     ratio: 1, focusX: 0.36, widths: [640] },   // манго ліворуч + маракуя
  'f-lunch':   { src: 'food-lunch-salad-soup.webp',  ratio: 1, focusY: 0.42, widths: [640] },   // салат, супи, курка
  'f-orange':  { src: 'food-orange-cake.webp',       ratio: 1, focusX: 0.55, widths: [640] },
};
// вирізає з фото кадр потрібних пропорцій: по вертикалі — за fy, по горизонталі — за fx
function cropFor(meta, ratio, fy = 0.5, fx = 0.5) {
  if (meta.width / meta.height < ratio) {
    const ch = Math.round(meta.width / ratio);
    const top = Math.max(0, Math.min(meta.height - ch, Math.round(fy * meta.height - ch / 2)));
    return { left: 0, top, width: meta.width, height: ch };
  }
  const cw = Math.round(meta.height * ratio);
  const left = Math.max(0, Math.min(meta.width - cw, Math.round(fx * meta.width - cw / 2)));
  return { left, top: 0, width: cw, height: meta.height };
}
// Кадр пропорцій A, у якому box стоїть угорі й займає не більше верхньої частки F (T — відступ зверху).
// Повертає буфер фото (за потреби з розмито добудованими краями) і прямокутник обрізки в ньому.
// extend — 'left', 'right' або 'both': якщо з того боку на фото однорідний фон (стіна), кадр можна розширити, продовживши цей фон
// flop — віддзеркалити фото (координати box тоді вже для віддзеркаленого)
// feather — ширина м'якого переходу фото в добудований край (частка ширини фото); без нього межа різка
async function artFrame(file, meta, { box, F, T = 0.05, padX = 0.06, extend = null, flop = false, feather = 0 }, A) {
  const W = meta.width, H = meta.height;
  const x0 = box[0] * W, y0 = box[1] * H, x1 = box[2] * W, y1 = box[3] * H;
  let Hc = (y1 - y0) / (F - T), Wc = Hc * A;
  const needW = (x1 - x0) * (1 + 2 * padX);
  if (Wc < needW) { Wc = needW; Hc = Wc / A; }
  let right = 0, leftPad = 0;
  if (Wc > W) {
    if (extend === 'right') right = Math.ceil(Wc - W);
    else if (extend === 'left') leftPad = Math.ceil(Wc - W);
    else if (extend === 'both') { leftPad = Math.ceil((Wc - W) / 2); right = Math.ceil((Wc - W) / 2); }
    else { Wc = W; Hc = W / A; }   // по боках не добудовуємо — краще трохи більший план
  }
  const left = right || leftPad ? 0 : Math.min(Math.max((x0 + x1) / 2 - Wc / 2, 0), W - Wc);
  const top = y0 - T * Hc;
  const pad = { top: Math.max(0, Math.ceil(-top)), bottom: Math.max(0, Math.ceil(top + Hc - H)), right, left: leftPad };
  let buf = await (flop ? sharp(file).rotate().flop() : sharp(file).rotate()).removeAlpha().toBuffer();
  if (right || leftPad) {
    // зрізаємо по 4 px з країв, що продовжуємо (на фото буває темна рамка), продовжуємо фон і розмиваємо продовження,
    // а поверх кладемо різке фото — виходить м'який фон без смуг
    const e = 4, cl = leftPad ? e : 0, cr = right ? e : 0;
    let core = await sharp(buf).extract({ left: cl, top: 0, width: W - cl - cr, height: H }).toBuffer();
    const soft = await sharp(core).extend({ left: leftPad ? leftPad + e : 0, right: right ? right + e : 0, extendWith: 'copy' }).blur(30).toBuffer();
    if (feather) {
      const CWd = W - cl - cr, f = Math.round(CWd * feather) / CWd, fl = leftPad ? f : 0, fr = right ? f : 0;
      const mask = `<svg width="${CWd}" height="${H}"><defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="0">` +
        `<stop offset="0" stop-color="#fff" stop-opacity="${fl ? 0 : 1}"/><stop offset="${fl}" stop-color="#fff"/>` +
        `<stop offset="${1 - fr}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${fr ? 0 : 1}"/></linearGradient></defs>` +
        `<rect width="100%" height="100%" fill="url(#m)"/></svg>`;
      const alpha = await sharp(Buffer.from(mask)).ensureAlpha().extractChannel('alpha').toBuffer();
      core = await sharp(core).joinChannel(alpha).png().toBuffer();
    }
    buf = await sharp(soft).composite([{ input: core, left: leftPad ? leftPad + e : 0, top: 0 }]).removeAlpha().toBuffer();
  }
  if (pad.top) buf = await sharp(buf).extend({ top: pad.top, extendWith: 'copy' }).toBuffer();   // кілька пікселів зверху — просто продовжуємо край
  if (pad.bottom) {
    // знизу фото плавно переходить у темний колір картки — там і так текст на темному градієнті
    const EW = W + right + leftPad, EH = H + pad.top + pad.bottom, fb = Math.round(H * 0.18), y = pad.top + H - fb;
    buf = await sharp(buf).extend({ bottom: pad.bottom, background: '#0b0b2e' }).toBuffer();
    const g = `<svg width="${EW}" height="${EH}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0b2e" stop-opacity="0"/><stop offset="1" stop-color="#0b0b2e" stop-opacity="1"/></linearGradient></defs><rect x="0" y="${y}" width="${EW}" height="${fb}" fill="url(#g)"/></svg>`;
    buf = await sharp(buf).composite([{ input: Buffer.from(g) }]).toBuffer();
  }
  const m2 = await sharp(buf).metadata();
  const rect = { left: Math.round(left), top: Math.round(top + pad.top), width: Math.round(Wc), height: Math.round(Hc) };
  rect.width = Math.min(rect.width, m2.width - rect.left); rect.height = Math.min(rect.height, m2.height - rect.top);
  return { buf, rect, pad };
}
// Квадрат якомога більший, з box посередині (наскільки дозволяють краї фото)
function sqRect(meta, box) {
  const s = Math.min(meta.width, meta.height);
  const cx = (box[0] + box[2]) / 2 * meta.width, cy = (box[1] + box[3]) / 2 * meta.height;
  return { left: Math.round(Math.min(Math.max(cx - s / 2, 0), meta.width - s)), top: Math.round(Math.min(Math.max(cy - s / 2, 0), meta.height - s)), width: s, height: s };
}
const WIDTHS = [800, 1600];
const manifest = {};

for (const [slot, cfg] of Object.entries(PHOTOS)) {
  const file = path.join(RAW, cfg.src);
  if (!fs.existsSync(file)) { console.warn(`⚠ ${slot}: немає ${cfg.src}, пропускаю`); continue; }
  const meta = await sharp(file).rotate().metadata();
  // ручна обрізка за focusY (якщо фото вище, ніж потрібні пропорції)
  let crop = null, src = file;
  if (cfg.art) {
    const fr = await artFrame(file, meta, cfg.art, cfg.ratio);
    src = fr.buf; crop = fr.rect;
    if (Object.values(fr.pad).some(Boolean)) console.log(`  ${slot}: добудовано краї`, JSON.stringify(fr.pad));
  } else if (cfg.region) {
    // region = [x0, y0, x1, y1] — точний кадр (частки від 0 до 1)
    const [x0, y0, x1, y1] = cfg.region;
    crop = { left: Math.round(x0 * meta.width), top: Math.round(y0 * meta.height), width: Math.round((x1 - x0) * meta.width), height: Math.round((y1 - y0) * meta.height) };
  } else if (cfg.ratio && (cfg.focusY != null || cfg.focusX != null)) crop = cropFor(meta, cfg.ratio, cfg.focusY ?? 0.5, cfg.focusX ?? 0.5);
  for (const w of cfg.widths || WIDTHS) {
    const width = Math.min(w, cfg.art || cfg.region ? crop.width : meta.width);
    const height = cfg.ratio ? Math.round(width / cfg.ratio) : null;
    let img = sharp(src).rotate();
    if (crop) img = img.extract(crop);
    img = img.resize({ width, height: height ?? undefined, fit: 'cover', position: cfg.position || 'centre' });
    if (cfg.brighten || cfg.saturation) img = img.modulate({ brightness: cfg.brighten || 1, saturation: cfg.saturation || 1 });
    if (cfg.denoise) img = img.median(3); // нічне фото: прибираємо шум — файл значно легший
    if (!slot.startsWith('hero')) img = img.sharpen({ sigma: 0.6 }); // hero не різкішаємо — легший файл, швидший LCP
    const out = path.join(OUT, `${slot}-${w}.webp`);
    const info = await img.webp({ quality: cfg.q ?? (w > 1000 ? 72 : 76), effort: 6 }).toFile(out);
    manifest[slot] ??= {};
    manifest[slot][w] = { width: info.width, height: info.height, kb: Math.round(info.size / 1024) };
  }
  if (cfg.tall) {
    let img = sharp(file).rotate().extract(cropFor(meta, 4 / 5, cfg.tallY ?? cfg.focusY ?? 0.5, cfg.tallX ?? cfg.focusX ?? 0.5)).resize(800, 1000, { fit: 'cover' });
    if (cfg.brighten || cfg.saturation) img = img.modulate({ brightness: cfg.brighten || 1, saturation: cfg.saturation || 1 });
    const info = await img.sharpen({ sigma: 0.6 }).webp({ quality: 74, effort: 5 }).toFile(path.join(OUT, `${slot}-tall-800.webp`));
    manifest[slot].tall = { width: info.width, height: info.height, kb: Math.round(info.size / 1024) };
  }
  if (cfg.m) {
    const [x0, y0, x1, y1] = cfg.m;
    const r = { left: Math.round(x0 * meta.width), top: Math.round(y0 * meta.height), width: Math.round((x1 - x0) * meta.width), height: Math.round((y1 - y0) * meta.height) };
    const info = await sharp(file).rotate().extract(r).resize({ width: 800 }).sharpen({ sigma: 0.6 }).webp({ quality: 74, effort: 5 }).toFile(path.join(OUT, `${slot}-m-800.webp`));
    manifest[slot].m = { width: info.width, height: info.height, kb: Math.round(info.size / 1024) };
  }
  if (cfg.sq) {
    const r = sqRect(meta, cfg.sq);
    const info = await (cfg.art?.flop ? sharp(file).rotate().flop() : sharp(file).rotate()).extract(r).resize(800, 800).sharpen({ sigma: 0.6 }).webp({ quality: 74, effort: 5 }).toFile(path.join(OUT, `${slot}-sq-800.webp`));
    // точка фокусу для CSS (object-position), щоб на будь-якій висоті фото головне лишалось у кадрі
    const fx = (((cfg.sq[0] + cfg.sq[2]) / 2 * meta.width) - r.left) / r.width, fy = (((cfg.sq[1] + cfg.sq[3]) / 2 * meta.height) - r.top) / r.height;
    manifest[slot].sq = { kb: Math.round(info.size / 1024), focus: `${Math.round(fx * 100)}% ${Math.round(fy * 100)}%` };
  }
  console.log('✓', slot, JSON.stringify(manifest[slot]));
}

// Open Graph 1200×630 з фото першого екрана
const HERO = PHOTOS['hero-slope'];
if (fs.existsSync(path.join(RAW, HERO.src))) {
  const hm = await sharp(path.join(RAW, HERO.src)).rotate().metadata();
  const [ox0, oy0, ox1, oy1] = HERO.og || [0, 0, 1, 1];
  await sharp(path.join(RAW, HERO.src)).rotate()
    .extract({ left: Math.round(ox0 * hm.width), top: Math.round(oy0 * hm.height), width: Math.round((ox1 - ox0) * hm.width), height: Math.round((oy1 - oy0) * hm.height) })
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(ROOT, 'assets/og.jpg'));
  console.log('✓ og.jpg');
}

// Білий логотип для синього фону (з чорно-білої версії брендбука)
async function whiteLogo(srcName, outName, height) {
  const src = path.join(BRAND, srcName);
  if (!fs.existsSync(src)) return;
  const trimmed = await sharp(src).trim().toBuffer();
  const alpha = await sharp(trimmed).extractChannel('alpha').toBuffer();
  const { width, height: h } = await sharp(trimmed).metadata();
  const full = await sharp({ create: { width, height: h, channels: 3, background: '#ffffff' } })
    .joinChannel(alpha).png().toBuffer();
  await sharp(full).resize({ height }).png({ compressionLevel: 9 }).toFile(path.join(OUT, outName));
  const m = await sharp(path.join(OUT, outName)).metadata();
  console.log('✓', outName, m.width + 'x' + m.height);
}
await whiteLogo('EBC Logo BW Horizontal.png', 'logo-white-h.png', 64);
await whiteLogo('EBC Logo BW Vertical.png', 'logo-white-v.png', 120);

// Favicon: синій квадрат з білим вертикальним логотипом
async function favicon(size, name) {
  const pad = Math.round(size * 0.14);
  const logo = await sharp(path.join(OUT, 'logo-white-v.png'))
    .resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#0000FE' } })
    .composite([{ input: logo, gravity: 'centre' }]).png().toFile(path.join(ROOT, name));
}
await favicon(32, 'assets/favicon-32.png');
await favicon(180, 'assets/apple-touch-icon.png');
await favicon(512, 'assets/icon-512.png');
// favicon.ico у корені (ICO з вбудованим PNG 32×32 — підтримують усі сучасні браузери)
{
  const png = fs.readFileSync(path.join(ROOT, 'assets/favicon-32.png'));
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
  head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12); head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), Buffer.concat([head, png]));
}
console.log('✓ favicon');

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
