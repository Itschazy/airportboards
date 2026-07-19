// Catch translated names written in the wrong alphabet.
//
// A machine-translation pass left foreign scripts spliced INSIDE Devanagari words in the Hindi
// corpus: Bembridge as बे‎מבר‎िज़ (Hebrew in the middle), Dalton as डा‎الت‎न (Arabic), Cruzeiro do
// Sul as क्रूज़ेरु ‎דו‎ सुल, Coimbatore rendered entirely in Tamil. These are not exotic edge
// cases in some data file nobody reads — airport and city names go straight into <title>, <h1>
// and JSON-LD, so every one of them was on a live page.
//
// Nothing caught it because each value is a valid string and the catalogues are complete: 241
// of 241 keys present, every airport covered. Completeness checks pass happily on garbage.
//
// This checks the alphabet instead. Runs offline over data/*.json, exits non-zero on a hit, so
// it can sit in CI and refuse the next translation import that does the same thing.
//
// Usage:  node scripts/check-scripts.mjs [--verbose]

import fs from 'node:fs';
import path from 'node:path';

const VERBOSE = process.argv.includes('--verbose');

const RANGES = {
  latin:      [[0x0041, 0x024F], [0x1E00, 0x1EFF]],
  cyrillic:   [[0x0400, 0x04FF]],
  greek:      [[0x0370, 0x03FF]],
  arabic:     [[0x0600, 0x06FF], [0x0750, 0x077F], [0xFB50, 0xFDFF], [0xFE70, 0xFEFF]],
  hebrew:     [[0x0590, 0x05FF]],
  devanagari: [[0x0900, 0x097F], [0xA8E0, 0xA8FF]],
  bengali:    [[0x0980, 0x09FF]],
  gurmukhi:   [[0x0A00, 0x0A7F]],
  gujarati:   [[0x0A80, 0x0AFF]],
  tamil:      [[0x0B80, 0x0BFF]],
  telugu:     [[0x0C00, 0x0C7F]],
  kannada:    [[0x0C80, 0x0CFF]],
  malayalam:  [[0x0D00, 0x0D7F]],
  thai:       [[0x0E00, 0x0E7F]],
  hangul:     [[0x1100, 0x11FF], [0x3130, 0x318F], [0xAC00, 0xD7AF]],
  kana:       [[0x3040, 0x30FF], [0x31F0, 0x31FF]],
  cjk:        [[0x3400, 0x4DBF], [0x4E00, 0x9FFF], [0xF900, 0xFAFF]],
};

// Latin is allowed everywhere: airline codes, IATA codes and untranslated proper nouns are
// legitimately Latin in every locale.
const ALLOWED = {
  en: ['latin'], de: ['latin'], es: ['latin'], fr: ['latin'], it: ['latin'], tr: ['latin'],
  ru: ['latin', 'cyrillic'],
  ar: ['latin', 'arabic'],
  hi: ['latin', 'devanagari'],
  ja: ['latin', 'kana', 'cjk'],
  ko: ['latin', 'hangul', 'cjk'],
  zh: ['latin', 'cjk'],
};

// Which blocks are the locale's OWN writing system, for the intra-word check below.
const NATIVE_RANGES = {
  ru: [[0x0400, 0x04FF]],
  ar: [[0x0600, 0x06FF], [0x0750, 0x077F]],
  hi: [[0x0900, 0x097F]],
  ja: [[0x3040, 0x30FF], [0x4E00, 0x9FFF]],
  ko: [[0xAC00, 0xD7AF], [0x4E00, 0x9FFF]],
  zh: [[0x4E00, 0x9FFF]],
};
const SEPARATORS = new Set([...' ・-–—.,()/’\'«»"']);

function scriptOf(cp) {
  for (const [name, ranges] of Object.entries(RANGES)) {
    for (const [a, b] of ranges) if (cp >= a && cp <= b) return name;
  }
  return null;   // punctuation, digits, spaces, emoji — script-neutral
}

let checked = 0;
const problems = [];

for (const file of fs.readdirSync('data').filter(f => f.endsWith('.json'))) {
  const p = path.join('data', file);
  let json;
  try { json = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  if (!json || typeof json !== 'object' || Array.isArray(json)) continue;

  for (const [key, value] of Object.entries(json)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const [locale, text] of Object.entries(value)) {
      const allowed = ALLOWED[locale];
      if (!allowed || typeof text !== 'string' || !text) continue;
      checked++;
      const found = new Set();
      for (const ch of text) {
        const s = scriptOf(ch.codePointAt(0));
        if (s && !allowed.includes(s)) found.add(s);
      }
      if (found.size) problems.push({ file, key, locale, text, scripts: [...found] });
      // Latin is allowed everywhere (IATA codes, untranslated proper nouns), and that blanket
      // permission hid a whole second class of damage: a Latin RUN SPLICED INSIDE a native
      // word. "Арландa" (Arlanda with a Latin a), "अden", "سamana" — 165 of them, invisible to
      // a per-character whitelist because every character is individually permitted.
      //
      // Worst are the homoglyphs: /ru/az/o listed "ITM Осака" and "Осaка" side by side, the
      // second with a Latin a. Proofreading cannot catch that, and the page was unfindable by
      // searching for Осака.
      //
      // A single capital between separators is left alone — "リー・C・ファイン" is a real middle
      // initial, not contamination.
      else if (NATIVE_RANGES[locale]) {
        const isNative = ch => NATIVE_RANGES[locale].some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b);
        const isLatin = ch => /[A-Za-z]/.test(ch);
        const chars = [...text];
        for (let i = 0; i < chars.length; i++) {
          if (!isLatin(chars[i])) continue;
          const left = chars[i - 1] ?? '', right = chars[i + 1] ?? '';
          if (/[A-Z]/.test(chars[i]) && (!left || SEPARATORS.has(left)) && (!right || SEPARATORS.has(right))) continue;
          if ((left && isNative(left)) || (right && isNative(right))) {
            problems.push({ file, key, locale, text, scripts: ['latin spliced into native word'] });
            break;
          }
        }
      }
    }
  }
}

console.log(`checked ${checked} localised strings across data/*.json`);

if (!problems.length) {
  console.log('no foreign-script contamination found');
  process.exit(0);
}

const byFile = {};
for (const pr of problems) (byFile[pr.file] ??= []).push(pr);

console.log(`\n${problems.length} value(s) written in the wrong alphabet:\n`);
for (const [file, list] of Object.entries(byFile)) {
  console.log(`${file} — ${list.length}`);
  for (const pr of (VERBOSE ? list : list.slice(0, 8))) {
    console.log(`  ${pr.locale}  ${pr.key.padEnd(24)} ${JSON.stringify(pr.text)}  <- ${pr.scripts.join(', ')}`);
  }
  if (!VERBOSE && list.length > 8) console.log(`  … ${list.length - 8} more (--verbose)`);
}

process.exit(1);
