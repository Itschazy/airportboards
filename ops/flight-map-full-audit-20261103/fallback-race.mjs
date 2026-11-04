import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
// Two workers stand for independent window agents. Each getItem/setItem is
// atomic, just as localStorage methods are; the pair is not one transaction.
// Barrier places both writes after getItem, before either setItem. No Web Locks.
const shared=new SharedArrayBuffer(65536), state=new Int32Array(shared,0,4);
const source=`
const {workerData,parentPort}=require('node:worker_threads');
(async()=>{
 const {createStorage}=await import(workerData.url);
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 const state=new Int32Array(workerData.shared,0,4),bytes=new Uint8Array(workerData.shared,16);
 const encoder=new TextEncoder(),decoder=new TextDecoder();let reads=0;
 const memory={getItem(){
  const len=Atomics.load(state,0);const snapshot=len?decoder.decode(bytes.slice(0,len)):null;
  if(++reads===2){Atomics.add(state,1,1);Atomics.notify(state,1);while(Atomics.load(state,1)<2)Atomics.wait(state,1,1,5000);}
  return snapshot;
 },setItem(k,value){
  while(Atomics.compareExchange(state,2,0,1)!==0)Atomics.wait(state,2,1,5000);
  const encoded=encoder.encode(value);bytes.set(encoded);Atomics.store(state,0,encoded.length);
  Atomics.store(state,2,0);Atomics.notify(state,2);
 }};
 const store=createStorage(k=>k).createStore(memory,new Set(['HND','LAX']));store.read();
 await store.writeAsync([{id:workerData.id,from:'HND',to:'LAX',date:'2025',number:''}]);
 parentPort.postMessage({saved:workerData.id});
})().catch(e=>{parentPort.postMessage({error:e.message});});`;
const url=new URL('../../public/flight-map/v10/storage.js',import.meta.url).href;
const run=id=>new Promise((resolve,reject)=>{
 const w=new Worker(source,{eval:true,workerData:{shared,url,id}});
 const timeout=setTimeout(()=>{w.terminate();reject(Error('worker timeout'));},15000);
 w.once('message',result=>{clearTimeout(timeout);resolve(result);});w.once('error',reject);
});
const outcomes=await Promise.all([run('f_first'),run('f_second')]);
// После исправления обе вкладки без Web Locks И IndexedDB обязаны отказать
// в записи. Исходный режим сохранён для проверки старого кода аудита.
if(process.argv.includes('--expect-safe')){
 assert.ok(outcomes.every(x=>x.error==='m149'),JSON.stringify(outcomes));
 assert.equal(Atomics.load(state,0),0);
 console.log('PASS: two independent workers cannot write without either locking API.',JSON.stringify(outcomes));
 process.exit(0);
}
assert.ok(outcomes.every(x=>x.saved),JSON.stringify(outcomes));
const saved=JSON.parse(new TextDecoder().decode(new Uint8Array(shared,16,Atomics.load(state,0))));
assert.equal(saved.flights.length,1);
console.log('CONFIRMED conditional fallback race: both windows report saved, final journal has only one flight.',JSON.stringify(outcomes));
