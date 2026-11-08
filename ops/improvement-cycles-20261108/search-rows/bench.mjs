import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const {createAirportSearch}=await import(process.argv[2]);
const base=new URL('../../../public/flight-map/v4/',import.meta.url);
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
const qs=['p','pa','par','pari','paris','l','lo','lon','lond','londo','london','ч','че','чел','челя','чеоя','челяб','dub','duba','dubai','tok','toky','tokyo','s','sa','san','san f','san fr','san franc','м','мо','мос','моск','моско','москва','東京','दिल्ली','دبي'];
const out=[];
for(const locale of locales){const data=JSON.parse(fs.readFileSync(new URL('airports-'+locale+'.json',base)));const t=performance.now(),fn=createAirportSearch(data,locale),build=performance.now()-t;for(let i=0;i<3;i++)for(const q of qs)fn(q);const times=[];let checksum=0;for(let i=0;i<9;i++){const start=performance.now();for(const q of qs)checksum+=fn(q).length;times.push(performance.now()-start);}times.sort((a,b)=>a-b);out.push({locale,queries:qs.length,buildMs:+build.toFixed(2),medianBatchMs:+times[4].toFixed(2),checksum});}
console.log(JSON.stringify(out,null,2));
