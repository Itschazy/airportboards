import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAirportSearch,createLocalAirportSearch,createAirportSearchAsync} from '../../public/flight-map/v9/entry.js';
import {createAirportSearch as previous,createLocalAirportSearch as previousLocal} from '../../public/flight-map/v8/entry.js';

// Oracle deliberately uses the previous independent implementation: preparing
// the haystack must not alter cross-field matches, ties, aliases or exclusions.
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])test(locale+': prepared rows preserve search ordering and options',async()=>{
 const airports=JSON.parse(fs.readFileSync(new URL(`../../public/flight-map/v4/airports-${locale}.json`,import.meta.url)));
 const full=createAirportSearch(airports,locale),local=createLocalAirportSearch(airports,locale),old=previous(airports,locale),oldLocal=previousLocal(airports,locale),asyncFull=await createAirportSearchAsync(airports,locale);
 const queries=new Set(['','!','p','pa','paris','london','san f','чел','челя','chelyabinsk','istanbul','İstanbul','東京','दिल्ली','دُبَيّ','서울','nosuchairport']);
 for(let i=0;i<airports.length;i+=173){const a=airports[i];for(const q of [a.code,a.city,a.city.slice(0,3),a.name.slice(0,5),a.code+' '+a.city])queries.add(q);}
 const codes=xs=>xs.map(a=>a.code);
 for(const query of queries)for(const options of [{},{recent:['AYT','CDG','SVO','LHR'],exclude:'CDG',limit:3},{exclude:'LHR',limit:12}]){
  const expected=codes(old(query,options));
  assert.deepEqual(codes(full(query,options)),expected,query);
  assert.deepEqual(codes(asyncFull(query,options)),expected,query+' async');
  assert.deepEqual(codes(local(query,options)),codes(oldLocal(query,options)),query+' local');
 }
});
