// Показывается ли сгенерированный моделью абзац там, где его быть не должно, — и остался ли
// он там, где его сняли бы по ошибке.
//
// ЗАЧЕМ ЭТОТ СТОРОЖ СУЩЕСТВУЕТ. 24.09.2026 абзацы «About X Airport» из data/airport-content
// (scripts/gen-content.mjs, 6 073 файла × 12 языков) сняты со всех языков, кроме русского —
// причины в lib/airport-content.ts. Граница держится одной строкой кода, а нарушается двумя
// разными способами, и оба молчаливы:
//
//   · абзац возвращается на снятые языки. Самый вероятный путь — фолбэк: прежний
//     `obj[locale] || obj.en` отдавал английский сгенерированный текст на любой локали, где
//     своего нет. Страница при этом цела и выглядит даже «богаче»;
//   · абзац пропадает с РУССКОГО. Русские страницы — единственный канал с людьми (Яндекс),
//     а изменение их текста без замера на этом канале — ровно то, от чего граница защищает.
//
// Ищется по ВИДИМОМУ тексту (без <script>): в RSC-нагрузке лежит весь каталог сообщений, и
// поиск по сырому HTML отвечает «да» на любой вопрос.
//
// Usage:  node scripts/check-generated-prose.mjs [base]

import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3002';
const UA = { 'user-agent': 'audit-bot' };
const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
/** Аэропорты заведомо с обслуживанием — на остальных секция не рисуется в любом случае. */
const AIRPORTS = ['KZN', 'MUC', 'HLN'];

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

// Граница читается из кода, а не дублируется здесь.
const SRC = fs.readFileSync('lib/airport-content.ts', 'utf8');
const m = /GENERATED_PROSE_LOCALES[^=]*=\s*new Set\(\[([^\]]*)\]\)/.exec(SRC);
const KEEP = m ? [...m[1].matchAll(/'([a-z]{2})'/g)].map((x) => x[1]) : null;
say(!!KEEP, KEEP ? `сгенерированный текст оставлен на: ${KEEP.join(', ') || '(нигде)'}` : 'GENERATED_PROSE_LOCALES не найден в lib/airport-content.ts');
if (!KEEP) process.exit(1);
say(KEEP.includes('ru'), KEEP.includes('ru') ? 'русский в списке — канал с людьми не тронут' : 'РУССКОГО НЕТ в списке: текст снят с единственного канала, который приносит людей');

const visible = (html) => ((html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1])
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
/** Первые 80 знаков — устойчиво к тому, что карточка может обрезать хвост под «читать далее». */
const head = (s) => norm(s).slice(0, 80);

const leaked = [], lost = [];
let checked = 0;
for (const iata of AIRPORTS) {
  const prose = JSON.parse(fs.readFileSync(`data/airport-content/${iata}.json`, 'utf8'));
  for (const loc of LOCALES) {
    const r = await fetch(`${BASE}/${loc}/airport/${iata}`, { headers: UA });
    if (r.status !== 200) { say(false, `/${loc}/airport/${iata} ответил ${r.status}`); continue; }
    const text = norm(visible(await r.text()));
    checked++;
    const own = prose[loc] ? text.includes(head(prose[loc])) : false;
    const fromEn = loc !== 'en' && prose.en ? text.includes(head(prose.en)) : false;
    if (KEEP.includes(loc)) {
      if (!own) lost.push(`${loc}/${iata}`);
    } else if (own || fromEn) {
      leaked.push(`${loc}/${iata}${fromEn ? ' (английский фолбэк)' : ''}`);
    }
  }
}

say(checked > 0, `страниц проверено: ${checked}`);
say(leaked.length === 0, leaked.length
  ? `сгенерированный абзац ВЕРНУЛСЯ на снятые языки: ${leaked.join(', ')}`
  : 'на снятых языках сгенерированного абзаца нет — ни своего, ни английского');
say(lost.length === 0, lost.length
  ? `абзац ПРОПАЛ там, где оставлен намеренно: ${lost.join(', ')}`
  : `на ${KEEP.join(', ')} абзац на месте`);

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nсгенерированный текст стоит ровно там, где решено');
process.exit(fails ? 1 : 0);
