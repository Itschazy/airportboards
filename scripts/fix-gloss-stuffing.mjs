#!/usr/bin/env node
/**
 * Strip the keyword-gloss stuffing out of data/airport-content/*.json.
 *
 * The generator prompt used to say "naturally include the words online flight board /
 * arrivals / departures", and the model complied the only way it could on 6,072 airports:
 * it appended a parenthetical translation of the service noun to the service noun itself.
 *
 *     ...check the online flight board (オンラインフライトボード) for arrivals (到着) and departures (出発)
 *     ...check the online flight board (online flight board) to see arrivals (arrivals)
 *     ...view arrivals (arrivals / llegadas) and departures (salidas/departures)
 *
 * 1,187 English paragraphs carry the literal `X (X)` form and 863 carry a foreign-script
 * gloss — together 52% of the English corpus, which is also the ONLY unique prose on an
 * airport page. To a spam classifier (and to an AdSense reviewer) that reads as keyword
 * stuffing on a page whose remaining text is template, which is the most credible
 * explanation on hand for 4,035 pages sitting in "Crawled — currently not indexed".
 *
 * This is a surgical deletion, not a rewrite: the model's actual sentences are fine, so
 * regenerating 72,864 paragraphs would spend real money to re-introduce fresh risk. A gloss
 * is deleted only when it is provably disposable:
 *
 *   1. it repeats the noun it follows, verbatim ("arrivals (arrivals)");
 *   2. it is a slash/comma list containing that noun ("departures (salidas/departures)");
 *   3. it is flagged as a placeholder ("(local: online flight board)");
 *   4. it is written in a script foreign to the locale AND follows a known service noun
 *      in that locale — the last clause is what keeps genuine native names, such as
 *      "Beijing Capital International Airport (北京首都国际机场)", untouched.
 *
 * Everything else — terminal numbers, airline names, native airport names — is left alone.
 *
 *   node scripts/fix-gloss-stuffing.mjs --dry     report only, write nothing
 *   node scripts/fix-gloss-stuffing.mjs           apply
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data', 'airport-content');
const DRY = process.argv.includes('--dry');

/** Scripts a locale is allowed to contain. Latin is allowed everywhere: IATA codes are Latin. */
const NATIVE = {
  en: /[A-Za-z]/, de: /[A-Za-z]/, fr: /[A-Za-z]/, es: /[A-Za-z]/, it: /[A-Za-z]/, tr: /[A-Za-z]/,
  ru: /[Ѐ-ӿ]/, ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/,
  zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/,
};
// Every non-Latin block that turned up in the corpus, not just the six I first guessed at.
// The narrow version missed Thai glosses — "(กระดานเที่ยวบินออนไลน์)", "(เที่ยวบินขาเข้า)" —
// plus Greek, Hebrew and Indic splices, 226 values in all, found only once
// scripts/check-scripts.mjs was pointed at data/airport-content/.
const NON_LATIN = /[\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * The service nouns the prompt asked to be "included", per locale. A foreign-script gloss is
 * only stripped when it hangs off one of these — that is the whole safety margin against
 * deleting a native place name.
 */
const NOUNS = {
  en: ['arrivals', 'departures', 'arrival', 'departure', 'online flight board', 'flight board',
       'flight information board', 'flight information display', 'flight status board'],
  de: ['ankünfte', 'abflüge', 'online-flugtafel', 'flugtafel', 'anzeigetafel', 'ankunft', 'abflug'],
  fr: ['arrivées', 'départs', 'tableau des vols', "tableau d'affichage des vols", 'arrivée', 'départ'],
  es: ['llegadas', 'salidas', 'tablero de vuelos', 'panel de vuelos', 'llegada', 'salida'],
  it: ['arrivi', 'partenze', 'tabellone voli', 'tabellone dei voli', 'arrivo', 'partenza'],
  tr: ['varışlar', 'gidişler', 'uçuş tablosu', 'uçuş bilgi ekranı', 'varış', 'gidiş'],
  ru: ['прилёты', 'вылеты', 'прилеты', 'онлайн-табло', 'табло', 'прилёт', 'вылет'],
  ar: [], hi: [], zh: [], ja: [], ko: [],   // rules 1-3 only; their own script is native
};

const PLACEHOLDER = /^(local|lokal|локально|yerel)\s*[::]/i;

/** Normalise for comparison: lowercase, strip punctuation and accents-insensitive spacing. */
const norm = (s) => s.toLowerCase().replace(/[«»"“”'’.,;:!?]/g, '').replace(/\s+/g, ' ').trim();

/** Does `gloss` merely restate `lead`, the words immediately before the parenthesis? */
function restates(gloss, lead) {
  const g = norm(gloss);
  if (!g) return true;
  const words = norm(lead).split(' ').filter(Boolean);
  // Compare against the last 1..4 words before the bracket — "and departures" must match on
  // "departures", and "online flight board" must match on all three.
  for (let n = 1; n <= 4 && n <= words.length; n++) {
    const tail = words.slice(-n).join(' ');
    if (!tail) continue;
    if (g === tail) return true;
    // slash/comma alternatives: "salidas/departures", "arrivals / llegadas"
    if (g.split(/[/,;|]/).map((p) => p.trim()).includes(tail)) return true;
  }
  return false;
}

/** Does `lead` end with one of the locale's service nouns? */
function endsWithNoun(lead, locale) {
  const l = norm(lead);
  return (NOUNS[locale] || []).some((n) => l.endsWith(norm(n)));
}

/**
 * The same defect behind FULL-WIDTH brackets （）, which CJK prose uses instead of ASCII ().
 *
 * Matching only ASCII parentheses hid 1,521 tautologies in 1,216 files — including
 * オンラインフライトボード（オンラインフライトボード） on 1,498 Japanese pages, the single most
 * repeated defect in the whole corpus. Two shapes, both unambiguous:
 *
 *   X（X）        → X                  exact restatement
 *   X（Y、X）     → X（Y）              restatement inside a separated list; Y is usually the
 *                                      English name or the IATA code and must survive
 */
function cleanFullWidth(text) {
  let removed = 0;
  // Japanese and Chinese are written without spaces, so a leading `([^\s]{2,40})` capture
  // greedily swallows the previous clause and never equals the gloss. Match the bracket
  // alone, then ask whether the text immediately before it ENDS WITH the restated part.
  let out = text.replace(/（\s*([^（）]{1,80}?)\s*）/g, (whole, gloss, offset, full) => {
    const before = full.slice(0, offset);
    const parts = gloss.split(/[/／,、]/).map((p) => p.trim()).filter(Boolean);
    const kept = parts.filter((p) => !(p.length >= 2 && before.endsWith(p)));
    if (kept.length === parts.length) return whole;      // nothing restated — leave alone
    removed++;
    return kept.length ? `（${kept.join('、')}）` : '';
  });
  return { out, removed };
}

function clean(text, locale) {
  const native = NATIVE[locale];
  let removed = 0;
  const fw = cleanFullWidth(text);
  text = fw.out;
  removed += fw.removed;
  // Capture the run of words before "(", then the bracket contents. No nested brackets.
  let out = text.replace(/([^()]{0,60}?)\(([^()]{1,120})\)/g, (whole, lead, gloss) => {
    const disposable =
      restates(gloss, lead) ||
      PLACEHOLDER.test(gloss.trim()) ||
      // foreign script, but only when it is glossing a service noun
      (endsWithNoun(lead, locale) &&
        (locale === 'en' || locale === 'de' || locale === 'fr' || locale === 'es' ||
         locale === 'it' || locale === 'tr' || locale === 'ru'
          ? NON_LATIN.test(gloss) && !native.test(gloss.replace(NON_LATIN, ''))
          : false));
    if (!disposable) return whole;
    removed++;
    return lead;
  });
  if (removed) {
    // Tidy the seams the deletion leaves behind.
    out = out
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+$/gm, '');
  }
  return { out, removed };
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const perLocale = {};
let filesTouched = 0, totalRemoved = 0;
const samples = [];

for (const f of files) {
  const p = path.join(DIR, f);
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  let touched = false;
  for (const [locale, text] of Object.entries(doc)) {
    if (typeof text !== 'string' || !NATIVE[locale]) continue;
    const { out, removed } = clean(text, locale);
    if (!removed) continue;
    perLocale[locale] = (perLocale[locale] || 0) + removed;
    totalRemoved += removed;
    if (samples.length < 8 && locale === 'en') {
      samples.push({ iata: f.replace('.json', ''), before: text.slice(0, 0), diff: [text, out] });
    }
    doc[locale] = out;
    touched = true;
  }
  if (touched) {
    filesTouched++;
    if (!DRY) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  }
}

console.log(`${DRY ? 'DRY RUN — nothing written' : 'applied'}`);
console.log(`files touched : ${filesTouched} of ${files.length}`);
console.log(`glosses removed: ${totalRemoved}`);
console.log('by locale     :', perLocale);
if (samples.length) {
  console.log('\n— sample (English) —');
  for (const s of samples.slice(0, 3)) {
    const [a, b] = s.diff;
    // print the first sentence that actually changed
    const sa = a.split(/(?<=\.)\s/), sb = b.split(/(?<=\.)\s/);
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) { console.log(`  ${s.iata}\n    было: ${sa[i]}\n    стало: ${sb[i]}`); break; }
    }
  }
}
