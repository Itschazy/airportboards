#!/usr/bin/env node
// Copy for airports with no scheduled commercial service — roughly two thirds of the 6,072
// IATA codes in the dataset (military fields, bush strips, general-aviation and private
// airfields). Showing them an empty "live board" reads as broken; saying plainly that no
// airline flies here, and pointing at the nearest airport that one does, is both true and
// more useful. Idempotent.
import fs from 'fs';

const STRINGS = {
  en: { ns_title: 'No scheduled flights',
        ns_body: 'No airline operates scheduled passenger flights from {name}, so there is no departure board to show.',
        ns_nearest: 'The nearest airport with scheduled flights is <link>{airport}</link>, about {km} km away.',
        ns_meta: '{airport} ({iata}) in {city}, {country}: no scheduled passenger flights. Location, time zone and the nearest airport that does have flights.' },
  ru: { ns_title: 'Регулярных рейсов нет',
        ns_body: 'Из {name} не выполняются регулярные пассажирские рейсы, поэтому табло вылетов здесь нет.',
        ns_nearest: 'Ближайший аэропорт с регулярными рейсами — <link>{airport}</link>, примерно в {km} км.',
        ns_meta: '{airport} ({iata}), {city}, {country}: регулярных пассажирских рейсов нет. Расположение, часовой пояс и ближайший аэропорт с рейсами.' },
  de: { ns_title: 'Keine Linienflüge',
        ns_body: 'Ab {name} werden keine planmäßigen Passagierflüge durchgeführt, daher gibt es hier keine Abflugtafel.',
        ns_nearest: 'Der nächste Flughafen mit Linienflügen ist <link>{airport}</link>, etwa {km} km entfernt.',
        ns_meta: '{airport} ({iata}) in {city}, {country}: keine planmäßigen Passagierflüge. Lage, Zeitzone und der nächste Flughafen mit Flugverbindungen.' },
  fr: { ns_title: 'Aucun vol régulier',
        ns_body: 'Aucune compagnie n’assure de vols réguliers depuis {name}, il n’y a donc pas de tableau des départs.',
        ns_nearest: 'L’aéroport le plus proche avec des vols réguliers est <link>{airport}</link>, à environ {km} km.',
        ns_meta: '{airport} ({iata}) à {city}, {country} : aucun vol régulier de passagers. Localisation, fuseau horaire et aéroport desservi le plus proche.' },
  es: { ns_title: 'Sin vuelos regulares',
        ns_body: 'Ninguna aerolínea opera vuelos regulares de pasajeros desde {name}, por lo que no hay panel de salidas.',
        ns_nearest: 'El aeropuerto con vuelos regulares más cercano es <link>{airport}</link>, a unos {km} km.',
        ns_meta: '{airport} ({iata}) en {city}, {country}: sin vuelos regulares de pasajeros. Ubicación, zona horaria y el aeropuerto con vuelos más cercano.' },
  it: { ns_title: 'Nessun volo di linea',
        ns_body: 'Nessuna compagnia opera voli di linea passeggeri da {name}, quindi non c’è un tabellone delle partenze.',
        ns_nearest: 'L’aeroporto di linea più vicino è <link>{airport}</link>, a circa {km} km.',
        ns_meta: '{airport} ({iata}) a {city}, {country}: nessun volo di linea passeggeri. Posizione, fuso orario e l’aeroporto servito più vicino.' },
  ja: { ns_title: '定期便はありません',
        ns_body: '{name}を発着する定期旅客便はないため、出発案内は表示されません。',
        ns_nearest: '定期便のある最寄りの空港は<link>{airport}</link>で、約{km}kmの距離です。',
        ns_meta: '{city}（{country}）の{airport}（{iata}）：定期旅客便はありません。所在地、時間帯、定期便のある最寄り空港。' },
  ko: { ns_title: '정기편이 없습니다',
        ns_body: '{name}에서 운항하는 정기 여객편이 없어 출발 정보를 표시할 수 없습니다.',
        ns_nearest: '정기편이 있는 가장 가까운 공항은 <link>{airport}</link>이며, 약 {km}km 거리입니다.',
        ns_meta: '{city}, {country}의 {airport}({iata}): 정기 여객편 없음. 위치, 시간대, 정기편이 있는 가장 가까운 공항.' },
  zh: { ns_title: '没有定期航班',
        ns_body: '目前没有航空公司从{name}运营定期客运航班，因此没有出发信息板。',
        ns_nearest: '最近的有定期航班的机场是<link>{airport}</link>，距离约{km}公里。',
        ns_meta: '{country}{city}的{airport}（{iata}）：无定期客运航班。位置、时区以及最近的有航班的机场。' },
  ar: { ns_title: 'لا توجد رحلات منتظمة',
        ns_body: 'لا تُشغّل أي شركة طيران رحلات ركاب منتظمة من {name}، لذلك لا توجد لوحة مغادرة.',
        ns_nearest: 'أقرب مطار به رحلات منتظمة هو <link>{airport}</link>، على بُعد {km} كم تقريبًا.',
        ns_meta: '{airport} ({iata}) في {city}، {country}: لا توجد رحلات ركاب منتظمة. الموقع والمنطقة الزمنية وأقرب مطار به رحلات.' },
  hi: { ns_title: 'कोई नियमित उड़ान नहीं',
        ns_body: '{name} से कोई भी एयरलाइन नियमित यात्री उड़ानें नहीं चलाती, इसलिए यहाँ प्रस्थान बोर्ड नहीं है।',
        ns_nearest: 'नियमित उड़ानों वाला निकटतम हवाई अड्डा <link>{airport}</link> है, लगभग {km} किमी दूर।',
        ns_meta: '{city}, {country} में {airport} ({iata}): कोई नियमित यात्री उड़ान नहीं। स्थान, समय क्षेत्र और उड़ानों वाला निकटतम हवाई अड्डा।' },
  tr: { ns_title: 'Tarifeli uçuş yok',
        ns_body: '{name} havalimanından tarifeli yolcu uçuşu yapılmıyor, bu nedenle kalkış tablosu bulunmuyor.',
        ns_nearest: 'Tarifeli uçuşu olan en yakın havalimanı <link>{airport}</link>, yaklaşık {km} km uzaklıkta.',
        ns_meta: '{city}, {country} bölgesindeki {airport} ({iata}): tarifeli yolcu uçuşu yok. Konum, saat dilimi ve uçuşu olan en yakın havalimanı.' },
};

let added = 0;
for (const [loc, strings] of Object.entries(STRINGS)) {
  const p = `messages/${loc}.json`;
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  d.home ??= {};
  let touched = false;
  for (const [k, v] of Object.entries(strings)) {
    if (d.home[k] !== undefined) continue;
    d.home[k] = v; touched = true; added++;
  }
  if (touched) fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
}
console.log(`${added} keys added`);

const sets = Object.keys(STRINGS).map(l => {
  const d = JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8'));
  return [l, Object.keys(d.home).sort().join('|')];
});
const bad = sets.filter(([, s]) => s !== sets[0][1]).map(([l]) => l);
console.log(bad.length ? `MISMATCH: ${bad.join(', ')}` : 'home key sets identical across all 12 locales');
