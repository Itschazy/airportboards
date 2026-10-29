import {applyAliases} from '../v7/data.js';
import {createAirportSearchAsync,createLocalAirportSearch} from './entry.js';
// V7 задерживала даже «Челя» до загрузки английских алиасов. Основной
// каталог уже содержит все локальные города/аэропорты: индексируем его сразу.
// Совпадения показываются без сети; пустой ответ ждёт полный словарь, чтобы
// «Heathrow» на RU не превращался в ложное «не найдено». Фоновое дополнение
// не перерисовывает открытый список: следующий ввод использует полный индекс.
export function createDeferredSearch(airports,locale,loadAliases,signal){
 const byCode=new Map(airports.map(a=>[a.code,a]));
 const defaults=locale==='ru'?['SVO','LED','AYT','IST','DXB','SVX']:['LHR','JFK','CDG','DXB','SIN','HND'];
 let localPending=null,pending=null,local=null,search=null;
 const check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
 function prepareLocal(){
  check();
  if(!localPending){local=createLocalAirportSearch(airports,locale);localPending=Promise.resolve(local);}
  return localPending;
 }
 function instant(value,options={}){
  check();const {recent=[],exclude='',limit=6}=options,code=value.trim().toUpperCase();
  if(code&&byCode.has(code))return code===exclude?[]:[byCode.get(code)];
  if(!code)return [...new Set([...recent,...defaults])].filter(c=>c!==exclude&&byCode.has(c)).slice(0,limit).map(c=>byCode.get(c));
  if(search)return search(value,options);
  const rows=local?.(value,options);return rows?.length?rows:null;
 }
 function prepare(){
  check();if(search)return Promise.resolve(search);
  if(!pending)pending=Promise.all([prepareLocal(),Promise.resolve().then(loadAliases)]).then(async([,aliases])=>{
   check();applyAliases(airports,aliases);
   // Полный индекс также сохраняет поиск по транслитерации и между полями.
   search=await createAirportSearchAsync(airports,locale,signal);return search;
  }).catch(error=>{pending=null;throw error;});
  return pending;
 }
 return {instant,prepare,prepareLocal,get ready(){return !!local;},get complete(){return !!search;},async query(value,options){
  let quick=instant(value,options);if(quick)return quick;
  await prepareLocal();quick=instant(value,options);if(quick)return quick;
  return(await prepare())(value,options);
 }};
}
