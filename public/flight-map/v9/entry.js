// v4 сохраняет диакритики хинди/арабского и английские алиасы каталога.
// Только локальный каталог: история старого рейса не требует платного поиска.
// Коды имеют приоритет над совпадением в названии; транслитерация позволяет
// найти Челябинск по chelyabinsk, не меняя каноническое имя аэропорта.
// ASCII не требует NFD/Unicode-классов: английские алиасы есть у всех
// локалей. Быстрый путь эквивалентен прежнему; остальные алфавиты сохраняют
// диакритику и нормализуются ровно как v8. Проверено дифференциально.
export function normalize(value){const s=String(value).toLowerCase();return /^[\x00-\x7f]*$/.test(s)?s.replace(/[^a-z0-9]+/g,' ').trim():s.replaceAll('ё','е').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim();}
const letters={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
const latin=s=>s.replace(/[а-я]/g,c=>letters[c]??c);
export function recentAirports(flights){return [...new Set(flights.slice().reverse().flatMap(f=>[f.to,f.from]))];}
export function routePair(value,codes){const m=String(value).trim().toUpperCase().match(/^([A-Z]{3})\s*(?:[-–—→/>]|\s)\s*([A-Z]{3})$/);return m&&m[1]!==m[2]&&codes.has(m[1])&&codes.has(m[2])?{from:m[1],to:m[2]}:null;}
// Индекс раньше блокировал main thread целиком (~350мс вместе с mount на CPU6×).
// Делим подготовку на порции; поиск возвращает тот же полный ранжированный набор.
// Одни и те же город/имя раньше нормализовались трижды, включая повтор
// внутри alias; на CPU6× подготовка core растягивалась до1.6с. Кэш действует
// только во время сборки индекса. Состав строки и ранжирование сохраняются;
// дифференциальные тесты сравнивают результат со старым индексом на12языках.
function rowBuilder(){
 const normalized=new Map(),transliterated=new Map();
 const norm=s=>{if(!normalized.has(s))normalized.set(s,normalize(s));return normalized.get(s);};
 const translit=s=>{if(!transliterated.has(s))transliterated.set(s,latin(s));return transliterated.get(s);};
 return a=>{
  const city=norm(a.city),name=norm(a.name);
  const alias=a.alias===a.city+' '+a.name?[city,name].filter(Boolean).join(' '):norm(a.alias||'');
  return {a,code:a.code.toLowerCase(),city,name,latin:[city,name,alias].filter(Boolean).map(translit).join(' ')};
 };
}
export const createAirportSearch=(airports,locale='ru')=>searchFromRows(airports,locale,airports.map(rowBuilder()));
// Основной индекс не строит транслитерации и английские алиасы: только
// city/name/code, уже нужные форме. Это короткая синхронная работа вместо
// очереди13 задач, которую гидратация Next растягивала ещё почти на секунду.
// Запрос без совпадений ожидает полный асинхронный индекс, а не ложный zero.
export function createLocalAirportSearch(airports,locale='ru'){
 const cache=new Map(),norm=s=>{if(!cache.has(s))cache.set(s,normalize(s));return cache.get(s);};
 return searchFromRows(airports,locale,airports.map(a=>({a,code:a.code.toLowerCase(),city:norm(a.city),name:norm(a.name),latin:''})));
}
export async function createAirportSearchAsync(airports,locale='ru',signal){
 // Safari растягивал цепочку setTimeout(0): после 28с готово лишь 1600
 // из6074 строк. MessageChannel уступает main thread между короткими порциями
 // без цепочки таймеров; закрываем оба порта при успехе, ошибке и abort.
 const channel=new MessageChannel(),rows=[],searchRow=rowBuilder(),batch=800;
 const yieldTask=()=>new Promise(resolve=>{channel.port1.onmessage=resolve;channel.port2.postMessage(null);});
 // Первый chunk не присоединяем к JSON.parse/decode/mount в одной microtask.
 // Даём браузеру закончить текущую задачу до нормализации имён.
 try{await yieldTask();for(let i=0;i<airports.length;i+=batch){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  for(const a of airports.slice(i,i+batch))rows.push(searchRow(a));
  if(i+batch<airports.length)await yieldTask();
 }
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 return searchFromRows(airports,locale,rows);
 }finally{channel.port1.close();channel.port2.close();}
}
function searchFromRows(airports,locale,rows){
 // При равной точности не прячем уже предложенные по умолчанию аэропорты
 // за алфавитным IATA: «Ант» на RU раньше ставил AYT пятым. Точный город/код
 // и личные недавние аэропорты сохраняют приоритет; остальные не исключаются.
 const defaults=locale==='ru'?['SVO','LED','AYT','IST','DXB','SVX']:['LHR','JFK','CDG','DXB','SIN','HND'];
 const preferred=new Map(defaults.map((code,i)=>[code,i]));
 const byCode=new Map(airports.map(a=>[a.code,a]));
 return (value,{recent=[],exclude='',limit=6}={})=>{
  const q=normalize(value);if(!q)return [...new Set([...recent,...defaults])].filter(c=>c!==exclude&&byCode.has(c)).slice(0,limit).map(c=>byCode.get(c));
  const terms=q.split(' '),rank=new Map(recent.map((c,i)=>[c,i])),out=[];
  for(const row of rows){if(row.a.code===exclude)continue;const hay=row.code+' '+row.city+' '+row.name+' '+row.latin;if(!terms.every(t=>hay.includes(t)))continue;
   const score=row.code===q?0:row.city===q?1:row.city.startsWith(q)?2:row.code.startsWith(q)?3:row.city.includes(q)?4:row.latin.startsWith(q)?5:6;
   out.push({a:row.a,score,recent:rank.get(row.a.code)??9999});
  }
  return out.sort((a,b)=>a.score-b.score||a.recent-b.recent||(preferred.get(a.a.code)??9999)-(preferred.get(b.a.code)??9999)||a.a.code.localeCompare(b.a.code)).slice(0,limit).map(x=>x.a);
 };
}
