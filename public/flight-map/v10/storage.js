import {validateDate,markDuplicates,sameFlight} from './history.js';
// Язык ошибок задаётся экземпляром, формат и ключ истории общие для всех локалей.
export function createStorage(t){
// Независимый ключ журнала не затрагивает избранное. Формат backup совместим с прототипом.
// Web Locks сериализует конкурирующие записи вкладок, сравнение observed отклоняет устаревшую форму.
// Commit before updating the UI: quota/private-mode failures must not masquerade
// as a saved flight. Compare the previous value to reject stale edits in another
// tab. Imports are validated in full and merged by stable ID, never replacing
// the current journal. Browser clearing still requires an external JSON backup.
const KEY='airportsboard-flight-history-v1';
const FORMAT='airportsboard-flight-history';
const LIMIT=5000, MAX_BYTES=2*1024*1024;
function newId(){return 'f_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');}
function validate(data,codes,{allowFuture=false}={}){
 if(!data||data.format!==FORMAT||data.version!==1||!Array.isArray(data.flights))throw Error(t("m141"));
 if(data.flights.length>LIMIT)throw Error(t("m142"));
 const ids=new Set();return data.flights.map((f,i)=>{
  const fail=()=>{throw Error(`${t("m143",{p0:(i+1)})}`);};
  if(!f||typeof f.id!=='string'||!/^f_[a-zA-Z0-9_-]{1,76}$/.test(f.id)||ids.has(f.id))fail();
  if(!codes.has(f.from)||!codes.has(f.to)||f.from===f.to||typeof f.number!=='string'||f.number.length>24||/[\x00-\x1f]/.test(f.number))fail();
  if(typeof f.date!=='string')fail();
  if(!validateDate(f.date,{allowFuture}).valid)fail();
  ids.add(f.id);return {id:f.id,from:f.from,to:f.to,date:f.date,number:f.number};
 });
}
function parse(text,codes,options){if(typeof text!=='string'||new Blob([text]).size>MAX_BYTES)throw Error(t("m137"));let d;try{d=JSON.parse(text);}catch{throw Error(t("m144"));}return validate(d,codes,options);}
function backup(flights){return JSON.stringify({format:FORMAT,version:1,exportedAt:new Date().toISOString(),flights},null,2);}
function merge(current,incoming){const byId=new Map(current.map(f=>[f.id,f]));let added=0,existing=0,conflicts=0;const flights=[...current];for(const f of incoming){const old=byId.get(f.id);if(!old){flights.push(f);byId.set(f.id,f);added++;}else if(['from','to','date','number'].every(k=>old[k]===f[k]))existing++;else conflicts++;}if(flights.length>LIMIT)throw Error(t("m145"));return{flights,added,existing,conflicts};}
function createStore(storage,codes){let observed,unreadable=false;
 const store={read(){try{const raw=storage.getItem(KEY);const flights=raw===null?[]:parse(raw,codes,{allowFuture:true});observed=raw;unreadable=false;return flights;}catch(e){unreadable=true;throw e;}},
 write(flights,expected=observed){if(unreadable)throw Error(t("m146"));
  let current;try{current=storage.getItem(KEY);}catch{throw Error(t("m147"));}
  if(current!==expected)throw Error(t("m148"));
  // Сохранённая календарная дата не становится повреждённой после перелёта
  // на запад/смены часов. Для чтения проверяем структуру и календарь; запрет
  // будущего относится к новой или изменённой дате. Старые строки можно
  // удалить/исправить по номеру, не блокируя весь журнал. JSON-импорт остаётся
  // строгим. Регрессия: Tokyo → Los_Angeles в один момент времени.
  const clean=validate({format:FORMAT,version:1,flights},codes,{allowFuture:true});
  const previous=new Map((current===null?[]:parse(current,codes,{allowFuture:true})).map(f=>[f.id,f]));
  for(const [i,f] of clean.entries())if(previous.get(f.id)?.date!==f.date&&!validateDate(f.date).valid)throw Error(t('m143',{p0:i+1}));
  const raw=backup(clean);
  try{storage.setItem(KEY,raw);}catch{throw Error(t("m149"));}observed=raw;return clean;
 }};
 // Ожидаемый снимок фиксируем ДО ожидания Web Lock. Раньше другая операция
 // того же store могла прочитать/импортировать данные и обновить observed:
 // устаревшая форма после этого проходила проверку и стирала новый импорт.
 // Regression: queued import → queued save; старый save обязан отклониться.
 store.writeAsync=flights=>{const expected=observed;
  return globalThis.navigator?.locks
   ?navigator.locks.request(KEY,()=>store.write(flights,expected))
   :Promise.resolve().then(()=>store.write(flights,expected));
 };
 // Массовый импорт перечитывает актуальную историю ВНУТРИ той же блокировки,
 // что обычное сохранение. Отмена не восстанавливает старый снимок всего журнала:
 // удаляет только записи этой партии, которые с тех пор никто не изменял.
 // Благодаря сравнению полей правки соседней вкладки и новые перелёты сохраняются.
 const transaction=run=>globalThis.navigator?.locks
  ?navigator.locks.request(KEY,run):Promise.resolve().then(run);
 store.importAsync=(incoming,{allowDuplicates=false}={})=>transaction(()=>{
  const clean=validate({format:FORMAT,version:1,flights:incoming},codes),current=store.read();
  const result=merge(current,clean),existingIds=new Set(current.map(f=>f.id));
  const added=clean.filter(f=>!existingIds.has(f.id));
  const duplicates=markDuplicates(added,current).filter(f=>f.duplicateOf).length;
  if(duplicates&&!allowDuplicates)return {...result,flights:current,added:0,duplicates,requiresConfirmation:true,receipt:null};
  const saved=result.added?store.write(result.flights):current;
  const receipt=Object.freeze({records:Object.freeze(added.map(f=>Object.freeze({...f})))});
  return {...result,flights:saved,duplicates,requiresConfirmation:false,receipt};
 });
 store.undoImportAsync=receipt=>transaction(()=>{
  if(!receipt||!Array.isArray(receipt.records))throw Error(t('m144'));
  const originals=validate({format:FORMAT,version:1,flights:receipt.records},codes),current=store.read();
  const byId=new Map(originals.map(f=>[f.id,f]));let removed=0,preserved=0;
  const remaining=current.filter(f=>{const original=byId.get(f.id);if(!original)return true;if(sameFlight(f,original)){removed++;return false;}preserved++;return true;});
  return {flights:removed?store.write(remaining):current,removed,preserved};
 });
 return store;
}

return {KEY,FORMAT,LIMIT,MAX_BYTES,newId,validate,parse,backup,merge,createStore};
}
