import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,uniqueRoutes} from '../../public/flight-map/v2/map.js';
import {buildCard,cityLines} from '../../public/flight-map/v2/share.js';
import {latestJob} from '../../public/flight-map/v2/jobs.js';
const airports=JSON.parse(fs.readFileSync(new URL('../../public/flight-map/v1/airports.json',import.meta.url))),land=JSON.parse(fs.readFileSync(new URL('../../public/flight-map/v1/land-v2.json',import.meta.url)));
const model=createMap(airports,land),fonts=['',''];
const flights=[{id:'private-id-123',from:'NRT',to:'SFO',date:'2025-01-14',number:'PRIVATE 765'},{id:'second',from:'SVX',to:'IST',date:'2026-05-11',number:'AB123'}];
test('all 12 export combinations have correct dimensions, readable typography and no private fields',()=>{
 for(const kind of ['map','year','flight'])for(const format of ['story','square'])for(const light of [true,false]){
  const c=buildCard(model,fonts,{flights,kind,year:'2025',flightId:flights[0].id,format,light});
  assert.equal(c.width,1080);assert.equal(c.height,format==='story'?1920:1080);assert.doesNotMatch(c.svg,/NaN|Infinity|private-id|PRIVATE|2025-01-14|AB123/);
  assert.match(c.svg,/font-size="36"[^>]*>airportsboard.live/);assert.match(c.svg,/font-size="32"/);assert.match(c.caption,/https:\/\/airportsboard.live\/ru\/flight-map/);
  if(kind==='year')assert.match(c.caption,/2025 год: 1 перелёт/);if(kind==='map')assert.match(c.caption,/2 перелёта/);
 }
});
test('no invented empty record stats; demo is explicit; long cities retain their text',()=>{
 assert.throws(()=>buildCard(model,fonts,{flights,kind:'year',year:'2020'}),/нет перелётов/);
 const c=buildCard(model,fonts,{flights,demo:true});assert.match(c.svg,/Демонстрационный пример/);assert.match(c.caption,/Демонстрационный пример/);
 for(const a of airports){const lines=cityLines(a.city);assert.ok(lines.every(s=>s.length<=23),a.city);assert.equal(lines.join('').replaceAll(' ',''),a.city.replace(/\s/g,''));assert.ok(lines.length<=4,a.city);}
});
test('duplicate and return routes share geometry; selected record and all counts survive',()=>{
 const history=Array.from({length:5000},(_,i)=>({id:'r_'+i,from:i%2?'SFO':'NRT',to:i%2?'NRT':'SFO',date:'2025-01-14'}));
 assert.equal(uniqueRoutes(history).length,1);assert.equal(uniqueRoutes(history,'r_2')[0].id,'r_2');
 const b=model.fit(history),svg=model.body(history,b,375,'r_2');assert.equal((svg.match(/class="flight-path/g)||[]).length,1);assert.match(svg,/data-route="r_2"/);assert.ok(svg.length<500000);
 const card=buildCard(model,fonts,{flights:history});assert.match(card.caption,/5000 перелётов/);assert.equal((card.svg.match(/class="flight-path/g)||[]).length,1);
});
test('share queue runs only one canvas job and drops stale success/error',async()=>{
 let running=0,max=0,release;const seen=[],results=[],errors=[];
 const job=latestJob({run:async value=>{seen.push(value);max=Math.max(max,++running);await new Promise(r=>release=r);running--;if(value===1)throw Error('old');return value;},done:v=>results.push(v),error:e=>errors.push(e)});
 job.push(1);job.push(2);job.push(3);release();await new Promise(r=>setImmediate(r));assert.deepEqual(seen,[1,3]);release();await new Promise(r=>setImmediate(r));assert.deepEqual(results,[3]);assert.equal(max,1);assert.equal(errors.length,0);
 job.push(4);job.cancel();release();await new Promise(r=>setImmediate(r));assert.deepEqual(results,[3]);
 job.push(5);release();await new Promise(r=>setImmediate(r));assert.deepEqual(results,[3,5]);
});
