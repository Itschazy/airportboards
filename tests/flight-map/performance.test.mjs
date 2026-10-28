import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sameFlights,resizeBox} from '../../public/flight-map/v5/state.js';
import {createMap} from '../../public/flight-map/v2/map.js';
import {createI18n} from '../../public/flight-map/v4/i18n.js';
const {createExporter}=await import(`../../public/flight-map/${process.env.MAP_EXPORT_VERSION||'v5'}/share.js`);
const flights=[{id:'f_test',from:'LHR',to:'HND',date:'',number:''}];
test('unchanged storage copies preserve view; edits and ordering invalidate it',()=>{
 assert.equal(sameFlights(flights,structuredClone(flights)),true);
 for(const key of ['id','from','to','date','number'])assert.equal(sameFlights(flights,[{...flights[0],[key]:'different'}]),false,key);
 assert.equal(sameFlights(flights,[]),false);
 const second={...flights[0],id:'f_second'};assert.equal(sameFlights([...flights,second],[second,...flights]),false);
});
test('keyboard and orientation resizing preserve map scale and center',()=>{
 const box={x:123,y:234,w:320,h:210,c:400};assert.deepEqual(resizeBox(box,320/210),box);
 for(const ratio of [1,2,.5]){const next=resizeBox(box,ratio);assert.equal(next.w,box.w);assert.equal(next.x,box.x);assert.equal(next.y+next.h/2,box.y+box.h/2);assert.equal(next.c,box.c);}
 assert.equal(resizeBox(box,0),box);
});
test('first export requests flags before fonts finish and can retry a failed font',async()=>{
 const airports=[{code:'LHR',city:'London',lat:51.5,lon:0,country:'GB'},{code:'HND',city:'Tokyo',lat:35.5,lon:139.7,country:'JP'}];
 const model=createMap(airports,[]),messages=JSON.parse(fs.readFileSync(new URL('../../lib/flight-map/locales/en.json',import.meta.url))),i18n=createI18n('en',messages);
 const original=globalThis.fetch,requests=[],releases=[];let failed=false;
 globalThis.fetch=url=>{requests.push(url);if(url.startsWith('/fonts/'))return new Promise(resolve=>releases.push(()=>resolve({ok:!failed,arrayBuffer:async()=>new Uint8Array([1,2]).buffer})));
 return Promise.resolve({ok:true,text:async()=>'<svg viewBox="0 0 4 3"><path d="M0 0h4v3H0z"/></svg>'});};
 let first;
 try{
  const pending=(async()=>{const exporter=await createExporter(model,i18n);first=exporter;return exporter.build({flights});})();
  await new Promise(r=>setTimeout(r,20));const flagsParallel=requests.filter(u=>u.includes('/flags/')).length;
  while(releases.length)releases.shift()();await pending;
  assert.equal(flagsParallel,2,'flags waited for fonts: extra network round-trip');
  // Fresh exporter fails once; the same instance must recover on the next build.
  failed=true;const retry=await createExporter(model,i18n);const bad=retry.build({flights});await new Promise(r=>setTimeout(r,0));while(releases.length)releases.shift()();await assert.rejects(bad,/font/);
  failed=false;const good=retry.build({flights});await new Promise(r=>setTimeout(r,0));while(releases.length)releases.shift()();assert.match((await good).svg,/<svg/);
 }finally{while(releases.length)releases.shift()();globalThis.fetch=original;}
});
