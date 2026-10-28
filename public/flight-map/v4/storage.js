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
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function validate(data,codes){
 if(!data||data.format!==FORMAT||data.version!==1||!Array.isArray(data.flights))throw Error(t("m141"));
 if(data.flights.length>LIMIT)throw Error(t("m142"));
 const ids=new Set();return data.flights.map((f,i)=>{
  const fail=()=>{throw Error(`${t("m143",{p0:(i+1)})}`);};
  if(!f||typeof f.id!=='string'||!/^f_[a-zA-Z0-9_-]{1,76}$/.test(f.id)||ids.has(f.id))fail();
  if(!codes.has(f.from)||!codes.has(f.to)||f.from===f.to||typeof f.number!=='string'||f.number.length>24||/[\x00-\x1f]/.test(f.number))fail();
  if(typeof f.date!=='string')fail();
  if(f.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(f.date)||!Number.isFinite(Date.parse(f.date))||new Date(f.date).toISOString().slice(0,10)!==f.date||f.date>today()))fail();
  ids.add(f.id);return {id:f.id,from:f.from,to:f.to,date:f.date,number:f.number};
 });
}
function parse(text,codes){if(typeof text!=='string'||new Blob([text]).size>MAX_BYTES)throw Error(t("m137"));let d;try{d=JSON.parse(text);}catch{throw Error(t("m144"));}return validate(d,codes);}
function backup(flights){return JSON.stringify({format:FORMAT,version:1,exportedAt:new Date().toISOString(),flights},null,2);}
function merge(current,incoming){const byId=new Map(current.map(f=>[f.id,f]));let added=0,existing=0,conflicts=0;const flights=[...current];for(const f of incoming){const old=byId.get(f.id);if(!old){flights.push(f);byId.set(f.id,f);added++;}else if(['from','to','date','number'].every(k=>old[k]===f[k]))existing++;else conflicts++;}if(flights.length>LIMIT)throw Error(t("m145"));return{flights,added,existing,conflicts};}
function createStore(storage,codes){let observed,unreadable=false;
 const store={read(){try{const raw=storage.getItem(KEY);const flights=raw===null?[]:parse(raw,codes);observed=raw;unreadable=false;return flights;}catch(e){unreadable=true;throw e;}},
 write(flights){if(unreadable)throw Error(t("m146"));
  let current;try{current=storage.getItem(KEY);}catch{throw Error(t("m147"));}
  if(current!==observed)throw Error(t("m148"));
  const clean=validate({format:FORMAT,version:1,flights},codes),raw=backup(clean);
  try{storage.setItem(KEY,raw);}catch{throw Error(t("m149"));}observed=raw;return clean;
 }};
 store.writeAsync=flights=>globalThis.navigator?.locks
  ?navigator.locks.request(KEY,()=>store.write(flights))
  :Promise.resolve().then(()=>store.write(flights));
 return store;
}

return {KEY,FORMAT,LIMIT,MAX_BYTES,newId,validate,parse,backup,merge,createStore};
}
