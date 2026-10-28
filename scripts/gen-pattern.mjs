#!/usr/bin/env node
/**
 * Собирает public/pattern.svg — бесшовную плитку фоновых обоев.
 * Руками файл не правится: меняй рисунки и параметры здесь и перезапускай.
 *
 *   node scripts/gen-pattern.mjs
 *
 * Это не набор иконок интерфейса, а обои: 88 отдельных рисунков от руки,
 * моno-линия, только контур, с мелкими деталями и намеренно неровными
 * кривыми. Плитка работает МАСКОЙ (CSS --pat), поэтому цвет живёт внутри
 * штриха и не вылезает за контур; краску задаёт --pat-ink в globals.css.
 *
 * Правила, выученные на этом узоре:
 *   1. Плитка 1600×1600, рисунки у края дублируются на противоположной
 *      стороне, пересечения считаются НА ТОРЕ. Иначе «чисто внутри плитки»
 *      означает кашу на стыке.
 *   2. Рисунки стоят почти прямо (±35°). Случайный поворот на 360° читается
 *      не как узор, а как мусор.
 *   3. Два прохода: сперва иллюстрации, затем мелочь (точки, кольца, звёзды,
 *      волны, пунктир) в оставшиеся промежутки. Закрывать промежутки
 *      иллюстрациями нельзя — они начинают слипаться.
 *   4. Толщина штриха задаётся на <use> и делится на масштаб: иначе крупный
 *      рисунок выходит жирным, а мелкий — волосяным.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 1800;
const H = 1800;
const BOX = 64;          // сторона холста одного рисунка
const SEED = 20261029;

const ILLU_TARGET = 700;
const ILLU_ATTEMPTS = 420000;
const ILLU_GAP = 5;
const TILT = 35;         // максимальный наклон, градусы

const TINY_TARGET = 340;
const TINY_ATTEMPTS = 320000;
const TINY_GAP = 3;

const WRAP = 130;
/* Обязательный зазор между габаритными кругами соседей. Ноль означал бы, что
   рисунки стоят вплотную: наложения нет, но и воздуха между ними тоже. */
const MIN_GAP = 6;

/* Размеры в пикселях готовой плитки (плитка рисуется 1:1). Большинство
   рисунков мелкие, крупные — редкие акценты. */
/* Размер = ДЛИННАЯ СТОРОНА самого рисунка в пикселях, а не сторона холста.
   Раньше считали по холсту 64×64, и рисунок, занимающий его половину,
   выходил вдвое мельче заказанного — отсюда «слишком маленькие». */
const TIERS = [
  { min: 52, max: 96,  weight: 0.70 },
  { min: 28, max: 44,  weight: 0.20 },
  { min: 104, max: 150, weight: 0.10 },
];

/* ─────────────────────────── Рисунки ───────────────────────────
   Холст 64×64, координаты от левого верхнего угла; центрируются через
   translate(-32 -32), чтобы rotate() крутил рисунок вокруг середины.
   Кривые намеренно слегка несимметричны — это и даёт ощущение руки. */
/* ─────────────────────────── Рисунки ───────────────────────────
   Холст 64×64. Набор намеренно элементарный: каждый знак — несколько
   штрихов, узнаваемых с первого взгляда и не рассыпающихся при уменьшении
   до 30 px. Прежний набор был подробнее и на обоях читался как мешанина. */
const ART = {
  plane_top: 'M32 8l4 14 18 10v4l-18-5v11l6 5v3l-10-3-10 3v-3l6-5V31L10 36v-4l18-10z',
  plane_side: 'M6 38h12l10-14h12l-5 14h16a4 4 0 0 1 0 8H30l-10 12h-6l5-12H6z',
  takeoff: 'M6 54h52 M18 44 46 16 M36 16h10 M46 16v10',
  landing: 'M6 54h52 M18 18 46 46 M36 46h10 M46 46v-10',
  paper_plane: 'M56 10 8 30l18 6z M56 10 36 56l-10-20z',
  propeller: 'M32 26a6 6 0 1 1 0 12 6 6 0 0 1 0-12z M32 26V8 M38 36l16 10 M26 36 10 46',
  tail_fin: 'M22 48 36 14h6l6 34z M22 48h26',
  wing: 'M6 40 44 18l12 2-30 24z',
  flight_arc: 'M8 44c10-18 38-18 48 0 M5 44a3 3 0 1 0 6 0 3 3 0 1 0-6 0z M53 44a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
  tower: 'M24 52l3-22h10l3 22z M26 30h12l-3-10h-6z M32 20v-6 M18 52h28',
  terminal: 'M8 48V28l24-14 24 14v20z M8 48h48 M24 48V36h16v12',
  hangar: 'M10 48V32a22 22 0 0 1 44 0v16z M10 48h44 M26 48V38h12v10',
  runway: 'M20 54 28 10h8l8 44z M32 18v6 M32 30v6 M32 42v6',
  gate_arch: 'M14 52V26a18 18 0 0 1 36 0v26 M14 52h36',
  stairs: 'M8 52h10V40h10V28h10V16h18 M8 52h48',
  baggage_belt: 'M8 38h48 M16 48a5 5 0 1 0 0-10 5 5 0 1 0 0 10z M48 48a5 5 0 1 0 0-10 5 5 0 1 0 0 10z M22 38V24h20v14',
  bus: 'M8 14h48v28H8z M8 26h48 M16 50a5 5 0 1 0 0-10 5 5 0 1 0 0 10z M48 50a5 5 0 1 0 0-10 5 5 0 1 0 0 10z',
  windsock: 'M14 54V12 M14 18h8l14 4 10 3-10 3-14 3h-8z',
  radar: 'M32 10a22 22 0 1 1 0 44 22 22 0 0 1 0-44z M32 32V12 M32 32l16 10 M41 22a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
  flag: 'M16 54V10 M16 14h26l-6 8 6 8H16',
  suitcase: 'M10 22h44v28H10z M24 22v-6h16v6 M22 30v12 M42 30v12',
  ticket: 'M8 20h48v10a6 6 0 0 0 0 12v2H8v-2a6 6 0 0 0 0-12z M38 20v24',
  passport: 'M16 10h32v44H16z M32 22a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M24 44h16',
  boarding_pass: 'M8 22h48v20H8z M40 22v20 M14 30h18 M14 36h12',
  luggage_tag: 'M20 12h24v40H20z M32 20a3 3 0 1 0 0 6 3 3 0 1 0 0-6z M26 34h12',
  trolley: 'M8 12h8l8 28h26 M20 18h26v16H20z M26 50a4 4 0 1 0 0-8 4 4 0 1 0 0 8z M44 50a4 4 0 1 0 0-8 4 4 0 1 0 0 8z',
  clock: 'M32 10a22 22 0 1 1 0 44 22 22 0 0 1 0-44z M32 20v12l8 6',
  compass: 'M32 10a22 22 0 1 1 0 44 22 22 0 0 1 0-44z M40 24 26 30l-2 12 14-6z',
  pin: 'M32 54s-14-16-14-26a14 14 0 0 1 28 0c0 10-14 26-14 26z M32 34a6 6 0 1 0 0-12 6 6 0 1 0 0 12z',
  globe: 'M32 8a24 24 0 1 1 0 48 24 24 0 0 1 0-48z M8 32h48 M32 8c-8 8-12 16-12 24s4 16 12 24 M32 8c8 8 12 16 12 24s-4 16-12 24',
  map: 'M8 16l14-6 20 6 14-6v38l-14 6-20-6-14 6z M22 10v38 M42 16v38',
  seat: 'M20 12h6v24h22v8H20z',
  porthole: 'M32 10a20 22 0 1 1 0 44 20 22 0 0 1 0-44z M32 18a12 14 0 1 1 0 28 12 14 0 0 1 0-28z',
  binoculars: 'M16 24h14v22a7 7 0 0 1-14 0z M34 24h14v22a7 7 0 0 1-14 0z M30 32h4 M20 24v-8h6v8 M44 24v-8h-6v8',
  coffee: 'M14 20h26v14a13 13 0 0 1-26 0z M40 24h6a5 5 0 0 1 0 10h-6 M14 50h26',
  cloud: 'M18 44a9 9 0 0 1 1-18 13 13 0 0 1 24-2 9 9 0 0 1-1 20z',
  cloud_small: 'M22 40a7 7 0 0 1 1-14 10 10 0 0 1 18-1 7 7 0 0 1 0 15z',
  sun: 'M32 20a12 12 0 1 1 0 24 12 12 0 0 1 0-24z M32 6v6 M32 52v6 M6 32h6 M52 32h6 M14 14l4 4 M46 46l4 4 M50 14l-4 4 M18 46l-4 4',
  moon: 'M38 8a24 24 0 1 0 14 40A20 20 0 0 1 38 8z',
  star: 'M32 8c2 12 10 20 22 22-12 2-20 10-22 22-2-12-10-20-22-22 12-2 20-10 22-22z',
  rain: 'M16 38a9 9 0 0 1 2-18 13 13 0 0 1 24-3 9 9 0 0 1 2 21z M20 46l-3 8 M32 46l-3 8 M44 46l-3 8',
  snow: 'M16 38a9 9 0 0 1 2-18 13 13 0 0 1 24-3 9 9 0 0 1 2 21z M22 46v5 M32 48v5 M42 46v5',
  bolt: 'M34 8 16 36h12l-4 20 18-28H30z',
  wind: 'M6 22h26a7 7 0 1 0-7-7 M6 34h34a7 7 0 1 1-7 7 M6 46h20',
  mountains: 'M6 48h52 M6 48 22 20l10 16 8-12 12 24z',
  horizon_sun: 'M6 46h52 M32 22a14 14 0 0 1 14 14H18a14 14 0 0 1 14-14z M32 10v6 M12 24l4 4 M52 24l-4 4',
  wifi: 'M10 26a30 30 0 0 1 44 0 M18 34a19 19 0 0 1 28 0 M26 42a9 9 0 0 1 12 0 M30 50a2 2 0 1 0 4 0 2 2 0 1 0-4 0z',
  arrow_right: 'M10 32h40 M38 20l12 12-12 12',
  arrow_curve: 'M10 48c6-22 22-34 42-36 M42 4l10 8-10 8',
};

/* Мелочь между рисунками: даёт плотность, не превращая фон в свалку. */
const TINY = {
  /* ext — собственный размах фигуры в единицах холста. Пока его не было,
     масштаб считался от холста 64, и «мелочь» выходила в десятые доли
     пикселя: формально она место занимала, а на экране её не было —
     отсюда и ощущение пустот. */
  dot:    { d: 'M32 29a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', fill: true, ext: 6, min: 5, max: 10, w: 0.34 },
  ring:   { d: 'M32 23a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', ext: 18, min: 11, max: 22, w: 0.26 },
  spark:  { d: 'M32 18c1 8 5 12 13 13-8 1-12 5-13 13-1-8-5-12-13-13 8-1 12-5 13-13z', ext: 26, min: 15, max: 30, w: 0.22 },
  wave:   { d: 'M10 32c5-7 9 7 13 0s9 7 13 0 9 7 13 0', ext: 42, min: 26, max: 48, w: 0.18 },
};

/* ── Габарит рисунка ───────────────────────────────────────────────────────
 * Рисунки занимают холст 64×64 по-разному: самолёт — почти весь, точка —
 * центр. Пока габаритом считался сам холст, случалось двойное зло: мелкие
 * рисунки резервировали лишнее место (отсюда пустоты), а крупные при повороте
 * вылезали углами за круг радиусом в полхолста и НАКЛАДЫВАЛИСЬ друг на друга,
 * хотя проверка считала, что всё чисто.
 *
 * Поэтому у каждого рисунка берётся настоящая рамка: середина становится
 * центром вращения, а радиусом служит половина диагонали рамки — при любом
 * повороте рисунок остаётся внутри этого круга.
 *
 * Разбор грубый: собираются опорные точки команд. Для кривых это ещё и
 * контрольные точки, которые лежат снаружи дуги, поэтому рамка выходит с
 * запасом — в нашу сторону. */
function pathPoints(d) {
  const toks = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const pts = [];
  let i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0;
  const num = () => parseFloat(toks[i++]);
  const put = (px, py) => { pts.push([px, py]); };
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) { cmd = toks[i++]; if (cmd === 'Z' || cmd === 'z') { x = sx; y = sy; continue; } }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M' || C === 'L' || C === 'T') {
      const nx = num(), ny = num();
      x = rel ? x + nx : nx; y = rel ? y + ny : ny;
      if (C === 'M') { sx = x; sy = y; }
      put(x, y);
    } else if (C === 'H') { const nx = num(); x = rel ? x + nx : nx; put(x, y); }
    else if (C === 'V') { const ny = num(); y = rel ? y + ny : ny; put(x, y); }
    else if (C === 'C') {
      const a1 = num(), b1 = num(), a2 = num(), b2 = num(), nx = num(), ny = num();
      put(rel ? x + a1 : a1, rel ? y + b1 : b1);
      put(rel ? x + a2 : a2, rel ? y + b2 : b2);
      x = rel ? x + nx : nx; y = rel ? y + ny : ny; put(x, y);
    } else if (C === 'S' || C === 'Q') {
      const a1 = num(), b1 = num(), nx = num(), ny = num();
      put(rel ? x + a1 : a1, rel ? y + b1 : b1);
      x = rel ? x + nx : nx; y = rel ? y + ny : ny; put(x, y);
    } else if (C === 'A') {
      const rx = num(), ry = num(); num(); num(); num();
      const nx = num(), ny = num();
      const ex = rel ? x + nx : nx, ey = rel ? y + ny : ny;
      // дуга не выходит за прямоугольник концов, расширенный на радиусы
      put(Math.min(x, ex) - rx, Math.min(y, ey) - ry);
      put(Math.max(x, ex) + rx, Math.max(y, ey) + ry);
      x = ex; y = ey; put(x, y);
    } else { i++; }
  }
  return pts;
}

const GEOM = {};
for (const [k, d] of Object.entries(ART)) {
  const pts = pathPoints(d);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = x1 - x0, h = y1 - y0;
  GEOM[k] = {
    cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
    long: Math.max(w, h),
    rr: Math.hypot(w, h) / 2,
  };
}

const ART_KEYS = Object.keys(ART);
const TINY_KEYS = Object.keys(TINY);

/* mulberry32: детерминированный ГПСЧ. Без него каждый запуск давал бы новый
   узор, и диff файла был бы чистым шумом. */
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);

function pickSize() {
  let r = rand();
  for (const t of TIERS) {
    if (r < t.weight) return t.min + rand() * (t.max - t.min);
    r -= t.weight;
  }
  const t = TIERS[0];
  return t.min + rand() * (t.max - t.min);
}

function pickTiny() {
  let r = rand();
  for (const k of TINY_KEYS) {
    if (r < TINY[k].w) return k;
    r -= TINY[k].w;
  }
  return TINY_KEYS[0];
}

/* Сетка-ускоритель: без неё проверка пересечений — это O(n) на каждый из
   семисот тысяч бросков, и сборка занимает минуты. */
const CELL = 96;
const COLS = Math.ceil(W / CELL);
const ROWS = Math.ceil(H / CELL);
const buckets = new Map();
const keyOf = (cx, cy) => ((cx + COLS) % COLS) * 10000 + ((cy + ROWS) % ROWS);
let maxR = 0;

function freeAt(x, y, r) {
  const reach = Math.ceil((r + maxR) / CELL);
  const cx = Math.floor(x / CELL);
  const cy = Math.floor(y / CELL);
  for (let i = -reach; i <= reach; i++) {
    for (let j = -reach; j <= reach; j++) {
      const list = buckets.get(keyOf(cx + i, cy + j));
      if (!list) continue;
      for (const q of list) {
        let dx = Math.abs(x - q.x); if (dx > W / 2) dx = W - dx;
        let dy = Math.abs(y - q.y); if (dy > H / 2) dy = H - dy;
        const need = r + q.r + MIN_GAP;
        if (dx * dx + dy * dy < need * need) return false;
      }
    }
  }
  return true;
}

/* Один и тот же знак рядом бросается в глаза сильнее, чем пустота: два
   одинаковых автобуса в одном углу читаются как ошибка верстки. Поэтому у
   каждой расстановки проверяется, нет ли такого же знака ближе NO_REPEAT. */
const NO_REPEAT = 300;
function keyFreeAt(x, y, key) {
  if (!key) return true;
  const reach = Math.ceil(NO_REPEAT / CELL);
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  for (let i = -reach; i <= reach; i++) {
    for (let j = -reach; j <= reach; j++) {
      const list = buckets.get(keyOf(cx + i, cy + j));
      if (!list) continue;
      for (const q of list) {
        if (q.key !== key) continue;
        let dx = Math.abs(x - q.x); if (dx > W / 2) dx = W - dx;
        let dy = Math.abs(y - q.y); if (dy > H / 2) dy = H - dy;
        if (dx * dx + dy * dy < NO_REPEAT * NO_REPEAT) return false;
      }
    }
  }
  return true;
}

const placed = [];
function add(item) {
  placed.push(item);
  if (item.r > maxR) maxR = item.r;
  const k = keyOf(Math.floor(item.x / CELL), Math.floor(item.y / CELL));
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push(item);
}

function run(attempts, target, make) {
  let got = 0;
  for (let i = 0; i < attempts && got < target; i++) {
    const cand = make();
    const x = rand() * W;
    const y = rand() * H;
    if (!freeAt(x, y, cand.r)) continue;
    if (!keyFreeAt(x, y, cand.key)) continue;
    add({ ...cand, x, y });
    got++;
  }
  return got;
}

/* Размер рисунка задаётся явно на каждом проходе, а не лотереей по ярусам:
   при лотерее крупные акценты ложились кучно и в середину плитки могли не
   попасть вовсе — там оставалась «мелкая каша». */
function makeArt(px, forced) {
  const key = forced || ART_KEYS[Math.floor(rand() * ART_KEYS.length)];
  const g = GEOM[key];
  const scale = px / g.long;
  return {
    d: ART[key], key,
    fill: false,
    scale,
    // + половина штриха: линия выходит за геометрию пути, и без этого
    // запаса соседи соприкасались именно линиями
    r: g.rr * scale + ILLU_GAP + 1.4,
    cx: g.cx, cy: g.cy,
    rot: Math.round((rand() * 2 - 1) * TILT),
    mirror: rand() < 0.28 ? -1 : 1,
    sw: +(1.7 + rand() * 0.9).toFixed(2),
    tiny: false,
    jig: rand(),
    lum: rand(),
  };
}

/* Проход 0 — крупные акценты по рыхлой сетке. Ячейка задаёт район, точка
   внутри неё случайна, поэтому решётка не читается, но ни один участок
   плитки не остаётся без крупного рисунка. */
const BIG_COLS = 5, BIG_ROWS = 5;
/* Колода: каждый крупный знак свой, пока хватает набора. Случайный выбор
   ставил рядом два одинаковых, и это читалось как брак. */
const deck = [...ART_KEYS];
for (let i = deck.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [deck[i], deck[j]] = [deck[j], deck[i]];
}
let bigs = 0;
for (let row = 0; row < BIG_ROWS; row++) {
  for (let col = 0; col < BIG_COLS; col++) {
    /* Точка — середина ячейки с дрожанием в пятую часть: решётка не
       читается, но и два соседних акцента не сходятся у общей границы. */
    const key = deck[(row * BIG_COLS + col) % deck.length];
    for (let attempt = 0; attempt < 300; attempt++) {
      const px = 86 + rand() * 30;
      const cand = makeArt(px, key);
      const x = (col + 0.5 + (rand() - 0.5) * 0.4) * (W / BIG_COLS);
      const y = (row + 0.5 + (rand() - 0.5) * 0.4) * (H / BIG_ROWS);
      if (!freeAt(x, y, cand.r)) continue;
      add({ ...cand, x, y });
      bigs++;
      break;
    }
  }
}

// Проход 1 — средние и мелкие иллюстрации вразброс.
const mids = run(ILLU_ATTEMPTS, 420, () => makeArt(52 + rand() * 44));
const smalls = run(ILLU_ATTEMPTS, 320, () => makeArt(28 + rand() * 16));
const illus = bigs + mids + smalls;

// Проход 2 — мелочь в оставшиеся промежутки.
const tinies = run(TINY_ATTEMPTS, TINY_TARGET, () => {
  const t = TINY[pickTiny()];
  const px = t.min + rand() * (t.max - t.min);
  const scale = px / t.ext;
  return {
    d: t.d,
    fill: !!t.fill,
    scale,
    r: (t.ext / 2) * scale + TINY_GAP,
    cx: 32, cy: 32,
    rot: Math.round((rand() * 2 - 1) * TILT),
    mirror: 1,
    sw: +(1.5 + rand() * 0.7).toFixed(2),
    tiny: true,
    jig: rand(),
    lum: rand(),
  };
});

/* Тела собираются в <defs> с дедупликацией: тысяча расстановок ссылками на
   сотню определений весит втрое меньше, чем копии разметки. */
const defsMap = new Map();
function defId(it) {
  const k = (it.fill ? 'f|' : 's|') + it.d;
  if (!defsMap.has(k)) {
    defsMap.set(k, { id: 'g' + defsMap.size.toString(36), d: it.d, fill: it.fill, cx: it.cx, cy: it.cy });
  }
  return defsMap.get(k).id;
}

/* ── Проход 3: закрытие пустот ─────────────────────────────────────────────
 * Случайные броски оставляют «проплешины»: место есть, но попасть в него
 * становится всё менее вероятно, и добирать их бросками бессмысленно.
 * Поэтому пустоты ищутся прямо: по плитке строится карта просвета (для
 * каждой точки — расстояние до ближайшего края рисунка), и в самую пустую
 * точку ставится рисунок ровно такого размера, какой туда влезает. Повтор
 * до тех пор, пока крупнее HOLE_MAX дыр не останется.
 *
 * Шаг карты GRID — компромисс: 6px по плитке 1800 даёт 300×300 точек, этого
 * хватает, чтобы не пропустить дыру меньше самого мелкого рисунка.
 */
const GRID = 6;
const GW = Math.ceil(W / GRID);
const GH = Math.ceil(H / GRID);
const HOLE_MAX = 8;      // радиус самой большой допустимой пустоты, px

const clear = new Float32Array(GW * GH).fill(1e9);

function stampClearance(item, full) {
  // Пересчитываем просвет только вокруг добавленного рисунка.
  const reach = full ? Math.max(W, H) : item.r + HOLE_MAX * 2 + 8;
  const i0 = Math.floor((item.x - reach) / GRID), i1 = Math.ceil((item.x + reach) / GRID);
  const j0 = Math.floor((item.y - reach) / GRID), j1 = Math.ceil((item.y + reach) / GRID);
  for (let i = i0; i <= i1; i++) {
    const gi = ((i % GW) + GW) % GW;
    for (let j = j0; j <= j1; j++) {
      const gj = ((j % GH) + GH) % GH;
      const px = gi * GRID, py = gj * GRID;
      let dx = Math.abs(px - item.x); if (dx > W / 2) dx = W - dx;
      let dy = Math.abs(py - item.y); if (dy > H / 2) dy = H - dy;
      const d = Math.hypot(dx, dy) - item.r;
      const k = gj * GW + gi;
      if (d < clear[k]) clear[k] = d;
    }
  }
}

for (const it of placed) stampClearance(it, true);

function worstHole() {
  let best = -1e9, bi = 0;
  for (let k = 0; k < clear.length; k++) if (clear[k] > best) { best = clear[k]; bi = k; }
  return { v: best, x: (bi % GW) * GRID, y: Math.floor(bi / GW) * GRID };
}

let holesFilled = 0;
for (let guard = 0; guard < 4000; guard++) {
  const hole = worstHole();
  if (hole.v <= HOLE_MAX) break;
  // Размер подбираем под дыру: рисунок должен влезть с тем же зазором.
  const rFit = hole.v - ILLU_GAP - MIN_GAP;
  /* Добор тоже обязан соблюдать запрет на повтор рядом: иначе именно он,
     самый массовый проход, и расставляет одинаковые знаки по соседству. */
  let key = ART_KEYS[Math.floor(rand() * ART_KEYS.length)];
  for (let t = 0; t < 12; t++) {
    if (keyFreeAt(hole.x, hole.y, key)) break;
    key = ART_KEYS[Math.floor(rand() * ART_KEYS.length)];
  }
  const gg = GEOM[key];
  // радиус дыры задаёт половину диагонали рамки, из неё — длинную сторону
  const px = Math.min((rFit / gg.rr) * gg.long, 150);
  const useArt = px >= 22;
  const scale = px / gg.long;
  const item = useArt
    ? {
        d: ART[key], key,
        fill: false, scale,
        r: gg.rr * scale + ILLU_GAP + 1.4,
        cx: gg.cx, cy: gg.cy,
        rot: Math.round((rand() * 2 - 1) * TILT),
        mirror: rand() < 0.28 ? -1 : 1,
        sw: +(1.7 + rand() * 0.9).toFixed(2),
        tiny: false, jig: rand(), lum: rand(),
      }
    : (() => {
        const t = TINY[pickTiny()];
        const sc = Math.min(px, t.max) / t.ext;
        return {
          d: t.d, fill: !!t.fill, scale: sc,
          r: (t.ext / 2) * sc + TINY_GAP,
          cx: 32, cy: 32,
          rot: Math.round((rand() * 2 - 1) * TILT),
          mirror: 1, sw: +(1.5 + rand() * 0.7).toFixed(2),
          tiny: true, jig: rand(), lum: rand(),
        };
      })();
  item.x = hole.x; item.y = hole.y;
  add(item);
  stampClearance(item, false);
  holesFilled++;
}

/* ── Аудит: три утверждения о готовой плитке ───────────────────────────── */
function audit() {
  let minGap = 1e9;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j];
      let dx = Math.abs(a.x - b.x); if (dx > W / 2) dx = W - dx;
      let dy = Math.abs(a.y - b.y); if (dy > H / 2) dy = H - dy;
      const gap = Math.hypot(dx, dy) - (a.r + b.r);
      if (gap < minGap) minGap = gap;
    }
  }
  let hole = -1e9, covered = 0;
  for (let k = 0; k < clear.length; k++) {
    if (clear[k] > hole) hole = clear[k];
    if (clear[k] <= 0) covered++;
  }
  return {
    minGap: minGap.toFixed(1),
    hole: hole.toFixed(1),
    coverage: ((covered / clear.length) * 100).toFixed(1),
  };
}

/* ── Цвет ──────────────────────────────────────────────────────────────────
 * Цвет принадлежит самому контуру: он записан в файл как stroke каждого
 * рисунка, а не наложен градиентом сверху.
 *
 * Пять опорных точек задают распределение из задания. Рисунок берёт цвет
 * ближайшей точки, но веса слегка сбиты случайностью — границы зон выходят
 * рваными, как в рисованных обоях, а не как заливка в редакторе.
 *
 * Про стык плиток. Цвет, зашитый в рисунок, повторяется вместе с плиткой,
 * поэтому бирюзовый левый край встаёт рядом с пурпурным правым. Полностью
 * убрать это нельзя — либо цвет привязан к плитке, либо переход бесшовен.
 * Шов размывается так: ближе к краю рисунок с растущей вероятностью берёт
 * общий синий. Получается не линия, а рассыпанный переход в синеву, и с
 * обеих сторон стыка он одинаковый.
 */
/* Палитра — прежние шесть цветов, они нравились больше. Оттенки одни и те же
   в обеих темах, различается только плотность штриха: на чёрном те же цвета
   звучат ярче, на белом их приходится давить, иначе рисунок кричит. */
const HUES = {
  teal:   '#00BFAF',
  sky:    '#168BC4',
  blue:   '#3469AF',
  indigo: '#56539A',
  violet: '#79458E',
  purple: '#943F75',
};
/* Цвет меняется ПЛАВНО по диагонали, как на образце: зелёный в левом нижнем
   углу, дальше бирюзовый, голубой, синий, индиго, фиолетовый и пурпурный к
   правому верхнему. Оттенок каждого рисунка — интерполяция между соседними
   остановками, а не «ближайшая зона», поэтому переход сплошной.
   У краёв плитки оттенок подтягивается к середине шкалы: цвет зашит в файл и
   повторяется вместе с плиткой, и без этого зелёный край встал бы вплотную к
   пурпурному. Получается не линия, а медленный снос в синеву. */
const STOPS = ['#00C08B', '#00BFAF', '#168BC4', '#3469AF', '#56539A', '#79458E', '#943F75', '#B8477F'];
const TAU = Math.PI * 2;

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const STOPS_RGB = STOPS.map(rgb);
const hex2 = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

function mixAt(t) {
  const f = Math.max(0, Math.min(0.9999, t)) * (STOPS.length - 1);
  const i = Math.floor(f), k = f - i;
  const a = STOPS_RGB[i], b = STOPS_RGB[Math.min(i + 1, STOPS.length - 1)];
  return '#' + hex2(a[0] + (b[0] - a[0]) * k) + hex2(a[1] + (b[1] - a[1]) * k) + hex2(a[2] + (b[2] - a[2]) * k);
}

/* Поле оттенка — две косинусоиды по осям. Косинус периодичен, поэтому
   значения на левом и правом краю плитки совпадают, и на правом с левым тоже:
   стык не виден без всякой «подтяжки к середине», которая и давала пятна.
   Знаки подобраны так, что цвет идёт по диагонали: лево-низ → право-верх.
   Никакого случайного разброса — любой шум по оттенку читается как грязь. */
function hueAt(x, y) {
  const u = x / W, v = y / H;
  const t = 0.5 - 0.25 * Math.cos(TAU * u) + 0.25 * Math.cos(TAU * v);
  return mixAt(Math.round(t * 48) / 48);
}

/* Прозрачность СВЕТЛОЙ и ТЁМНОЙ тем разная, и это не недосмотр: на белом фоне тот же
   узор читается заметно навязчивее, чем на чёрном, — светлый глаз различает контраст
   линий тоньше. Светлая опущена на 30% от общего уровня (28.10.2026, решение владельца).
   Прозрачность: обои остаются фоном, но не пропадают. 28.10.2026 по просьбе владельца
   поднята дважды — сперва на 35%, затем ещё в полтора раза; итог вдвое выше исходных
   (были light main 0.085–0.125, tiny 0.05–0.085; dark main 0.12–0.18, tiny 0.07–0.115).
   Диапазон, а не одно число, — чтобы рисунки не светились одинаково ровно. Шаг
   квантования ниже по коду 1/40, поэтому дробные хвосты всё равно округлятся. */
const PALETTE = {
  light: { main: [0.121, 0.178], tiny: [0.071, 0.121] },
  dark:  { main: [0.243, 0.365], tiny: [0.143, 0.233] },
};

/* Сборка файла. Рисунки группируются по паре «цвет + прозрачность»: эти два
   атрибута наследуются, поэтому у каждого <use> остаётся только ссылка,
   преобразование и толщина штриха. Оттенок и прозрачность для этого
   квантуются — на глаз шаг незаметен, а файл худеет примерно на четверть. */
function render(themeName) {
  const pal = PALETTE[themeName];
  const groups = new Map();
  let total = 0;

  for (const g of placed) {
    const id = defId(g);
    const sw = +(g.sw / g.scale).toFixed(2);
    const color = hueAt(g.x, g.y);
    const band = g.tiny ? pal.tiny : pal.main;
    const op = (Math.round((band[0] + g.lum * (band[1] - band[0])) * 40) / 40).toFixed(3);
    const key = `${g.fill ? 'f' : 's'}|${color}|${op}`;
    if (!groups.has(key)) groups.set(key, { fill: g.fill, color, op, uses: [] });

    const spots = [[g.x, g.y]];
    const nearL = g.x < WRAP, nearR = g.x > W - WRAP;
    const nearT = g.y < WRAP, nearB = g.y > H - WRAP;
    if (nearL) spots.push([g.x + W, g.y]);
    if (nearR) spots.push([g.x - W, g.y]);
    if (nearT) spots.push([g.x, g.y + H]);
    if (nearB) spots.push([g.x, g.y - H]);
    if (nearL && nearT) spots.push([g.x + W, g.y + H]);
    if (nearR && nearT) spots.push([g.x - W, g.y + H]);
    if (nearL && nearB) spots.push([g.x + W, g.y - H]);
    if (nearR && nearB) spots.push([g.x - W, g.y - H]);

    const list = groups.get(key).uses;
    for (const [px, py] of spots) {
      list.push(
        `<use href="#${id}" transform="translate(${Math.round(px)} ${Math.round(py)}) rotate(${g.rot}) scale(${(g.mirror * g.scale).toFixed(2)} ${g.scale.toFixed(2)})"` +
        `${g.fill ? '' : ` stroke-width="${sw}"`}/>`
      );
      total++;
    }
  }

  const bodyParts = [...groups.values()].map(gr =>
    `<g ${gr.fill ? `fill="${gr.color}" fill-opacity="${gr.op}"` : `stroke="${gr.color}" stroke-opacity="${gr.op}"`}>` +
    gr.uses.join('') + `</g>`
  );

  const defs = [...defsMap.values()]
    .map(v => `<g id="${v.id}" transform="translate(${(-v.cx).toFixed(1)} ${(-v.cy).toFixed(1)})">` +
      `<path d="${v.d}"${v.fill ? ' stroke="none"' : ''}/></g>`)
    .join('');

  return {
    uses: total,
    svg:
      `<!-- Фоновые обои (${themeName}): собираются scripts/gen-pattern.mjs, руками не правятся.
` +
      `     Плитка ${W}×${H}. Цвет зашит в контуры, своя плитка на каждую тему.
` +
      `     Рисунков: ${ART_KEYS.length} видов, размещено ${illus}; мелочи ${tinies}. -->
` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` +
      `viewBox="0 0 ${W} ${H}" fill="none" ` +
      `stroke-linecap="round" stroke-linejoin="round">` +
      `<defs>${defs}</defs>${bodyParts.join('')}</svg>
`,
  };
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
let report = '';
for (const theme of ['light', 'dark']) {
  const { svg, uses } = render(theme);
  writeFileSync(join(dir, `pattern-${theme}.svg`), svg, 'utf8');
  report += `  pattern-${theme}.svg — ${uses} расстановок, ${(svg.length / 1024).toFixed(1)} КБ
`;
}

const a = audit();
console.log(
  `${ART_KEYS.length} видов рисунков; размещено ${illus} иллюстраций ` +
  `(${bigs} крупных, ${mids} средних, ${smalls} мелких), ${tinies} мелочи, ` +
  `${holesFilled} добором в пустоты — всего ${placed.length}
` +
  `  минимальный зазор между рисунками: ${a.minGap} px (отрицательный = наложение)
` +
  `  самая большая пустота: радиус ${a.hole} px (предел ${HOLE_MAX})
` +
  `  площадь под рисунками: ${a.coverage}%
` + report
);
