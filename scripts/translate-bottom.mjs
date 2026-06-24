import fs from 'fs';
import path from 'path';

const KEY = process.env.OPENAI_API_KEY;
const MSG = path.join(process.cwd(), 'messages');
const OTHER = { zh: 'Chinese (Simplified)', ar: 'Arabic', de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French', es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish' };

const EN = {
  show_more: 'Show more', read_more: 'Read more', view_all: 'View all', airport_word: 'Airport',
  ov_dep: 'Departures today', ov_arr: 'Arrivals today',
  routes_title: 'Popular routes from {iata}', per_day: '{n} per day',
  nearby_title: 'Other airports near {city}', km_away: '{km} km from {iata}',
  faq_title: 'Frequently asked questions', about_title: 'About {iata} Airport',
  country_air_title: 'Popular airports in {country}', az_all: 'All airports A–Z',
  faq_iata_q: 'What is the IATA code for {name}?',
  faq_icao_q: 'What is the ICAO code for {name}?',
  faq_where_q: 'Where is {name} located?',
  faq_tz_q: 'What time zone is {name} in?',
  faq_arrive_q: 'How early should I arrive at {name}?',
  faq_arrive_a: 'For international flights, arrive at least 3 hours before departure; for domestic flights, about 2 hours.',
  faq_live_q: 'How can I see live flights at {name}?',
  faq_live_a: 'This page shows live arrivals and departures for {name} ({iata}), updated every minute.',
  footer_tagline: 'Live airport boards for 6,000+ airports worldwide. Arrivals and departures in real time, updated every minute.',
  footer_countries: 'Popular countries', footer_cities: 'Popular cities',
};
const RU = {
  show_more: 'Показать больше', read_more: 'Читать далее', view_all: 'Все', airport_word: 'Аэропорт',
  ov_dep: 'Вылетов сегодня', ov_arr: 'Прилётов сегодня',
  routes_title: 'Популярные направления из {iata}', per_day: '{n} в день',
  nearby_title: 'Другие аэропорты рядом — {city}', km_away: '{km} км от {iata}',
  faq_title: 'Частые вопросы', about_title: 'Об аэропорте {iata}',
  country_air_title: 'Популярные аэропорты — {country}', az_all: 'Все аэропорты A–Z',
  faq_iata_q: 'Какой код ИАТА у {name}?',
  faq_icao_q: 'Какой код ИКАО у {name}?',
  faq_where_q: 'Где находится {name}?',
  faq_tz_q: 'В каком часовом поясе {name}?',
  faq_arrive_q: 'За сколько приезжать в {name}?',
  faq_arrive_a: 'На международные рейсы приезжайте минимум за 3 часа до вылета, на внутренние — примерно за 2 часа.',
  faq_live_q: 'Как посмотреть рейсы {name} онлайн?',
  faq_live_a: 'На этой странице — онлайн прилёты и вылеты {name} ({iata}), обновление каждую минуту.',
  footer_tagline: 'Онлайн табло 6000+ аэропортов мира. Прилёты и вылеты в реальном времени, обновление каждую минуту.',
  footer_countries: 'Популярные страны', footer_cities: 'Популярные города',
};

function merge(loc, obj) {
  const f = path.join(MSG, `${loc}.json`);
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  m.home = { ...(m.home || {}), ...obj };
  fs.writeFileSync(f, JSON.stringify(m, null, 2) + '\n');
  console.log('merged', loc);
}
async function tr(lang) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-5-mini', reasoning_effort: 'minimal', messages: [{ role: 'system', content: `Translate this JSON of airport-page UI strings into ${lang}. Return ONLY valid JSON, SAME keys. Keep placeholders {iata} {name} {city} {country} {km} {n} EXACTLY. Short, natural.` }, { role: 'user', content: JSON.stringify(EN) }] }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message);
  let t = j.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(t);
}
async function main() {
  merge('en', EN); merge('ru', RU);
  for (const [loc, lang] of Object.entries(OTHER)) {
    try { const o = await tr(lang); for (const k of Object.keys(EN)) if (!o[k]) o[k] = EN[k]; merge(loc, o); }
    catch (e) { console.error('!', loc, e.message); }
  }
  console.log('DONE');
}
main();
