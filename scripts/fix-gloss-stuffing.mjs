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

/**
 * A gloss can also be written in a LATIN-SCRIPT foreign language, and the first version of
 * this script missed every one of those: rule 4 asked whether the bracket contained a foreign
 * SCRIPT, so "arrivals (llegadas)" and "departures (vertrekken)" sailed through while
 * "arrivals (到着)" was removed. 7,020 occurrences across 2,519 files — 41% of the corpus —
 * survived the first pass for exactly that reason:
 *
 *     684 (salidas)   627 (llegadas)   574 (départs)   573 (arrivées)
 *     428 (tableau des vols en ligne)  260 (chegadas)  124 (keberangkatan)
 *     103 (ankünfte)  101 (ankomster)   52 (avganger)   42 (kalkışlar)
 *
 * The safe generalisation is positional rather than linguistic: a bracket that opens
 * IMMEDIATELY after a service noun is a gloss of that noun, whatever language it is in,
 * because that is precisely what the old prompt asked for. Measured across the English
 * corpus, exactly ONE of those 7,020 brackets contains a digit or a terminal/gate word — so
 * excluding those keeps the only legitimate shape ("departures (Terminal 2)") and removes the
 * rest.
 */
const LEGIT_IN_BRACKET = /\d|terminal|gate|hall|concourse|pier|level|floor|building|wing/i;

/** Service nouns for the locales whose own script made rules 1-4 sufficient until now. */
const NOUNS_EXTRA = {
  ar: ['الوصول', 'القادمون', 'المغادرة', 'المغادرون', 'لوحة الرحلات', 'لوحة الرحلات الإلكترونية'],
  hi: ['आगमन', 'प्रस्थान', 'ऑनलाइन फ्लाइट बोर्ड', 'फ्लाइट बोर्ड'],
  zh: ['到达', '出发', '在线航班信息板', '航班信息板', '在线航班信息'],
  ja: ['到着', '出発', 'オンラインフライトボード', '発着案内'],
  ko: ['도착', '출발', '온라인 항공편 조회', '항공편 조회'],
};


/**
 * Stems of the service nouns, for the quote rule. Matching whole nouns exactly left the job
 * half done: the corpus quotes inflected and extended forms the exact list does not contain —
 * `"kalkışlar"` (tr list has gidişler), `("прилётах")` (prepositional case),
 * `"çevrimiçi uçuş tablosu"` and `"tableau des vols en ligne"` (extra words inside the
 * quotes). A short quoted run that CONTAINS one of these stems is the gloss, whatever the
 * grammar around it.
 */
const STEMS = {
  en: ['arrival', 'departure', 'flight board', 'flight information', 'flight status'],
  de: ['ankunft', 'ankünft', 'abflug', 'abflüg', 'flugtafel', 'anzeigetafel'],
  fr: ['arrivée', 'départ', 'tableau des vols', 'affichage des vols'],
  es: ['llegada', 'salida', 'arribo', 'tablero de vuelos', 'panel de vuelos', 'tabla de vuelos'],
  it: ['arriv', 'partenz', 'tabellone'],
  tr: ['varış', 'gidiş', 'kalkış', 'uçuş tablosu', 'uçuş bilgi', 'uçuş panosu'],
  // Short stems on purpose. Each generation picked its own wording for the same three terms —
  // Chinese alone produced 在线航班看板 / 在线航班板 / 在线航班牌 / 在线航班显示 / 在线航班表 —
  // so enumerating full phrases would never converge. Inside quotation marks, in a run of six
  // words or fewer, on an airport page, these stems only ever appear as a term being quoted.
  // Real airport names are safe: Chinese names carry 机场, not 航班; Arabic names carry مطار,
  // not وصول.
  ar: ['وصول', 'مغادر', 'القادم', 'لوحة', 'الرحلات الإلكترونية', 'الرحلات عبر الإنترنت'],
  hi: ['आगमन', 'प्रस्थान', 'फ्लाइट', 'फ़्लाइट', 'बोर्ड'],
  zh: ['到达', '抵达', '出发', '起飞', '离港', '航班'],
  ja: ['到着', '出発', 'フライトボード', '発着', '航空便'],
  ko: ['도착', '출발', '항공편', '운항정보', '플라이트', '비행판', '비행 게시판', '온라인'],
  ru: ['прилёт', 'прилет', 'вылет', 'табло', 'прибыти'],
};

/** Normalise for comparison: lowercase, strip punctuation and accents-insensitive spacing. */
const norm = (s) => s.toLowerCase().replace(/[«»"“”'’.,;:!?]/g, '').replace(/\s+/g, ' ').trim();

/** Does `gloss` merely restate `lead`, the words immediately before the parenthesis? */
function restates(gloss, lead) {
  const g = norm(gloss);
  if (!g) return true;
  const words = norm(lead).split(' ').filter(Boolean);
  // Compare against the last 1..8 words before the bracket. Four was not enough: French
  // carries `tableau des vols en ligne (tableau des vols en ligne)` — a five-word term — on
  // 1,900 pages, and every one of them slipped through a four-word window.
  for (let n = 1; n <= 8 && n <= words.length; n++) {
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
  const list = [...(NOUNS[locale] || []), ...(NOUNS_EXTRA[locale] || [])];
  // Trailing quote or bracket-adjacent punctuation must not defeat the match: the corpus has
  // both `arrivals (…)` and `"arrivals" (…)`.
  const tail = l.replace(/["“”'’)\]]+$/, '').trim();
  return list.some((n) => tail.endsWith(norm(n)));
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

/**
 * Two gloss shapes that live outside brackets.
 *
 *   1. the service noun in quotes — `check the "online flight board"`, `verify "arrivals"`.
 *      2,051 occurrences. Quoting a generic noun is not emphasis, it is the residue of the
 *      prompt treating it as a term to be reproduced; the quotes make ordinary prose read
 *      like a glossary entry.
 *
 * A slash form also exists (`arrivals / aankomsten`) but is deliberately NOT handled: only
 * ~265 occurrences, and Turkish produces genuine synonym pairs that look identical —
 * `varış/çıkış bilgilerini` is ordinary prose, not a gloss, and stripping it would delete
 * meaning. Not worth the false positives for that count.
 */
function stripLooseGlosses(text, locale) {
  // Every locale. An earlier version of this function used \b, which is defined on ASCII word
  // characters and therefore matches inside Arabic, Devanagari and CJK runs — that fired on
  // ordinary prose and had to be fenced off to Latin scripts. The rule below anchors on the
  // quotation marks instead and needs no word boundary, so the fence is gone: it was leaving
  // 27,000 quoted glosses untouched in ar, hi, zh and ko.
  if (!(STEMS[locale] || []).length) return { out: text, removed: 0 };
  let removed = 0;
  const stems = (STEMS[locale] || []).map((x) => x.toLowerCase());
  let out = text.replace(/["“”«»]\s*([^"“”«»]{2,60}?)\s*["“”»«]/g, (whole, inner) => {
    const low = inner.toLowerCase();
    const words = inner.trim().split(/\s+/).length;
    if (words > 6 || !stems.some((st) => low.includes(st))) return whole;
    removed++;
    return inner;
  });
  return { out, removed };
}

function clean(text, locale) {
  const native = NATIVE[locale];
  let removed = 0;
  const loose = stripLooseGlosses(text, locale);
  text = loose.out;
  removed += loose.removed;
  const fw = cleanFullWidth(text);
  text = fw.out;
  removed += fw.removed;
  // Capture the run of words before "(", then the bracket contents. No nested brackets.
  let out = text.replace(/([^()]{0,60}?)\(([^()]{1,120})\)/g, (whole, lead, gloss) => {
    const disposable =
      restates(gloss, lead) ||
      PLACEHOLDER.test(gloss.trim()) ||
      // foreign script, but only when it is glossing a service noun
      // Rule 5 (see LEGIT_IN_BRACKET): the bracket opens straight after a service noun, so it
      // glosses that noun regardless of which language the gloss is in. Keeps the one shape
      // that is real content — a terminal or gate reference — and drops the translations.
      (endsWithNoun(lead, locale)
        && gloss.trim().split(/\s+/).length <= 14
        && !LEGIT_IN_BRACKET.test(gloss));
    if (!disposable) return whole;
    removed++;
    return lead;
  });
  // Whitespace tidy runs unconditionally, not only when something was removed. Gating it on
  // `removed` left 498 double spaces and 317 spaces-before-punctuation in the corpus — some
  // predating this script, some in paragraphs it edited in an earlier pass. A space before a
  // comma is visible in the rendered page (`والمغادرة ، ويُنصح`), unlike a double space, which
  // HTML collapses.
  {
    // Tidy the seams the deletion leaves behind.
    out = out
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([.,;:!?\u060C\u061B\u061F\u3001\u3002\uFF0C\uFF1B\uFF1A\uFF01\uFF1F])/g, '$1')
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
    // Write when the TEXT changed, not only when a gloss was removed: the whitespace tidy can
    // be the only edit, and gating on `removed` meant those files were never saved.
    if (out === text) continue;
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
