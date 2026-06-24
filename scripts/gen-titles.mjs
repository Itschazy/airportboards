// Per-language SEO-optimal <title>/description templates for the airport board,
// arrivals and departures pages — tuned to each language's highest-volume head query.
// Output: data/title-templates.json = { <locale>: { target_query, main_title, ... } }
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data/title-templates.json');

const LANGS = {
  en: 'English', ru: 'Russian', zh: 'Chinese (Simplified)', de: 'German',
  fr: 'French', es: 'Spanish', ar: 'Arabic', ja: 'Japanese', ko: 'Korean',
  hi: 'Hindi', it: 'Italian', tr: 'Turkish',
};

const SYS = `You are a senior multilingual SEO specialist for an airport flight-board website (live arrivals & departures, like FlightStats / Flightradar). For the GIVEN language, write the HIGHEST-RANKING, click-matching <title> and meta-description templates for THREE page types of one airport: (1) MAIN board, (2) ARRIVALS board, (3) DEPARTURES board.

Optimize for the REAL head query a native speaker types to find an airport's board. Examples of head intent: Russian "шереметьево табло вылетов", "аэропорт шереметьево табло"; English "heathrow departures", "heathrow arrivals board"; German "flughafen ... ankunft". The single most important keyword is the local word for the live arrivals/departures BOARD/timetable (Russian: табло; etc.) — it MUST appear, ideally early.

HARD RULES:
- Use ONLY these literal placeholders: {airport} (airport's common local name, e.g. Шереметьево / Heathrow), {iata} (3-letter code), and optionally {city}. NEVER use any other placeholder (no {country}).
- ARRIVALS title must target the "[airport] arrivals board" head query; DEPARTURES title the "[airport] departures board" head query; MAIN the general "[airport] flight board / online board" query. Each must read naturally and contain the airport name + the board keyword + the arrivals/departures word as appropriate.
- Front-load the most valuable words. Titles concise: aim for ≤ 60 visible characters once {airport} expands to a typical name. Descriptions ≤ 155 chars, natural, mention arrivals + departures, real-time/live, today, and the airport.
- Native, idiomatic, non-spammy. No English words unless locals genuinely search that way. Keep the "({iata})" code in titles.
- Return ONLY a strict JSON object with EXACTLY these keys: target_query, main_title, arrivals_title, departures_title, main_description, arrivals_description, departures_description. "target_query" = the canonical head query a native would type, using "Sheremetyevo"/its local form as the example airport (no placeholders there).`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function gen(loc, name) {
  const body = {
    model: 'gpt-5.5',
    messages: [
      { role: 'system', content: SYS },
      { role: 'user', content: `Language: ${name} (${loc}). Example airport for target_query: Sheremetyevo.` },
    ],
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    let r;
    try { r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch { await sleep(2000 * (attempt + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    let txt = (j.choices?.[0]?.message?.content || '').trim().replace(/^```json\s*|\s*```$/g, '');
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('no json: ' + txt.slice(0, 120));
    const obj = JSON.parse(m[0]);
    // guardrail: reject forbidden placeholders
    const all = JSON.stringify(obj);
    const bad = all.match(/\{(?!airport\}|iata\}|city\})[a-z_]+\}/);
    if (bad) throw new Error(`forbidden placeholder ${bad[0]} in ${loc}`);
    return obj;
  }
  throw new Error('exhausted ' + loc);
}

const out = {};
await Promise.all(Object.entries(LANGS).map(async ([loc, name]) => {
  try { out[loc] = await gen(loc, name); console.log(`✓ ${loc}: ${out[loc].target_query}`); }
  catch (e) { console.error(`✗ ${loc}: ${e.message}`); }
}));

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`\nDONE ${Object.keys(out).length}/12 → ${OUT}`);
