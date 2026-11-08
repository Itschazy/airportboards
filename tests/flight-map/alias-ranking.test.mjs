import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createSearch} from '../../public/flight-map/v9/search.js';
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
for(const locale of locales)test(locale+': Paris alias precedes incidental Casparis even with recent history',async()=>{
 const airports=JSON.parse(fs.readFileSync(new URL(`../../public/flight-map/v4/airports-${locale}.json`,import.meta.url)));
 const search=createSearch(airports,locale);
 for(const query of ['Paris','PARIS',' paris ','Pari']){
  const results=await search.query(query,{recent:['ALE'],limit:20}),codes=results.map(a=>a.code);
  for(const code of ['CDG','LBG','ORY'])assert.ok(codes.indexOf(code)>=0&&codes.indexOf(code)<codes.indexOf('ALE'),query+': '+codes);
 }
 assert.equal((await search.query('ALE'))[0].code,'ALE','exact code must still win');
 assert.equal((await search.query('Casparis'))[0].code,'ALE','incidental match stays searchable');
 const excluded=await search.query('Paris',{exclude:'CDG',recent:['ALE']});assert.ok(!excluded.some(a=>a.code==='CDG'));assert.ok(['LBG','ORY','PRX'].includes(excluded[0].code));
});
