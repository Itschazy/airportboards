import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap} from '../../public/flight-map/v2/map.js';
import {buildCard,cardCountries,flagLayout,createExporter} from '../../public/flight-map/v2/share.js';
const root=new URL('../../public/flight-map/v1/',import.meta.url);
const airports=JSON.parse(fs.readFileSync(new URL('airports.json',root))),land=JSON.parse(fs.readFileSync(new URL('land-v2.json',root)));
const model=createMap(airports,land),flagAssets=Object.fromEntries([...new Set(airports.map(a=>a.country).filter(Boolean))].map(c=>[c,fs.readFileSync(new URL(`flags/${c.toLowerCase()}.svg`,root),'utf8')]));
const f=(from,to,id='one')=>({from,to,id,date:'2025-01-02'});

test('flag assets cover the catalogue and contain only self-contained SVG artwork',()=>{
 assert.equal(Object.keys(flagAssets).length,234);
 for(const [code,svg] of Object.entries(flagAssets)){
  assert.match(svg,/^<svg\b[^>]*viewBox="[\d .-]+"/);
  assert.doesNotMatch(svg,/<(?:script|foreignObject|image|text)|\bon\w+=|(?:href|src)="(?!#)|<!ENTITY/i,code);
 }
 assert.match(fs.readFileSync(new URL('flags/LICENSE',root),'utf8'),/MIT License/);
});

test('flags show countries from the selected data once, without confusing unknown country with a visit',()=>{
 const unknown=airports.find(a=>!a.country);
 assert.ok(unknown);
 assert.deepEqual(cardCountries(model,[f('NRT','HND'),f('HND','NRT','two'),f('NRT',unknown.code,'three')]),['JP']);
 const flights=[f('NRT','SFO'),{...f('LHR','CDG','two'),date:'2026-01-03'}];
 for(const kind of ['map','year','flight'])for(const format of ['square','story'])for(const light of [true,false]){
  const card=buildCard(model,['',''],{flights,kind,format,light,year:'2025',flightId:'one',flagAssets});
  assert.doesNotMatch(card.svg+card.caption,/А как выглядит твоя карта|Куда полетим дальше|посещён|посещен/);
  assert.equal((card.svg.match(/data-country=/g)||[]).length,kind==='map'?4:2);
  assert.match(card.svg,/id="flag-frame-JP"/);assert.match(card.svg,/id="flag-frame-US"/);
  if(kind!=='map')assert.doesNotMatch(card.svg,/data-country="(?:GB|FR)"/);
  assert.doesNotMatch(card.svg,/<image\b/);
 }
});

test('flag row stays inside the card for zero, few and 234 countries; +N counts hidden countries',()=>{
 for(const n of [0,1,2,6,7,9,10,50,234])for(const compact of [true,false]){
  const countries=Object.keys(flagAssets).slice(0,n),row=flagLayout(countries,compact);
  assert.equal(row.visible.length,Math.min(n,9));assert.equal(row.more,Math.max(0,n-9));
  assert.ok(row.x>=60);assert.ok(row.x+(row.visible.length+(row.more?1:0))*(row.w+row.gap)-row.gap<=1020);
  assert.ok(row.y+row.h<(compact?976:1620));
 }
 const first=new Map();for(const a of airports)if(a.country&&!first.has(a.country))first.set(a.country,a.code);
 const all=[...first.values()].filter(code=>code!=='LHR').map((code,i)=>f('LHR',code,String(i)));
 const card=buildCard(model,['',''],{flights:all,format:'square',flagAssets});
 assert.equal((card.svg.match(/data-country=/g)||[]).length,9);assert.match(card.svg,/>\+225<\/text>/);
 const ids=[...card.svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'clipPath/gradient ids must not collide');
});

test('old coastline arrays still render; new boundaries are one path with repeated world uses',()=>{
 const old=createMap(airports,land.land),route=[f('NRT','SFO')],box=model.fit(route),svg=model.body(route,box);
 assert.doesNotMatch(old.body(route,box),/class="country-border"/);
 assert.equal((svg.match(/class="country-border"/g)||[]).length,1);
 assert.equal((svg.match(/<use /g)||[]).length,3);
 assert.doesNotMatch(svg,/NaN|Infinity/);
 assert.ok(svg.length<500000);
 const card=buildCard(model,['',''],{flights:route,flagAssets});
 assert.match(card.svg,/<\/defs><use href="#coast-/);
 assert.match(card.svg,/<\/g><!--map-geography-end--><\/svg><\/g><svg/);
 // An open page can retain the pre-deploy map module and import the new exporter.
 const previousModel={...model,body:()=>'<g><path class="land" d="M0,0L1,1Z"/></g><path class="flight-path" d="M0,0L1,1"/>'};
 assert.match(buildCard(previousModel,['',''],{flights:route}).svg,/<path class="land"[^>]+\/><\/g><\/svg><\/g><svg[^>]+><path class="flight-path"/);
});

test('export fetches only visible local flags, shares cached work and retries missing assets',async()=>{
 const original=globalThis.fetch,calls=[];let fail=true;
 globalThis.fetch=async(url,options)=>{calls.push(url);assert.ok(options.signal);if(url.startsWith('/fonts/'))return new Response(new Uint8Array([1,2,3]));if(url.endsWith('/us.svg')&&fail)return new Response('',{status:503});return new Response(flagAssets[url.match(/\/([a-z]{2})\.svg$/)[1].toUpperCase()]);};
 try{
  const exporter=await createExporter(model),options={flights:[f('NRT','SFO')]};
  const first=await exporter.build(options);assert.match(first.svg,/>US<\/text>/);assert.match(first.svg,/id="flag-frame-JP"/);
  fail=false;const second=await exporter.build(options);assert.match(second.svg,/id="flag-frame-US"/);
  assert.equal(calls.filter(s=>s.endsWith('/jp.svg')).length,1);assert.equal(calls.filter(s=>s.endsWith('/us.svg')).length,2);
  assert.equal(calls.length,5);assert.ok(calls.every(s=>s.startsWith('/fonts/')||s.startsWith('/flight-map/v1/flags/')));
 }finally{globalThis.fetch=original;}
});

test('embedded coat-of-arms flags retain the xlink namespace for PNG XML decoding',()=>{
 const card=buildCard(model,['',''],{flights:[f('EZE','BEG')],flagAssets});
 assert.match(card.svg,/<svg xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink"[^>]*>[\s\S]*xlink:href="#export-/);
});
