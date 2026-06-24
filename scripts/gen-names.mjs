// Localized airport NAME per language (the recognisable name people search for),
// so titles/h1 read "Аэропорт Шереметьево (SVO)" instead of Latin on /ru etc.
// Output: data/airport-names.json = { "<IATA>": { ru:"Шереметьево", zh:"谢列梅捷沃", ... } }
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const OUT = path.join(ROOT, 'data/airport-names.json');
const LANGS = ['ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'de', 'fr', 'es', 'it', 'tr'];

let out = {};
if (fs.existsSync(OUT)) { try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {} }

const LIMIT = process.env.LIMIT ? +process.env.LIMIT : airports.length;
const CONCURRENCY = +(process.env.CONCURRENCY || 60);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let done = 0, calls = 0, tok = 0, errors = 0;
const t0 = Date.now();

const SYS = `Given an airport, return its COMMON NAME as people in each language would type it when searching — the recognisable name only (e.g. "Sheremetyevo" → Russian "Шереметьево", Chinese "谢列梅捷沃"; "Heathrow" stays "Heathrow" in Latin-script languages). Native scripts. Do NOT add the word "Airport"/"International"/city unless the name itself is the city. Do NOT include the IATA code. If a language has no distinct exonym, use the city name in that language. Return ONLY a JSON object with EXACTLY these keys: ${LANGS.join(', ')}.`;

async function genOne(a) {
  const body = {
    model: 'gpt-5-mini', reasoning_effort: 'minimal',
    messages: [
      { role: 'system', content: SYS },
      { role: 'user', content: `Airport: ${a.name} (${a.iata}), city ${a.city}, ${a.country}.` },
    ],
  };
  for (let attempt = 0; attempt < 6; attempt++) {
    let r;
    try { r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch { await sleep(1500 * (attempt + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    calls++; tok += j.usage.total_tokens;
    let txt = j.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const obj = JSON.parse(txt);
    const clean = {};
    for (const l of LANGS) if (typeof obj[l] === 'string' && obj[l].trim()) clean[l] = obj[l].trim();
    return clean;
  }
  throw new Error('retries exhausted');
}

let dirty = 0;
const save = () => fs.writeFileSync(OUT, JSON.stringify(out));

async function main() {
  const list = airports.slice(0, LIMIT).filter(a => !out[a.iata]);
  console.log(`Generating names for ${list.length} airports (concurrency=${CONCURRENCY})`);
  let idx = 0;
  async function worker() {
    while (idx < list.length) {
      const a = list[idx++];
      try { out[a.iata] = await genOne(a); }
      catch (e) { errors++; console.error(`! ${a.iata}: ${e.message}`); }
      done++;
      if (++dirty >= 60) { dirty = 0; save(); }
      if (done % 300 === 0) console.log(`[${done}/${list.length}] calls=${calls} tok=${tok} err=${errors} ${((Date.now() - t0) / 60000).toFixed(1)}min`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  save();
  console.log(`DONE ${done} airports, calls=${calls}, tok=${tok}, errors=${errors}`);
}
main();
