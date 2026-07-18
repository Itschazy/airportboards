#!/usr/bin/env node
// Repair the machine-generation fingerprint in data/airport-content/*.json.
//
// scripts/gen-content.mjs used to instruct the model to "naturally include the ${lang}
// words for 'online flight board', 'arrivals' and 'departures'". The models complied with
// the ENGLISH literals instead, leaving raw English inside the localized prose of ~62k
// locale-files across all 11 non-English locales. That reads as machine output to both a
// quality algorithm and a human reviewer.
//
// Three ordered passes, cheapest and safest first:
//   A. unwrap  — "arrivals (Ankünfte)" -> "Ankünfte". The model already emitted the correct
//                native term; we just drop the English and the parens. Grammatically safe,
//                because the native word is kept exactly as the model inflected it.
//   B. gloss   — "(online flight board)" with no native partner -> delete the parenthetical.
//   C. bare    — a remaining bare English term -> substitute the locale term. Least safe
//                (inflection can be off), so it runs last and only on what A and B missed.
//
// Pass A refuses to unwrap a parenthetical that is in the wrong script for the locale —
// some ja files carry an Indonesian gloss ("online flight board（papan penerbangan online）")
// and unwrapping there would swap one foreign language for another.
//
// Usage:
//   node scripts/fix-english-leak.mjs           # dry run: counts + sample diffs
//   node scripts/fix-english-leak.mjs --write   # apply
import fs from 'fs';
import path from 'path';

const WRITE = process.argv.includes('--write');
const DIR = 'data/airport-content';

// Locale terms, taken from messages/*.json (home.*_short / nav.*) so the repaired prose
// uses the same wording the UI already ships. The board phrase matches how each locale's
// own copy already refers to it.
const TERMS = {
  ru: { arrivals: 'прилёты', departures: 'вылеты', board: 'онлайн-табло' },
  de: { arrivals: 'Ankünfte', departures: 'Abflüge', board: 'Online-Flugtafel' },
  fr: { arrivals: 'arrivées', departures: 'départs', board: 'tableau des vols en ligne' },
  es: { arrivals: 'llegadas', departures: 'salidas', board: 'panel de vuelos en línea' },
  it: { arrivals: 'arrivi', departures: 'partenze', board: 'tabellone voli online' },
  ja: { arrivals: '到着', departures: '出発', board: 'オンライン発着案内' },
  ko: { arrivals: '도착', departures: '출발', board: '온라인 운항정보' },
  zh: { arrivals: '到达', departures: '出发', board: '在线航班信息板' },
  ar: { arrivals: 'الوصول', departures: 'المغادرة', board: 'لوحة الرحلات' },
  hi: { arrivals: 'आगमन', departures: 'प्रस्थान', board: 'ऑनलाइन फ़्लाइट बोर्ड' },
  tr: { arrivals: 'varışlar', departures: 'kalkışlar', board: 'çevrimiçi uçuş tablosu' },
};

// Locales whose own script is non-Latin: a Latin-script parenthetical there is a foreign
// gloss, not the native term, so pass A must not unwrap it.
const NON_LATIN = { ru: /[Ѐ-ӿ]/, ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/,
  zh: /[一-鿿]/, ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/ };

const EN = '(?:online\\s+flight\\s+board|flight\\s+board|arrivals|departures)';
const OPEN = '[(（「“„«\\[]';
const CLOSE = '[)）」”»\\]]';

const canon = s => {
  const t = s.toLowerCase().replace(/\s+/g, ' ').trim();
  if (t.includes('board')) return 'board';
  return t;
};

// Russian needs the case, not just the word: "информации о arrivals" must become
// "…о прилётах", not "…о прилёты". The governing word sits immediately to the left —
// either a preposition, or (for the second half of "X и Y") the already-correct native
// noun, whose ending we can copy.
const RU_FORMS = {
  arrivals: { nom: 'прилёты', gen: 'прилётов', dat: 'прилётам', prep: 'прилётах', ins: 'прилётами' },
  departures: { nom: 'вылеты', gen: 'вылетов', dat: 'вылетам', prep: 'вылетах', ins: 'вылетами' },
};
const RU_GOV = [
  [/^(о|об|обо|при|в|во|на)$/i, 'prep'],
  [/^(для|из|от|без|до|после|кроме|актуальных|свежих|текущих|отслеживания|расписание|расписания|список|списки|информации|информацию|данных|обновления|табло|раздел|разделов)$/i, 'gen'],
  [/^(по|к|ко|благодаря)$/i, 'dat'],
  [/^(с|со|перед|над|под|за|между|разделами)$/i, 'ins'],
];
const RU_ENDING = [[/(ах|ях)$/i, 'prep'], [/(ов|ев)$/i, 'gen'], [/(ам|ям)$/i, 'dat'], [/(ами|ями)$/i, 'ins']];

function ruCase(left) {
  const words = left.match(/[А-Яа-яЁё-]+/g);
  if (!words) return 'nom';
  for (let i = words.length - 1; i >= Math.max(0, words.length - 3); i--) {
    const w = words[i];
    if (/^и$/i.test(w)) continue;                       // "X и <term>" — keep looking left
    for (const [re, c] of RU_GOV) if (re.test(w)) return c;
    if (/^(прил[её]т|вылет)/i.test(w)) {                 // copy the sibling noun's case
      for (const [re, c] of RU_ENDING) if (re.test(w)) return c;
      return 'nom';
    }
    break;
  }
  return 'nom';
}

function repair(text, loc) {
  const term = TERMS[loc];
  if (!term) return { out: text, a: 0, b: 0, c: 0 };
  let a = 0, b = 0, c = 0;
  let out = text;

  // A. "arrivals (Ankünfte)" -> "Ankünfte"
  out = out.replace(new RegExp(`\\b(${EN})\\s*${OPEN}\\s*([^)）」”»\\]]{1,40}?)\\s*${CLOSE}`, 'gi'),
    (m, en, inner) => {
      const script = NON_LATIN[loc];
      if (script && !script.test(inner)) return m;   // foreign gloss — leave for pass C
      if (new RegExp(EN, 'i').test(inner)) return m; // parenthetical is itself English
      a++;
      return inner.trim();
    });

  // B. a parenthetical English gloss with no native partner -> drop it entirely
  out = out.replace(new RegExp(`\\s*${OPEN}\\s*(${EN})\\s*${CLOSE}`, 'gi'), () => { b++; return ''; });

  // C. whatever bare English survives -> locale term (case-aware for ru)
  out = out.replace(new RegExp(`\\b(${EN})\\b`, 'gi'), (m, _g, off, whole) => {
    c++;
    const key = canon(m);
    if (loc === 'ru' && RU_FORMS[key]) return RU_FORMS[key][ruCase(whole.slice(0, off))];
    return term[key] ?? m;
  });

  // tidy the punctuation the removals can leave behind
  out = out.replace(/[ \t]{2,}/g, ' ')
           .replace(/\s+([,.;:!?、。，])/g, '$1')
           .replace(/(\(|（)\s*(\)|）)/g, '')
           .trim();

  return { out, a, b, c };
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
let touchedFiles = 0, A = 0, B = 0, C = 0, touchedLocales = 0;
const samples = {};

for (const f of files) {
  const p = path.join(DIR, f);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  let dirty = false;
  for (const [loc, txt] of Object.entries(d)) {
    if (loc === 'en' || typeof txt !== 'string') continue;
    const { out, a, b, c } = repair(txt, loc);
    if (out === txt) continue;
    A += a; B += b; C += c; touchedLocales++;
    if (!samples[loc]) samples[loc] = { file: f, before: txt, after: out };
    d[loc] = out;
    dirty = true;
  }
  if (dirty) {
    touchedFiles++;
    if (WRITE) fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  }
}

console.log(`${WRITE ? 'APPLIED' : 'DRY RUN'} — ${files.length} files scanned`);
console.log(`  files changed        : ${touchedFiles}`);
console.log(`  locale strings fixed : ${touchedLocales}`);
console.log(`  A unwrapped gloss    : ${A}`);
console.log(`  B deleted gloss      : ${B}`);
console.log(`  C substituted bare   : ${C}\n`);

for (const [loc, s] of Object.entries(samples)) {
  const win = (t) => {
    const i = t.search(/arrivals|departures|flight board|Ankünfte|прилёт|到着|도착|आगमन|varış/i);
    return t.slice(Math.max(0, i - 70), i + 90);
  };
  console.log(`[${loc}] ${s.file}`);
  console.log(`  было : …${win(s.before)}…`);
  console.log(`  стало: …${win(s.after)}…\n`);
}
if (!WRITE) console.log('Ничего не записано. Повторить с --write.');
