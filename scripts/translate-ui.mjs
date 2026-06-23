// Translate the FlightBoard UI strings into all locales via gpt-5-mini and
// merge them into messages/<loc>.json under the "ui" namespace.
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const ROOT = process.cwd();
const MSG = path.join(ROOT, 'messages');

const LOCALES = {
  ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic', de: 'German',
  ko: 'Korean', ja: 'Japanese', fr: 'French', es: 'Spanish',
  it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};

// English source — keep {placeholders} intact in translations.
const UI = {
  departures: 'Departures',
  arrivals: 'Arrivals',
  search_placeholder: 'Search flight, city or airline',
  local_time: 'Local time',
  departures_today: '{count} departures today',
  arrivals_today: '{count} arrivals today',
  no_flights: 'No flights found',
  filter_all: 'All',
  filter_ontime: 'On time',
  filter_delayed: 'Delayed',
  filter_boarding: 'Boarding',
  filter_finalcall: 'Final call',
  filter_departed: 'Departed',
  st_ontime: 'On time',
  st_boarding: 'Boarding',
  st_delayed: 'Delayed',
  st_finalcall: 'Final call',
  st_cancelled: 'Cancelled',
  st_departed: 'Departed',
  st_arrived: 'Arrived',
  st_baggage: 'Baggage claim',
  st_scheduled: 'Scheduled',
  updated_now: 'Updated now',
  updated_min_ago: 'Updated {m} min ago',
  departure: 'Departure',
  arrival: 'Arrival',
  gate: 'Gate',
  terminal: 'Terminal',
  baggage: 'Baggage claim',
  flight_status: 'Flight status',
  updated: 'Updated',
  now: 'now',
  departing: 'Departing',
  landing: 'Landing',
  departs_in: 'Departs in',
  arrives_in: 'Arrives in',
  final_call: 'Final call',
  go_to_gate: 'Go to gate now',
  delayed_by: 'Delayed by {m}m',
  was: 'Was {time}',
  scheduled_at: 'Scheduled {time}',
};

function mergeUi(loc, ui) {
  const file = path.join(MSG, `${loc}.json`);
  const msg = JSON.parse(fs.readFileSync(file, 'utf8'));
  msg.ui = ui;
  fs.writeFileSync(file, JSON.stringify(msg, null, 2) + '\n');
  console.log(`merged ui into ${loc}.json (${Object.keys(ui).length} keys)`);
}

async function translate(lang) {
  const body = {
    model: 'gpt-5-mini',
    reasoning_effort: 'minimal',
    messages: [
      { role: 'system', content: `Translate this JSON object of airport flight-board UI labels into ${lang}. Return ONLY valid JSON with the SAME keys. Keep placeholders like {count}, {m}, {time} EXACTLY as-is. Keep translations short and natural for a flight information board.` },
      { role: 'user', content: JSON.stringify(UI) },
    ],
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  let txt = j.choices[0].message.content.trim();
  txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(txt);
}

async function main() {
  mergeUi('en', UI); // source of truth
  for (const [loc, lang] of Object.entries(LOCALES)) {
    try {
      const ui = await translate(lang);
      // ensure every key present; fall back to English for any missing
      for (const k of Object.keys(UI)) if (!ui[k]) ui[k] = UI[k];
      mergeUi(loc, ui);
    } catch (e) {
      console.error(`! ${loc}: ${e.message}`);
    }
  }
  console.log('DONE');
}
main();
