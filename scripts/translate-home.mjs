// Translate new homepage `home` keys and merge into each locale (preserving existing).
import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
const MSG = path.join(process.cwd(), 'messages');
const OTHER = { zh: 'Chinese (Simplified)', ar: 'Arabic', de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French', es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish' };

const EN = {
  hero1: 'Airport boards', hero2: 'in real time',
  subline: 'Arrivals and departures for 6,000+ airports worldwide. Updated every minute.',
  nearest: 'Nearest airports',
  m_airports: 'airports', m_countries: 'countries & territories',
  m_updates_v: 'Every minute', m_updates_l: 'data updates',
  sec_popular_now: 'Popular now', sec_countries: 'Airports by country',
  sec_cities: 'Popular cities', sec_airports: 'Popular airports',
  sec_recent: 'Recently viewed', sec_az: 'All airports A–Z',
  departures_short: 'departures', arrivals_short: 'arrivals',
  airports_count: '{count} airports',
  country_title: 'Airports in {country}',
  country_desc: 'Live arrivals and departures for all {count} airports in {country}. Real-time flight status, updated every minute.',
  az_title: 'Airports starting with {letter}',
  az_desc: 'All airports starting with the letter {letter} — live arrivals and departures, updated every minute.',
};
const RU = {
  hero1: 'Табло аэропортов', hero2: 'в реальном времени',
  subline: '6000+ аэропортов мира. Прилёты и вылеты, обновление каждую минуту.',
  nearest: 'Ближайшие аэропорты',
  m_airports: 'аэропортов', m_countries: 'стран и территорий',
  m_updates_v: 'Каждую минуту', m_updates_l: 'обновление данных',
  sec_popular_now: 'Популярно сейчас', sec_countries: 'Аэропорты по странам',
  sec_cities: 'Популярные города', sec_airports: 'Популярные аэропорты',
  sec_recent: 'Недавно просмотренные', sec_az: 'Все аэропорты A–Z',
  departures_short: 'вылетов', arrivals_short: 'прилётов',
  airports_count: '{count} аэропортов',
  country_title: 'Аэропорты — {country}',
  country_desc: 'Онлайн табло прилётов и вылетов всех аэропортов страны {country} ({count}). Актуальные статусы рейсов, обновление каждую минуту.',
  az_title: 'Аэропорты на букву {letter}',
  az_desc: 'Все аэропорты на букву {letter} — онлайн прилёты и вылеты, обновление каждую минуту.',
};

function merge(loc, obj) {
  const file = path.join(MSG, `${loc}.json`);
  const msg = JSON.parse(fs.readFileSync(file, 'utf8'));
  msg.home = { ...(msg.home || {}), ...obj };
  fs.writeFileSync(file, JSON.stringify(msg, null, 2) + '\n');
  console.log(`merged home into ${loc}.json`);
}

async function translate(lang) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-5-mini', reasoning_effort: 'minimal', messages: [
      { role: 'system', content: `Translate this JSON of homepage UI strings for an airport flight-board site into ${lang}. Return ONLY valid JSON, SAME keys. Keep placeholders {count}, {country}, {letter} EXACTLY. Keep short and natural. hero1+hero2 form one phrase ("Airport boards in real time").` },
      { role: 'user', content: JSON.stringify(EN) },
    ] }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  let txt = j.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(txt);
}

async function main() {
  merge('en', EN);
  merge('ru', RU);
  for (const [loc, lang] of Object.entries(OTHER)) {
    try { const o = await translate(lang); for (const k of Object.keys(EN)) if (!o[k]) o[k] = EN[k]; merge(loc, o); }
    catch (e) { console.error(`! ${loc}: ${e.message}`); }
  }
  console.log('DONE');
}
main();
