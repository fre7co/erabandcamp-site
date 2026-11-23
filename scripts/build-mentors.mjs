// Фото менторів для блоку «Ментори» (#mentors) → assets/img/m-*-480.webp (4:5).
// Джерела: 4 оригінали з erabandcamp.ch/team (mentor-*.webp у photos-raw);
// Ірина Яремчук і Юлія Ярошенко — вирізані зі скріншотів сторінки erabandcamp.com від клієнта (*-screen.webp).
// Запуск: node scripts/build-mentors.mjs. Якщо міняєте фото — дайте НОВЕ ім'я слота (кеш /assets/ на рік).
import sharp from 'sharp';
import path from 'node:path';
const RAW = path.resolve(import.meta.dirname, '../assets/photos-raw');
const OUT = path.resolve(import.meta.dirname, '../assets/img');
// region — частки кадру [x0, y0, x1, y1]; fy — центр кадру 4:5 по висоті (0 = верх)
const M = {
  'm-natalia-k': { src: 'mentor-natalia-kolodnytska.webp', fy: 0.4 },
  'm-ivan-k': { src: 'mentor-ivan-kolodnytskyi.webp', fy: 0.45 },
  'm-sofia-o': { src: 'mentor-sofia-ohanesian.webp', fy: 0.4 },
  'm-natalia-o': { src: 'mentor-natalia-oharenko.webp', fy: 0.4 },
  // на скріншоті фото: x 69–851, y 340–928 з 920×2000 (верх фото заходить під шапку сайту)
  'm-iryna-ya': { src: 'mentor-iryna-yaremchuk-screen.webp', region: [69 / 920, 340 / 2000, 851 / 920, 920 / 2000], fy: 0.45 },
  'm-yuliia-ya': { src: 'mentor-yuliia-yaroshenko-screen.webp', region: [69 / 920, 340 / 2000, 851 / 920, 920 / 2000], fy: 0.45 },
};
for (const [slot, o] of Object.entries(M)) {
  let buf = await sharp(path.join(RAW, o.src)).rotate().toBuffer();
  let { width: w, height: h } = await sharp(buf).metadata();
  if (o.region) {
    const [x0, y0, x1, y1] = o.region;
    buf = await sharp(buf).extract({ left: Math.round(w * x0), top: Math.round(h * y0), width: Math.round(w * (x1 - x0)), height: Math.round(h * (y1 - y0)) }).toBuffer();
    ({ width: w, height: h } = await sharp(buf).metadata());
  }
  let cw = Math.min(w, Math.round(h * 4 / 5)), ch = Math.round(cw * 5 / 4);
  if (ch > h) { ch = h; cw = Math.round(ch * 4 / 5); }
  const left = Math.round((w - cw) / 2);
  const top = Math.max(0, Math.min(h - ch, Math.round(h * o.fy - ch / 2)));
  await sharp(buf).extract({ left, top, width: cw, height: ch }).resize(480, 600).webp({ quality: 78 }).toFile(path.join(OUT, `${slot}-480.webp`));
  console.log(slot, `${w}x${h}`, '→ crop', cw, ch);
}
