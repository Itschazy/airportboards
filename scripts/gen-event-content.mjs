// Generate localized content for an /event/[slug] page (12 locales via gpt-5.5).
// Facts are pinned in the prompt — the model localizes, it may not invent.
// Usage: OPENAI_API_KEY=... node scripts/gen-event-content.mjs
import fs from 'fs';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const SLUG = 'world-cup-2026-final';
const OUT = `data/events/${SLUG}.json`;
fs.mkdirSync('data/events', { recursive: true });

const LOCALES = {
  en: 'English', ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic',
  de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French',
  es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};

const FACTS = `EVENT FACTS (fixed, do not alter):
- FIFA World Cup 2026 Final: Spain vs Argentina.
- Kick-off: Sunday, July 19, 2026, 15:00 local time (ET).
- Venue: MetLife Stadium, East Rutherford, New Jersey (New York City area).
- Nearest major airports: Newark Liberty (EWR, ~20 km from the stadium — closest), LaGuardia (LGA, ~32 km), John F. Kennedy (JFK, ~48 km).
- Typical transit: NJ Transit rail to Meadowlands Sports Complex via Secaucus Junction on event days; taxis/ride-hailing also common. From EWR: AirTrain + NJ Transit. Roads around the stadium are heavily congested on match day.
- Fans fly home mostly July 20–21; airports will be exceptionally busy — arrive much earlier than usual.
FORBIDDEN: prices, fares, flight numbers, timetables, gate numbers, phone numbers, predictions of the result.`;

function sys(lang) {
  return `You write concise, factually-careful travel info for a live flight-board website (airportsboard.live). Write ONLY in ${lang}. Return a JSON object with EXACTLY these keys:
- "title": SEO <title> for the page, ≤65 chars, must mention the World Cup final and airports (naturally, for how locals search).
- "description": meta description, 120-155 chars, mention live flight boards for EWR/JFK/LGA.
- "h1": page heading, ≤70 chars.
- "banner": one short line (≤70 chars) for a promo banner on airport pages, e.g. "Flying to the World Cup final? Nearest airports & tips →" in ${lang}.
- "intro": 60-90 word paragraph: the final (Spain vs Argentina, July 19, MetLife Stadium near NYC) and why checking a live airport board matters that weekend.
- "getting": 60-90 words: getting from EWR/LGA/JFK to MetLife Stadium in general terms (NJ Transit via Secaucus on event days, taxis, heavy traffic).
- "leaving": 60-90 words: flying home July 20-21 — huge crowds, arrive very early, check the live departures board before leaving for the airport, allow extra time for security/passport.
- "tips": 50-80 words of practical evergreen advice for match-weekend air travellers.
${FACTS}
Return ONLY the JSON object.`;
}

const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {
  meta: {
    slug: SLUG,
    name: 'FIFA World Cup 2026 Final — Spain vs Argentina',
    startDate: '2026-07-19T15:00:00-04:00',
    venue: 'MetLife Stadium',
    venueCity: 'East Rutherford, New Jersey',
    airports: [
      { iata: 'EWR', km: 20 },
      { iata: 'LGA', km: 32 },
      { iata: 'JFK', km: 48 },
    ],
  },
  locales: {},
};

let tokIn = 0, tokOut = 0;
for (const [loc, lang] of Object.entries(LOCALES)) {
  const cur = out.locales[loc];
  if (cur && cur.title && cur.intro && cur.tips) { console.log(`= ${loc} (cached)`); continue; }
  const body = {
    model: 'gpt-5.5',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: sys(lang) },
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
      out.locales[loc] = JSON.parse(j.choices[0].message.content);
      fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
      console.log(`✓ ${loc}: ${out.locales[loc].title}`);
      break;
    } catch (e) { console.error(`! ${loc} attempt ${a}: ${e.message}`); await new Promise(s => setTimeout(s, 1500)); }
  }
}
console.log(`DONE tokens ${tokIn}+${tokOut} (~$${((tokIn * 1.25 + tokOut * 10) / 1e6).toFixed(2)})`);
