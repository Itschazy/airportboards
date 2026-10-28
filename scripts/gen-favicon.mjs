// Собирает app/favicon.ico — 16×16, 32×32 и 48×48, PNG внутри ICO.
//
// Зачем вообще: в репозитории с первого коммита лежал favicon.ico от create-next-app —
// 25 931 байт, четыре размера, из них 48×48 несжатым BMP на 11 560 Б и ещё PNG 256×256.
// Отдавался он с `Cache-Control: public, max-age=0, must-revalidate` и без ETag, то есть
// качался ЦЕЛИКОМ на каждый показ страницы, а не раз на визит, и весил больше, чем весь
// сжатый HTML главной (25 317 Б). Плюс в табе у людей висел логотип Next.js.
//
// Вектор теперь общий с PNG-маршрутами (lib/brand-icon.json): раньше PNG рисовали
// шрифтовой ✈ и отличались от ICO. Геометрия и палитра хранятся в одном месте.
// Суперсэмплинг сохраняет читаемость малого силуэта; полные проверки — на фикстуре.
//
// Почему PNG внутри ICO, а не BMP: 32×32 BMP с альфой — это 32·32·4 + маска + заголовок,
// около 4.3 КБ на один размер. Тот же кадр PNG-ом — сотни байт, потому что фон плоский.
// PNG-in-ICO понимают все браузеры и Windows начиная с XP.
//
// Usage:
//   node scripts/gen-favicon.mjs           — собрать и напечатать размеры
//   node scripts/gen-favicon.mjs --write   — записать app/favicon.ico

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const WRITE = process.argv.includes('--write');

// Общий источник с PNG-маршрутами: один силуэт, без шрифтов и внешней сети.
const brand = JSON.parse(fs.readFileSync(new URL('../lib/brand-icon.json', import.meta.url), 'utf8'));
const rgb = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
const BG = rgb(brand.background);
const FG = rgb(brand.foreground);
const FIT = brand.plane.map(([x, y]) => [50 + (x - 50) * brand.inset, 50 + (y - 50) * brand.inset]);

/** Точка внутри полигона — луч вправо, чётность пересечений. */
function inside(x, y, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * Рисует кадр size×size со сглаживанием суперсэмплингом 8×8 на пиксель.
 *
 * Сглаживание тут не украшение: без него крыло на 16×16 обрывается ступенькой в один
 * пиксель и силуэт перестаёт читаться. Считается покрытие пикселя фигурой, и им смешиваются
 * два цвета — фон при этом непрозрачный, поэтому альфа везде 255 и полупрозрачных краёв,
 * которые темнеют на тёмной теме таба, не возникает.
 */
function render(size) {
  const SS = 8;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * 100;
          const v = ((y + (sy + 0.5) / SS) / size) * 100;
          if (inside(u, v, FIT)) cover++;
        }
      }
      const a = cover / (SS * SS);
      const o = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
      px[o + 3] = 255;
    }
  }
  return px;
}

/** Минимальный PNG-энкодер: RGBA, без интерлейса, фильтр 0 на каждой строке. */
function png(px, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // бит на канал
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

/** ICO: заголовок 6 Б + по 16 Б на размер + сами PNG подряд. */
function ico(frames) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);              // 1 = иконка
  head.writeUInt16LE(frames.length, 4);
  let off = 6 + frames.length * 16;
  const dir = [];
  for (const { size, data } of frames) {
    const e = Buffer.alloc(16);
    e[0] = size === 256 ? 0 : size;      // 0 означает 256
    e[1] = size === 256 ? 0 : size;
    e.writeUInt16LE(1, 4);               // плоскости
    e.writeUInt16LE(32, 6);              // бит на пиксель
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(off, 12);
    dir.push(e);
    off += data.length;
  }
  return Buffer.concat([head, ...dir, ...frames.map((f) => f.data)]);
}

const SIZES = [16, 32, 48];
const frames = SIZES.map((size) => ({ size, data: png(render(size), size) }));
const out = ico(frames);

const target = path.join('app', 'favicon.ico');
const before = fs.existsSync(target) ? fs.statSync(target).size : 0;

for (const f of frames) console.log(`  ${f.size}×${f.size}  ${String(f.data.length).padStart(5)} Б  PNG`);
console.log(`\n  было:  ${before} Б`);
console.log(`  стало: ${out.length} Б`);

if (WRITE) {
  fs.writeFileSync(target, out);
  console.log(`\n  записано в ${target}`);
}
