// Виджет /embed — поверхность, у которой не было ни одной проверки, и она за это поплатилась.
//
// Виджет существует, чтобы его ставили на ЧУЖИЕ сайты: он отдаётся с X-Frame-Options ALLOWALL
// и frame-ancestors *. То есть его дефекты видит не наш посетитель, а чужая аудитория, и мы
// об этом не узнаём — аналитики на нём нет, ссылок на него с сайта нет, в отчётах он не виден.
//
// 13.08 разбор нашёл, что виджет печатал вместо возраста данных СЫРОЙ шаблон ICU:
//
//     ru:  «Обновлено {h, number} ч назад»
//     ar:  «تم التحديث قبل {h, plural, one {ساعة واحدة} two {ساعتين} few {# ساعات} …}»  — 90 знаков
//
// Причина: route handler подставлял значения строковой заменой `.replace('{h}', …)`, и это
// работало ровно до тех пор, пока в каталогах лежали голые плейсхолдеры. Как только у ключей
// появились система счисления и множественное число, замене стало нечего искать. Ветка минут
// при этом не срабатывает почти никогда — борт моложе часа редкость, — так что штатным видом
// виджета был сырой ICU.
//
// Проверяется главное свойство: в выводе не должно быть НИ ОДНОГО шаблона. Всё, что похоже
// на `{x, number}` или `{x, plural, …}`, — это невыполненная подстановка.
//
// Провайдерские эндпоинты не трогаются: виджет читает хранилище (getBoard с live=false).
//
// Usage:  node scripts/check-embed.mjs [base]

const BASE = process.argv[2] || 'http://localhost:3002';
const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
const CODES = ['SVO', 'KZN', 'JFK'];

/** Невыполненная подстановка ICU: `{x, number}`, `{x, plural, …}`, `{x, select, …}`. */
const RAW_ICU = /\{\s*\w+\s*,\s*(number|plural|select|date|time)\b/;
/** Голый плейсхолдер тоже дефект: `{date}`, `{name}`. */
const RAW_VAR = /\{\s*[a-z][a-zA-Z0-9_]*\s*\}/;

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`виджет /embed (${BASE})\n`);

let checked = 0;
for (const loc of LOCALES) {
  for (const code of CODES) {
    const url = `${BASE}/embed/${code}?lang=${loc}`;
    let html, status;
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'audit-bot' } });
      status = res.status;
      html = await res.text();
    } catch (e) {
      say(false, `${loc}/${code}: не ответил — ${e.message}`);
      continue;
    }
    checked++;

    if (status !== 200) { say(false, `${loc}/${code}: HTTP ${status}`); continue; }

    const icu = RAW_ICU.exec(html);
    const bare = RAW_VAR.exec(html);
    if (icu) {
      say(false, `${loc}/${code}: СЫРОЙ ШАБЛОН ICU в выводе — «${html.slice(icu.index, icu.index + 60)}…»`);
      continue;
    }
    if (bare) {
      say(false, `${loc}/${code}: невыполненная подстановка «${bare[0]}»`);
      continue;
    }
    // Ключ каталога, просочившийся вместо текста.
    if (/\b(ui|home|meta|nav)\.[a-z_]{3,}/.test(html.replace(/<[^>]+>/g, ' '))) {
      say(false, `${loc}/${code}: в тексте виден ключ каталога`);
      continue;
    }
  }
}

say(checked > 0, `проверено ответов: ${checked} (${LOCALES.length} локалей × ${CODES.length} кодов)`);

// Виджет обязан оставаться встраиваемым — это его единственное назначение.
try {
  const res = await fetch(`${BASE}/embed/SVO`, { headers: { 'user-agent': 'audit-bot' } });
  const xfo = res.headers.get('x-frame-options');
  const csp = res.headers.get('content-security-policy') ?? '';
  say(xfo === 'ALLOWALL' || /frame-ancestors\s+\*/.test(csp),
    `встраивание разрешено (X-Frame-Options: ${xfo ?? '—'}${csp ? ', CSP есть' : ''})`);
} catch { say(false, 'не удалось проверить заголовки встраивания'); }

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nвиджет не печатает шаблонов и остаётся встраиваемым');
process.exit(fails ? 1 : 0);
