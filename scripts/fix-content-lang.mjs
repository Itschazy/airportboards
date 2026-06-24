// Repair airport-content values that leaked Russian/Cyrillic tokens (онлайн-табло,
// прилёты, вылеты) into non-ru locales. Regenerates ONLY the corrupted (iata, locale)
// pairs with a strict single-language prompt. Resumable & safe (only touches bad values).
// Usage: OPENAI_API_KEY=... node scripts/fix-content-lang.mjs
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const byIata = new Map(airports.map(a => [a.iata, a]));
const DIR = path.join(ROOT, 'data/airport-content');

const LANGS = { en: 'English', zh: 'Chinese (Simplified)', ar: 'Arabic', de: 'German',
  ko: 'Korean', ja: 'Japanese', fr: 'French', es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish' };
const CYR = /[А-Яа-яЁё]/;
const CONCURRENCY = +(process.env.CONCURRENCY || 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Collect corrupted (file, locale) pairs.
const tasks = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.json'))) {
  let o; try { o = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch { continue; }
  const iata = f.replace('.json', '');
  for (const l of Object.keys(LANGS)) {
    if (typeof o[l] === 'string' && CYR.test(o[l])) tasks.push({ file: f, iata, locale: l });
  }
}
console.log(`corrupted pairs to fix: ${tasks.length}`);

function sys(lang) {
  return `You are an SEO copywriter for an airport flight-board website. Write a unique, factually accurate intro paragraph (70-110 words) ENTIRELY in ${lang} for an airport page: mention terminals, airlines based there, popular destinations, useful passenger context. If little reliable info exists, stay general — do NOT invent terminals/gates/routes. Include the ${lang} words for "online flight board", "arrivals" and "departures". CRITICAL: write ONLY in ${lang}; do NOT include any Russian or Cyrillic characters, and do NOT add parenthetical translations in other languages. Output ONLY the paragraph.`;
}

async function gen(a, locale) {
  const body = { model: 'gpt-5-mini', reasoning_effort: 'minimal', messages: [
    { role: 'system', content: sys(LANGS[locale]) },
    { role: 'user', content: `Airport: ${a.name} (${a.iata}), ${a.city}, ${a.country}. Write in ${LANGS[locale]}.` },
  ] };
  for (let attempt = 0; attempt < 6; attempt++) {
    let r;
    try { r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch { await sleep(1500 * (attempt + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    let txt = (j.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
    if (CYR.test(txt)) txt = txt.replace(/\s*\(?[А-Яа-яЁё][А-Яа-яЁё\s\-]*\)?/g, '').replace(/\s+/g, ' ').trim(); // belt-and-suspenders
    return txt;
  }
  throw new Error('exhausted');
}

let done = 0, errors = 0, idx = 0;
async function worker() {
  while (idx < tasks.length) {
    const tk = tasks[idx++];
    const a = byIata.get(tk.iata);
    if (!a) { done++; continue; }
    try {
      const txt = await gen(a, tk.locale);
      if (txt && txt.length > 30 && !CYR.test(txt)) {
        const p = path.join(DIR, tk.file);
        const o = JSON.parse(fs.readFileSync(p, 'utf8'));
        o[tk.locale] = txt;
        fs.writeFileSync(p, JSON.stringify(o));
      } else errors++;
    } catch { errors++; }
    done++;
    if (done % 50 === 0) console.log(`${done}/${tasks.length} (err ${errors})`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`DONE ${done} fixed, ${errors} errors`);
