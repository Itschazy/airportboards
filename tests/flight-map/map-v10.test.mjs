import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,uniqueRoutes} from '../../public/flight-map/v10/map.js';
import {createMap as previousMap} from '../../public/flight-map/v6/map.js';
import {decodeCore} from '../../public/flight-map/v7/data.js';
import {decodeGeography} from '../../public/flight-map/v6/data.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
const airports=decodeCore(read('public/flight-map/v7/core-en.json')),land=decodeGeography(read('public/flight-map/v6/geography.json'));
const map=createMap(airports,land),old=previousMap(airports,land);
const route=(from,to,id=from+to)=>({id,from,to,date:'2025'});
const circles=svg=>[...svg.matchAll(/<circle class="airport-dot" cx="([^"]+)" cy="([^"]+)"/g)].map(m=>[+m[1],+m[2]]);
const clean=s=>s.replace(/coast-\d+/g,'coast-ID');

test('Pacific multi-route seam reproduces the old missing marker and connects every endpoint in v10',()=>{
 const flights=[route('LHR','HND'),route('HND','SFO')],box=map.fit(flights,1.5);
 const previous=circles(old.body(flights,box)),current=circles(map.body(flights,box));
 const end=map.arc(flights[0],box.c).at(-1),near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.001;
 assert.ok(!previous.some(p=>near(p,end)),'fixture must expose the original bug');
 assert.ok(current.some(p=>near(p,end)),'the same route now has its destination marker');
 assert.equal(current.length,4);assert.equal(uniqueRoutes(flights).length,2);
 for(const flight of flights){const arc=map.arc(flight,box.c);for(const p of [arc[0],arc.at(-1)])assert.ok(current.some(dot=>near(dot,p)));}
 assert.equal((map.body(flights,box).match(/>HND<\/text>/g)||[]).length,2,'both visible world copies identify the same airport');
});

test('ordinary Europe, single Pacific and return journeys preserve their existing geometry/style',()=>{
 for(const flights of [[route('LHR','CDG')],[route('HND','SFO')],[route('CDG','AMS'),route('AMS','FRA')],[route('HND','SFO'),route('SFO','HND')]]){
  const box=map.fit(flights);assert.deepEqual(box,old.fit(flights));assert.equal(clean(map.body(flights,box)),clean(old.body(flights,box)));
 }
});

test('all ends remain marked across longitudes, route order and portrait/landscape fitting',()=>{
 const codes=['LHR','HND','SFO','AKL','SYD','SCL','GRU','JFK','DXB','SIN','CPT','ICN'];
 for(let turn=0;turn<codes.length;turn++)for(const ratio of [.65,1.5,2.5]){
  const flights=codes.map((from,i)=>route(from,codes[(i+turn+1)%codes.length],String(i)));
  const box=map.fit(flights,ratio),svg=map.body(flights,box,375),dots=circles(svg);
  assert.doesNotMatch(svg,/NaN|Infinity/);assert.equal((svg.match(/class="flight-path/g)||[]).length,uniqueRoutes(flights).length);
  for(const f of uniqueRoutes(flights)){const pts=map.arc(f,box.c);for(const p of [pts[0],pts.at(-1)]){
   assert.ok(dots.some(dot=>Math.hypot(dot[0]-p[0],dot[1]-p[1])<.001));
   assert.ok(p[0]>=box.x&&p[0]<=box.x+box.w&&p[1]>=box.y&&p[1]<=box.y+box.h);
  }}
 }
});

test('interactive record identifiers are escaped and private exports contain no hit targets',()=>{
 const flights=[route('LHR','HND','bad" onload="alert(1)')],box=map.fit(flights);
 const interactive=map.body(flights,box);assert.match(interactive,/data-route="bad&amp;|data-route="bad&quot;/);assert.doesNotMatch(interactive,/data-route="bad"/);
 const exported=map.body(flights,box,320,null,false);assert.doesNotMatch(exported,/data-route|onload|bad&quot;|route-hit/);
});

test('large repeated journals keep route deduplication and a bounded number of world copies',()=>{
 const flights=Array.from({length:5000},(_,i)=>i%2?route('HND','SFO',String(i)):route('LHR','HND',String(i))),box=map.fit(flights);
 const svg=map.body(flights,box);assert.equal(circles(svg).length,4);assert.equal((svg.match(/class="flight-path/g)||[]).length,2);assert.ok(svg.length<500000);
});
