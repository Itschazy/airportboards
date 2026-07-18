#!/usr/bin/env node
// Repair place names whose localized form is corrupted with characters from a foreign script.
//
// The damage is character-level, not word-level: the generator that produced these switched
// script mid-token, so entries read like "سيوداد أكو냐" (Arabic with a Hangul syllable),
// "कайсेरी" (Devanagari क followed by Cyrillic), "أديсон" (Arabic then Cyrillic). No
// transliteration rule can undo that — the value has to be produced again.
//
// Two-step repair, cheapest first:
//   1. borrow — the same place is often spelled correctly in the sibling file
//      (airport-names vs city-names), so copy that before paying for a model call;
//   2. regenerate — ask gpt-5.5 for the place name in the target language, and REJECT any
//      answer that still contains a foreign script, is empty, or comes back in Latin.
//
// Parenthetical glosses like "日本（にっぽん）" are a separate defect and are left alone here.
//
// Usage:
//   node scripts/fix-mixed-script-names.mjs            # report only
//   node scripts/fix-mixed-script-names.mjs --write
import fs from 'fs';

const KEY = process.env.OPENAI_API_KEY;
const WRITE = process.argv.includes('--write');
if (WRITE && !KEY) { console.error('OPENAI_API_KEY missing (source ~/.env.openai)'); process.exit(1); }

const FILES = ['data/city-names.json', 'data/airport-names.json', 'data/country-names.json'];

// Scripts that must never appear inside a value for these locales.
const FOREIGN = {
  ar: /[Ѐ-ӿͰ-Ͽ가-힯぀-ヿ一-鿿]/,
  hi: /[Ѐ-ӿͰ-Ͽ가-힯぀-ヿ一-鿿]/,
  ru: /[؀-ۿऀ-ॿ]/,
  zh: /[؀-ۿऀ-ॿЀ-ӿ]/,
  ja: /[؀-ۿऀ-ॿЀ-ӿ]/,
  ko: /[؀-ۿऀ-ॿЀ-ӿ]/,
};
// The script a correct value is expected to be written in.
const EXPECTED = {
  ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/, ru: /[Ѐ-ӿ]/,
  zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/,
};
const LANG = { ar: 'Arabic', hi: 'Hindi', ru: 'Russian', zh: 'Chinese (Simplified)', ja: 'Japanese', ko: 'Korean' };

const stripGloss = s => s.replace(/[（(][^）)]*[）)]/g, '');

const data = Object.fromEntries(FILES.map(f => [f, JSON.parse(fs.readFileSync(f, 'utf8'))]));

// Collect every corrupted entry.
const broken = [];
for (const [file, d] of Object.entries(data)) {
  for (const [key, vals] of Object.entries(d)) {
    if (!vals || typeof vals !== 'object') continue;
    for (const [loc, v] of Object.entries(vals)) {
      if (typeof v !== 'string' || !FOREIGN[loc]) continue;
      if (FOREIGN[loc].test(stripGloss(v))) broken.push({ file, key, loc, bad: v, en: vals.en || key });
    }
  }
}
console.log(`corrupted entries: ${broken.length}`);
const byLoc = {};
for (const b of broken) byLoc[b.loc] = (byLoc[b.loc] || 0) + 1;
console.log('by locale:', byLoc);

// Step 1 — borrow a clean spelling of the same place from the other file.
let borrowed = 0;
for (const b of broken) {
  for (const [file, d] of Object.entries(data)) {
    if (file === b.file) continue;
    for (const vals of Object.values(d)) {
      if (!vals || typeof vals !== 'object') continue;
      if ((vals.en || '') !== b.en) continue;
      const cand = vals[b.loc];
      if (typeof cand === 'string' && cand && !FOREIGN[b.loc].test(stripGloss(cand)) && EXPECTED[b.loc].test(cand)) {
        b.fixed = cand; b.how = 'borrowed';
        borrowed++;
      }
    }
  }
}
console.log(`repairable by borrowing a clean sibling: ${borrowed}`);

if (!WRITE) {
  console.log('\nsamples:');
  for (const b of broken.slice(0, 12)) console.log(`  ${b.loc} ${b.file.split('/').pop()} ${b.key}: ${JSON.stringify(b.bad)}${b.fixed ? ` -> ${JSON.stringify(b.fixed)} (${b.how})` : ''}`);
  console.log('\nReport only — re-run with --write to repair (regenerates the rest via gpt-5.5).');
  process.exit(0);
}

// Step 2 — regenerate what could not be borrowed.
async function ask(en, loc) {
  const sys = `Give the standard ${LANG[loc]} name for the place below.

Return ONLY the name, written entirely in the ${LANG[loc]} script. No transliteration in brackets, no explanation, no quotes, no alternatives. If the place is normally written in ${LANG[loc]} exactly as in the source, transliterate it into the ${LANG[loc]} script.`;
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-5.5', messages: [{ role: 'system', content: sys }, { role: 'user', content: en }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return (j.choices[0].message.content || '').trim().replace(/^["'«“]|["'»”]$/g, '');
}

const todo = broken.filter(b => !b.fixed);
console.log(`\nregenerating ${todo.length} …`);
let done = 0, failed = 0;
const CONC = 8;
let cursor = 0;
async function worker() {
  while (cursor < todo.length) {
    const b = todo[cursor++];
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const out = await ask(b.en, b.loc);
        if (!out) continue;
        if (FOREIGN[b.loc].test(stripGloss(out))) continue;      // still mixed
        if (!EXPECTED[b.loc].test(out)) continue;                 // came back in Latin
        b.fixed = out; b.how = 'regenerated';
        break;
      } catch (e) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); }
    }
    done++;
    if (!b.fixed) { failed++; console.error(`  FAILED ${b.loc} ${b.key} (${b.en})`); }
    if (done % 50 === 0) console.log(`  ${done}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));

const fixedAll = broken.filter(b => b.fixed);
for (const b of fixedAll) data[b.file][b.key][b.loc] = b.fixed;
for (const [file, d] of Object.entries(data)) fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');

console.log(`\nrepaired ${fixedAll.length}/${broken.length} (${borrowed} borrowed, ${fixedAll.length - borrowed} regenerated), ${failed} failed`);
console.log('samples:');
for (const b of fixedAll.slice(0, 10)) console.log(`  ${b.loc} ${b.key}: ${JSON.stringify(b.bad)} -> ${JSON.stringify(b.fixed)} (${b.how})`);
