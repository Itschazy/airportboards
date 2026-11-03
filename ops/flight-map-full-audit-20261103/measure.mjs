// Локальная стоимость вычислений, НЕ LCP и НЕ эмуляция физического Android.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createMap} from '../../public/flight-map/v10/map.js';
import {decodeCatalogue} from '../../public/flight-map/v9/data.js';
import {decodeGeography} from '../../public/flight-map/v6/data.js';
import {createSearch} from '../../public/flight-map/v9/search.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const land=decodeGeography(read('public/flight-map/v6/geography.json'));
const airports=decodeCatalogue(read('public/flight-map/v9/catalogue-en.json'));
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results=[];
for(const count of [6,100,1000,4999]){
 const flights=Array.from({length:count},(_,i)=>({id:'f_'+i,from:airports[0].code,to:airports[i+1].code,date:'2020',number:''}));
 const samples=[];
 for(let i=0;i<3;i++){
  const map=createMap(airports,land),start=performance.now(),box=map.fit(flights),fit=performance.now(),body=map.body(flights,box),done=performance.now();
  samples.push({fitMs:fit-start,bodyMs:done-fit,bytes:Buffer.byteLength(body),nodes:(body.match(/<[a-z]/g)||[]).length});
 }
 results.push({count,fitMs:median(samples.map(x=>x.fitMs)),bodyMs:median(samples.map(x=>x.bodyMs)),bytes:samples[0].bytes,nodes:samples[0].nodes});
}
const search=[];
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const entries=decodeCatalogue(read(`public/flight-map/v9/catalogue-${locale}.json`)),s=createSearch(entries,locale),start=performance.now();await s.prepare();const ready=performance.now();
 const times=[];for(let n=0;n<30;n++){const t=performance.now();s.instant(locale==='ru'?'челя':'london');times.push(performance.now()-t);}
 search.push({locale,prepareMs:ready-start,queryMedianMs:median(times)});
}
console.log(JSON.stringify({kind:'Node CPU only; no network, DOM or LCP',map:results,search},null,2));
