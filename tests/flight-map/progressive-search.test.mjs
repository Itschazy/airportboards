import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {decodeCore} from '../../public/flight-map/v7/data.js';
import {createDeferredSearch} from '../../public/flight-map/v8/search.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../public/flight-map/'+p,import.meta.url)));
test('local city search does not wait for the optional English dictionary',async()=>{
 const airports=decodeCore(read('v7/core-ru.json'));
 const search=createDeferredSearch(airports,'ru',()=>new Promise(()=>{}));
 const result=await Promise.race([search.query('Челя'),new Promise(r=>setTimeout(()=>r('blocked by aliases'),500))]);
 assert.notEqual(result,'blocked by aliases');assert.equal(result[0].code,'CEK');
});
import {createAirportSearch as before} from '../../public/flight-map/v5/entry.js';
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])test(locale+': local search is usable before aliases and full results preserve ranking',async()=>{
 const airports=decodeCore(read(`v7/core-${locale}.json`)),source=read(`v4/airports-${locale}.json`);
 let resolve;const search=createDeferredSearch(airports,locale,()=>new Promise(r=>resolve=r));
 const background=search.prepare();await search.prepareLocal();
 assert.equal(search.ready,true);assert.equal(search.complete,false);
 const city=airports.find(a=>a.code==='CEK').city;
 assert.ok(search.instant(city).some(a=>a.code==='CEK'));
 assert.equal(search.instant(city,{exclude:'CEK'})?.some(a=>a.code==='CEK')??false,false);
 resolve(read(`v7/aliases-${locale}.json`));await background;assert.equal(search.complete,true);
 const expected=before(source,locale);
 for(const q of ['Heathrow','Челя','Chelyabinsk','Tokyo','東京','Ант','Delhi',source[500].city,'zzznotfound'])assert.deepEqual((await search.query(q)).map(a=>a.code),expected(q).map(a=>a.code),q);
});
test('unknown local queries wait for aliases, failed aliases retry without breaking local matches',async()=>{
 const airports=decodeCore(read('v7/core-ru.json'));let calls=0;
 const search=createDeferredSearch(airports,'ru',()=>{if(++calls===1)throw Error('offline');return read('v7/aliases-ru.json');});
 await assert.rejects(search.prepare(),/offline/);await search.prepareLocal();
 assert.equal(search.instant('Челя')[0].code,'CEK');assert.equal(search.instant('Heathrow'),null);
 assert.equal((await search.query('Heathrow'))[0].code,'LHR');assert.equal(calls,2);
 assert.deepEqual(await search.query('zzznosuchcity'),[]);
});
test('aborted navigation rejects late alias results and later queries',async()=>{
 const controller=new AbortController();let resolve;
 const search=createDeferredSearch(decodeCore(read('v7/core-ru.json')),'ru',()=>new Promise(r=>resolve=r),controller.signal);
 const pending=search.prepare();await Promise.resolve();controller.abort();resolve(read('v7/aliases-ru.json'));
 await assert.rejects(pending,{name:'AbortError'});await assert.rejects(search.query('CEK'),{name:'AbortError'});
});
