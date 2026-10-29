import {createAirportSearchAsync} from './entry.js';
// Все алиасы приходят вместе с каталогом. Раньше непустая локальная выдача
// могла скрыть CDG за Paris (Texas) и остаться такой после догрузки словаря.
// Теперь любой текст ждёт один полный индекс; точный IATA/недавние коды
// доступны сразу. Это сохраняет ранжирование всех 12 языков без скачков списка.
export function createSearch(airports,locale='ru',signal){
 const byCode=new Map(airports.map(a=>[a.code,a]));
 const defaults=locale==='ru'?['SVO','LED','AYT','IST','DXB','SVX']:['LHR','JFK','CDG','DXB','SIN','HND'];
 let pending=null,search=null;
 const check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
 function instant(value,{recent=[],exclude='',limit=6}={}){
  check();const code=value.trim().toUpperCase();
  if(code&&byCode.has(code))return code===exclude?[]:[byCode.get(code)];
  if(!code)return [...new Set([...recent,...defaults])].filter(c=>c!==exclude&&byCode.has(c)).slice(0,limit).map(c=>byCode.get(c));
  return search?search(value,{recent,exclude,limit}):null;
 }
 function prepare(){check();return pending??=createAirportSearchAsync(airports,locale,signal).then(fn=>search=fn).catch(error=>{pending=null;throw error;});}
 return {instant,prepare,get ready(){return !!search;},async query(value,options){const quick=instant(value,options);if(quick)return quick;return(await prepare())(value,options);}};
}
