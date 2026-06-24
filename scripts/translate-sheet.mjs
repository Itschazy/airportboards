import fs from 'fs';
import path from 'path';
const KEY = process.env.OPENAI_API_KEY;
const MSG = path.join(process.cwd(), 'messages');
const OTHER = { zh: 'Chinese (Simplified)', ar: 'Arabic', de: 'German', ko: 'Korean', ja: 'Japanese', fr: 'French', es: 'Spanish', it: 'Italian', hi: 'Hindi', tr: 'Turkish' };

const EN = {
  h_board_label: 'Boarding', h_board_main: 'Boarding now',
  gate_closes: 'Gate closes in {m} min',
  h_final_label: 'Final call', h_final_main: 'Go to the gate now',
  h_delay_label: 'Delay {dur}',
  actual_dep: 'Actual departure time',
  h_cancel_label: 'Flight cancelled', h_cancel_main: 'Contact the airline', h_cancel_sub: 'Check alternative flights',
  about_flight: 'About the flight', airline_label: 'Airline', aircraft_type: 'Aircraft type', flight_no: 'Flight number',
  flight_details: 'Flight details',
  notice_board: 'Please be at the gate early. The gate closes strictly on schedule.',
  notice_final: 'Head to the gate now. Boarding is not allowed once the gate closes.',
  notice_ontime: 'Arrive at the airport early to complete all procedures.',
  notice_delayed: 'The departure time has changed. Keep an eye on the board.',
};
const RU = {
  h_board_label: 'Посадка идёт', h_board_main: 'Идёт посадка',
  gate_closes: 'Выход закроется в {m} мин',
  h_final_label: 'Последний вызов', h_final_main: 'Срочно к выходу',
  h_delay_label: 'Задержка {dur}',
  actual_dep: 'Фактическое время вылета',
  h_cancel_label: 'Рейс отменён', h_cancel_main: 'Свяжитесь с авиакомпанией', h_cancel_sub: 'Проверьте альтернативные рейсы',
  about_flight: 'О рейсе', airline_label: 'Авиакомпания', aircraft_type: 'Тип самолёта', flight_no: 'Номер рейса',
  flight_details: 'Подробности рейса',
  notice_board: 'Пожалуйста, будьте у выхода заранее. Выход закроется строго по расписанию.',
  notice_final: 'Срочно направляйтесь к выходу. После закрытия выхода на посадку не допускают.',
  notice_ontime: 'Приезжайте в аэропорт заранее, чтобы пройти все необходимые процедуры.',
  notice_delayed: 'Время вылета изменилось. Следите за обновлениями табло.',
};
function merge(loc, obj) {
  const f = path.join(MSG, `${loc}.json`); const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  m.ui = { ...(m.ui || {}), ...obj }; fs.writeFileSync(f, JSON.stringify(m, null, 2) + '\n'); console.log('merged', loc);
}
async function tr(lang) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-5-mini', reasoning_effort: 'minimal', messages: [{ role: 'system', content: `Translate this JSON of flight-card UI strings into ${lang}. Return ONLY valid JSON, SAME keys. Keep placeholders {m} {dur} EXACTLY. Short, natural, for a flight status card.` }, { role: 'user', content: JSON.stringify(EN) }] }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message);
  let t = j.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim(); return JSON.parse(t);
}
async function main() {
  merge('en', EN); merge('ru', RU);
  for (const [loc, lang] of Object.entries(OTHER)) { try { const o = await tr(lang); for (const k of Object.keys(EN)) if (!o[k]) o[k] = EN[k]; merge(loc, o); } catch (e) { console.error('!', loc, e.message); } }
  console.log('DONE');
}
main();
