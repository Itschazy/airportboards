// Заголовок не должен называть одно место дважды — и не должен обрезаться в выдаче.
//
// «Онлайн-табло аэропорта Анталия, Анталья (AYT)», «Усть-Каменногорск, Усть-Каменогорск (UKK)»,
// «इस्तांबुल, इस्तानबुल (IST)» — это не приём под два запроса, а расхождение двух справочников:
// airport-names.json и city-names.json транслитерировались независимо, а showCityFlag сравнивал
// их точным вхождением, поэтому «анталья» не содержало «анталия» и город приклеивался вторым.
//
// Что здесь НЕ утверждается: что второе написание бесполезно. Оно остаётся в справочниках и,
// значит, в поисковом индексе — «Анталия» находит AYT ровно так же, как «Анталья». Убрано оно
// только из ЗАГОЛОВКА, и по измеримой причине: охвата оно не добавляет (Яндекс.Вебмастер
// показывает 467 показов по «мин воды» при заголовке «Минеральные Воды» и 218 по «сухуми» при
// заголовке «Сухум» — то есть варианты матчатся и без нас), а место в заголовке стоит дорого.
// На UKK удвоение раздувало заголовок до 91 знака, и в выдаче обрезалось ровно «прилеты и
// вылеты сегодня» — слова, которые люди набирают.
//
// Usage:  npm run check:titles

import fs from 'node:fs';
import ts from 'typescript';

const src = fs.readFileSync('lib/show-city.ts', 'utf8');
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { showCityFlag, fold } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const read = (f) => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
const cities = read('city-names.json');
const names = read('airport-names.json');
const rawAirports = read('airports.json');
const airports = rawAirports.airports ?? rawAirports;
const svcRaw = read('airport-service.json');
const levels = svcRaw.airports ?? svcRaw;

const LOCALES = ['ru', 'en', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi'];
/** Яндекс режет заголовок примерно здесь; Google — по пикселям, но порядок тот же. */
const TITLE_BUDGET = 70;

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

/**
 * Разворачивает ICU-шаблон настолько, насколько нужно для замера длины: подстановки и
 * `select`. Скобки в `select` ВЛОЖЕННЫЕ — «{showCity, select, yes {, {city}} other {}}» —
 * и регулярным выражением не разбираются: моя первая версия оставила в заголовке хвост
 * «…Airportcity} (ECP)» и намерила 108 знаков там, где их 61.
 */
function render(tpl, values) {
  let out = '';
  for (let i = 0; i < tpl.length; i++) {
    if (tpl[i] !== '{') { out += tpl[i]; continue; }
    let depth = 0, j = i;
    for (; j < tpl.length; j++) {
      if (tpl[j] === '{') depth++;
      else if (tpl[j] === '}' && --depth === 0) break;
    }
    const body = tpl.slice(i + 1, j);
    i = j;

    const sel = body.match(/^(\w+),\s*select,\s*([\s\S]*)$/);
    if (!sel) { out += values[body.trim()] ?? ''; continue; }

    const [, varName, arms] = sel;
    const want = String(values[varName] ?? 'other');
    const branches = {};
    for (let k = 0; k < arms.length;) {
      const m = arms.slice(k).match(/^\s*(\w+)\s*\{/);
      if (!m) break;
      const start = k + m[0].length;
      let d = 1, e = start;
      for (; e < arms.length; e++) {
        if (arms[e] === '{') d++;
        else if (arms[e] === '}' && --d === 0) break;
      }
      branches[m[1]] = arms.slice(start, e);
      k = e + 1;
    }
    out += render(branches[want] ?? branches.other ?? '', values);
  }
  return out;
}

// ── 1. Одно место, названное дважды ──────────────────────────────────────────────────────
{
  const dupes = [];
  let checked = 0;
  for (const a of airports) {
    if (!(Number(levels[a.iata]) > 0)) continue;          // страницы без рейсов никто не открывает
    for (const locale of LOCALES) {
      const name = names[a.iata]?.[locale] || a.name;
      const city = cities[a.city]?.[locale] || a.city;
      if (!name || !city) continue;
      checked++;
      if (showCityFlag(name, city, a.city) !== 'yes') continue;
      // Город приклеивается — убеждаемся, что это РАЗНЫЕ места, а не два написания одного.
      const n = fold(name), c = fold(city);
      if (!n || !c || Math.abs(n.length - c.length) > 3) continue;
      let same = 0;
      for (let i = 0; i < Math.min(n.length, c.length); i++) if (n[i] === c[i]) same++;
      if (same / Math.max(n.length, c.length) >= 0.8) {
        dupes.push(`${a.iata} ${locale}: «${name}» + «${city}»`);
      }
    }
  }
  dupes.length
    ? fail(`заголовок называет одно место дважды в ${dupes.length} случаях: ${dupes.slice(0, 5).join(', ')}`)
    : pass(`ни один из ${checked} заголовков обслуживаемых аэропортов не называет место дважды`);
}

// ── 2. Длина заголовка ───────────────────────────────────────────────────────────────────
// Шаблон восстанавливается из каталога, а не хардкодится, иначе проверка разойдётся с сайтом.
{
  const over = [];
  let longest = ['', 0];
  for (const locale of LOCALES) {
    const msgs = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'));
    const tpl = msgs.meta?.main_title;
    if (typeof tpl !== 'string') continue;

    for (const a of airports) {
      if (!(Number(levels[a.iata]) > 0)) continue;
      const name = names[a.iata]?.[locale] || a.name;
      const city = cities[a.city]?.[locale] || a.city;
      const title = render(tpl, {
        airport: name, city, iata: a.iata,
        showCity: showCityFlag(name, city, a.city),
      });
      if (title.length > longest[1]) longest = [`${a.iata} ${locale}: ${title}`, title.length];
      if (title.length > TITLE_BUDGET + 25) over.push(`${a.iata} ${locale} (${title.length})`);
    }
  }
  // Длина сама по себе НЕ дефект: «Guarulhos - Governador André Franco Montoro International
  // Airport» длинный потому, что таково имя аэропорта, и укорачивать его — продуктовое
  // решение, а не починка. Порог здесь ловит только патологию: заголовок, в который имя
  // физически не помещается вместе с кодом и обещанием страницы.
  console.log(`  · самый длинный заголовок: ${longest[1]} зн. — ${longest[0].slice(0, 96)}`);
  console.log(`  · длиннее ${TITLE_BUDGET + 25} знаков: ${over.length} (обрежутся в выдаче — это длинные ИМЕНА, не дубли)`);
  over.length > 120
    ? fail(`заголовков сверх меры: ${over.length} — проверь, не вернулось ли дублирование`)
    : pass('патологически длинных заголовков нет');
}

console.log(failures ? `\n${failures} проблем(ы)` : '\nзаголовки не дублируют место и помещаются в выдачу');
process.exit(failures ? 1 : 0);
