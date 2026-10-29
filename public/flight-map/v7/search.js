import {applyAliases} from './data.js';
import {createAirportSearchAsync} from './entry.js';
// Один общий запрос для prefetched поиска и обоих полей. При сбое разрешаем
// повторную попытку; отсутствие сети не ломает уже открытую карту или историю.
export function createDeferredSearch(airports,locale,loadAliases,signal){
 const byCode=new Map(airports.map(a=>[a.code,a]));
 const defaults=locale==='ru'?['SVO','LED','AYT','IST','DXB','SVX']:['LHR','JFK','CDG','DXB','SIN','HND'];
 let pending=null,search=null;
 function instant(value,{recent=[],exclude='',limit=6}={}){
  const code=value.trim().toUpperCase();
  if(code&&byCode.has(code))return code===exclude?[]:[byCode.get(code)];
  if(code)return null;
  return [...new Set([...recent,...defaults])].filter(c=>c!==exclude&&byCode.has(c)).slice(0,limit).map(c=>byCode.get(c));
 }
 function prepare(){
  if(search)return Promise.resolve(search);
  if(!pending)pending=Promise.resolve().then(loadAliases).then(async aliases=>{
   if(signal?.aborted)throw new DOMException('Aborted','AbortError');
   applyAliases(airports,aliases);
   const ready=await createAirportSearchAsync(airports,locale,signal);search=ready;return ready;
  }).catch(error=>{pending=null;throw error;});
  return pending;
 }
 return {instant,prepare,get ready(){return !!search;},async query(value,options){const quick=instant(value,options);if(quick)return quick;return(await prepare())(value,options);}};
}
