// Generate multilingual search aliases per airport via gpt-5-mini, so users
// can find an airport by its city/name in their own language or script.
// Output: data/airport-aliases.json = { "<IATA>": ["Москва","莫斯科",...], ... }
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const OUT = path.join(ROOT, 'data/airport-aliases.json');

let out = {};
if (fs.existsSync(OUT)) { try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {} }

const LIMIT = process.env.LIMIT ? +process.env.LIMIT : airports.length;
const CONCURRENCY = +(process.env.CONCURRENCY || 40);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let done = 0, calls = 0, tok = 0, errors = 0;
const t0 = Date.now();

const SYS = `You generate search aliases for an airport finder. Given an airport, return a JSON array of strings people might type to find it in different languages: the CITY name and the airport's common short name in Russian, German, French, Spanish, Italian, Portuguese, Turkish, Chinese (Simplified), Japanese, Korean, Arabic, Hindi — in their native scripts — plus well-known nicknames/abbreviations. Rules: native scripts; each entry is ONLY the plain name (no language labels, no parentheses, no annotations like "(de)" or "informal"); deduplicated; SHORT (city or airport short name, not full official names); do NOT include the English city/name already provided; do NOT include the IATA code. Return ONLY a JSON array of strings.`;

async function genOne(a) {
  const body = {
    model: 'gpt-5-mini',
    reasoning_effort: 'minimal',
    messages: [
      { role: 'system', content: SYS },
      { role: 'user', content: `Airport: ${a.name} (${a.iata}), city ${a.city}, ${a.country}.` },
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
    } catch { await sleep(1500 * (attempt + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    calls++; tok += j.usage.total_tokens;
    let txt = j.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr.filter(s => typeof s === 'string' && s.trim()).slice(0, 30) : [];
  }
  throw new Error('retries exhausted');
}

let dirty = 0;
function save() { fs.writeFileSync(OUT, JSON.stringify(out)); }

async function main() {
  const list = airports.slice(0, LIMIT).filter(a => !out[a.iata]);
  console.log(`Generating aliases for ${list.length} airports (concurrency=${CONCURRENCY})`);
  let idx = 0;
  async function worker() {
    while (idx < list.length) {
      const a = list[idx++];
      try { out[a.iata] = await genOne(a); }
      catch (e) { errors++; console.error(`! ${a.iata}: ${e.message}`); }
      done++;
      if (++dirty >= 50) { dirty = 0; save(); }
      if (done % 200 === 0) {
        const mins = ((Date.now() - t0) / 60000).toFixed(1);
        console.log(`[${done}/${list.length}] calls=${calls} tok=${tok} err=${errors} ${mins}min`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  save();
  console.log(`DONE ${done} airports, calls=${calls}, tok=${tok}, errors=${errors}`);
}
main();
