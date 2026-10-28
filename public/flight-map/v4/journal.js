import {normalize} from './entry.js';


// Индекс перестраивается при изменении истории/периода, а не на каждый символ.
// Фильтр относится только к журналу: поиск рейса не меняет карту и экспорт.
// Номер сравниваем также без пробелов, чтобы SU123 и SU 123 находили одну запись.
export function createJournalSearch(flights,airports){
 const rows=flights.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(f=>({flight:f,text:normalize([f.from,f.to,airports[f.from]?.city,airports[f.to]?.city,f.number,f.number?.replace(/\s/g,''),f.date].join(' '))}));
 return query=>{const terms=normalize(query).split(' ').filter(Boolean);return rows.filter(r=>terms.every(t=>r.text.includes(t))).map(r=>r.flight);};
}
