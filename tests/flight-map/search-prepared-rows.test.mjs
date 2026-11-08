import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAirportSearch,createLocalAirportSearch,createAirportSearchAsync,normalize} from '../../public/flight-map/v9/entry.js';
import {createAirportSearch as previous,createLocalAirportSearch as previousLocal} from '../../public/flight-map/v8/entry.js';

// The previous implementation remains the independent membership oracle.
// Alias prefixes intentionally move above incidental substrings; native city
// and code matches must retain their earlier order and stay above aliases.
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])test(locale+': prepared rows preserve membership, stronger matches and options',async()=>{
 const airports=JSON.parse(fs.readFileSync(new URL(`../../public/flight-map/v4/airports-${locale}.json`,import.meta.url)));
 const full=createAirportSearch(airports,locale),local=createLocalAirportSearch(airports,locale),old=previous(airports,locale),oldLocal=previousLocal(airports,locale),asyncFull=await createAirportSearchAsync(airports,locale);
 const queries=new Set(['','!','p','pa','paris','london','san f','чел','челя','chelyabinsk','istanbul','İstanbul','東京','दिल्ली','دُبَيّ','서울','nosuchairport']);
 for(let i=0;i<airports.length;i+=173){const a=airports[i];for(const q of [a.code,a.city,a.city.slice(0,3),a.name.slice(0,5),a.code+' '+a.city])queries.add(q);}
 const codes=xs=>xs.map(a=>a.code);
 for(const query of queries)for(const options of [{},{recent:['AYT','CDG','SVO','LHR'],exclude:'CDG',limit:3},{exclude:'LHR',limit:12}]){
  const allOptions={...options,limit:airports.length},before=old(query,allOptions),after=full(query,allOptions),q=normalize(query);
  assert.deepEqual(codes(after).sort(),codes(before).sort(),query+' membership');
  const strong=a=>!q||a.code.toLowerCase().startsWith(q)||normalize(a.city).includes(q);
  const protectedOrder=codes(before.filter(strong));
  assert.deepEqual(codes(after.slice(0,protectedOrder.length)),protectedOrder,query+' native/code priority');
  assert.deepEqual(codes(full(query,options)),codes(after.slice(0,options.limit??6)),query+' limit');
  assert.deepEqual(codes(asyncFull(query,options)),codes(full(query,options)),query+' async');
  assert.deepEqual(codes(local(query,options)),codes(oldLocal(query,options)),query+' local');
 }
});
