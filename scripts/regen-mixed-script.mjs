// Regenerate the airport paragraphs that still contain text in the wrong writing system.
//
// scripts/fix-gloss-stuffing.mjs removes parenthetical keyword glosses deterministically —
// 24,732 of them. What it deliberately cannot repair is the residue where a foreign phrase
// was welded into the sentence itself rather than bracketed after it:
//
//     ...check the airport’s online flight board for real-time 信息 on arrivals...
//     ...for real-time اطلاعات, and find separate sections for arrivals...
//     ...check the 온라인 항공편 조회 (online flight board) for 실시간...
//
// There is no safe deletion for those: removing the foreign run leaves a hole in the
// grammar. They have to be written again. It is a small set — 404 paragraphs across ten
// locales — so this regenerates only those, and validates before writing.
//
// Resumable and idempotent: the defect list is recomputed from the corpus on every run, so
// re-running only touches whatever is still broken.
//
//   node scripts/regen-mixed-script.mjs            # reads ~/.env.openai if OPENAI_API_KEY unset
//   DRY=1 node scripts/regen-mixed-script.mjs      # list the work, call nothing
//   LIMIT=10 CONCURRENCY=4 node scripts/regen-mixed-script.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
let KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  try {
    const env = fs.readFileSync(path.join(os.homedir(), '.env.openai'), 'utf8');
    KEY = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch { /* fall through */ }
}
const DRY = !!process.env.DRY;
if (!KEY && !DRY) { console.error('OPENAI_API_KEY missing (env or ~/.env.openai)'); process.exit(1); }

const CONTENT_DIR = path.join(ROOT, 'data/airport-content');
const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const byIata = new Map(airports.map((a) => [a.iata, a]));

const LOCALES = {
  en: 'English', ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic',
  de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French',
  es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};

// Writing systems each locale is allowed to contain. Latin is tolerated everywhere because
// the IATA code itself is Latin and belongs in the prose.
// Mirrors the block list in scripts/check-scripts.mjs — keep the two in step. The first
// version of this file knew only six writing systems and therefore called the corpus clean
// while 226 values still carried Thai, Greek, Hebrew, Bengali, Tamil, Malayalam, Kannada,
// Gujarati and Gurmukhi text.
const SCRIPTS = {
  greek: /[\u0370-\u03FF]/, cyr: /[\u0400-\u04FF]/, hebrew: /[\u0590-\u05FF]/,
  arab: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/,
  deva: /[\u0900-\u097F]/, bengali: /[\u0980-\u09FF]/, gurmukhi: /[\u0A00-\u0A7F]/,
  gujarati: /[\u0A80-\u0AFF]/, tamil: /[\u0B80-\u0BFF]/, telugu: /[\u0C00-\u0C7F]/,
  kannada: /[\u0C80-\u0CFF]/, malayalam: /[\u0D00-\u0D7F]/, thai: /[\u0E00-\u0E7F]/,
  hang: /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/,
  kana: /[\u3040-\u30FF]/, han: /[\u4E00-\u9FFF\uF900-\uFAFF]/,
};
const ALLOWED = {
  en: [], de: [], fr: [], es: [], it: [], tr: [],
  ru: ['cyr'], ar: ['arab'], hi: ['deva'], zh: ['han'], ja: ['han', 'kana'], ko: ['hang', 'han'],
};

/** Which foreign scripts, if any, this text contains for its locale. */
function foreignScripts(text, locale) {
  const allowed = ALLOWED[locale] ?? [];
  return Object.entries(SCRIPTS)
    .filter(([name, re]) => !allowed.includes(name) && re.test(text))
    .map(([name]) => name);
}

const TAUT = /\b([\w][\w\s’'-]{2,40}?)\s*\(\s*\1\s*\)/i;

/**
 * The other shape the gloss defect took: instead of bracketing the translation, the model
 * wrote a clause about the term — `...you may also search for the "online flight board" as
 * "online flight board"...`. Deleting the quoted run leaves a dangling "as", so unlike the
 * bracketed form this cannot be repaired by deletion and has to be rewritten. 25 paragraphs.
 */
const QUOTED_GLOSS = /\b(?:as|or)\s+["“][^"”]{2,40}["”]/i;

function sysPrompt(lang) {
  return `You are an SEO copywriter for a live airport flight-board website. Rewrite the supplied paragraph (70-110 words) in ${lang} for an airport page: keep every fact that is already there — terminals, based airlines, destinations, passenger context — and drop nothing that is true. Do not invent terminals, gate numbers, routes or airline names that are not in the source. CRITICAL: write ONLY in ${lang}, in ${lang}'s own writing system. The paragraph you are given is defective precisely because words in another language were pasted into it; your output must contain none. Never add a parenthetical translation or a gloss of any term — an earlier prompt asked for the ${lang} words for "online flight board", "arrivals" and "departures" and models answered by pasting those literals into the prose, which took 62k pages to repair. Those concepts already appear in the page H1, title and board headers, so do not reach for them at all. Output ONLY the paragraph text — no headings, no quotes, no commentary.`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0, tokIn = 0, tokOut = 0;

/**
 * The exact runs of foreign text in the paragraph. Quoting them back to the model matters:
 * without this the residual cases — a Korean syllable spliced into "Downing", an Arabic word
 * inside a Japanese airport name — survived three attempts each, because the model reproduced
 * the proper noun faithfully, corruption included, without ever noticing it was corrupt.
 */
function foreignRuns(text, locale) {
  const allowed = ALLOWED[locale] ?? [];
  const cls = Object.entries(SCRIPTS).filter(([n]) => !allowed.includes(n)).map(([, re]) => re.source).join('|');
  const runs = text.match(new RegExp(`(?:${cls})+[^\\s]*`, 'g')) ?? [];
  return [...new Set(runs)].slice(0, 12);
}

async function ask(lang, source, airport, locale) {
  const runs = foreignRuns(source, locale);
  const pointer = runs.length
    ? `\n\nThese exact fragments are in the WRONG language and must not appear in your output in any form — not transliterated, not translated in brackets, not at all. Where one sits inside a proper name, the name itself is corrupted: reconstruct the correct name from the airport details above and write it properly in ${lang}.\n${runs.map((r) => `  • ${r}`).join('\n')}`
    : '';
  const body = {
    model: 'gpt-5.5',
    messages: [
      { role: 'system', content: sysPrompt(lang) },
      {
        role: 'user',
        content: `Airport: ${airport?.name ?? ''} (${airport?.iata ?? ''}), ${airport?.city ?? ''}, ${airport?.country ?? ''}.\n\nDefective paragraph to rewrite in ${lang}:\n${source}${pointer}`,
      },
    ],
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    let r;
    try {
      r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch { await sleep(1500 * (attempt + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(2500 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    calls++; tokIn += j.usage.prompt_tokens; tokOut += j.usage.completion_tokens;
    return j.choices[0].message.content.trim().replace(/^["“]|["”]$/g, '');
  }
  throw new Error('retries exhausted');
}

// ── collect the work ────────────────────────────────────────────────────────────────────
const work = [];
for (const f of fs.readdirSync(CONTENT_DIR).filter((n) => n.endsWith('.json')).sort()) {
  const p = path.join(CONTENT_DIR, f);
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  for (const [locale, text] of Object.entries(doc)) {
    if (typeof text !== 'string' || !LOCALES[locale]) continue;
    const bad = foreignScripts(text, locale);
    if (QUOTED_GLOSS.test(text)) bad.push('quoted-gloss');
    if (bad.length) work.push({ file: p, iata: f.replace('.json', ''), locale, bad });
  }
}
const LIMIT = process.env.LIMIT ? +process.env.LIMIT : work.length;
const todo = work.slice(0, LIMIT);
const byLocale = todo.reduce((m, w) => ({ ...m, [w.locale]: (m[w.locale] || 0) + 1 }), {});
console.log(`paragraphs to rewrite: ${todo.length}${LIMIT < work.length ? ` of ${work.length}` : ''}`);
console.log('by locale:', byLocale);
if (DRY) { console.log('DRY — nothing called, nothing written'); process.exit(0); }

// ── rewrite ─────────────────────────────────────────────────────────────────────────────
const CONCURRENCY = +(process.env.CONCURRENCY || 6);
let ok = 0, gave_up = 0, idx = 0;
const failures = [];

async function worker() {
  while (idx < todo.length) {
    const w = todo[idx++];
    const doc = JSON.parse(fs.readFileSync(w.file, 'utf8'));
    const source = doc[w.locale];
    let accepted = null;
    for (let tryNo = 0; tryNo < 3 && !accepted; tryNo++) {
      let out;
      try { out = await ask(LOCALES[w.locale], source, byIata.get(w.iata), w.locale); }
      catch (e) { failures.push(`${w.iata}/${w.locale}: ${e.message}`); break; }
      const stillForeign = foreignScripts(out, w.locale);
      const words = out.split(/\s+/).length;
      // Reject rather than accept-and-hope: a silent bad rewrite is worse than the defect,
      // because the defect is at least detectable by the same check on the next run.
      if (stillForeign.length) continue;
      if (TAUT.test(out) || QUOTED_GLOSS.test(out)) continue;
      if (w.locale === 'zh' || w.locale === 'ja' || w.locale === 'ko') {
        if (out.length < 80 || out.length > 700) continue;   // CJK: characters, not words
      } else if (words < 45 || words > 170) continue;
      accepted = out;
    }
    if (!accepted) { gave_up++; failures.push(`${w.iata}/${w.locale}: no valid rewrite in 3 tries`); continue; }
    doc[w.locale] = accepted;
    fs.writeFileSync(w.file, JSON.stringify(doc, null, 2) + '\n');
    ok++;
    if (ok % 25 === 0) console.log(`  ${ok}/${todo.length} rewritten…`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// gpt-5.5 list pricing at time of writing: $1.25 / 1M in, $10 / 1M out.
const cost = (tokIn / 1e6) * 1.25 + (tokOut / 1e6) * 10;
console.log(`\nrewritten: ${ok}   gave up: ${gave_up}   api calls: ${calls}`);
console.log(`tokens in/out: ${tokIn}/${tokOut}   ≈ $${cost.toFixed(2)}`);
if (failures.length) {
  console.log('\nnot repaired:');
  for (const f of failures.slice(0, 40)) console.log('  ' + f);
}
