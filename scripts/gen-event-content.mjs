// Generate localized content for an /event/[slug] page (12 locales via gpt-5.5).
// Facts are pinned in the prompt — the model localizes, it may not invent.
//
// Usage:
//   OPENAI_API_KEY=... node scripts/gen-event-content.mjs data/events/drafts/<slug>.meta.json
//
// The draft file holds the verified meta plus the facts the copy may use:
// {
//   "meta": { slug, name, startDate, endDate?, venue, venueCity, country, type,
//             officialUrl?, sources[], airports:[{iata,km}] },
//   "facts": "bullet list of verified, quotable facts (routes, transit, distances)",
//   "guidance": "optional extra rules for this event (e.g. logistics-only)",
//   "locales": ["en","ru",...]   // optional subset; defaults to all 12
// }
// Resumable: locales already present in the output keep their copy.
import fs from 'fs';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const draftPath = process.argv[2];
if (!draftPath) { console.error('usage: node scripts/gen-event-content.mjs <draft.meta.json>'); process.exit(1); }
const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
const meta = draft.meta;
if (!meta?.slug) { console.error('draft.meta.slug missing'); process.exit(1); }

const ALL = {
  en: 'English', ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic',
  de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French',
  es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};
const LOCALES = Object.fromEntries(
  (draft.locales?.length ? draft.locales : Object.keys(ALL)).map(l => [l, ALL[l]]),
);

const OUT = `data/events/${meta.slug}.json`;
fs.mkdirSync('data/events', { recursive: true });

const airportList = meta.airports.map(a => `${a.iata} (~${a.km} km from ${meta.venue})`).join(', ');

function sys(lang, loc) {
  // SERP truncation is by pixel width and CJK glyphs are ~2x the width of Latin, so the
  // Latin character budgets would produce zh/ja/ko copy that gets cut off in the snippet.
  const cjk = ['zh', 'ja', 'ko'].includes(loc);
  const titleMax = cjk ? 32 : 65;
  const descRange = cjk ? '55-85' : '120-155';
  return `You write concise, factually-careful TRAVEL LOGISTICS copy for a live flight-board website (airportsboard.live). The page answers one question: how air travellers get to and from this event. Write ONLY in ${lang}.

Return a JSON object with EXACTLY these keys:
- "title": SEO <title>, ≤${titleMax} characters. Must read naturally for how people in ${lang} search; mention the event and airports/flights.
- "description": meta description, ${descRange} characters, mentioning live flight boards for ${meta.airports.map(a => a.iata).join('/')}.
- "h1": page heading, ≤${cjk ? 36 : 70} characters.
- "banner": ONE short line (≤70 chars) for a promo chip on the airport pages, e.g. an invitation to open the event guide.
- "intro": 60-90 words — what the event is (name, date, venue, city) and why checking a live airport board matters around those dates.
- "getting": 60-90 words — getting from the listed airports to the venue: which airport is the main gateway, approximate distance/time, the transport modes that exist there.
- "leaving": 60-90 words — the fly-home wave after the event: crowded airports, arrive earlier than usual, check the live departures board before leaving for the airport.
- "tips": 50-80 words — practical, evergreen advice for air travellers around a big event.
- "sec": an object with FOUR short section headings in ${lang}, tailored to THIS event (not generic football wording):
    { "boards": heading for the nearest-airports/live-boards block,
      "getting": heading for the getting-there block,
      "leaving": heading for the flying-home block,
      "tips": heading for the tips block }

HARD RULES
- Use ONLY the facts below. You may translate and rephrase them; you may NOT add new facts.
- Across "intro" + "getting" + "leaving" you must use at least 5 CONCRETE facts from the list
  (main gateway airport, distances/times, transport modes, the peak departure window, dates).
- FORBIDDEN: ticket prices, fares, flight numbers, timetables, gate numbers, phone numbers,
  predictions of results, and any claim that this site sells tickets or is official.
- Neutral service-directory tone. No hype, no clickbait, no opinions about people.

EVENT FACTS (fixed, do not alter):
- Event: ${meta.name}
- Type: ${meta.type}
- Date: ${meta.startDate}${meta.endDate ? ` — ${meta.endDate}` : ''}
- Venue: ${meta.venue}, ${meta.venueCity} (${meta.country})
- Airports covered: ${airportList}
${draft.facts || ''}
${draft.guidance ? `\nEVENT-SPECIFIC RULES:\n${draft.guidance}` : ''}

Return ONLY the JSON object.`;
}

const out = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, 'utf8'))
  : { meta, locales: {} };
out.meta = meta;   // draft is the source of truth for meta

let tokIn = 0, tokOut = 0;
for (const [loc, lang] of Object.entries(LOCALES)) {
  const cur = out.locales[loc];
  if (cur && cur.title && cur.intro && cur.tips && cur.sec) { console.log(`= ${loc} (cached)`); continue; }
  const body = {
    model: 'gpt-5.5',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: sys(lang, loc) },
      { role: 'user', content: `Write the JSON in ${lang}.` },
    ],
  };
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 2000 * (a + 1))); continue; }
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      tokIn += j.usage.prompt_tokens; tokOut += j.usage.completion_tokens;
      const parsed = JSON.parse(j.choices[0].message.content);
      for (const k of ['title', 'description', 'h1', 'banner', 'intro', 'getting', 'leaving', 'tips']) {
        if (!parsed[k]) throw new Error(`missing key "${k}"`);
      }
      out.locales[loc] = parsed;
      fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
      console.log(`✓ ${loc}: ${parsed.title}`);
      break;
    } catch (e) { console.error(`! ${loc} attempt ${a}: ${e.message}`); await new Promise(s => setTimeout(s, 1500)); }
  }
}
console.log(`DONE ${OUT} — ${Object.keys(out.locales).length} locales, tokens ${tokIn}+${tokOut} (~$${((tokIn * 1.25 + tokOut * 10) / 1e6).toFixed(2)})`);
