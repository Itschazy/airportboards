// v4 сохраняет диакритики хинди/арабского и английские алиасы каталога.
// Только локальный каталог: история старого рейса не требует платного поиска.
// Коды имеют приоритет над совпадением в названии; транслитерация позволяет
// найти Челябинск по chelyabinsk, не меняя каноническое имя аэропорта.
export const normalize=s=>String(s).toLowerCase().replaceAll('ё','е').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim();
const letters={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
const latin=s=>s.replace(/[а-я]/g,c=>letters[c]??c);
export function recentAirports(flights){return [...new Set(flights.slice().reverse().flatMap(f=>[f.to,f.from]))];}
export function routePair(value,codes){const m=String(value).trim().toUpperCase().match(/^([A-Z]{3})\s*(?:[-–—→/>]|\s)\s*([A-Z]{3})$/);return m&&m[1]!==m[2]&&codes.has(m[1])&&codes.has(m[2])?{from:m[1],to:m[2]}:null;}
export function createAirportSearch(airports,locale='ru'){
 const rows=airports.map(a=>({a,code:a.code.toLowerCase(),city:normalize(a.city),name:normalize(a.name),latin:latin(normalize(a.city+' '+a.name+' '+(a.alias||'')))})),byCode=new Map(airports.map(a=>[a.code,a]));
 return (value,{recent=[],exclude='',limit=6}={})=>{
  const q=normalize(value);if(!q)return [...new Set([...recent,...(locale==='ru'?['SVO','LED','AYT','IST','DXB','SVX']:['LHR','JFK','CDG','DXB','SIN','HND'])])].filter(c=>c!==exclude&&byCode.has(c)).slice(0,limit).map(c=>byCode.get(c));
  const terms=q.split(' '),rank=new Map(recent.map((c,i)=>[c,i])),out=[];
  for(const row of rows){if(row.a.code===exclude)continue;const hay=row.code+' '+row.city+' '+row.name+' '+row.latin;if(!terms.every(t=>hay.includes(t)))continue;
   const score=row.code===q?0:row.city===q?1:row.city.startsWith(q)?2:row.code.startsWith(q)?3:row.city.includes(q)?4:row.latin.startsWith(q)?5:6;
   out.push({a:row.a,score,recent:rank.get(row.a.code)??9999});
  }
  return out.sort((a,b)=>a.score-b.score||a.recent-b.recent||a.a.code.localeCompare(b.a.code)).slice(0,limit).map(x=>x.a);
 };
}
