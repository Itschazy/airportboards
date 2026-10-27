#!/usr/bin/env node
/**
 * Контрольный лист: все рисунки фона в сетке, с подписями.
 *
 *   node scripts/glyph-sheet.mjs   →   public/_glyph-sheet.svg
 *   открыть: http://localhost:3000/_glyph-sheet.svg
 *
 * Нужен для проверки самих рисунков. На обоях они повёрнуты, уменьшены и
 * перемешаны, поэтому сломанный путь там выглядит как случайная закорючка и
 * найти его невозможно. Здесь каждый стоит прямо, в своём размере и подписан.
 * Файл служебный, на сайте не используется.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'gen-pattern.mjs'), 'utf8');

// Вытаскиваем ART из генератора, не дублируя его: один источник правды.
const body = src.slice(src.indexOf('const ART = {'), src.indexOf('/* Мелочь между рисунками'));
const ART = {};
for (const m of body.matchAll(/^\s{2}([a-z_0-9]+):\s*'(.+?)',\s*$/gm)) ART[m[1]] = m[2];

const keys = Object.keys(ART);
const COLS = 5;
const CELL = 120;
const rows = Math.ceil(keys.length / COLS);

let out = '';
keys.forEach((k, i) => {
  const cx = (i % COLS) * CELL;
  const cy = Math.floor(i / COLS) * CELL;
  out +=
    `<g transform="translate(${cx + 10} ${cy + 10})">` +
    `<rect width="100" height="100" rx="10" fill="none" stroke="#24304a"/>` +
    `<g transform="translate(18 14) scale(1.05)" fill="none" stroke="#6fe3d4" stroke-width="1.4" ` +
    `stroke-linecap="round" stroke-linejoin="round"><path d="${ART[k]}"/></g>` +
    `<text x="50" y="112" fill="#8fa0c0" font-family="monospace" font-size="9" text-anchor="middle">${k}</text>` +
    `</g>`;
});

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * CELL + 20}" ` +
  `viewBox="0 0 ${COLS * CELL} ${rows * CELL + 20}">` +
  `<rect width="100%" height="100%" fill="#0b0e14"/>${out}</svg>\n`;

writeFileSync(join(here, '..', 'public', '_glyph-sheet.svg'), svg, 'utf8');
console.log(`лист собран: ${keys.length} рисунков, ${COLS}×${rows}`);
