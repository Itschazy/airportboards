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

/**
 * The generator's own scratchpad, published as page copy.
 *
 * Ten paragraphs across the corpus talk about the WRITING TASK instead of the airport, and
 * they are live on indexed pages:
 *
 *   SOF/ar  "...هو المطار الرئيسي لرومانيا... wait — must be accurate: Sofia is in Bulgaria. Let's craft."
 *   SCO/ru  "Актобе? Wait—user requested Aktau Airport (SCO)... Need to deliver in Russian."
 *   USA/en  "Concord-Padgett is USA: airport code USA? Wait)"
 *   MAQ/tr  "Word count check: Turkish words ~70-90. Should be within 70-110 words."
 *
 * These predate the gloss cleanup — neither repair script touched them, because they carry
 * no foreign script and no bracketed gloss. For a reviewer looking for evidence of machine-
 * generated filler this is the single most damning thing on the site, so it is worth its own
 * detector rather than waiting to be noticed again.
 *
 * Deliberately narrow. "wait" is a normal English word on an airport site ("security
 * wait-time updates", "minimal wait-area amenities"), so the bare word is excluded and only
 * the self-correction shapes match.
 */
const SCRATCHPAD = new RegExp([
  // Case-insensitive only right after a question mark — that is the self-correction shape
  // ("(CWB? wait CAC)") and it cannot be ordinary prose. A bare lower-case "wait" is left
  // alone because passengers legitimately wait.
  /\?\s*(?:wait|actually|hmm)\b/i.source,
  /\bWait\b(?![- ](?:time|times|area|areas|staff))/.source,
  /\bactually (?:code|the code|it'?s the)\b/i.source,
  // "(sic)" and an em-dashed "actually" are the two remaining self-correction shapes:
  // "bedient die Region Südkalifornien (sic) — actually Oregon's Rogue Valley". Neither is
  // copy anyone would write for a reader.
  /\(sic\)/i.source,
  /[—–]\s*actually\b/i.source,
  /\bLet'?s (?:craft|generate|write|go)\b/.source,
  /\buser requested\b/.source,
  /\bNeed to deliver\b/.source,
  /\bWord count\b/.source,
  /\bShould be within \d/.source,
  /\bavoid (?:inventing|specifics)\b/.source,
  /\bkept (?:the )?user'?s\b/.source,
  /\bcommonly spelled\b/.source,
  /\bbetter to say\b/.source,
  /\bmust be accurate\b/.source,
  /\bneed local-language\b/.source,
].join('|'));

/**
 * Punctuation that no writer produces: a doubled comma, a bracket opening on punctuation, a
 * parenthetical with nothing in front of it. Pre-existing generation damage rather than
 * anything the repair scripts caused — `...bilgi önemli olup,, (varışlar) ve (kalkışlar)
 * ekranları...` reads identically before and after them — and unfixable by deletion, since the
 * clause has no subject to restore. Two paragraphs.
 */
// Only the shapes that cannot occur in real writing. An earlier version also flagged "a
// sentence beginning with a bracket", which matched every airport named after a person:
// `Merle K. (Mudhole) Smith Airport`, `Edward G. Pitka Sr. (GAL)` — an initial's full stop
// followed by a parenthetical nickname. 21 paragraphs were rejected three times each over it.
const BROKEN_PUNCT = /,\s*,|[;:]\s*[,;]/;

/**
 * Locales written in their own script, where the Latin IATA code has to be spelled out
 * explicitly or the model drops it.
 *
 * 769 paragraphs had no bare Latin code at all, and some spelled it phonetically instead —
 * «код ИАТА Эй-эйч-джей» for AHJ, «с кодом АГДЖ» for AGJ, «с кодом СКО» for SCO. The code is
 * the query: people search "AHJ arrivals", never its Cyrillic transcription, and the code is
 * also what ties the paragraph to the H1 and the title. Roughly half of these predate the
 * rewrites and half were introduced by them — the prompt's "write ONLY in {lang}, in {lang}'s
 * own writing system" was read, reasonably, as forbidding the Latin code too.
 */
const OWN_SCRIPT_LOCALES = new Set(['ru', 'ar', 'hi', 'zh', 'ja', 'ko']);

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

async function ask(lang, source, airport, locale, kinds = []) {
  const runs = foreignRuns(source, locale);
  // A scratchpad paragraph has no foreign run to point at — the defect is that the text
  // discusses the writing task instead of the airport. Saying so explicitly matters: told
  // only "words in another language were pasted in", the model preserved the commentary.
  const iataNote = OWN_SCRIPT_LOCALES.has(locale)
    ? `\n\nThe IATA code ${airport?.iata ?? ''} must appear in the paragraph in LATIN LETTERS, exactly as written here, once. Do not transliterate it into ${lang}'s script and do not spell it out phonetically — «код ИАТА Эй-эйч-джей» is not the code, and the code is what people actually search for. Everything else stays in ${lang}.`
    : '';
  const scratch = kinds.includes('scratchpad')
    ? `\n\nThis paragraph contains the previous model's own working notes published as page copy — self-corrections, questions about the airport code or spelling, remarks about word count or about what language to write in. None of that is page content. Write a clean paragraph about the airport itself and nothing else.`
    : '';
  const pointer = runs.length
    ? `\n\nThese exact fragments are in the WRONG language and must not appear in your output in any form — not transliterated, not translated in brackets, not at all. Where one sits inside a proper name, the name itself is corrupted: reconstruct the correct name from the airport details above and write it properly in ${lang}.\n${runs.map((r) => `  • ${r}`).join('\n')}`
    : '';
  const body = {
    model: 'gpt-5.5',
    messages: [
      { role: 'system', content: sysPrompt(lang) },
      {
        role: 'user',
        content: `Airport: ${airport?.name ?? ''} (${airport?.iata ?? ''}), ${airport?.city ?? ''}, ${airport?.country ?? ''}.\n\nDefective paragraph to rewrite in ${lang}:\n${source}${pointer}${scratch}${iataNote}`,
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
    if (BROKEN_PUNCT.test(text)) bad.push('broken-punctuation');
    if (OWN_SCRIPT_LOCALES.has(locale) && !text.includes(f.replace('.json', ''))) bad.push('no-iata');
    if (SCRATCHPAD.test(text)) bad.push('scratchpad');
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
let ok = 0, gave_up = 0;
const failures = [];

/**
 * Work is claimed per FILE, not per paragraph.
 *
 * Each airport is one JSON document holding all twelve locales, so two workers repairing, say,
 * the zh and the ja paragraph of the same airport would both read the document, each apply
 * their own change to their own copy, and each write the whole thing back — the second write
 * silently discarding the first. That is why successive runs kept reporting every paragraph
 * "rewritten" while the defect count only fell by about two thirds each pass: 769 → 106 → 36.
 * Grouping by file makes the read-modify-write atomic with respect to this script, and is
 * faster besides, since a file is parsed and written once instead of once per locale.
 */
const byFile = new Map();
for (const w of todo) {
  if (!byFile.has(w.file)) byFile.set(w.file, []);
  byFile.get(w.file).push(w);
}
const fileJobs = [...byFile.entries()];
let fi = 0;

async function worker() {
  while (fi < fileJobs.length) {
    const [file, items] = fileJobs[fi++];
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    let changed = false;
    for (const w of items) {
      const source = doc[w.locale];
      let accepted = null;
      for (let tryNo = 0; tryNo < 3 && !accepted; tryNo++) {
        let out;
        try { out = await ask(LOCALES[w.locale], source, byIata.get(w.iata), w.locale, w.bad); }
        catch (e) { failures.push(`${w.iata}/${w.locale}: ${e.message}`); break; }
        const stillForeign = foreignScripts(out, w.locale);
        const words = out.split(/\s+/).length;
        // Reject rather than accept-and-hope: a silent bad rewrite is worse than the defect,
        // because the defect is at least detectable by the same check on the next run.
        if (stillForeign.length) continue;
        if (TAUT.test(out) || QUOTED_GLOSS.test(out) || SCRATCHPAD.test(out) || BROKEN_PUNCT.test(out)) continue;
        if (OWN_SCRIPT_LOCALES.has(w.locale) && !out.includes(w.iata)) continue;
        if (w.locale === 'zh' || w.locale === 'ja' || w.locale === 'ko') {
          if (out.length < 80 || out.length > 700) continue;   // CJK: characters, not words
        } else if (words < 45 || words > 170) continue;
        accepted = out;
      }
      if (!accepted) { gave_up++; failures.push(`${w.iata}/${w.locale}: no valid rewrite in 3 tries`); continue; }
      doc[w.locale] = accepted;
      changed = true;
      ok++;
      if (ok % 25 === 0) console.log(`  ${ok}/${todo.length} rewritten…`);
    }
    if (changed) fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
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
