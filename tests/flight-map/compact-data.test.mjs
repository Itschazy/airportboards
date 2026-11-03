import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{gzipSync}from'node:zlib';import vm from'node:vm';
import{decodeAirports,decodeGeography}from'../../public/flight-map/v6/data.js';
import{createMap as oldMap}from'../../public/flight-map/v2/map.js';import{createMap as newMap}from'../../public/flight-map/v6/map.js';
import{initialMapLayoutScript}from'../../lib/flight-map/layout-hint.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
const original=read('public/flight-map/v1/land-v2.json'),packed=read('public/flight-map/v6/geography.json');
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])test(locale+': lossless compact catalogue and unchanged SVG',()=>{
 const airports=read(`public/flight-map/v4/airports-${locale}.json`),decoded=decodeAirports(read(`public/flight-map/v6/airports-${locale}.json`));assert.deepEqual(decoded,airports);
 // d7187d2a перенёс подписи с дуг, поэтому v2 — больше не oracle их координат.
 // Проверяем сжатие тем же актуальным рендерером на исходной и упакованной
 // географии: весь SVG, включая подписи, должен совпасть. Отдельно старый v2
 // продолжает контролировать неизменность земли, маршрутов, точек и fit.
 const a=newMap(airports,original),b=newMap(decoded,decodeGeography(packed)),legacy=oldMap(airports,original);
 const geometry=svg=>svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'');
 for(const fs of [[],[{id:'f_one',from:'LHR',to:'HND',date:'2025-01-14',number:''}],[{id:'f_two',from:'SFO',to:'NRT',date:'',number:''}]]){assert.deepEqual(b.fit(fs),a.fit(fs));const actual=b.body(fs,b.fit(fs)),reference=a.body(fs,a.fit(fs));assert.equal(actual,reference);assert.deepEqual(b.fit(fs),legacy.fit(fs));assert.equal(geometry(actual),geometry(legacy.body(fs,legacy.fit(fs))));}
});
test('RU critical datasets transfer at least 25% less with gzip',()=>{const size=p=>gzipSync(fs.readFileSync(new URL('../../'+p,import.meta.url))).length;const base=size('public/flight-map/v4/airports-ru.json')+size('public/flight-map/v1/land-v2.json');const current=size('public/flight-map/v6/airports-ru.json')+size('public/flight-map/v6/geography.json');assert.ok(current<base*.75,`${current} >= .75 * ${base}`);});
test('pre-paint layout hint never exposes or modifies saved records',()=>{
 for(const [raw,search,want]of [[null,'','no'],['{bad','','no'],[JSON.stringify({format:'airportsboard-flight-history',version:1,flights:[]}), '','no'],[JSON.stringify({format:'airportsboard-flight-history',version:1,flights:[{from:'LHR',to:'HND',number:'SECRET'}]}),'','yes'],[null,'?demo','yes']]){
  const root={dataset:{}},context={localStorage:{getItem:()=>raw,setItem:()=>assert.fail('must not write')},location:{search},URLSearchParams,document:{currentScript:{previousElementSibling:root}}};vm.runInNewContext(initialMapLayoutScript,context);assert.deepEqual(root.dataset,{initialHistory:want});assert.ok(!JSON.stringify(root).includes('SECRET'));
 }
 const root={dataset:{}};vm.runInNewContext(initialMapLayoutScript,{localStorage:{getItem:()=>{throw Error('denied');}},location:{search:''},URLSearchParams,document:{currentScript:{previousElementSibling:root}}});assert.equal(root.dataset.initialHistory,'no');
});
