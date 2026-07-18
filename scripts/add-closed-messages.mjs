#!/usr/bin/env node
// Add the closed-airport notice strings to all 12 locales, under the `home` namespace where
// the rest of the airport-page copy lives. Idempotent: existing keys are left alone.
import fs from 'fs';

const STRINGS = {
  en: { closed_title: 'This airport is closed',
        closed_body: '{name} stopped handling scheduled flights in {year}, so there is no live board to show.',
        closed_successor: 'Flights for this city now use {successor}.' },
  ru: { closed_title: 'Аэропорт закрыт',
        closed_body: '{name} прекратил обслуживание регулярных рейсов в {year} году, поэтому онлайн-табло здесь нет.',
        closed_successor: 'Рейсы этого города обслуживает {successor}.' },
  de: { closed_title: 'Dieser Flughafen ist geschlossen',
        closed_body: '{name} hat den Linienflugbetrieb {year} eingestellt, daher gibt es hier keine Flugtafel.',
        closed_successor: 'Die Flüge dieser Stadt laufen jetzt über {successor}.' },
  fr: { closed_title: 'Cet aéroport est fermé',
        closed_body: '{name} a cessé d’accueillir des vols réguliers en {year}, il n’y a donc pas de tableau en direct.',
        closed_successor: 'Les vols de cette ville passent désormais par {successor}.' },
  es: { closed_title: 'Este aeropuerto está cerrado',
        closed_body: '{name} dejó de operar vuelos regulares en {year}, por lo que no hay panel en directo.',
        closed_successor: 'Los vuelos de esta ciudad utilizan ahora {successor}.' },
  it: { closed_title: 'Questo aeroporto è chiuso',
        closed_body: '{name} ha cessato i voli di linea nel {year}, quindi non c’è un tabellone in tempo reale.',
        closed_successor: 'I voli di questa città usano ora {successor}.' },
  ja: { closed_title: 'この空港は閉鎖されています',
        closed_body: '{name}は{year}年に定期便の運航を終了したため、発着案内は表示されません。',
        closed_successor: 'この都市の便は現在{successor}を利用しています。' },
  ko: { closed_title: '운영이 종료된 공항입니다',
        closed_body: '{name}은(는) {year}년에 정기편 운항을 종료하여 실시간 운항 정보가 없습니다.',
        closed_successor: '이 도시의 항공편은 현재 {successor}을(를) 이용합니다.' },
  zh: { closed_title: '该机场已关闭',
        closed_body: '{name}已于{year}年停止定期航班运营，因此没有实时航班信息板。',
        closed_successor: '该城市的航班现由{successor}承运。' },
  ar: { closed_title: 'هذا المطار مغلق',
        closed_body: 'توقف {name} عن تشغيل الرحلات المنتظمة في عام {year}، لذلك لا توجد لوحة رحلات مباشرة.',
        closed_successor: 'رحلات هذه المدينة تستخدم الآن {successor}.' },
  hi: { closed_title: 'यह हवाई अड्डा बंद है',
        closed_body: '{name} ने {year} में नियमित उड़ानों का संचालन बंद कर दिया, इसलिए यहाँ लाइव बोर्ड नहीं है।',
        closed_successor: 'इस शहर की उड़ानें अब {successor} से संचालित होती हैं।' },
  tr: { closed_title: 'Bu havalimanı kapalı',
        closed_body: '{name} {year} yılında tarifeli uçuşları sonlandırdı, bu nedenle canlı uçuş tablosu yok.',
        closed_successor: 'Bu şehrin uçuşları artık {successor} üzerinden yapılıyor.' },
};

let added = 0;
for (const [loc, strings] of Object.entries(STRINGS)) {
  const path = `messages/${loc}.json`;
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  d.home ??= {};
  let touched = false;
  for (const [k, v] of Object.entries(strings)) {
    if (d.home[k] !== undefined) continue;
    d.home[k] = v;
    touched = true;
    added++;
  }
  if (touched) fs.writeFileSync(path, JSON.stringify(d, null, 2) + '\n');
  console.log(`${loc}: ${touched ? 'updated' : 'already had all keys'}`);
}
console.log(`\n${added} keys added across ${Object.keys(STRINGS).length} locales`);

// parity check — every locale must end up with the same key set
const sets = Object.keys(STRINGS).map(l => {
  const d = JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8'));
  return [l, Object.keys(d.home).sort().join('|')];
});
const ref = sets[0][1];
const bad = sets.filter(([, s]) => s !== ref).map(([l]) => l);
console.log(bad.length ? `MISMATCHED home keys in: ${bad.join(', ')}` : 'home key sets identical across all locales');
