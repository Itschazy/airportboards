// Французская элизия: «d’Amsterdam», а не «de Amsterdam».
//
// Элизия во французском обязательна и перед именами собственными тоже, а шаблоны печатали
// «de» всегда. Отсюда <title>Aéroports de Amsterdam</title> на странице города и H2 «Autres
// aéroports près de Istanbul». Из 11 662 французских названий городов и аэропортов 1669
// требуют «d’» — то есть каждое седьмое.
//
// Предлог теперь приезжает вместе с именем отдельным параметром ({deName}, {deCity}, {deIata}),
// потому что «Le Havre» даёт «du Havre»: предлог и артикль сращиваются, и разделить их в
// шаблоне нельзя.
//
// Проверяется три вещи, и третья — единственная, которая ловит настоящую поломку:
//   1. правило frDe() на известных случаях, включая те, где наивная версия ошибается;
//   2. во французском каталоге не осталось «de {…}» перед именем;
//   3. НА ОТРИСОВАННОЙ СТРАНИЦЕ нет ни голого «{deName}» (параметр не передан в вызов),
//      ни «de » перед гласной (шаблон, который пропустили).
//
// Usage:
//   npm run check:fr                      — правило + каталог
//   npm run check:fr -- http://localhost:3002   — плюс отрисованные страницы
import fs from 'node:fs';

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

// ── 1. Правило ───────────────────────────────────────────────────────────────────────────
const src = fs.readFileSync('lib/fr-elision.ts', 'utf8');
const { frDe } = await import('data:text/javascript;base64,' + Buffer.from(
  src.replace(/export function/g, 'export function').replace(/: string/g, '').replace(/\?\?/g, '??'),
).toString('base64'));

const CASES = [
  ['Amsterdam', 'd’Amsterdam', 'гласная — элизия обязательна'],
  ['Istanbul', 'd’Istanbul', 'гласная'],
  ['Édimbourg', 'd’Édimbourg', 'гласная с диакритикой'],
  ['Oslo', 'd’Oslo', 'гласная'],
  ['Paris', 'de Paris', 'согласная'],
  ['Hambourg', 'de Hambourg', 'h придыхательное — наивное правило дало бы «d’Hambourg»'],
  ['Houston', 'de Houston', 'h: по умолчанию без элизии'],
  ['York', 'de York', 'y даёт согласный звук — не «d’York»'],
  ['Yokohama', 'de Yokohama', 'y'],
  ['Le Havre', 'du Havre', 'артикль сращивается с предлогом'],
  ['Le Caire', 'du Caire', 'артикль'],
  ['Les Saintes', 'des Saintes', 'артикль во множественном'],
  ['Los Angeles', 'de Los Angeles', 'испанский артикль французским не считается'],
  ['Las Vegas', 'de Las Vegas', 'то же'],
  ['北京', 'de 北京', 'нелатиница — элизию не угадываем'],
  ['Žilina', 'de Žilina', 'согласная с диакритикой'],
  ['Ōita', 'd’Ōita', 'гласная с макроном'],
  // Перед кодом ИАТА элизии нет НИКОГДА. Правило «по названию буквы» (effe → d’FRA) верно
  // для устной речи и неверно для этого текста: на проде оно дало «10 km d’FRA», «42 km d’MUC».
  ['IST', 'de IST', 'код ИАТА — предлог полный'],
  ['AMS', 'de AMS', 'то же, хотя буква «a» гласная'],
  ['FRA', 'de FRA', 'то же'],
  ['KZN', 'de KZN', 'то же'],
  ['MSQ', 'de MSQ', 'то же'],
];
let bad = 0;
for (const [input, want, why] of CASES) {
  const got = frDe(input);
  if (got !== want) { fail(`frDe("${input}") = "${got}", ожидалось "${want}" — ${why}`); bad++; }
}
if (!bad) pass(`правило верно на ${CASES.length} случаях, включая h, y, артикли и аббревиатуры`);

// ── 2. Каталог ───────────────────────────────────────────────────────────────────────────
{
  const fr = JSON.parse(fs.readFileSync('messages/fr.json', 'utf8'));
  const leftovers = [];
  for (const [ns, group] of Object.entries(fr)) {
    if (!group || typeof group !== 'object') continue;
    for (const [k, v] of Object.entries(group)) {
      if (typeof v !== 'string') continue;
      // «de {name}» перед подстановкой имени. {count}, {km}, {m} и прочие числа не в счёт.
      const m = v.match(/\b[Dd]e \{(name|city|iata|a|airport|successor|predecessors)\}/);
      if (m) leftovers.push(`${ns}.${k}: «…${m[0]}…»`);
    }
  }
  leftovers.length
    ? leftovers.forEach((l) => fail(`во французском осталось «de» перед именем — ${l}`))
    : pass('во французском каталоге не осталось «de {имя}»');
}

// ── 2b. Каждый {deXxx} должен передаваться в КАЖДЫЙ вызов своего ключа ───────────────────
//
// Отрисованная страница этот дефект не показывает: next-intl не печатает голый «{deA}», он
// бросает FORMATTING_ERROR, пишет его в лог сборки и отдаёт строку как есть. Проверка по
// видимому тексту проходила, а французская фраза на 2389 страницах теряла предлог — поймано
// только чтением журнала `next build`. Поэтому связь «ключ → параметр → вызов» проверяется
// статически, по исходникам.
{
  // ВСЕ каталоги, а не только французский. Первая версия смотрела на fr, поэтому пропустила
  // {deAirport} в немецком и {arAirport} в арабском: 1141 FORMATTING_ERROR за одну сборку,
  // и ни одного видимого следа на странице — next-intl не печатает голый плейсхолдер, он
  // бросает исключение, пишет его в журнал и отдаёт строку как есть.
  const needs = new Map();                       // ключ → набор параметров-форм имени
  for (const file of fs.readdirSync('messages').filter((f) => f.endsWith('.json'))) {
    const cat = JSON.parse(fs.readFileSync(`messages/${file}`, 'utf8'));
    for (const [ns, group] of Object.entries(cat)) {
      if (!group || typeof group !== 'object') continue;
      for (const [k, v] of Object.entries(group)) {
        if (typeof v !== 'string') continue;
        // {deName}, {deCity}, {deIata}, {deA}, {dePredecessors}, {deAirport}, {arAirport}
        const params = [...v.matchAll(/\{((?:de|ar)[A-Z]\w*)\}/g)].map((m) => m[1]);
        if (params.length) needs.set(k, new Set([...(needs.get(k) ?? []), ...params]));
      }
    }
  }

  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) files.push(p);
    }
  };
  walk('app'); walk('components');

  const missing = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const [key, params] of needs) {
      // вызов вида t('key', { … }) — берём содержимое объекта до закрывающей скобки вызова
      const re = new RegExp(`\\b\\w*t?\\w*\\(\\s*['"\`]${key}['"\`]\\s*,\\s*\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}`, 'g');
      for (const m of src.matchAll(re)) {
        // Раскрытие объекта: `t('key', { ...N, code })`. Значения лежат в объявлении N,
        // а не в самом вызове — без этого проверка объявляет дефектом ровно тот приём,
        // которым этот класс дефектов и лечится.
        let body = m[1];
        for (const sp of body.matchAll(/\.\.\.(\w+)/g)) {
          const decl = src.match(new RegExp(`const ${sp[1]}\\s*=\\s*\\{([^}]*)\\}`));
          if (decl) body += ` ${decl[1]}`;
        }
        for (const p of params) {
          if (!new RegExp(`\\b${p}\\b`).test(body)) {
            missing.push(`${file}: ${key} без ${p}`);
          }
        }
      }
    }
  }
  missing.length
    ? missing.slice(0, 6).forEach((m) => fail(`параметр не передан — ${m}`))
    : pass(`все ${needs.size} ключей с формами имени получают свои параметры во всех вызовах`);
}

// ── 3. Отрисованные страницы ─────────────────────────────────────────────────────────────
const BASE = process.argv[2];
if (!BASE) {
  console.log('\n  · страницы не проверены — передай адрес сервера: npm run check:fr -- http://localhost:3002');
} else {
  const PAGES = ['/fr/city/amsterdam', '/fr/city/istanbul', '/fr/airport/IST', '/fr/airport/AMS',
    '/fr/airport/CDG', '/fr/airport/KZN', '/fr/city/paris'];
  for (const path of PAGES) {
    let html;
    try {
      const r = await fetch(BASE + path, { headers: { 'user-agent': 'audit-bot' } });
      html = await r.text();
    } catch { fail(`${path}: сервер не ответил`); continue; }

    // RSC-пейлоад содержит копии строк — вырезаем скрипты, иначе меряем не то, что видит читатель.
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '');

    const raw = visible.match(/\{de[A-Z]\w*\}/);
    if (raw) { fail(`${path}: параметр не передан в вызов — на странице напечатано «${raw[0]}»`); continue; }

    // Код ИАТА исключён: перед ним предлог полный по правилу (см. lib/fr-elision.ts), а
    // регулярка иначе считает «de IST» пропущенной элизией — букву «I» она видит гласной.
    const missed = [...visible.matchAll(/\bde (?![A-Z]{2,4}\b)([AEIOUÉÈÊÀÂÎÔÛaeiouéèêàâîôû][\wÀ-ÿ]{2,})/g)]
      .map((m) => m[0])
      // «de» перед нарицательным словом французского текста элизии не требует по нашим правилам
      // ровно тогда, когда слово начинается с согласной; сюда попадают только гласные, поэтому
      // отсеиваем известные служебные слова самого французского текста.
      .filter((s) => !/^de (aujourd|arrivées|un |une |environ|autres|options|escales|informations)/i.test(s));
    missed.length
      ? fail(`${path}: пропущенная элизия — ${[...new Set(missed)].slice(0, 4).join(', ')}`)
      : pass(`${path}: элизия на месте`);
  }
}

console.log(failures ? `\n${failures} проблем(ы)` : '\nфранцузский предлог согласован с именем');
process.exit(failures ? 1 : 0);
