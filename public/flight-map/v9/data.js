// V8 передавала core и английские алиасы разными запросами: на медленной
// сети словарь попадал в конец очереди. V9 отдаёт полный неизменённый каталог
// одним ответом. Brotli подготовлен офлайн; браузер сам распаковывает Content-
// Encoding без JS-декодера. JSON остаётся запасным путём для браузера/прокси,
// не поддерживающего такое кодирование. Abort не превращается в повтор.
// Safari дублировал fetch-preload, если словарь ещё летел по сети. Module
// preload и import разделяют module map даже с пустым HTTP-кэшем. Данные
// не исполняют логики: только export default; fallback сохраняет старый JSON.
export async function loadPayload(name,signal,request=fetch,importData=url=>import(/* webpackIgnore: true */ url)){
 const check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};check();
 try{const module=await importData('/flight-map/v9/'+name+'.js.br');check();return module.default;}
 catch(error){check();if(error.name==='AbortError')throw error;}
 let firstError;
 for(const suffix of ['.json.br','.json']){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  try{const r=await request('/flight-map/v9/'+name+suffix,{signal});if(!r.ok)throw Error('catalogue');return await r.json();}
  catch(error){if(signal?.aborted||error.name==='AbortError')throw error;firstError??=error;}
 }
 throw firstError;
}
// Объединённый каталог сразу создаёт конечные объекты. Старый decodeCore
// выделял по промежуточному массиву/алиасу на аэропорт, затем applyAliases
// заменял строки вторым проходом. На слабом CPU это лишняя работа и GC.
export function decodeCatalogue(data){
 const [codes,cities,names,countries,lats,lons]=data.columns,aliases=data.aliases;
 if(!Array.isArray(aliases)||aliases.length!==codes.length||aliases.some(x=>x!==null&&typeof x!=='string'))throw Error('Invalid search aliases');
 return codes.map((code,i)=>{const city=cities[i],name=names[i]===null?city:names[i];return{code,city,name,country:countries[i],lat:lats[i],lon:lons[i],alias:aliases[i]===null?city+' '+name:aliases[i]};});
}
