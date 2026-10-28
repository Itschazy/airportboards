import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAirportSearch,recentAirports,routePair} from '../../public/flight-map/v2/entry.js';
import {canShareImage,shareImage,serviceLinks,SHARE_URL} from '../../public/flight-map/v2/sharing.js';
const airports=JSON.parse(fs.readFileSync(new URL('../../public/flight-map/v1/airports.json',import.meta.url))),find=createAirportSearch(airports),codes=new Set(airports.map(a=>a.code));
test('incremental and transliterated searches retain the airport; exact codes win',()=>{
 for(const q of ['чел','челя','челябинск','chelyabinsk','CEK'])assert.equal(find(q)[0].code,'CEK',q);
 assert.equal(find('svo')[0].code,'SVO');
 assert.ok(find('москва').length>1);assert.equal(find('москва',{recent:['VKO']})[0].code,'VKO');
 assert.ok(!find('москва',{exclude:'SVO'}).some(a=>a.code==='SVO'));
 assert.equal(find('no such airport zzzz').length,0);
});
test('recent airports derive from real records without duplicates; route paste is strict',()=>{
 const recent=recentAirports([{from:'SVO',to:'AYT'},{from:'AYT',to:'CEK'}]);assert.deepEqual(recent,['CEK','AYT','SVO']);assert.equal(find('',{recent})[0].code,'CEK');
 for(const v of ['cek–ayt','CEK → AYT','CEK AYT','CEK/AYT'])assert.deepEqual(routePair(v,codes),{from:'CEK',to:'AYT'});
 for(const v of ['CEKCEK','CEK-CEK','CEK-XXX','CEK AYT SVO','тут CEK-AYT','SU123'])assert.equal(routePair(v,codes),null,v);
});
test('native PNG sharing stays in the tap, checks support and never mixes personal text',async()=>{
 const file=new File(['PNG'],'map.png',{type:'image/png'});let calls=0,payload;
 const nav={canShare:d=>d.files[0]===file,share:d=>{calls++;payload=d;return Promise.resolve();}};
 assert.equal(canShareImage(nav,file),true);const p=shareImage(nav,file);assert.equal(calls,1);await p;
 assert.deepEqual(payload,{files:[file],title:'Мои перелёты'});assert.equal(canShareImage({},file),false);assert.equal(canShareImage({share(){},canShare(){throw Error();}},file),false);
});
test('social links contain a public invitation only, no pretend blob attachment or user routes',()=>{
 const links=serviceLinks();assert.deepEqual(links.map(l=>new URL(l.url).hostname),['t.me','max.ru','wa.me','x.com']);
 for(const {url} of links){const u=new URL(url);assert.equal(u.protocol,'https:');assert.ok([...u.searchParams.values()].some(v=>v.includes(SHARE_URL)));assert.doesNotMatch(url,/blob:|data:|flightId|from=|to=/);}
 assert.equal(new URL(links[1].url).pathname,'/:share');
});
