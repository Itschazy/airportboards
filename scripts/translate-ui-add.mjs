// Translate ONLY the new bottom-sheet UI keys and MERGE them into the
// existing `ui` namespace of each locale (existing keys are preserved).
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const MSG = path.join(process.cwd(), 'messages');
const LOCALES = {
  ru: 'Russian', zh: 'Chinese (Simplified)', ar: 'Arabic', de: 'German',
  ko: 'Korean', ja: 'Japanese', fr: 'French', es: 'Spanish',
  it: 'Italian', hi: 'Hindi', tr: 'Turkish',
};

const NEW = {
  departs_in: 'Departs in',
  arrives_in: 'Arrives in',
  new_departure: 'New departure {time}',
  on_schedule: 'On schedule {time}',
  boarding_now: 'Boarding now',
  final_call_now: 'Final call',
  go_to_gate_now: 'Go to gate {gate}',
  flight_departed: 'Flight departed',
  just_now: 'Just now',
  aircraft: 'Aircraft',
  show_on_map: 'Show on airport map',
  checkin: 'Check-in',
  seat: 'Seat',
  boarding_in: 'Boarding in {time}',
  delayed_label: 'Delayed',
  dur_h: 'h',
  dur_m: 'm',
};

function merge(loc, obj) {
  const file = path.join(MSG, `${loc}.json`);
  const msg = JSON.parse(fs.readFileSync(file, 'utf8'));
  msg.ui = { ...(msg.ui || {}), ...obj };
  fs.writeFileSync(file, JSON.stringify(msg, null, 2) + '\n');
  console.log(`merged ${Object.keys(obj).length} keys into ${loc}.json`);
}

async function translate(lang) {
  const body = {
    model: 'gpt-5-mini',
    reasoning_effort: 'minimal',
    messages: [
      { role: 'system', content: `Translate this JSON of airport flight-board UI labels into ${lang}. Return ONLY valid JSON with the SAME keys. Keep placeholders {time} and {gate} EXACTLY. Keep short and natural for a flight-status card. "dur_h"/"dur_m" are short hour/minute units (like "h"/"m").` },
      { role: 'user', content: JSON.stringify(NEW) },
    ],
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  let txt = j.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(txt);
}

async function main() {
  merge('en', NEW);
  for (const [loc, lang] of Object.entries(LOCALES)) {
    try {
      const obj = await translate(lang);
      for (const k of Object.keys(NEW)) if (!obj[k]) obj[k] = NEW[k];
      merge(loc, obj);
    } catch (e) { console.error(`! ${loc}: ${e.message}`); }
  }
  console.log('DONE');
}
main();
