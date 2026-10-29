import {decodeCore,applyAliases} from '../../public/flight-map/v7/data.js';
import {decodeGeography} from '../../public/flight-map/v6/data.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createI18n} from '../../public/flight-map/v4/i18n.js';
import {createStorage} from '../../public/flight-map/v4/storage.js';
import {createSharing} from '../../public/flight-map/v4/sharing.js';
import {createAirportSearch,normalize} from '../../public/flight-map/v5/entry.js';
import {createMap} from '../../public/flight-map/v6/map.js';
import {buildCard} from '../../public/flight-map/v5/exporter.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
const ru=read('lib/flight-map/locales/ru.json'),land=decodeGeography(read('public/flight-map/v6/geography.json'));
const params=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
const flight={id:'f_private123',from:'LHR',to:'HND',date:'2025-01-14',number:'PRIVATE 765'};
const shared=new Map(),memory={getItem:k=>shared.get(k)??null,setItem:(k,v)=>shared.set(k,v)};
for(const locale of locales)test(locale+': complete messages, search, cross-language storage and private export',()=>{
 const messages=read(`lib/flight-map/locales/${locale}.json`),i18n=createI18n(locale,messages),airports=decodeCore(read(`public/flight-map/v7/core-${locale}.json`)),codes=new Set(airports.map(a=>a.code));
 assert.deepEqual(Object.keys(messages).sort(),Object.keys(ru).sort());
 for(const [key,value]of Object.entries(messages))if(typeof value==='string'){
  assert.deepEqual(params(value),params(ru[key]),key);assert.ok(value.trim().length,key);
  if(locale!=='ru')assert.doesNotMatch(value,/[А-Яа-яЁё]/,key);
  i18n.t(key,Object.fromEntries(params(value).map(k=>[k,'test'])));
 }
 for(const n of [0,1,2,3,5,11,21,100])assert.ok(i18n.countLabel('flights',n));
 const storage=createStorage(i18n.t),store=storage.createStore(memory,codes);store.read();store.write([flight]);assert.deepEqual(storage.parse(storage.backup([flight]),codes),[flight]);
 assert.throws(()=>storage.parse('{bad',codes),{message:messages.m144});
 const sharing=createSharing(i18n.t,locale);assert.ok(sharing.SHARE_URL.endsWith('/'+locale+'/flight-map'));assert.ok(!sharing.INVITE.includes('PRIVATE'));
 const model=createMap(airports,land);
 for(const kind of ['map','year','flight'])for(const format of ['story','square']){
  const card=buildCard(model,['','',''],{flights:[flight],kind,year:'2025',flightId:flight.id,format,i18n});
  assert.doesNotMatch(card.svg,/NaN|Infinity|undefined|PRIVATE|2025-01-14|f_private/);assert.ok(card.caption.includes(sharing.SHARE_URL));assert.doesNotMatch(card.caption,/\{p\d\}/);assert.equal(card.height,format==='story'?1920:1080);
  if(locale!=='ru')assert.doesNotMatch(card.svg.replace(/<style>[\s\S]*?<\/style>/g,''),/[А-Яа-яЁё]/);
 }
 applyAliases(airports,read(`public/flight-map/v7/aliases-${locale}.json`));
 const search=createAirportSearch(airports,locale),hnd=airports.find(a=>a.code==='HND');
 assert.equal(search('HND')[0].code,'HND');assert.ok(search(hnd.city,{limit:30}).some(a=>a.code==='HND'));assert.ok(search('Tokyo',{limit:30}).some(a=>a.code==='HND'));
});
test('Indic vowel marks remain significant; composed Hangul searches consistently',()=>{assert.notEqual(normalize('दिल्ली'),normalize('दलल'));assert.equal(normalize('서울'),normalize('서울'.normalize('NFD')));});
test('localized storage preserves corrupt original and rejects stale tabs',()=>{for(const locale of locales){const m=read(`lib/flight-map/locales/${locale}.json`),s=createStorage(createI18n(locale,m).t),codes=new Set(['LHR','HND']);const map=new Map(),mem={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const a=s.createStore(mem,codes),b=s.createStore(mem,codes);a.read();b.read();a.write([flight]);assert.throws(()=>b.write([]),{message:m.m148});map.set(s.KEY,'{broken');assert.throws(()=>a.read());assert.throws(()=>a.write([]));assert.equal(map.get(s.KEY),'{broken');}});
