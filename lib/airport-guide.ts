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
 * Аэропорты, для которых файл заведён руками: data/airport-guide/<IATA>.json — русский оригинал.
 * Остальные 11 языков (решение владельца 25.10.2026) — переводы ТОЛЬКО текстов в
 * data/airport-guide/<locale>/<IATA>.json: { about?, blocks: { <id>: { title, hint, text } } }.
 * Источники, ссылки, дата проверки и basis берутся из оригинала — перевод не может сослаться на
 * другую страницу или «освежить» дату. Нет перевода на язык — справочной на нём нет; нет
 * перевода блока — блок на этом языке не показывается (лучше меньше, чем русский текст на
 * немецкой странице).
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

type GuideTranslation = { about?: string; blocks?: Record<string, { title?: string; hint?: string; text?: string }> };

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
}

export function getAirportGuide(iata: string, locale: string): AirportGuide | null {
  const code = iata.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code) || !/^[a-z]{2}$/.test(locale)) return null;
  const key = `${locale}:${code}`;
  if (cache.has(key)) return cache.get(key)!;
  let guide: AirportGuide | null = null;
  const base = readJson<AirportGuide>(path.join(DIR, `${code}.json`));
  if (base?.blocks?.length) {
    if (locale === 'ru') guide = base;
    else {
      const tr = readJson<GuideTranslation>(path.join(DIR, locale, `${code}.json`));
      if (tr?.blocks) {
        const blocks = base.blocks.flatMap((b) => {
          const t = tr.blocks?.[b.id];
          return t?.title && t.hint && t.text ? [{ ...b, title: t.title, hint: t.hint, text: t.text }] : [];
        });
        // about переводится вместе с оригиналом; нет перевода — не показываем русский.
        if (blocks.length) guide = { ...base, about: base.about && tr.about ? tr.about : undefined, blocks };
      }
    }
  }
  cache.set(key, guide);
  return guide;
}

/**
 * Машиночитаемая сторона справочной (25.10.2026, по чек-листу skill seo-aeo-geo: «извлекаемые
 * ответы + разметка + даты»). Вопросы — те же темы, что и плитки на странице, ответ — дословно
 * видимый текст плитки плюс источник и дата проверки: разметка не обещает ничего, чего читатель
 * не видит. Формулировки в именительном падеже имени («до аэропорта Шереметьево») — склонять
 * имена собственные нельзя (CLAUDE.md, «Имена собственные оставлять в именительном»).
 */
const QUESTION_IDS = new Set(['transport', 'taxi', 'terminals', 'lounges', 'storage', 'sleep', 'kids', 'parking', 'wifi']);

/** Дата проверки в сокращённой числовой форме языка (числа — западные, как по всему сайту). */
export function guideDate(iso: string, numLocale: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(numLocale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d);
}

type Tr = (key: string, values?: Record<string, string>) => string;

export function guideFaq(guide: AirportGuide, name: string, t: Tr, numLocale: string): { q: string; a: string }[] {
  const date = guideDate(guide.checked, numLocale);
  return guide.blocks
    .filter((b) => QUESTION_IDS.has(b.id))
    .map((b) => ({
      q: t(`aguide_q_${b.id}`, { a: name }),
      a: `${b.text} ${guide.basis === 'third-party'
        ? t('aguide_faq_third', { sources: `${b.source}, ${b.source2}`, date })
        : t('aguide_faq_official', { source: b.source, date })}`,
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
