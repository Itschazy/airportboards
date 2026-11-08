import test from 'node:test';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import {validateDate,formatHistoryDate,markDuplicates} from '../../public/flight-map/v10/history.js';
const {createTransfer,exportCSV}=await import(`../../public/flight-map/${process.env.MAP_TRANSFER_VERSION||'v11'}/transfer.js`);
import {createStorage} from '../../public/flight-map/v10/storage.js';
const codes=new Set(['LHR','CDG','JFK','HND']);let seq=0;
const transfer=createTransfer({codes,newId:()=>`f_${++seq}`,today:'2026-11-03'});
const api=createStorage((key)=>key);
const f={id:'f_old',from:'LHR',to:'CDG',date:'2024',number:'BA 123'};
function memory(){const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
function parse(text,options){return transfer.parse(text,options);}
test('date precision never fabricates a day; calendar and future boundaries',()=>{
 for(const value of ['', '2026','2024-02-29','2026-11-03'])assert.equal(validateDate(value,{today:'2026-11-03'}).valid,true,value);
 for(const value of ['2027','2026-11-04','2025-02-29','2024-02-30','2024-13-01','2024-00-01','0000','24','2024-2-01','01/02/2024'])assert.equal(validateDate(value,{today:'2026-11-03'}).valid,false,value);
 for(const locale of ['en','ru','de','fr','es','it','tr','ja','zh','ko','ar','hi'])assert.equal(formatHistoryDate('2024',locale),'2024');
 assert.equal(formatHistoryDate('','en'),'');assert.match(formatHistoryDate('2024-02-29','en'),/29/);
});
test('old backup schema and key retained; year and undated roundtrip across store instances',()=>{
 assert.equal(api.KEY,'airportsboard-flight-history-v1');const m=memory(),store=api.createStore(m,codes);store.read();
 const old={...f,id:'f_day',date:'2024-02-29'},unknown={...f,id:'f_none',date:''};store.write([f,old,unknown]);
 assert.equal(JSON.parse(m.getItem(api.KEY)).version,1);assert.deepEqual(api.createStore(m,codes).read(),[f,old,unknown]);assert.deepEqual(api.parse(api.backup([old]),codes),[old]);
});
test('CSV supports BOM, quoted commas/quotes/newlines, CRLF, semicolon and tabs',()=>{
 const r=parse('\uFEFFfrom,to,date,number,comment\r\nLHR,CDG,2024,"BA 123","hello, ""world""\r\nnext line"\r\nCDG,JFK,2024-02-29,AF23,ignored');
 assert.equal(r.errors.length,0);assert.equal(r.rows.length,2);assert.deepEqual(r.warnings,[{code:'fields_ignored',fields:['comment']}]);
 for(const d of [';','\t']){const p=parse(['from','to','date','number'].join(d)+'\n'+['LHR','CDG','2024','BA123'].join(d));assert.equal(p.errors.length,0);assert.equal(p.rows.length,1);}
});
test('CSV grammar errors and ambiguous dates are visible, never guessed',()=>{
 for(const text of ['from,to\n"LHR,CDG','from,to\n"LHR"garbage,CDG','from,to\nL"HR,CDG','from,to\nLHR,CDG,JFK','from,origin,to\nLHR,LHR,CDG','LHR,CDG,2024'])assert.ok(parse(text).errors.length,text);
 assert.equal(parse('from,to,date\nLHR,CDG,03/04/2024').errors[0].code,'date_ambiguous');
 assert.equal(parse('from,to,date\nLHR,CDG,2025-02-29').errors[0].code,'date_invalid');
 assert.equal(parse('from,to,date\nLHR,CDG,2027').errors[0].code,'date_future');
});
test('documented column aliases recognized; extra metadata reported; airport IDs not guessed',()=>{
 for(const flight of ['Flight_Number','Flight number','Flight']){const r=parse(`Date,From,To,${flight},Airline\n2024,LHR,CDG,BA1,British Airways`);assert.equal(r.errors.length,0);assert.equal(r.rows[0].number,'BA1');assert.equal(r.warnings[0].code,'fields_ignored');}
 assert.equal(parse('From,To\nLondon Heathrow (LHR),CDG').errors[0].code,'airport_unknown');
});
test('route chains create individual legs and reject unknown airports, same origin, extraneous words',()=>{
 const p=parse('lhr → cdg → jfk\nHND-LHR\nLHR CDG',{format:'routes'});assert.equal(p.rows.length,4);assert.equal(p.errors.length,0);assert.equal(p.rows[0].date,'');
 const bad=parse('LHR-QQQ\nLHR-LHR\nLHR-CDG tomorrow',{format:'routes'});assert.equal(bad.rows.length,0);assert.deepEqual(bad.errors.map(e=>e.code),['airport_unknown','route_same','route_format']);
});
test('semantic duplicates reported without silently dropping legitimate repeated flights',()=>{
 const r=parse('from,to,date,number\nLHR,CDG,2024,ba123\nLHR,CDG,2024,BA 123',{current:[f]});assert.equal(r.rows.length,2);assert.equal(r.warnings[0].count,2);assert.equal(r.rows[0].duplicateOf,f.id);
 assert.equal(markDuplicates([{...f,id:'f_different',date:'2025'}],[f])[0].duplicateOf,undefined);
});
test('CSV roundtrip and spreadsheet formula protection for user-provided flight number',()=>{
 for(const number of ['BA123',' BA 123 ',' =1+1','=1+1','+CMD','-1','@SUM(A1)',"'=LITERAL","''ABC",'BA,12','BA"12']){
  const original={...f,number};const text=exportCSV([original]);assert.ok(!text.includes(',=1+1'));const result=parse(text);assert.equal(result.errors.length,0,number);assert.equal(result.rows[0].number,number);
 }
});
test('input bounds reject oversized files and 5001 records; 5000 records accepted',()=>{
 assert.equal(parse('é'.repeat(1024*1024+1)).errors[0].code,'file_size');
 const record='LHR,CDG,2024,BA1\n';assert.equal(parse('from,to,date,number\n'+record.repeat(5000)).rows.length,5000);
 assert.ok(parse('from,to,date,number\n'+record.repeat(5001)).errors.some(e=>e.code==='record_limit'));
 assert.ok(parse('LHR CDG\n'.repeat(5001),{format:'routes'}).errors.some(e=>e.code==='record_limit'));
});
test('batch import requires explicit decision for semantic duplicate, supports idempotent JSON restore',async()=>{
 const m=memory(),s=api.createStore(m,codes);s.read();s.write([f]);const incoming={...f,id:'f_import'};
 const refused=await s.importAsync([incoming]);assert.equal(refused.requiresConfirmation,true);assert.equal(refused.added,0);assert.equal(refused.receipt,null);assert.deepEqual(s.read(),[f]);
 const accepted=await s.importAsync([incoming],{allowDuplicates:true});assert.equal(accepted.added,1);assert.equal(accepted.receipt.records.length,1);
 const twice=await s.importAsync([incoming]);assert.equal(twice.added,0);assert.equal(twice.existing,1);
 const conflict=await s.importAsync([{...f,number:'changed'}]);assert.equal(conflict.conflicts,1);assert.equal(s.read()[0].number,f.number);
});
test('undo batch preserves concurrent additions, edits and pre-existing records',async()=>{
 const m=memory(),s=api.createStore(m,codes),other=api.createStore(m,codes);s.read();s.write([f]);
 const a={...f,id:'f_a',date:'2023'},b={...f,id:'f_b',date:'2022'},addedLater={...f,id:'f_new',date:'2021'};
 const saved=await s.importAsync([a,b]);const current=other.read();other.write([...current.map(row=>row.id===a.id?{...row,number:'EDITED'}:row),addedLater]);
 const undone=await s.undoImportAsync(saved.receipt);assert.equal(undone.removed,1);assert.equal(undone.preserved,1);assert.deepEqual(undone.flights.map(row=>row.id),['f_old','f_a','f_new']);assert.equal(undone.flights[1].number,'EDITED');
 const again=await s.undoImportAsync(saved.receipt);assert.equal(again.removed,0);
});
test('invalid imports, corrupt storage and quota failure never alter saved data',async()=>{
 const m=memory(),s=api.createStore(m,codes);s.read();s.write([f]);const before=m.getItem(api.KEY);
 await assert.rejects(s.importAsync([{...f,id:'f_bad',date:'2025-02-29'}]));assert.equal(m.getItem(api.KEY),before);
 m.setItem=()=>{throw Error('quota');};await assert.rejects(s.importAsync([{...f,id:'f_new',date:'2023'}]));assert.equal(m.getItem(api.KEY),before);
 const broken=memory();broken.setItem(api.KEY,'{broken');const b=api.createStore(broken,codes);await assert.rejects(b.importAsync([f]));assert.equal(broken.getItem(api.KEY),'{broken');
});
test('concurrent import transactions reread under same Web Lock and do not lose another batch',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let queue=Promise.resolve(),locks=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:(_key,run)=>{locks++;const pending=queue.then(run);queue=pending.catch(()=>{});return pending;}}}});
 try{const m=memory(),a=api.createStore(m,codes),b=api.createStore(m,codes);a.read();b.read();const results=await Promise.all([a.importAsync([f]),b.importAsync([{...f,id:'f_next',date:'2023'}])]);assert.equal(locks,2);assert.deepEqual(a.read().map(f=>f.id),['f_old','f_next']);assert.equal(results[1].added,1);}
 finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});

test('stale single-record editor still cannot overwrite a committed batch',async()=>{
 const m=memory(),a=api.createStore(m,codes),b=api.createStore(m,codes);a.read();b.read();await a.importAsync([f]);await assert.rejects(b.writeAsync([{...f,id:'f_other'}]));assert.deepEqual(a.read(),[f]);
});

test('queued stale save cannot overwrite import that advances same store observed value',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let queue=Promise.resolve();
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:(_key,run)=>{const pending=queue.then(run);queue=pending.catch(()=>{});return pending;}}}});
 try{const m=memory(),s=api.createStore(m,codes);s.read();s.write([f]);const imported={...f,id:'f_import_later',date:'2023'};
  const importing=s.importAsync([imported]);const staleSaving=s.writeAsync([{...f,number:'EDITED'}]);
  await importing;await assert.rejects(staleSaving);assert.deepEqual(s.read(),[f,imported]);
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});

// A single permitted 1.6MB chain used to allocate 394999 identical errors
// after the 5000-record limit. The preview must stop work at the limit.
test('long route chains stop at one limit error instead of allocating an error per remaining leg',()=>{
 const text=Array.from({length:400000},(_,i)=>i%2?'CDG':'LHR').join(' ');
 const result=parse(text,{format:'routes'});
 assert.equal(result.rows.length,5000);
 assert.equal(result.errors.length,1);assert.deepEqual(result.errors[0],{code:'record_limit',line:1});
});
test('route limit counts legs across lines, allows exactly 5000 and never truncates silently',()=>{
 const exact='LHR CDG JFK\n'.repeat(2500);
 const ok=parse(exact,{format:'routes'});assert.equal(ok.rows.length,5000);assert.equal(ok.errors.length,0);
 const over=parse(exact+'HND LHR CDG',{format:'routes'});
 assert.equal(over.rows.length,5000);assert.deepEqual(over.errors,[{code:'record_limit',line:2501}]);
});
