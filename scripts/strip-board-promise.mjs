// Remove the "check the online flight board" sentence from airports that will never have one.
//
// AdSense rejected the site on 2026-08-03 for low-value content. The sharpest example of what
// that means here: 294 airports whose provider feed is empty BY CONSTRUCTION — no measurement,
// no Wikipedia routes, nothing the warmer can ever fill — carried a generated paragraph telling
// the reader to "use the online flight board for arrivals and departures", directly above a
// board that says the data is not available. The <title> made the same promise until this
// commit; the paragraph is the other half, and it also feeds the JSON-LD description.
//
// Surgical, not regenerative: the rest of each paragraph (location, terminals, transport,
// history) is genuine and useful, and rewriting 3,528 paragraphs through a model would risk
// the whole class of damage this corpus has already suffered twice — mixed scripts, glosses,
// tautologies. So this drops exactly the offending sentence and leaves everything else byte
// for byte.
//
// Guards, because a blunt version of this would be worse than the problem:
//   - only airports on the passed list (the "no data, ever" set) are touched;
//   - at most ONE sentence is removed per locale — if a paragraph somehow leans on the board
//     twice, that is a content problem to look at, not to silently halve;
//   - a paragraph must retain at least MIN_KEEP characters, or it is left alone and reported.
//
// Usage:  node scripts/strip-board-promise.mjs <codes.json> [--write]

import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const listPath = process.argv[2];
if (!listPath) { console.error('usage: strip-board-promise.mjs <codes.json> [--write]'); process.exit(1); }
const CODES = new Set(JSON.parse(fs.readFileSync(listPath, 'utf8')));

/** How much prose must survive for the paragraph to still be worth publishing. */
const MIN_KEEP = 120;

// What "the flight board" is called in each locale's generated prose. Deliberately narrow:
// these match the board as a THING to consult, not the words "arrival"/"departure", which are
// legitimate everywhere and appear in sentences we must keep.
const BOARD = {
  en: /\b(?:online\s+)?flight(?:\s+information)?\s+board\b|\bdepartures?\s+board\b|\barrivals?\s+board\b/i,
  ru: /табло/i,
  de: /Flugtafel|Anzeigetafel|Abfahrtstafel/i,
  es: /panel\s+de\s+vuelos|tablero\s+de\s+vuelos|panel\s+de\s+salidas/i,
  fr: /tableau\s+des\s+vols|tableau\s+d[’']affichage/i,
  it: /tabellone(?:\s+voli)?/i,
  tr: /uçuş\s+panosu|uçuş\s+bilgi\s+ekranı/i,
  ar: /لوحة\s+الرحلات/,
  zh: /航班信息板|航班动态查询|在线航班信息/,
  ja: /発着案内|フライトボード|運航情報板/,
  ko: /운항\s?정보판|항공편\s?정보판|출도착\s?안내/,
  hi: /फ्लाइट\s+बोर्ड|उड़ान\s+बोर्ड|सूचना[- ]?पट/,
};

// Sentence terminators. Two alternatives, and the second one matters: CJK does not put a space
// after 。 or ！, so requiring whitespace made the entire paragraph one "sentence" — the dry run
// reported "0 chars left" for every zh and ja file, which the MIN_KEEP guard caught before it
// could delete 299 Chinese and Japanese paragraphs outright.
const SPLIT = /(?<=[。！？])|(?<=[.!?।])\s+/;

/** Rejoin with the separator the locale actually uses: CJK closes a sentence without a space. */
const CJK = new Set(['zh', 'ja']);

const files = fs.readdirSync(path.join('data', 'airport-content')).filter(f => f.endsWith('.json'));
let touchedFiles = 0, removed = 0, tooShort = 0, multi = 0;
const skipped = [];

for (const f of files) {
  const iata = path.basename(f, '.json');
  if (!CODES.has(iata)) continue;
  const p = path.join('data', 'airport-content', f);
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;

  for (const [locale, text] of Object.entries(doc)) {
    const pat = BOARD[locale];
    if (!pat || typeof text !== 'string' || !text) continue;
    const sents = text.split(SPLIT);
    const hits = sents.filter(s => pat.test(s));
    if (!hits.length) continue;
    if (hits.length > 1) { multi++; skipped.push(`${iata}/${locale}: ${hits.length} board sentences`); continue; }
    const kept = sents.filter(s => !pat.test(s)).join(CJK.has(locale) ? '' : ' ').replace(/\s+/g, ' ').trim();
    if (kept.length < MIN_KEEP) { tooShort++; skipped.push(`${iata}/${locale}: ${kept.length} chars left`); continue; }
    doc[locale] = kept;
    removed++; changed = true;
  }

  if (changed) {
    touchedFiles++;
    if (WRITE) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  }
}

console.log(`airports on list      : ${CODES.size}`);
console.log(`files ${WRITE ? 'rewritten' : 'that would change'}: ${touchedFiles}`);
console.log(`sentences removed     : ${removed}`);
console.log(`left alone (too short): ${tooShort}`);
console.log(`left alone (2+ hits)  : ${multi}`);
if (skipped.length) console.log(`\nnot touched:\n  ${skipped.slice(0, 25).join('\n  ')}${skipped.length > 25 ? `\n  … ${skipped.length - 25} more` : ''}`);
if (!WRITE) console.log('\nDry run — nothing written. Re-run with --write.');
