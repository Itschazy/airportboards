import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,distance} from '../../public/flight-map/v10/map.js';
import {decodeCore} from '../../public/flight-map/v7/data.js';
import {decodeGeography} from '../../public/flight-map/v6/data.js';
import {createI18n} from '../../public/flight-map/v4/i18n.js';
import {buildCard,cardLayout,selectFlights,cityLines,createExporter} from '../../public/flight-map/v10/share.js';
import {buildCard as previousCard} from '../../public/flight-map/v5/share.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
const land=decodeGeography(read('public/flight-map/v6/geography.json'));
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
const i18n=locale=>createI18n(locale,read(`lib/flight-map/locales/${locale}.json`));
const airports=locale=>decodeCore(read(`public/flight-map/v7/core-${locale}.json`));
const model=createMap(airports('en'),land),en=i18n('en'),fonts=['','',''];
const flights=[{id:'private-id-123',from:'NRT',to:'SFO',date:'2025',number:'PRIVATE 765'},{id:'second',from:'LHR',to:'HND',date:'2025-01-14',number:'PRIVATE 321'},{id:'third',from:'CDG',to:'AMS',date:''},{id:'fourth',from:'LHR',to:'JFK',date:'2024-03-11'}];
const clean=s=>s.replace(/ lang="[a-z]+"/,'').replace(/coast-\d+/g,'coast-ID');

test('existing story and square keep their default visual composition',()=>{
 for(const format of ['story','square'])for(const kind of ['map','year','flight'])for(const light of [true,false]){
  const options={flights,kind,format,year:'2025',flightId:flights[0].id,light,i18n:en};
  const previous=previousCard(model,fonts,options),current=buildCard(model,fonts,options);
  assert.equal(clean(current.svg),clean(previous.svg),`${format}/${kind}/${light}`);
  assert.equal(current.caption,previous.caption);
 }
});
for(const locale of locales)test(`${locale}: 4:5, privacy and selected blocks in three formats`,()=>{
 const lang=i18n(locale),localized=createMap(airports(locale),land);
 for(const format of ['story','square','portrait'])for(const kind of ['map','year','flight'])for(const [showStats,showFlags] of [[true,true],[true,false],[false,true],[false,false]]){
  const options={flights,kind,format,year:'2025',flightId:flights[0].id,showStats,showFlags,i18n:lang};
  const card=buildCard(localized,fonts,options),layout=cardLayout(format,showStats,showFlags);
  assert.equal(card.width,1080);assert.equal(card.height,{story:1920,square:1080,portrait:1350}[format]);
  assert.doesNotMatch(card.svg+card.caption,/NaN|Infinity|undefined|PRIVATE|private-id|2025-01-14|2024-03-11|\{p\d\}/);
  assert.ok(card.caption.endsWith(`https://airportsboard.live/${locale}/flight-map`));
  assert.equal(card.svg.includes('data-country='),showFlags);
  assert.equal(card.svg.includes('≈ '),showStats);
  assert.equal(card.svg.includes(lang.t('m156')),showStats);
  if(!showStats)assert.doesNotMatch(card.caption,/765|321|kilom|килом|km|≈|countries/i);
  if(locale!=='ru')assert.doesNotMatch(card.svg.replace(/<style>[\s\S]*?<\/style>/g,''),/[А-Яа-яЁё]/);
  // Test the actual SVG frame and document-space typography bounds, not only helper output.
  const frame=card.svg.match(/<svg x="60" y="([\d.]+)" width="960" height="([\d.]+)" viewBox="([^"]+)"/);
  assert.ok(frame);assert.ok(+frame[1]>=layout.mapTop);assert.equal(+frame[1]+ +frame[2],layout.mapBottom);
  assert.ok(+frame[2]>100);assert.ok(frame[3].split(' ').every(x=>Number.isFinite(+x)));
  const outsideMap=card.svg.replace(/<svg x="60"[\s\S]*?<\/svg>/g,'');
  for(const m of outsideMap.matchAll(/<text x="([\d.]+)" y="([\d.]+)" font-size="([\d.]+)"/g)){
   assert.ok(+m[1]>=60&&+m[1]<=1020);assert.ok(+m[2]- +m[3]>0&&+m[2]+ +m[3]*.3<card.height);
  }
 }
});

test('hidden rows expand the actual map and never leave their old empty reserved block',()=>{
 for(const format of ['story','square','portrait']){
  const base=cardLayout(format);
  for(const [stats,flags]of [[false,true],[true,false],[false,false]])assert.ok(cardLayout(format,stats,flags).mapBottom>base.mapBottom);
  assert.ok(cardLayout(format,false,false).mapBottom>cardLayout(format,true,false).mapBottom);
 }
});

test('year-only dates and full dates select exactly one year; malformed and empty selections fail',()=>{
 assert.deepEqual(selectFlights(model,{flights,kind:'year',year:2025},en.t).map(x=>x.id),['private-id-123','second']);
 for(const options of [{kind:'year',year:'20'},{kind:'year',year:'2027'},{kind:'year',year:undefined},{kind:'flight',flightId:undefined},{kind:'flight',flightId:'missing'},{kind:'flight',flightId:1},{kind:'unrecognized'}])assert.throws(()=>buildCard(model,fonts,{flights,...options,i18n:en}),{message:en.t('m151')});
 assert.throws(()=>buildCard(model,fonts,{flights:[],i18n:en}));
 assert.throws(()=>buildCard(model,fonts,{flights:[{from:'INVALID',to:'HND'}],i18n:en}));
 assert.throws(()=>buildCard(model,fonts,{flights,format:'unsupported',i18n:en}));
 const invalid=[{...flights[0],date:'2025xyz'}];assert.throws(()=>selectFlights(model,{flights:invalid,kind:'year',year:'2025'},en.t));
});

test('5000 repeated flights keep one route but correct total distance and count',()=>{
 const history=Array.from({length:5000},(_,i)=>({...flights[0],id:'hidden-'+i,from:i%2?'NRT':'SFO',to:i%2?'SFO':'NRT'}));
 const card=buildCard(model,fonts,{flights:history,format:'portrait',i18n:en});
 const expected=Math.round(distance(model.airport.NRT,model.airport.SFO)*5000).toLocaleString('en');
 assert.match(card.caption,/5000/);assert.ok(card.svg.includes(expected));
 assert.equal((card.svg.match(/class="flight-path/g)||[]).length,1);
 assert.ok(card.svg.length<500000);assert.doesNotMatch(card.svg,/hidden-\d/);
});

test('city lines preserve graphemes, CJK and long localized city names without HTML injection',()=>{
 for(const locale of locales)for(const airport of airports(locale)){
  const lines=cityLines(airport.city);assert.equal(lines.join('').replace(/\s/g,''),airport.city.replace(/\s/g,''));
  for(const line of lines){const segments=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(line)];const weight=segments.reduce((n,x)=>n+(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(x.segment)?2:1),0);assert.ok(weight<=23,`${locale}/${airport.city}/${line}`);}
 }
 const malicious=airports('en').map(a=>a.code==='NRT'?{...a,city:'<script>evil&"</script>'}:a);
 const card=buildCard(createMap(malicious,land),fonts,{flights:[flights[0]],kind:'flight',flightId:flights[0].id,i18n:en});
 assert.doesNotMatch(card.svg,/<script>|onerror=|<foreignObject/);assert.match(card.svg,/&lt;script&gt;/);
});

test('export rejects invalid selections before fetching; hidden flags do not fetch and fonts are cached',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(url);return url.startsWith('/fonts/')?new Response(new Uint8Array([1,2,3])):new Response('<svg viewBox="0 0 4 3"><path d="M0 0h4v3H0z"/></svg>');};
 try{
  const exp=await createExporter(model,en);assert.equal(calls.length,0);
  await assert.rejects(exp.build({flights,kind:'flight',flightId:'missing'}));assert.equal(calls.length,0);
  await exp.build({flights,showFlags:false,format:'portrait'});assert.equal(calls.length,3);assert.ok(calls.every(s=>s.startsWith('/fonts/')));
  await exp.build({flights,showFlags:false,format:'square'});assert.equal(calls.length,3);
  await exp.build({flights:[flights[0]],format:'portrait'});assert.equal(calls.length,5);
 }finally{globalThis.fetch=original;}
});
