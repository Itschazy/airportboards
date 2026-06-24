// Localized CITY and COUNTRY names per language, deduped by unique value,
// so /ru shows "Москва, Россия" instead of "Moscow, Russia" in titles/descriptions/blocks.
// Output: data/city-names.json = { "Moscow": { ru:"Москва", ... } }, data/country-names.json likewise.
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const LANGS = ['ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'de', 'fr', 'es', 'it', 'tr'];

const CITY_OUT = path.join(ROOT, 'data/city-names.json');
const COUNTRY_OUT = path.join(ROOT, 'data/country-names.json');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CONCURRENCY = +(process.env.CONCURRENCY || 80);

function load(p) { if (fs.existsSync(p)) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {} } return {}; }

const SYS_CITY = `Given a city and its country, return the city's name as people in each language would write it (native script, common exonym; e.g. "Moscow"→ru "Москва", zh "莫斯科"; "Munich"→ru "Мюнхен", de "München"). If no distinct exonym exists, transliterate naturally. Return ONLY a JSON object with EXACTLY these keys: ${LANGS.join(', ')}. No extra text.`;
const SYS_COUNTRY = `Given a country, return its name in each language (native script, official common form; e.g. "Russia"→ru "Россия", zh "俄罗斯"). Return ONLY a JSON object with EXACTLY these keys: ${LANGS.join(', ')}. No extra text.`;

let calls = 0, tok = 0, errors = 0;

async function genOne(sys, userMsg) {
  const body = { model: 'gpt-5-mini', reasoning_effort: 'minimal', messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }] };
  for (let attempt = 0; attempt < 6; attempt++) {
    let r;
    try { r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch { await sleep(1500 * (attempt + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    calls++; tok += j.usage?.total_tokens || 0;
    let txt = (j.choices?.[0]?.message?.content || '').trim().replace(/^```json\s*|\s*```$/g, '');
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('no json');
    const obj = JSON.parse(m[0]);
    const clean = {};
    for (const l of LANGS) if (obj[l] && String(obj[l]).trim()) clean[l] = String(obj[l]).trim();
    return clean;
  }
  throw new Error('exhausted retries');
}

async function run(label, sys, values, outPath, ctxMap) {
  const out = load(outPath);
  const todo = values.filter(v => !out[v] || Object.keys(out[v]).length < LANGS.length);
  console.log(`[${label}] total ${values.length}, todo ${todo.length}`);
  let done = 0;
  let idx = 0;
  async function worker() {
    while (idx < todo.length) {
      const v = todo[idx++];
      try { out[v] = await genOne(sys, ctxMap(v)); }
      catch (e) { errors++; }
      done++;
      if (done % 100 === 0) { fs.writeFileSync(outPath, JSON.stringify(out)); console.log(`[${label}] ${done}/${todo.length} calls=${calls} err=${errors}`); }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log(`[${label}] DONE ${Object.keys(out).length} entries`);
}

// city -> a representative country (for disambiguation context)
const cityCountry = {};
for (const a of airports) if (a.city && !cityCountry[a.city]) cityCountry[a.city] = a.country;
const cities = Object.keys(cityCountry);
const countries = [...new Set(airports.map(a => a.country).filter(Boolean))];

await run('country', SYS_COUNTRY, countries, COUNTRY_OUT, (c) => `Country: ${c}.`);
await run('city', SYS_CITY, cities, CITY_OUT, (c) => `City: ${c}, ${cityCountry[c]}.`);
console.log(`ALL DONE calls=${calls} tok=${tok} errors=${errors}`);
