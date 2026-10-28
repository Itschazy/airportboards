import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,backup,parse,merge,KEY,FORMAT} from '../../public/flight-map/v1/storage.js';
const codes=new Set(['CEK','AYT','SVX','IST']);
const f={id:'f_test1',from:'CEK',to:'AYT',date:'2025-09-12',number:'TK 123'};
function memory(){const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
test('roundtrip across a new store instance and a downloaded backup',()=>{const m=memory(),s=createStore(m,codes);assert.deepEqual(s.read(),[]);s.write([f]);assert.deepEqual(createStore(m,codes).read(),[f]);assert.deepEqual(parse(backup([f]),codes),[f]);});
test('quota failure leaves the existing journal intact',()=>{const m=memory(),s=createStore(m,codes);s.read();s.write([f]);const old=m.getItem(KEY);m.setItem=()=>{throw Error('QuotaExceededError');};assert.throws(()=>s.write([]),/Не удалось сохранить/);assert.equal(m.getItem(KEY),old);});
test('a stale second tab cannot overwrite the newer history',()=>{const m=memory(),a=createStore(m,codes),b=createStore(m,codes);a.read();b.read();a.write([f]);assert.throws(()=>b.write([]),/другой вкладке/);assert.deepEqual(a.read(),[f]);});
test('corrupt current storage is preserved and blocks writes',()=>{const m=memory();m.setItem(KEY,'{broken');const s=createStore(m,codes);assert.throws(()=>s.read());assert.throws(()=>s.write([]),/не перезаписана/);assert.equal(m.getItem(KEY),'{broken');});
test('invalid import rejected as a whole, including duplicate IDs and invalid dates',()=>{for(const flights of [[f,{...f,id:'f_other',from:'BAD'}],[f,f],[{...f,date:'2025-02-30'}],[{...f,date:'2099-01-01'}],[{...f,number:123}],[{...f,id:'<script>'}]])assert.throws(()=>parse(backup(flights),codes));assert.throws(()=>parse(JSON.stringify({format:FORMAT,version:2,flights:[f]}),codes));assert.throws(()=>parse('x'.repeat(2*1024*1024+1),codes),/слишком большой/);});
test('restore is idempotent and preserves changed records on conflict',()=>{const incoming={...f,id:'f_other',to:'IST'},changed={...f,number:'UPDATED'};const r=merge([changed],[f,incoming]);assert.equal(r.added,1);assert.equal(r.conflicts,1);assert.deepEqual(r.flights,[changed,incoming]);const twice=merge(r.flights,[f,incoming]);assert.equal(twice.added,0);assert.equal(twice.existing,1);assert.equal(twice.conflicts,1);});
test('same route with distinct IDs remains two legitimate trips',()=>assert.equal(merge([f],[{...f,id:'f_other'}]).flights.length,2));
test('delete and undo both survive refresh',()=>{const m=memory(),s=createStore(m,codes);s.read();s.write([f]);s.write([]);assert.deepEqual(createStore(m,codes).read(),[]);s.write([f]);assert.deepEqual(createStore(m,codes).read(),[f]);});
test('simultaneous async tab writes are serialized and stale data is rejected',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let queue=Promise.resolve(),locks=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:(_name,run)=>{locks++;const pending=queue.then(run);queue=pending.catch(()=>{});return pending;}}}});
 try{const m=memory(),a=createStore(m,codes),b=createStore(m,codes);a.read();b.read();const results=await Promise.allSettled([a.writeAsync([f]),b.writeAsync([{...f,id:'f_other'}])]);assert.equal(locks,2);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.deepEqual(a.read(),[f]);}
 finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
