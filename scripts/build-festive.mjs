// Святковий шар: генерує :root-змінні з орнаментами бренду (data-URI SVG) і дописує шар у style.css.
// Запуск: node scripts/build-festive.mjs assets/style.css scripts/festive-layer.css
import fs from 'node:fs';
const [cssPath, layerPath] = process.argv.slice(2);
const u = s => `url("data:image/svg+xml,${encodeURIComponent(s.replace(/\s+/g, ' ').trim())}")`;
const svg = (body, vb = '0 0 100 100', w, h) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}'${w ? ` width='${w}' height='${h}'` : ''}>${body}</svg>`;

// Орнаменти з «EBC Logo Elements»: синя вишита зірка, мʼятна квітка, рожева квітка, лаймова зірка
const starBody = `<g fill='none' stroke='#000' stroke-width='5' stroke-linejoin='round' stroke-linecap='round'>
<polygon points='50,4 57.3,32.4 82.5,17.5 67.6,42.7 96,50 67.6,57.3 82.5,82.5 57.3,67.6 50,96 42.7,67.6 17.5,82.5 32.4,57.3 4,50 32.4,42.7 17.5,17.5 42.7,32.4'/>
<path d='M50 4V96M4 50H96M17.5 17.5L82.5 82.5M82.5 17.5L17.5 82.5'/></g>`;
const burstBody = `<path fill-rule='evenodd' d='M50 3.3L63.7 17L83 17L83 36.3L96.7 50L83 63.7L83 83L63.7 83L50 96.7L36.3 83L17 83L17 63.7L3.3 50L17 36.3L17 17L36.3 17Z
M50 29L56.2 35.2L64.9 35.2L64.9 43.8L71 50L64.9 56.2L64.9 64.9L56.2 64.9L50 71L43.8 64.9L35.2 64.9L35.2 56.2L29 50L35.2 43.8L35.2 35.2L43.8 35.2Z'/>`;
const leafBody = id => `<defs><path id='${id}' d='M50 39Q61 20 50 2Q39 20 50 39Z'/></defs>
${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<use href='#${id}' transform='rotate(${a} 50 50)'/>`).join('')}
<circle cx='50' cy='50' r='8' fill='none' stroke='#000' stroke-width='4'/>`;
const flowerBody = `<g fill='none' stroke='#000' stroke-width='4.5'>
${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => `<ellipse cx='50' cy='24' rx='6' ry='12' transform='rotate(${a} 50 50)'/>`).join('')}
<circle cx='50' cy='50' r='7'/></g>`;

// Узор «святковий папір» для синіх екранів: орнаменти білим, ледь помітно, у шаховому порядку
const at = (body, x, y, s, rot = 0) => `<svg x='${x}' y='${y}' width='${s}' height='${s}' viewBox='0 0 100 100' overflow='visible'><g transform='rotate(${rot} 50 50)'>${body}</g></svg>`;
const white = s => s.replace(/#000/g, '#fff');
const tile = (col, op) => svg(`<g opacity='${op}' fill='${col}'>${[at(starBody, 22, 22, 34), at(leafBody('a'), 152, 30, 30, 10), at(flowerBody, 90, 100, 32), at(burstBody, 220, 112, 28, 22), at(burstBody, 30, 176, 26, -12), at(starBody, 170, 196, 30, 22)].join('').replace(/#000/g, col)}</g>`, '0 0 280 260', 280, 260);
const pattern = svg(`<g opacity='.07' fill='#fff'>
${white(at(starBody, 22, 22, 34))}${white(at(leafBody('a'), 152, 30, 30, 10))}
${white(at(flowerBody, 90, 100, 32))}${white(at(burstBody, 220, 112, 28, 22))}
${white(at(burstBody, 30, 176, 26, -12))}${white(at(starBody, 170, 196, 30, 22))}</g>`, '0 0 280 260', 280, 260);

// Гірлянда: тонкий світлий провід, невеликі лампочки 4 кольорів бренду, період 320 px
const bulbs = [['#CBF908', 40], ['#FF30EE', 120], ['#70FF89', 200], ['#FFFFFF', 280]];
const garland = svg(`<path d='M0 2Q40 15 80 2T160 2T240 2T320 2' fill='none' stroke='#fff' stroke-opacity='.45' stroke-width='1.5'/>
${bulbs.map(([c, x]) => `<rect x='${x - 2.5}' y='7.5' width='5' height='4.5' rx='1' fill='#fff' fill-opacity='.75'/><ellipse cx='${x}' cy='17.5' rx='4.2' ry='6.2' fill='${c}'/><ellipse cx='${x - 1.4}' cy='15.5' rx='1.1' ry='2.2' fill='#fff' fill-opacity='.75'/>`).join('')}`, '0 0 320 28', 320, 28);
const glow = idx => svg(`${idx.map(i => { const [c, x] = bulbs[i]; return `<circle cx='${x}' cy='17.5' r='12' fill='${c}' fill-opacity='.3'/><circle cx='${x}' cy='17.5' r='7' fill='${c}' fill-opacity='.35'/>`; }).join('')}`, '0 0 320 28', 320, 28);

const vars = `
/* ---------- Святковий шар: орнаменти бренду (EBC Logo Elements), гірлянда ---------- */
:root{
  --o-star:${u(svg(starBody))};
  --o-burst:${u(svg(burstBody))};
  --o-leaf:${u(svg(leafBody('p')))};
  --o-flower:${u(svg(flowerBody))};
  --o-pattern:${u(tile('#fff', .07))};
  --o-pattern-blue:${u(tile('#0000FE', .045))};
  --garland:${u(garland)};
  --glow-a:${u(glow([0, 2]))};
  --glow-b:${u(glow([1, 3]))};
}
`;
let css = fs.readFileSync(cssPath, 'utf8');
const MARK = '/* ---------- Святковий шар';
if (css.includes(MARK)) css = css.slice(0, css.indexOf(MARK)).replace(/\s+$/, '\n');
fs.writeFileSync(cssPath, css + vars + fs.readFileSync(layerPath, 'utf8'));
console.log('ok');
