// Generate extended airport content — 3 short sections (transport / terminals / tips)
// per airport per locale — for the top hubs. Mirrors gen-content.mjs.
// Resumable: skips locales already present in each airport's file.
// Usage: OPENAI_API_KEY=... node scripts/gen-content-extended.mjs
//   SAMPLE=SVO,JFK,IST   only these airports (quality sample)
//   LIMIT=200            only first N of the hub list
//   CONCURRENCY=6        parallel airports
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const byIata = new Map(airports.map(a => [a.iata, a]));
const OUT_DIR = path.join(ROOT, 'data/airport-content-extended');
fs.mkdirSync(OUT_DIR, { recursive: true });

const LOCALES = {
  en: 'English', ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic',
  de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French',
  es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};
const LOCALE_KEYS = Object.keys(LOCALES);

// Top-50 hubs → premium gpt-5.5; the rest of the hub set → gpt-5-mini.
const PREMIUM = new Set([
  'LHR','CDG','DXB','JFK','LAX','HND','NRT','PEK','PVG','HKG','SIN','ICN','FRA','AMS','IST',
  'SVO','ORD','ATL','EWR','LGA','BOS','SFO','MIA','DFW','DEN','SEA','LGW','FCO','BCN','MAD',
  'MUC','ZRH','CPH','BRU','VIE','HEL','LIS','ARN','OSL','GVA','LED','SYD','MEL','BOM','DEL',
  'BKK','KUL','CGK','GRU','GIG',
]);
// The hub universe to enrich (top-200 by importance); dedup + keep only known IATAs.
const HUB_LIST = [...new Set([...PREMIUM,
  'DME','VKO','AER','KZN','OVB','SVX','KRR','ROV','UFA','MRV','KGD','GOJ','TJM','CEK','PEE',
  'MMK','KJA','IKT','VVO','KHV','TAS','ALA','GYD','EVN','TBS','FRU','DYU',
  'ESB','SAW','AYT','ADB','TZX','BJV','GZP','DLM','EDI','MAN','BHX','GLA','DUB','STN','LTN',
  'ORY','NCE','LYS','MRS','TLS','NTE','BOD','HAM','DUS','STR','CGN','TXL','BER','NUE','HAJ',
  'MXP','LIN','VCE','NAP','BLQ','CTA','PMO','PSA','FLR','ATH','SKG','HER','RHO','CFU','JMK','JTR',
  'LIS','OPO','WAW','KRK','GDN','PRG','BUD','OTP','SOF','ZAG','BEG','LJU',
  'GVA','BSL','SVQ','AGP','VLC','BIO','PMI','IBZ','TFN','TFS','LPA','ACE',
  'YYZ','YVR','YUL','YYC','MEX','CUN','GDL','PTY','BOG','LIM','SCL','EZE','GRU','GIG','CGH','BSB',
  'JNB','CPT','CAI','HRG','SSH','RUH','JED','DOH','AUH','KWI','BAH','MCT','AMM','TLV',
  'CAN','SZX','CTU','KMG','XIY','HGH','WUH','CKG','CGO','TSN','SHA','TPE','KIX','ITM','NGO','FUK','CTS','GMP',
  'MNL','CEB','HAN','SGN','DPS','SUB','PNH','RGN','DAC','CMB','KTM','ISB','KHI','LHE',
  'MAA','BLR','HYD','CCU','COK','AMD','PNQ','GOI','JAI',
  'PER','BNE','AKL','CHC','NAN','HNL','ANC','SLC','PHX','LAS','MCO','TPA','IAH','MSP','DTW','PHL','CLT','BWI','DCA','IAD','SAN','PDX','AUS','BNA','STL','MCI','CLE','PIT','CVG','IND','CMH',
])].filter(i => byIata.has(i));

const SAMPLE = process.env.SAMPLE ? process.env.SAMPLE.split(',').map(s => s.trim().toUpperCase()) : null;
const list = (SAMPLE || HUB_LIST).slice(0, process.env.LIMIT ? +process.env.LIMIT : undefined);
const CONCURRENCY = +(process.env.CONCURRENCY || 6);

const modelFor = (iata) => PREMIUM.has(iata)
  ? { model: 'gpt-5.5', effort: null }
  : { model: 'gpt-5-mini', effort: 'minimal' };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let tokIn = 0, tokOut = 0, calls = 0, errors = 0, doneLoc = 0;
const t0 = Date.now();
// Rough gpt-5.5 / gpt-5-mini blended price guess ($/1M tok) for a live estimate only.
const priceIn = 1.25, priceOut = 10;

function sysPrompt(lang) {
  return `You write concise, factually-careful passenger info for an airport page on a live flight-board website. For the given airport, return a JSON object with exactly three keys — "transport", "terminals", "tips" — each a single plain-text paragraph of about 45-75 words, written ONLY in ${lang}.
- transport: how travellers typically get to and from the airport (e.g. rail/express link, city buses, taxis, ride-hailing, car rental) in general terms.
- terminals: how the terminal(s) are organised and what a passenger should know (check-in, domestic vs international, transfers) in general terms.
- tips: practical, evergreen advice for using this airport (arrive-early guidance, security/passport, seasonal or hub-specific notes).
HARD RULES: Be factually accurate. If you are not sure, stay general. NEVER invent specific prices, fares, gate numbers, flight/route numbers, phone numbers, or timetables. Write ONLY in ${lang} — no Cyrillic/Latin/other-language words unless they are proper names, and no parenthetical translations. Return ONLY the JSON object, no markdown.`;
}

async function genOne(a, lang, model, effort) {
  const body = {
    model,
    ...(effort ? { reasoning_effort: effort } : {}),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: sysPrompt(lang) },
      { role: 'user', content: `Airport: ${a.name} (${a.iata}), ${a.city}, ${a.country}. Return the JSON in ${lang}.` },
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
    const obj = JSON.parse(j.choices[0].message.content);
    const clean = s => (typeof s === 'string' ? s.trim() : '');
    return { transport: clean(obj.transport), terminals: clean(obj.terminals), tips: clean(obj.tips) };
  }
  throw new Error('retries exhausted');
}

async function processAirport(iata) {
  const a = byIata.get(iata);
  if (!a) return;
  const file = path.join(OUT_DIR, `${a.iata}.json`);
  let content = {};
  if (fs.existsSync(file)) { try { content = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  const { model, effort } = modelFor(a.iata);
  let changed = false;
  for (const loc of LOCALE_KEYS) {
    const cur = content[loc];
    if (cur && cur.transport && cur.terminals && cur.tips) continue; // already done
    try {
      content[loc] = await genOne(a, LOCALES[loc], model, effort);
      changed = true; doneLoc++;
    } catch (e) { errors++; console.error(`  ! ${a.iata}/${loc}: ${e.message}`); }
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(content, null, process.env.SAMPLE ? 2 : 0));
  const est = (tokIn / 1e6) * priceIn + (tokOut / 1e6) * priceOut;
  console.log(`✓ ${a.iata} (${a.name}) | locales done cumulative:${doneLoc} calls:${calls} ~$${est.toFixed(3)} err:${errors}`);
}

async function run() {
  console.log(`Extended content for ${list.length} airports × ${LOCALE_KEYS.length} locales (concurrency ${CONCURRENCY})${SAMPLE ? ' [SAMPLE]' : ''}`);
  const queue = [...list];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) { const iata = queue.shift(); await processAirport(iata); }
  });
  await Promise.all(workers);
  const est = (tokIn / 1e6) * priceIn + (tokOut / 1e6) * priceOut;
  console.log(`\nDONE in ${((Date.now() - t0) / 1000).toFixed(0)}s | calls:${calls} tokIn:${tokIn} tokOut:${tokOut} ~\$${est.toFixed(2)} errors:${errors}`);
}
run();
