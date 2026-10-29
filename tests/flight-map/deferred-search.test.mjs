import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gzipSync} from 'node:zlib';
import {decodeCore,applyAliases} from '../../public/flight-map/v7/data.js';
import {createDeferredSearch} from '../../public/flight-map/v7/search.js';
import {createAirportSearch as before} from '../../public/flight-map/v5/entry.js';
import {createAirportSearchAsync} from '../../public/flight-map/v7/entry.js';
import {createMap} from '../../public/flight-map/v6/map.js';import {decodeGeography} from '../../public/flight-map/v6/data.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])test(locale+': initial map and completed catalogue remain lossless',async()=>{
 const source=read(`public/flight-map/v4/airports-${locale}.json`),core=decodeCore(read(`public/flight-map/v7/core-${locale}.json`));
 assert.deepEqual(core.map(({alias,...a})=>a),source.map(({alias,...a})=>a));
 const land=decodeGeography(read('public/flight-map/v6/geography.json')),a=createMap(core,land),b=createMap(source,land),flights=[{id:'f_1',from:'LHR',to:'HND',date:'',number:''}];assert.equal(a.body(flights,a.fit(flights)),b.body(flights,b.fit(flights)));
 applyAliases(core,read(`public/flight-map/v7/aliases-${locale}.json`));assert.deepEqual(core,source);
 const actual=await createAirportSearchAsync(core,locale),expected=before(source,locale);
 for(const query of ['','HND','Tokyo','Heathrow','Челя','Ант','Delhi',source[300].city])assert.deepEqual(actual(query),expected(query),query);
});
test('core plus aliases transfer less than v6 full RU catalogue',()=>{
 const size=p=>gzipSync(fs.readFileSync(new URL('../../public/flight-map/'+p,import.meta.url))).length;
 assert.ok(size('v7/core-ru.json')<size('v6/airports-ru.json')*.65);
 assert.ok(size('v7/core-ru.json')+size('v7/aliases-ru.json')<size('v6/airports-ru.json'));
});
test('instant defaults and code entry do not wait for aliases; concurrent text searches share one load',async()=>{
 const core=decodeCore(read('public/flight-map/v7/core-ru.json'));let calls=0,resolve;
 const search=createDeferredSearch(core,'ru',()=>{calls++;return new Promise(r=>resolve=r);});
 assert.equal(search.instant('CEK')[0].code,'CEK');assert.equal(search.instant('',{recent:['HND']})[0].code,'HND');assert.equal(calls,0);
 const one=search.query('Heathrow'),two=search.query('Челя');await Promise.resolve();assert.equal(calls,1);assert.equal(search.ready,false);
 resolve(read('public/flight-map/v7/aliases-ru.json'));
 assert.equal((await one)[0].code,'LHR');assert.equal((await two)[0].code,'CEK');assert.equal(search.ready,true);
});
test('a failed background load can retry, while abort prevents late index work',async()=>{
 const core=decodeCore(read('public/flight-map/v7/core-ru.json'));let calls=0;const search=createDeferredSearch(core,'ru',()=>{if(++calls===1)throw Error('offline');return read('public/flight-map/v7/aliases-ru.json');});
 await assert.rejects(search.prepare(),/offline/);assert.equal(search.instant('CEK')[0].code,'CEK');assert.equal((await search.query('Heathrow'))[0].code,'LHR');assert.equal(calls,2);
 const controller=new AbortController();controller.abort();await assert.rejects(createAirportSearchAsync(core,'ru',controller.signal),{name:'AbortError'});
});
test('index yields before completion and a navigation abort stops later chunks',async()=>{
 const core=decodeCore(read('public/flight-map/v7/core-ru.json')),controller=new AbortController();
 let complete=false;const pending=createAirportSearchAsync(core,'ru',controller.signal).then(x=>{complete=true;return x;});
 assert.equal(complete,false);controller.abort();await assert.rejects(pending,{name:'AbortError'});
});
