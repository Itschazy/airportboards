// Не сменился ли код IATA у аэропорта, который мы публикуем под старым.
//
// ЗАЧЕМ. 04.09.2026 сайт печатал «Регулярных рейсов нет» про Палм-Бич и про Манас. Поставщик
// действительно отдавал по PBI и FRU ноль — два прохода замера подряд, — но не потому, что
// рейсов нет: КОД СМЕНИЛСЯ. Палм-Бич стал DJT (переименован), Манас — BSZ. Под новыми кодами
// тот же поставщик отдавал 59 и 21 вылет в сутки.
//
// Это худший сорт дефекта: он не проявляется НИКАК. Ответ 200, страница целая, замер честно
// говорит «ноль», обе проверки свежести зелёные — а читателю сообщается прямая неправда про
// работающий международный аэропорт, и она же уходит в описание, в FAQ и в ответные машины.
//
// ЧЕМ ЛОВИТЬ. ICAO при переименовании НЕ меняется. Значит соединение нашего каталога с
// OurAirports по ICAO показывает расхождение кодов сразу: наш IATA против их IATA на одной и
// той же строке. Источник публичный, без ключа, без единого платного запроса.
//
// Проверка сравнивает найденные расхождения с data/airport-code-moves.json и краснеет на
// НОВЫХ. Молча дрейфовать это больше не может. Красное здесь — не «почини код», а «проверь
// руками у поставщика и внеси пару в файл, если новый код отдаёт рейсы».
//
// Usage:  node scripts/check-code-moves.mjs
import fs from 'node:fs';

const SRC = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${m}`); };
console.log('смена кодов IATA против нашего каталога\n');

function splitCsvLine(line) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}

const FILE = JSON.parse(fs.readFileSync('data/airport-code-moves.json', 'utf8'));
const known = FILE.moves ?? {};
/** Пары, где переезда нет: поставщик молчит и по старому коду, и по новому. Проверены руками. */
const gaps = FILE.gaps ?? {};
const svc = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8')).airports ?? {};
const cat = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
const ours = Array.isArray(cat) ? cat : Object.values(cat);
const haveIata = new Set(ours.map((a) => a.iata));

let csv;
try { csv = await (await fetch(SRC, { signal: AbortSignal.timeout(60000) })).text(); }
catch (e) { console.log(`  · OurAirports недоступен (${e.message}) — проверка пропущена, это не провал`); process.exit(0); }

const lines = csv.split('\n').filter(Boolean);
const head = splitCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
const [iId, iIata, iSched, iName, iType] =
  ['ident', 'iata_code', 'scheduled_service', 'name', 'type'].map((h) => head.indexOf(h));
if (iId < 0 || iIata < 0) { console.log('  ✗ схема OurAirports изменилась: нет ident/iata_code'); process.exit(1); }

const byIcao = new Map();
for (const l of lines.slice(1)) {
  const f = splitCsvLine(l);
  const id = (f[iId] || '').trim().toUpperCase();
  if (id) byIcao.set(id, { iata: (f[iIata] || '').trim().toUpperCase(), sched: f[iSched] === 'yes', name: f[iName] || '', type: f[iType] || '' });
}
say(byIcao.size > 50_000, `OurAirports прочитан: ${byIcao.size} строк с ICAO`);

const found = [];
for (const a of ours) {
  if (!a.icao || !a.iata) continue;
  const r = byIcao.get(a.icao.toUpperCase());
  if (!r || !r.iata || r.iata === a.iata) continue;
  // Новый код уже есть в каталоге отдельной записью — это не переезд, а два разных аэропорта
  // (так устроен Берлин: SXF закрыт, BER существует у нас сам по себе).
  if (haveIata.has(r.iata)) continue;
  found.push({ from: a.iata, to: r.iata, sched: r.sched, name: r.name, type: r.type, level: svc[a.iata] ?? null });
}

const unknown = found.filter((f) => known[f.from] !== f.to && gaps[f.from] !== f.to);
const risky = unknown.filter((f) => f.sched && !f.level);
say(risky.length === 0, risky.length
  ? `НОВЫЕ расхождения там, где мы публикуем ноль, а OurAirports знает рейсы — ${risky.length}:\n`
    + risky.map((f) => `      ${f.from} → ${f.to}  ${f.type}  ${f.name.slice(0, 40)}`).join('\n')
    + '\n      проверить у поставщика: schedules?dep_iata=<новый>. Отдаёт рейсы — внести пару\n'
    + '      в data/airport-code-moves.json. Отдаёт пусто — это дыра покрытия, оставить как есть.'
  : 'новых смен кода, ведущих к ложному отрицанию, нет');

/**
 * ТРЕТЬЕ УТВЕРЖДЕНИЕ, и оно уже спасло. В первой редакции файла стояли SRI → AAP, NMT → NYT и
 * SQN → NAM. Все три ICAO совпадали, поставщик по новому коду отвечал — но новый код есть в
 * НАШЕМ каталоге отдельным аэропортом (AAP у нас Andrau Airpark в Хьюстоне). Подмена показала
 * бы на странице одного аэропорта борт другого, и заметить это было бы нечем: борт непустой,
 * рейсы настоящие, всё зелёное.
 */
const collide = Object.entries(known).filter(([, to]) => haveIata.has(to));
say(collide.length === 0, collide.length
  ? `перенос указывает на код, который есть в каталоге СВОИМ аэропортом: ${collide.map(([f, t]) => `${f}→${t}`).join(', ')}`
  : 'ни один перенос не указывает на существующую запись каталога');

const stale = Object.keys(known).filter((c) => !found.some((f) => f.from === c));
say(stale.length === 0, stale.length
  ? `в airport-code-moves.json пары, которых OurAirports больше не подтверждает: ${stale.join(', ')}`
  : `все ${Object.keys(known).length} записанных переносов подтверждаются OurAirports`);

console.log(`\n  расхождений всего ${found.length}, из них записано ${found.length - unknown.length}`);
console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nкоды каталога не разошлись с реальностью');
process.exit(fails ? 1 : 0);
