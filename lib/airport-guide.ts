import fs from 'fs';
import path from 'path';

/**
 * Справочная по аэропорту: бизнес-залы, камера хранения, где поспать, как доехать (25.10.2026).
 *
 * ЧЕМ ЭТО НЕ ЯВЛЯЕТСЯ. Это не сгенерированный «SEO-текст» — правило CLAUDE.md «писать нельзя,
 * вычислять можно» остаётся в силе. Каждый блок — факты с ОДНОЙ официальной страницы (сайт
 * аэропорта, аэроэкспресса, парковки), ссылка и дата проверки печатаются под текстом. Чего нет
 * на официальной странице, того нет и здесь: у DME нет блока Wi‑Fi, у VKO — комнаты «в
 * терминале Д», потому что сайт аэропорта сам себе противоречит.
 *
 * Только русский и только аэропорты, для которых файл заведён руками: data/airport-guide/<IATA>.json.
 * Перевода на 11 языков пока нет сознательно — сначала замер, приносит ли блок трафик.
 * Факты стареют: цены и часы меняются, поэтому дата проверки видна читателю, а при
 * обновлении файла её надо менять вместе с текстом.
 */
export type GuideBlock = {
  id: string;
  title: string;
  hint: string;
  text: string;
  source: string;
  url: string;
  url2?: string;
};
export type AirportGuide = { iata: string; checked: string; blocks: GuideBlock[] };

const DIR = path.join(process.cwd(), 'data/airport-guide');
const cache = new Map<string, AirportGuide | null>();

export function getAirportGuide(iata: string, locale: string): AirportGuide | null {
  if (locale !== 'ru') return null;
  const code = iata.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  if (cache.has(code)) return cache.get(code)!;
  let guide: AirportGuide | null = null;
  try {
    const g = JSON.parse(fs.readFileSync(path.join(DIR, `${code}.json`), 'utf8')) as AirportGuide;
    if (g?.blocks?.length) guide = g;
  } catch { /* файла нет — справочной у аэропорта нет */ }
  cache.set(code, guide);
  return guide;
}
