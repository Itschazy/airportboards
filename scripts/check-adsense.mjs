// Соответствует ли живой сайт тому, что репозиторий говорит про AdSense.
//
// ЗАЧЕМ ЭТОТ СТОРОЖ СУЩЕСТВУЕТ. Рекламный код включается и выключается ОДНОЙ переменной
// NEXT_PUBLIC_ADSENSE_CLIENT, и это переменная СБОРКИ: она инлайнится в страницы во время
// `npm run build`, а не читается живым процессом. Значит между «в репозитории включено» и
// «на сайте есть» помещается целый выкат, который может не доехать — и уже не доезжал:
// 11–12.08.2026 пять коммитов подряд не доехали до прода, сайт при этом отвечал 200.
//
// Цена незамеченного расхождения несимметрична и потому стоит отдельной проверки:
//   · код пропал, а консоль AdSense ждёт подтверждения — проверка права собственности
//     проваливается, и это выясняется только в консоли, руками;
//   · код появился, когда его не ждали, — страницы тянут рекламный скрипт и CMP ради
//     рекламы, которой нет (ровно за это его и выключали 03.08.2026).
//
// 🔴 УТВЕРЖДЕНИЕ ПРО ПОРЯДОК — САМОЕ ВАЖНОЕ ЗДЕСЬ. Консоль AdSense выдаёт фрагмент с `async`
// и велит вставить его в <head>. Сделать так нельзя: React 19 поднимает `async`-скрипты в
// <head>, а инлайновая настройка Consent Mode остаётся в <body>, и рекламный код успевает
// выполниться ДО согласия — для посетителя из ЕЭЗ это персонализация без разрешения.
// Поэтому загрузчик у нас `defer` и идёт ПОСЛЕ настройки согласия. Проверка меряет это
// байтовыми позициями в выданном HTML, а не доверием к коду компонента.
//
// Провайдерских запросов ноль: страницы читаются под audit-bot, то есть из хранилища.
//
// Usage:  node scripts/check-adsense.mjs [base]

import fs from 'node:fs';

const BASE = process.argv[2] || 'https://airportsboard.live';
/** Страницы разных типов и локалей; MUC — немецкая, то есть та самая ЕЭЗ. */
const PAGES = ['/ru/airport/CEK', '/en', '/de/airport/MUC'];

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

// ── Источник истины — репозиторий, а не живой сайт ───────────────────────────────────────
const ENV = fs.readFileSync('.env.production', 'utf8');
const m = /^NEXT_PUBLIC_ADSENSE_CLIENT=(ca-pub-\d+)\s*$/m.exec(ENV);
const expected = m ? m[1] : null;
console.log(`AdSense: в .env.production ${expected ? `включён (${expected})` : 'ВЫКЛЮЧЕН'} · проверяем ${BASE}\n`);

const get = async (path) => {
  const r = await fetch(`${BASE}${path}`, { headers: { 'user-agent': 'audit-bot' } });
  return { status: r.status, html: await r.text() };
};

const pages = [];
for (const p of PAGES) {
  try { pages.push({ path: p, ...(await get(p)) }); }
  catch (e) { say(false, `${p} не открылась: ${String(e).slice(0, 60)}`); }
}
say(pages.length === PAGES.length && pages.every((p) => p.status === 200),
  `страниц снято: ${pages.length} из ${PAGES.length}`);

const adsTxt = await get('/ads.txt').catch(() => ({ status: 0, html: '' }));

if (!expected) {
  // Симметрия: выключено в репозитории — значит и на сайте ничего быть не должно.
  const leaked = pages.filter((p) => /adsbygoogle\.js|google-adsense-account/.test(p.html));
  say(leaked.length === 0, leaked.length
    ? `AdSense выключен в репозитории, но ЖИВ на сайте: ${leaked.map((p) => p.path).join(', ')}`
    : 'на сайте рекламного кода тоже нет — репозиторий и прод сходятся');
  say(!/DIRECT/.test(adsTxt.html), /DIRECT/.test(adsTxt.html)
    ? '/ads.txt заявляет издателя, хотя AdSense выключен'
    : '/ads.txt без строки издателя — верно для выключенного AdSense');
} else {
  const pubId = expected.replace(/^ca-/, '');

  // 1. Мета-тег подтверждения владения — им и стоит подтверждаться в консоли.
  const metaRe = new RegExp(`<meta[^>]+name="google-adsense-account"[^>]+content="${expected}"`);
  const metaOk = pages.filter((p) => metaRe.test(p.html));
  say(metaOk.length === pages.length,
    metaOk.length === pages.length
      ? `мета-тег google-adsense-account с ${expected} на всех ${pages.length} страницах`
      : `мета-тега НЕТ на: ${pages.filter((p) => !metaRe.test(p.html)).map((p) => p.path).join(', ')}`);

  // 2. Загрузчик с тем же издателем.
  const loaderRe = new RegExp(`adsbygoogle\\.js\\?client=${expected}`);
  const loaderOk = pages.filter((p) => loaderRe.test(p.html));
  say(loaderOk.length === pages.length,
    loaderOk.length === pages.length
      ? `загрузчик adsbygoogle.js с тем же издателем на всех страницах`
      : `загрузчика НЕТ на: ${pages.filter((p) => !loaderRe.test(p.html)).map((p) => p.path).join(', ')}`);

  // 3. Загрузчик НЕ async — иначе React поднимет его в <head>, выше настройки согласия.
  const asyncLoader = pages.filter((p) => /<script[^>]*\basync\b[^>]*adsbygoogle\.js/.test(p.html)
    || /<script[^>]*adsbygoogle\.js[^>]*\basync\b/.test(p.html));
  say(asyncLoader.length === 0, asyncLoader.length
    ? `загрузчик стал ASYNC на ${asyncLoader.map((p) => p.path).join(', ')} — он уедет в <head> выше согласия`
    : 'загрузчик не async — остаётся в порядке документа');

  // 4. Настройка согласия идёт РАНЬШЕ рекламного кода. Байтовые позиции, а не доверие.
  for (const p of pages) {
    const consentAt = p.html.indexOf("gtag('consent','default'");
    const loaderAt = p.html.search(loaderRe);
    if (consentAt === -1 || loaderAt === -1) { say(false, `${p.path}: не нашёл оба маркера для сравнения порядка`); continue; }
    say(consentAt < loaderAt,
      consentAt < loaderAt
        ? `${p.path}: согласие (байт ${consentAt}) раньше рекламы (байт ${loaderAt})`
        : `${p.path}: РЕКЛАМА (байт ${loaderAt}) РАНЬШЕ СОГЛАСИЯ (байт ${consentAt}) — посетитель из ЕЭЗ получит персонализацию без разрешения`);
  }

  // 5. ads.txt заявляет того же издателя.
  const line = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;
  say(adsTxt.status === 200 && adsTxt.html.includes(line),
    adsTxt.status === 200 && adsTxt.html.includes(line)
      ? `/ads.txt содержит строку издателя ${pubId}`
      : `/ads.txt (HTTP ${adsTxt.status}) НЕ содержит «${line}»: ${adsTxt.html.trim().slice(0, 80)}`);
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nсайт и репозиторий говорят про AdSense одно и то же');
process.exit(fails ? 1 : 0);
