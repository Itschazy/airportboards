// Установленное приложение должно открываться на том языке, который человек выбрал.
//
// Манифест был один на двенадцать локалей, целиком по-английски и со `start_url: '/'`.
// Следствия видел именно тот, кто поставил приложение на домашний экран — самый лояльный
// читатель: имя на экране оставалось «AirportsBoard.live — Live flight boards» на любом языке,
// а запуск уводил в язык БРАУЗЕРА, потому что корень отдаёт 307 по Accept-Language.
//
// Отдельная ловушка, стоившая мне сборки: `app/manifest.ts` — файловая конвенция Next. Пока
// файл существует, Next сам вставляет <link rel="manifest" href="/manifest.webmanifest"> и
// ПЕРЕБИВАЕТ поле `manifest` из generateMetadata, сколько бы его ни объявляли. Поэтому проверка
// смотрит не на конфиг, а на то, что реально стоит в <head> отрисованной страницы.
//
// Usage:  npm run check:manifest -- http://localhost:3002

import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3002';
const LOCALES = ['en', 'ru', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi'];
const RTL = new Set(['ar']);

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

// Конвенция, которая молча отменяет per-locale ссылку.
fs.existsSync('app/manifest.ts') || fs.existsSync('app/manifest.json')
  ? fail('app/manifest.ts существует — Next вставит корневую ссылку и перебьёт локальную')
  : pass('файловой конвенции манифеста нет — ссылку задаёт локаль');

const names = new Set();
let bad = 0;

for (const locale of LOCALES) {
  let head, body;
  try {
    head = await (await fetch(`${BASE}/${locale}`, { headers: { 'user-agent': 'audit-bot' } })).text();
    body = await (await fetch(`${BASE}/${locale}/manifest.webmanifest`, { headers: { 'user-agent': 'audit-bot' } })).text();
  } catch { fail(`${locale}: сервер не ответил`); bad++; continue; }

  const link = head.match(/rel="manifest"\s+href="([^"]*)"/)?.[1];
  if (link !== `/${locale}/manifest.webmanifest`) {
    fail(`${locale}: в <head> ссылка «${link ?? 'нет'}», ожидалась /${locale}/manifest.webmanifest`);
    bad++; continue;
  }

  let m;
  try { m = JSON.parse(body); } catch { fail(`${locale}: манифест не разбирается как JSON`); bad++; continue; }

  const problems = [];
  if (m.start_url !== `/${locale}`) problems.push(`start_url=${m.start_url}`);
  if (m.lang !== locale) problems.push(`lang=${m.lang}`);
  if (m.dir !== (RTL.has(locale) ? 'rtl' : 'ltr')) problems.push(`dir=${m.dir}`);
  if (!m.name) problems.push('нет name');
  // Имя приложения — не приглашение его установить. Первая версия подставляла ui.pwa_title
  // («Добавьте AirportsBoard на экран «Домой»»), и это уехало бы на домашний экран как имя.
  if (/добав|add to|home screen|ホーム画面|바탕 화면|الشاشة الرئيسية/i.test(m.name)) {
    problems.push('name — это приглашение установить, а не имя приложения');
  }
  if (!m.icons?.some((i) => i.sizes === '192x192')) problems.push('нет значка 192px — приложение не устанавливается');
  names.add(m.name);

  problems.length ? (fail(`${locale}: ${problems.join('; ')}`), bad++) : null;
}

if (!bad) pass(`все ${LOCALES.length} манифестов: своё имя, свой start_url, свой lang/dir`);
names.size === LOCALES.length
  ? pass(`имя приложения различается во всех локалях (${names.size} разных)`)
  : fail(`имён всего ${names.size} на ${LOCALES.length} локалей — часть не переведена`);

console.log(failures ? `\n${failures} проблем(ы)` : '\nустановленное приложение откроется на выбранном языке');
process.exit(failures ? 1 : 0);
