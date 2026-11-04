// Чередование baseline/candidate в одном процессе уменьшает дрейф нагрузки.
// Это CPU генерации SVG на Mac, НЕ Android LCP и не скорость DOM.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createMap} from '../../../public/flight-map/v10/map.js';
import {decodeCatalogue} from '../../../public/flight-map/v9/data.js';
import {decodeGeography} from '../../../public/flight-map/v6/data.js';
const root=new URL('../../../',import.meta.url);
const old=execFileSync('git',['show','ca0720ab:public/flight-map/v10/map.js'],{cwd:root,encoding:'utf8'});
const before=await import('data:text/javascript;base64,'+Buffer.from(old).toString('base64'));
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
const airports=decodeCatalogue(read('public/flight-map/v9/catalogue-en.json')),land=decodeGeography(read('public/flight-map/v6/geography.json'));
const median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
const results=[];
for(const count of [6,100,1000,4999]){
 const flights=Array.from({length:count},(_,i)=>({id:'f_'+i,from:airports[0].code,to:airports[i+1].code,date:'2024',number:''}));
 const samples={before:[],after:[]};let bytes={},nodes={};
 for(let round=0;round<11;round++)for(const key of round%2?['after','before']:['before','after']){
  const model=(key==='before'?before.createMap:createMap)(airports,land),box=model.fit(flights);
  const start=performance.now(),svg=model.body(flights,box,375),end=performance.now();
  if(round>=2)samples[key].push(end-start);
  bytes[key]=Buffer.byteLength(svg);nodes[key]=(svg.match(/<[a-z]/g)||[]).length;
 }
 const bodyMs=Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,median(v)]));
 results.push({count,bodyMs,bytes,nodes,samples});
}
console.log(JSON.stringify({kind:'Node CPU on Mac; no DOM/network/LCP; 9 measured samples after 2 warmups',results},null,2));
