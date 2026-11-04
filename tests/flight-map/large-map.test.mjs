import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createMap} from '../../public/flight-map/v10/map.js';
import {decodeCatalogue} from '../../public/flight-map/v9/data.js';
import {decodeGeography} from '../../public/flight-map/v6/data.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
const airports=decodeCatalogue(read('public/flight-map/v9/catalogue-en.json'));
const land=decodeGeography(read('public/flight-map/v6/geography.json'));
const flights=Array.from({length:1000},(_,i)=>({id:'f_'+i,from:airports[0].code,to:airports[i+1].code,date:'2024',number:''}));
// Снимки полного SVG до оптимизации (ca0720ab), включая подписи и стиль.
// При намеренном обновлении каталога/географии сверить визуально перед заменой.
test('ordinary maps through 100 routes retain the exact original SVG',()=>{
 const hashes=['bd2ef536a5f3cde0af54ad246a62843c33cae7d0bdad0e81671261392df0dd53','94a012016105018df5a94ac0beac0fda71fd4153cb59ca367f8263ebe0754c8b','ec07df89ff6acd301dc791ab5600b5a07c8aab288baf8d6d4369c43988588796','d14fd436ae45e7cdc8c5bdbb1620009f504785c6a94577ece85a028b562a3b8f'];
 for(const [i,count] of [0,1,6,100].entries()){
  const map=createMap(airports,land),fs=flights.slice(0,count);
  assert.equal(createHash('sha256').update(map.body(fs,map.fit(fs),375)).digest('hex'),hashes[i]);
 }
});
const pointDistance=(p,a,b)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len)):0;
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
};
test('1000 distinct routes produce a bounded SVG without hiding routes, IDs or endpoints',()=>{
 const map=createMap(airports,land),box=map.fit(flights),svg=map.body(flights,box,375);
 assert.ok(Buffer.byteLength(svg)<1_800_000,`SVG is ${Buffer.byteLength(svg)} bytes`);
 assert.equal((svg.match(/class="flight-path/g)||[]).length,1000);
 assert.equal((svg.match(/data-route=/g)||[]).length,1000);
});
test('large-map line simplification stays within a subpixel bound at phone, zoom and export scales',()=>{
 for(const width of [320,375,1080]){
  const map=createMap(airports,land),base=map.fit(flights);
  for(const zoom of [1,4,20]){
   const box={...base,w:base.w/zoom,h:base.h/zoom},svg=map.body(flights,box,width);
   const paths=[...svg.matchAll(/<path class="flight-path" d="([^"]+)"/g)].map(m=>m[1].slice(1).split('L').map(p=>p.split(',').map(Number)));
   assert.equal(paths.length,flights.length);
   for(let i=0;i<flights.length;i++){
    const full=map.arc(flights[i],box.c),simple=paths[i];
    assert.deepEqual(simple[0],full[0].map(x=>+x.toFixed(2)));
    assert.deepEqual(simple.at(-1),full.at(-1).map(x=>+x.toFixed(2)));
    // The existing 0.01 map-unit rounding is separate from the new 0.08px bound.
    const bound=0.08*box.w/width+Math.SQRT2*0.005+1e-8;
    for(const p of full)assert.ok(Math.min(...simple.slice(1).map((q,j)=>pointDistance(p,simple[j],q)))<=bound);
   }
  }
 }
});
