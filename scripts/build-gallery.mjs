// Фото для стрічки «Подивіться, як це було» (#reviews) → assets/img/g-*-480.webp (3:4).
// Запуск: node scripts/build-gallery.mjs. Число після файлу — центр кадру по ширині (0 = лівий край, 1 = правий).
// Якщо міняєте фото — дайте файлу НОВЕ ім'я слота (сервер кешує /assets/ на рік).
import sharp from 'sharp';
import path from 'node:path';
const RAW = path.resolve(import.meta.dirname, '../assets/photos-raw');
const OUT = path.resolve(import.meta.dirname, '../assets/img');
const G = {
  'g-summit': ['hero-summit-selfie.jpg', 0.72],
  'g-hoodies': ['evening-red-hoodies.jpg', 0.5],
  'g-market': ['christmas-market-group.jpg', 0.42],
  'g-snow': ['ski-girls-snow.jpg', 0.5],
  'g-mentors': ['mentor-hug.jpg', 0.5],
  'g-vyshyvanky': ['christmas-vyshyvanky-girls.jpg', 0.5],
  'g-un': ['geneva-un-hall.jpg', 0.5],
  'g-forest': ['sled-forest.jpg', 0.5],
};
for (const [slot, [file, fx]] of Object.entries(G)) {
  const img = sharp(path.join(RAW, file)).rotate();
  const { width: w, height: h } = await sharp(await img.clone().toBuffer()).metadata();
  // кадр 3:4: по ширині — fx (центр кадру), по висоті — від центру
  let cw = Math.min(w, Math.round(h * 3 / 4)), ch = Math.round(cw * 4 / 3);
  if (ch > h) { ch = h; cw = Math.round(ch * 3 / 4); }
  const left = Math.max(0, Math.min(w - cw, Math.round(w * fx - cw / 2)));
  const top = Math.max(0, Math.round((h - ch) / 2));
  await img.extract({ left, top, width: cw, height: ch }).resize(480, 640).webp({ quality: 74 }).toFile(path.join(OUT, `${slot}-480.webp`));
  console.log(slot, file, `${w}x${h}`);
}
