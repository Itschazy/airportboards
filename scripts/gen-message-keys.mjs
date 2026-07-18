#!/usr/bin/env node
// Translate a batch of message keys into the 11 non-English locales and write them into
// messages/*.json, keeping all 12 files key-identical.
//
// Why this exists rather than hand-editing: 12 locales x N keys is where drift and
// MISSING_MESSAGE come from, and the previous generator shipped a defect that took 62k
// string repairs to undo. The rules that prevent a repeat are enforced here, not trusted:
//
//   - the model is given a COMPLETE English sentence and asked to translate it naturally.
//     It is never asked to "include the word for X" — that phrasing is exactly what made
//     earlier runs paste English literals into localized prose.
//   - ICU placeholders ({name}, {iata}, ...) and rich-text tags (<link>) must survive
//     byte-identical. Output whose placeholder/tag multiset differs from the source is
//     rejected and retried, never written.
//   - for ar/hi the output is rejected if it contains Cyrillic, Greek, Hangul, Kana or Han
//     codepoints — the signature of the mixed-script corruption still present in the name
//     data files.
//
// Usage:
//   node scripts/gen-message-keys.mjs data/_keybatch.json           # dry run: print only
//   node scripts/gen-message-keys.mjs data/_keybatch.json --write
//
// Batch file shape: { "<namespace>": { "<key>": "<English source sentence>" }, ... }
import fs from 'fs';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing (source ~/.env.openai)'); process.exit(1); }

const batchPath = process.argv[2];
if (!batchPath) { console.error('usage: node scripts/gen-message-keys.mjs <batch.json> [--write]'); process.exit(1); }
const WRITE = process.argv.includes('--write');
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

const LANGS = {
  ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic', de: 'German', ko: 'Korean',
  ja: 'Japanese', fr: 'French', es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};

// Scripts that must never appear in these locales — the mixed-script corruption signature.
const FOREIGN_SCRIPT = {
  ar: /[Ѐ-ӿͰ-Ͽ가-힯぀-ヿ一-鿿]/,
  hi: /[Ѐ-ӿͰ-Ͽ가-힯぀-ヿ一-鿿]/,
  ru: /[؀-ۿऀ-ॿ]/,
  zh: /[؀-ۿऀ-ॿЀ-ӿ]/,
  ja: /[؀-ۿऀ-ॿЀ-ӿ]/,
  ko: /[؀-ۿऀ-ॿЀ-ӿ]/,
};

const tokens = s => [...s.matchAll(/\{[a-zA-Z_][a-zA-Z0-9_]*\}|<\/?[a-z]+>/g)].map(m => m[0]).sort().join('|');

async function translate(text, lang, loc) {
  const sys = `You translate short interface and metadata sentences for a flight-information website into ${lang}.

Return ONLY the translated sentence. No quotes, no commentary, no alternatives, no transliteration in brackets.

RULES
- Translate the whole sentence naturally, the way a native ${lang} speaker would write it on a travel website.
- Any token in curly braces, e.g. {name} {iata} {count} {km}, is a placeholder filled in by the program. Reproduce every placeholder EXACTLY as written, same spelling, same braces. Do not translate, reorder into something ungrammatical, add or drop them.
- Any tag like <link> or </link> must be reproduced exactly and must still wrap the same phrase it wraps in the source.
- Write ONLY in ${lang}. Do not leave any English word in the output, and never add an English gloss in brackets.`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5.5',
      messages: [{ role: 'system', content: sys }, { role: 'user', content: text }],
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return (j.choices[0].message.content || '').trim().replace(/^["'«“]|["'»”]$/g, '');
}

function validate(src, out, loc) {
  if (!out) return 'empty';
  if (tokens(src) !== tokens(out)) return `placeholders differ (src ${tokens(src) || '-'} / out ${tokens(out) || '-'})`;
  const bad = FOREIGN_SCRIPT[loc];
  if (bad && bad.test(out)) return 'foreign script in output';
  if (loc !== 'en' && /\b(arrivals|departures|flight board|airport)\b/i.test(out.replace(/\{[^}]*\}/g, ''))) {
    return 'English word leaked into localized text';
  }
  return null;
}

const out = {};
let total = 0, failed = 0;

// The 11 locales of one key are independent, so translate them concurrently — sequentially
// this is ~165 round trips and several minutes.
async function oneLocale(ns, key, src, loc, lang) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const t = await translate(src, lang, loc);
      const err = validate(src, t, loc);
      if (err) { console.error(`  ! ${ns}.${key} ${loc} attempt ${attempt}: ${err}`); continue; }
      return t;
    } catch (e) {
      console.error(`  ! ${ns}.${key} ${loc} attempt ${attempt}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  return null;
}

for (const [ns, keys] of Object.entries(batch)) {
  for (const [key, src] of Object.entries(keys)) {
    out[`${ns}.${key}`] = { en: src };
    const entries = Object.entries(LANGS);
    const got = await Promise.all(entries.map(([loc, lang]) => oneLocale(ns, key, src, loc, lang)));
    entries.forEach(([loc], i) => {
      total++;
      if (got[i]) out[`${ns}.${key}`][loc] = got[i];
      else { failed++; console.error(`  FAILED ${ns}.${key} ${loc}`); }
    });
    console.log(`✓ ${ns}.${key}`);
  }
}

console.log(`\n${total - failed}/${total} translations produced${failed ? ` — ${failed} FAILED` : ''}`);
if (failed) { console.error('Refusing to write with failures.'); process.exit(1); }

if (!WRITE) {
  for (const [k, v] of Object.entries(out)) {
    console.log(`\n${k}`);
    for (const [loc, t] of Object.entries(v)) console.log(`  ${loc}: ${t}`);
  }
  console.log('\nDry run — nothing written. Re-run with --write.');
  process.exit(0);
}

for (const loc of ['en', ...Object.keys(LANGS)]) {
  const p = `messages/${loc}.json`;
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [full, vals] of Object.entries(out)) {
    const [ns, key] = full.split('.');
    d[ns] ??= {};
    d[ns][key] = vals[loc];
  }
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
}
console.log(`written into all 12 locales`);

// key parity — the whole point of writing all 12 in one pass
const sets = ['en', ...Object.keys(LANGS)].map(l => {
  const d = JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8'));
  const ks = [];
  const walk = (o, p = '') => { for (const [k, v] of Object.entries(o)) (v && typeof v === 'object') ? walk(v, p + k + '.') : ks.push(p + k); };
  walk(d);
  return [l, ks.sort().join('|')];
});
const bad = sets.filter(([, s]) => s !== sets[0][1]).map(([l]) => l);
console.log(bad.length ? `KEY PARITY BROKEN in: ${bad.join(', ')}` : 'key parity OK across all 12 locales');
if (bad.length) process.exit(1);
