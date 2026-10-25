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
  /** Домен второй страницы — обязателен у справочной basis: 'third-party' (см. ниже). */
  source2?: string;
};
/** about — абзац «Об аэропорте» из тех же официальных источников; заменяет сгенерированный
 *  (lib/airport-content.ts). Необязателен: нет подтверждённых фактов — остаётся старый. */
export type AirportGuide = {
  iata: string; checked: string; about?: string; about_url?: string; blocks: GuideBlock[];
  /**
   * 'third-party' — у аэропорта нет официального сайта, и факты взяты со сторонних (25.10.2026,
   * решение владельца, Хургада и Шарм-эш-Шейх — две самые посещаемые страницы сайта). Правило
   * для таких файлов жёстче, а не мягче: в блок идёт только то, что совпало минимум на ДВУХ
   * независимых сайтах (url/source и url2/source2 с разных доменов), а читатель и разметка видят
   * «по данным сторонних сайтов», а не «официальный сайт». Почему не пользовательские данные
   * как есть: на Бодруме два гайда дали тариф шаттла «10 лир» и «230 ₺» для одного маршрута.
   */
  basis?: 'third-party';
};

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

/**
 * Машиночитаемая сторона справочной (25.10.2026, по чек-листу skill seo-aeo-geo: «извлекаемые
 * ответы + разметка + даты»). Вопросы — те же темы, что и плитки на странице, ответ — дословно
 * видимый текст плитки плюс источник и дата проверки: разметка не обещает ничего, чего читатель
 * не видит. Формулировки в именительном падеже имени («до аэропорта Шереметьево») — склонять
 * имена собственные нельзя (CLAUDE.md, «Имена собственные оставлять в именительном»).
 */
const QUESTIONS: Record<string, string> = {
  transport: 'Как доехать до аэропорта {a}?',
  taxi: 'Где такси и остановки у аэропорта {a}?',
  terminals: 'Как устроены терминалы аэропорта {a}?',
  lounges: 'Где бизнес-залы в аэропорту {a} и сколько стоит вход?',
  storage: 'Где камера хранения в аэропорту {a}?',
  sleep: 'Где поспать в аэропорту {a}?',
  kids: 'Где в аэропорту {a} отдохнуть с ребёнком?',
  parking: 'Как устроена парковка у аэропорта {a}?',
  wifi: 'Есть ли в аэропорту {a} бесплатный Wi‑Fi?',
};

const ruDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
};

export function guideFaq(guide: AirportGuide, name: string): { q: string; a: string }[] {
  return guide.blocks
    .filter((b) => QUESTIONS[b.id])
    .map((b) => ({
      q: QUESTIONS[b.id].replace('{a}', name),
      a: guide.basis === 'third-party'
        ? `${b.text} По данным сторонних сайтов (${b.source}, ${b.source2}), совпадает на обоих; проверено ${ruDate(guide.checked)}.`
        : `${b.text} По данным ${b.source}, проверено ${ruDate(guide.checked)}.`,
    }));
}

const AMENITY: Record<string, string> = {
  lounges: 'Бизнес-зал', storage: 'Камера хранения', sleep: 'Гостиница или капсулы',
  kids: 'Комната матери и ребёнка', parking: 'Парковка', wifi: 'Бесплатный Wi‑Fi',
};

/** amenityFeature для узла Airport — только то, что подтверждено блоком справочной. */
export function guideAmenities(guide: AirportGuide | null) {
  if (!guide) return {};
  const feats = guide.blocks
    .filter((b) => AMENITY[b.id])
    .map((b) => ({ '@type': 'LocationFeatureSpecification', name: AMENITY[b.id], value: true }));
  return feats.length ? { amenityFeature: feats } : {};
}

/** Коды аэропортов со справочной — для llms.txt. */
export function guideIatas(): string[] {
  try {
    return fs.readdirSync(DIR).filter((f) => /^[A-Z]{3}\.json$/.test(f)).map((f) => f.slice(0, 3)).sort();
  } catch { return []; }
}
