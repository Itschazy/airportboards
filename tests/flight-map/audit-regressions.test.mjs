import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStorage} from '../../public/flight-map/v10/storage.js';
const source=fs.readFileSync(new URL('../../public/flight-map/v9/app.js',import.meta.url),'utf8');
const api=createStorage(k=>k),codes=new Set(['HND','LAX']);
const flight={id:'f_test',from:'HND',to:'LAX',date:'2026-11-03',number:'TK 476'};
function memory(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
// Берём именно начало активного render: независимый helper не поймал бы
// регрессию, если вызов нормализации случайно исчезнет из настоящего UI.
test('active render clears a vanished period before computing the first statistics/map',()=>{
 const start=source.indexOf('function render(reset=true){')+'function render(reset=true){'.length;
 const end=source.indexOf("$('#storageStatus')",start);
 const run=new Function('flights','period','selected','box','fullBox',`let journalLimit=50;const reset=true;${source.match(/function visible\(\)\{[^\n]+/)[0]}
${source.slice(start,end)};return {period,selected,box,fullBox};`);
 const flights=[{...flight,date:'2020'}];
 assert.deepEqual(run(flights,'2019','f_deleted',{x:1},{x:2}),{period:'',selected:null,box:null,fullBox:null});
 const box={x:1},fullBox={x:2};
 assert.deepEqual(run(flights,'2020',flight.id,box,fullBox),{period:'2020',selected:flight.id,box,fullBox});
});

test('active journal finds compact flight numbers and IATA in Turkish as well as city names',()=>{
 const start=source.indexOf('function renderJournal(){')+'function renderJournal(){'.length;
 const end=source.indexOf(" $('#flightList').innerHTML",start);
 const run=new Function('$','visible','airport','locale','flights',source.slice(start,end)+';return results;');
 const airport={HND:{city:'Tokyo',name:'Haneda'},LAX:{city:'Los Angeles',name:'Los Angeles'}};
 const flights=[flight,{...flight,id:'f_other',number:'BA123'}];
 const search=(query,locale='en')=>run(s=>s==='#historyQuery'?{value:query}:{},()=>flights,airport,locale,flights).map(f=>f.id);
 assert.deepEqual(search('tk476'),[flight.id]);assert.deepEqual(search('TK\u00a0476'),[flight.id]);
 assert.deepEqual(search('ba 123'),['f_other']);assert.deepEqual(search('Los Angeles'),[flight.id,'f_other']);
 const trFlights=[{...flight,from:'IST'}],trAirport={...airport,IST:{city:'İstanbul',name:'İstanbul'}};
 assert.equal(run(s=>s==='#historyQuery'?{value:'ist'}:{},()=>trFlights,trAirport,'tr',trFlights).length,1);
});

test('history saved today remains readable/editable after travelling to an earlier timezone',()=>{
 const OriginalDate=Date,tz=process.env.TZ,now='2026-11-03T02:00:00Z';
 try{
  globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return new OriginalDate(now).getTime();}};
  process.env.TZ='Asia/Tokyo';const m=memory(),s=api.createStore(m,codes);s.read();s.write([flight]);
  process.env.TZ='America/Los_Angeles';const reloaded=api.createStore(m,codes);
  assert.deepEqual(reloaded.read(),[flight]);
  assert.deepEqual(reloaded.write([{...flight,number:'TK477'}]),[{...flight,number:'TK477'}]);
  assert.throws(()=>reloaded.write([{...flight,id:'f_new'}]),/m143/,'new future record remains forbidden');
  const old={...flight,number:'TK477'},second={...flight,id:'f_second',date:'2020'};
  assert.deepEqual(reloaded.write([old,second]),[old,second]);
  assert.deepEqual(reloaded.write([second]),[second]);
 }finally{globalThis.Date=OriginalDate;if(tz===undefined)delete process.env.TZ;else process.env.TZ=tz;}
});

test('stored invalid dates remain corrupt; imported future dates are not silently accepted',()=>{
 const m=memory();m.setItem(api.KEY,api.backup([{...flight,date:'2025-02-30'}]));const s=api.createStore(m,codes);
 assert.throws(()=>s.read(),/m143/);assert.throws(()=>s.write([]),/m146/);
 assert.throws(()=>api.parse(api.backup([{...flight,date:'9999-12-31'}]),codes),/m143/);
});

// Исполняем реальный обработчик кнопки Retry, а не проверяем наличие строки:
// фокус поля сам по себе повторный запрос не запускает.
test('airport-search retry actually retries after returning focus',async()=>{
 const handler=source.match(/list\.querySelector\('button'\)\.onclick=([^;]+;?[^}]*});return;/)?.[1];
 assert.ok(handler,'active error handler found');const calls=[];
 const click=new Function('input','show','return '+handler)({focus:()=>calls.push('focus')},()=>calls.push('query'));
 await click();assert.deepEqual(calls,['focus','query']);
});

test('editing an existing date after timezone travel is not blocked by native input max',()=>{
 const start=source.indexOf('function resetForm(f=null,from=null){')+'function resetForm(f=null,from=null){'.length;
 const end=source.indexOf("$('#flightForm').reset()",start),field={};
 const run=new Function('f','$','localToday',source.slice(start,end));
 run(flight,()=>field,()=> '2026-11-02');assert.equal(field.max,'2026-11-03');
 run(null,()=>field,()=> '2026-11-02');assert.equal(field.max,'2026-11-02');
});
