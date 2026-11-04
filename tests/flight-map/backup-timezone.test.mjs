import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {createStorage} from '../../public/flight-map/v10/storage.js';
import {createTransfer} from '../../public/flight-map/v10/transfer.js';
const api=createStorage(k=>k),codes=new Set(['HND','LAX']);
const flight={id:'f_one',from:'HND',to:'LAX',date:'2026-11-03',number:'JL16'};
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
async function at(instant,run){const OriginalDate=Date,tz=process.env.TZ;try{
 globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[instant]));}static now(){return new OriginalDate(instant).getTime();}};
 await run();
}finally{globalThis.Date=OriginalDate;if(tz===undefined)delete process.env.TZ;else process.env.TZ=tz;}}

test('own JSON restores after travelling west, including year-only New Year dates',async()=>{
 for(const [instant,east,west,date] of [
  ['2026-11-03T02:00:00Z','Asia/Tokyo','America/Los_Angeles','2026-11-03'],
  ['2027-01-01T10:30:00Z','Pacific/Kiritimati','Pacific/Pago_Pago','2027-01-02'],
  ['2027-01-01T10:30:00Z','Pacific/Kiritimati','Pacific/Pago_Pago','2027'],
 ])await at(instant,async()=>{
  process.env.TZ=east;const source=api.createStore(memory(),codes);source.read();const records=source.write([{...flight,date}]);const text=api.backup(records);
  process.env.TZ=west;const target=api.createStore(memory(),codes);target.read();
  // The ordinary input/CSV path still rejects new dates ahead of this device.
  assert.throws(()=>api.parse(text,codes),/m143/);
  await assert.rejects(target.writeAsync(records),/m143/);
  await assert.rejects(target.importAsync(records),/m143/);
  const csv=createTransfer({codes,newId:()=> 'f_csv'}).parse(`from,to,date\nHND,LAX,${date}`);
  assert.ok(csv.errors.some(e=>e.code==='date_future'));
  const result=await target.restoreAsync(api.parseBackup(text,codes));
  assert.equal(result.added,1);assert.deepEqual(target.read(),records);
  assert.equal((await target.restoreAsync(api.parseBackup(text,codes))).added,0);
  assert.deepEqual(api.parseBackup(api.backup(target.read()),codes),records);
 });
});

test('undo import remains usable after timezone change and preserves later edits',async()=>{
 await at('2026-11-03T02:00:00Z',async()=>{
  process.env.TZ='Asia/Tokyo';const s=api.createStore(memory(),codes);s.read();
  const imported=await s.importAsync([flight,{...flight,id:'f_two',number:'JL18'}]);
  process.env.TZ='America/Los_Angeles';await s.writeAsync(s.read().map(f=>f.id==='f_two'?{...f,number:'EDITED'}:f));
  const result=await s.undoImportAsync(imported.receipt);
  assert.equal(result.removed,1);assert.equal(result.preserved,1);assert.equal(s.read()[0].number,'EDITED');
 });
});

test('restore merges under lock without losing later additions or same-ID edits',async()=>{
 const m=memory(),a=api.createStore(m,codes),b=api.createStore(m,codes);a.read();b.read();
 const existing={...flight,date:'2020'},incoming={...flight,id:'f_new',date:'2021'};
 await b.writeAsync([{...existing,number:'EDITED'}]);
 const result=await a.restoreAsync([existing,incoming]);
 assert.equal(result.conflicts,1);assert.equal(result.added,1);assert.deepEqual(a.read(),[{...existing,number:'EDITED'},incoming]);
 const concurrent=await Promise.all([a.restoreAsync([{...incoming,id:'f_a'}]),b.restoreAsync([{...incoming,id:'f_b'}])]);
 assert.ok(concurrent.every(r=>r.added===1));assert.equal(a.read().length,4);
});

test('restore still rejects corrupt files and never modifies data on failure',async()=>{
 const m=memory(),s=api.createStore(m,codes);s.read();s.write([{...flight,date:'2020'}]);const before=m.getItem(api.KEY);
 for(const bad of [{...flight,date:'2025-02-30'},{...flight,date:'0000'},{...flight,from:'XXX'},{...flight,to:'HND'},{...flight,id:'<bad>'},{...flight,number:'\u0000'}]){
  assert.throws(()=>api.parseBackup(api.backup([bad]),codes));await assert.rejects(s.restoreAsync([bad]));assert.equal(m.getItem(api.KEY),before);
 }
 assert.throws(()=>api.parseBackup('{broken',codes));
 assert.throws(()=>api.parseBackup(api.backup([flight,flight]),codes));
 assert.throws(()=>api.parseBackup('x'.repeat(api.MAX_BYTES+1),codes));
 m.setItem=()=>{throw Error('quota');};await assert.rejects(s.restoreAsync([{...flight,id:'f_new',date:'2021'}]),/m149/);assert.equal(m.getItem(api.KEY),before);
 const broken=memory();broken.setItem(api.KEY,'broken');await assert.rejects(api.createStore(broken,codes).restoreAsync([flight]));assert.equal(broken.getItem(api.KEY),'broken');
});
