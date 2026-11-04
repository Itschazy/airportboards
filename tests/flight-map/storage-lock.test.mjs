import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createStorage} from '../../public/flight-map/v10/storage.js';

const api=createStorage(key=>key),codes=new Set(['LHR','CDG','JFK']);
const flight=id=>({id,from:'LHR',to:'CDG',date:'2024',number:id});
function setup(t,idb=new IDBFactory()){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;});
 // Node has no IndexedDB; each test gets a separate browser database.
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:idb});
 t.after(()=>delete globalThis.indexedDB);
 const map=new Map(),memory={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 const a=api.createStore(memory,codes),b=api.createStore(memory,codes);a.read();b.read();
 return {a,b,memory};
}

test('without either locking API, save/import/undo reject without changing the journal',async t=>{
 const {a,memory}=setup(t,undefined);
 delete globalThis.indexedDB;
 for(const run of [()=>a.writeAsync([flight('f_a')]),()=>a.importAsync([flight('f_a')]),()=>a.undoImportAsync({records:[]})]){
  await assert.rejects(run(),/m149/);
  assert.equal(memory.getItem(api.KEY),null);
 }
});

test('IndexedDB fallback rejects a stale concurrent editor, preserving the winning save',async t=>{
 const {a,b}=setup(t);
 const results=await Promise.allSettled([a.writeAsync([flight('f_a')]),b.writeAsync([flight('f_b')])]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.match(results.find(r=>r.status==='rejected').reason.message,/m148/);
 const saved=results.find(r=>r.status==='fulfilled').value;
 assert.deepEqual(a.read(),saved);
});

test('fallback serializes imports from independent stores; undo preserves the other batch',async t=>{
 const {a,b}=setup(t);
 const results=await Promise.all([a.importAsync([flight('f_a')]),b.importAsync([flight('f_b')])]);
 assert.deepEqual(a.read().map(f=>f.id).sort(),['f_a','f_b']);
 await a.undoImportAsync(results[0].receipt);
 assert.deepEqual(b.read(),[flight('f_b')]);
});

test('queued fallback save keeps its original expected snapshot despite a same-store import',async t=>{
 const {a}=setup(t);
 const results=await Promise.allSettled([a.importAsync([flight('f_a')]),a.writeAsync([flight('f_b')])]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
 assert.deepEqual(a.read(),[flight('f_a')]);
});

test('fallback releases the lock after quota failure and preserves readable data',async t=>{
 const {a,b,memory}=setup(t);await a.writeAsync([flight('f_a')]);
 const before=memory.getItem(api.KEY),write=memory.setItem;
 memory.setItem=()=>{throw Error('quota');};
 await assert.rejects(a.importAsync([flight('f_b')]),/m149/);assert.equal(memory.getItem(api.KEY),before);
 memory.setItem=write;await b.importAsync([flight('f_b')]);
 assert.equal(a.read().length,2);
});

test('unavailable IndexedDB fails closed, including a throwing browser property getter',async t=>{
 const {a,memory}=setup(t,{open(){throw Error('SecurityError');}});
 await assert.rejects(a.writeAsync([flight('f_a')]),/m149/);
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw Error('SecurityError');}});
 await assert.rejects(a.writeAsync([flight('f_a')]),/m149/);
 assert.equal(memory.getItem(api.KEY),null);
});

test('a stalled database open times out; late success cannot write after the error',async t=>{
 const request={},db={closed:false,close(){this.closed=true;},transaction(){throw Error('late transaction must not start');}};
 const {a,memory}=setup(t,{open:()=>request});
 t.mock.timers.enable({apis:['setTimeout']});
 const saving=a.writeAsync([flight('f_a')]);
 const rejected=assert.rejects(saving,/m149/);
 t.mock.timers.tick(10000);await rejected;
 request.result=db;request.onsuccess();
 assert.equal(db.closed,true);assert.equal(memory.getItem(api.KEY),null);
});

test('blocked open fails immediately and cannot create a late transaction',async t=>{
 const request={};const {a,memory}=setup(t,{open:()=>request});
 const saving=a.writeAsync([flight('f_a')]);const rejected=assert.rejects(saving,/m149/);
 request.onblocked();await rejected;
 let closed=false;request.result={close(){closed=true;},transaction(){throw Error('unexpected write');}};
 request.onsuccess();assert.equal(closed,true);assert.equal(memory.getItem(api.KEY),null);
});

test('Web Locks is preferred and never touches IndexedDB on the normal path',async t=>{
 const {a}=setup(t,{open(){throw Error('IndexedDB must stay cold');}});
 let calls=0;navigator.locks={request:async(key,run)=>{assert.equal(key,api.KEY);calls++;return run();}};
 await a.writeAsync([flight('f_a')]);assert.equal(calls,1);assert.deepEqual(a.read(),[flight('f_a')]);
});
