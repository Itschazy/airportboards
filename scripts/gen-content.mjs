// Generate unique SEO intro paragraphs per airport per locale via gpt-5.5.
// Resumable: skips locales already present in each airport's content file.
// Usage: OPENAI_API_KEY=... node scripts/gen-content.mjs
//   LIMIT=15        only first N airports (pilot)
//   CONCURRENCY=8   parallel airports
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const OUT_DIR = path.join(ROOT, 'data/airport-content');
fs.mkdirSync(OUT_DIR, { recursive: true });

const LOCALES = {
  en: 'English', ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic',
  de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French',
  es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};
const LOCALE_KEYS = Object.keys(LOCALES);

const LIMIT = process.env.LIMIT ? +process.env.LIMIT : airports.length;
const CONCURRENCY = +(process.env.CONCURRENCY || 8);

// Top-50 hubs get premium gpt-5.5; everyone else gpt-5-mini (minimal
// reasoning) — near-identical quality on factual blurbs at a fraction of cost.
const PREMIUM = new Set([
  'LHR','CDG','DXB','JFK','LAX','HND','NRT','PEK','PVG','HKG','SIN','ICN','FRA','AMS','IST',
  'SVO','ORD','ATL','EWR','LGA','BOS','SFO','MIA','DFW','DEN','SEA','LGW','FCO','BCN','MAD',
  'MUC','ZRH','CPH','BRU','VIE','HEL','LIS','ARN','OSL','GVA','LED','SYD','MEL','BOM','DEL',
  'BKK','KUL','CGK','GRU','GIG',
]);
const modelFor = (iata) => PREMIUM.has(iata)
  ? { model: 'gpt-5.5', effort: null }
  : { model: 'gpt-5-mini', effort: 'minimal' };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let tokIn = 0, tokOut = 0, done = 0, calls = 0, errors = 0;
const t0 = Date.now();

function sysPrompt(lang) {
  return `You are an SEO copywriter for a live airport flight-board website. Write a unique, factually accurate intro paragraph (70-110 words) in ${lang} for an airport page: mention terminals, which airlines are based there, popular destinations, and useful passenger context. IMPORTANT: if little reliable information exists about the airport, stay general and do NOT invent specific terminals, gate numbers, or routes. CRITICAL: write ONLY in ${lang}. Never emit an English word — not even as a keyword, a gloss, or a parenthetical translation. Earlier revisions of this prompt asked for the ${lang} words for "online flight board", "arrivals" and "departures"; models complied by pasting the ENGLISH literals into the localized prose, which took 62k pages to repair. Those concepts already appear in the page H1, title and board headers, so do not reach for them here at all. Never include Russian/Cyrillic text unless ${lang} IS Russian. Output ONLY the paragraph text — no headings, no quotes.`;
}

async function genOne(a, lang, model, effort) {
  const body = {
    model,
    ...(effort ? { reasoning_effort: effort } : {}),
    messages: [
      { role: 'system', content: sysPrompt(lang) },
      { role: 'user', content: `Airport: ${a.name} (${a.iata}), ${a.city}, ${a.country}. Write in ${lang}.` },
    ],
  };
  for (let attempt = 0; attempt < 6; attempt++) {
    let r;
    try {
      r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) { await sleep(1500 * (attempt + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    calls++;
    tokIn += j.usage.prompt_tokens; tokOut += j.usage.completion_tokens;
    return j.choices[0].message.content.trim();
  }
  throw new Error('retries exhausted');
}

async function processAirport(a) {
  const file = path.join(OUT_DIR, `${a.iata}.json`);
  let content = {};
  if (fs.existsSync(file)) {
    try { content = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  const { model, effort } = modelFor(a.iata);
  let changed = false;
  for (const loc of LOCALE_KEYS) {
    if (content[loc] && content[loc].length > 20) continue; // already done
    try {
      content[loc] = await genOne(a, LOCALES[loc], model, effort);
      changed = true;
    } catch (e) {
      errors++;
      console.error(`! ${a.iata}/${loc}: ${e.message}`);
    }
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(content, null, 0));
  done++;
  if (done % 10 === 0 || done === Math.min(LIMIT, airports.length)) {
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`[${done}/${Math.min(LIMIT, airports.length)}] calls=${calls} tok=${tokIn + tokOut} (in ${tokIn}/out ${tokOut}) err=${errors} ${mins}min`);
  }
}

async function main() {
  const list = airports.slice(0, LIMIT);
  console.log(`Generating ${list.length} airports × ${LOCALE_KEYS.length} locales, concurrency=${CONCURRENCY}`);
  let idx = 0;
  async function worker() {
    while (idx < list.length) {
      const a = list[idx++];
      await processAirport(a);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`DONE ${done} airports, ${calls} calls, tokens in=${tokIn} out=${tokOut} total=${tokIn + tokOut}, errors=${errors}, ${mins}min`);
}

main();
