import test from 'node:test';import assert from 'node:assert/strict';
import {createBoot} from '../../public/flight-map/v8/boot.js';
const root=()=>({dataset:{mapConfig:JSON.stringify({locale:'ru',messages:{}})}});
test('SSR boot and React adoption mount once, replay events once and abort on navigation',async()=>{
 const calls=[],events=[],node=root();
 const {boot,stop}=createBoot(async(el,options)=>{calls.push(options);options.track('open');});
 const a=boot(node);assert.equal(boot(node),a);await a.ready;assert.equal(calls.length,1);
 a.attachTrack((...args)=>events.push(args));a.attachTrack((...args)=>events.push(args));assert.deepEqual(events,[['open']]);
 calls[0].track('saved');assert.deepEqual(events,[['open'],['saved']]);
 stop(node);assert.ok(calls[0].signal.aborted);calls[0].track('export');assert.equal(events.length,2);
 const b=boot(node);assert.notEqual(a,b);a.dispose();assert.equal(boot(node),b);await b.ready;assert.equal(calls.length,2);b.dispose();
});
test('unmount before module microtask does not start or report a late session',async()=>{
 let calls=0;const {boot}=createBoot(()=>{calls++;});const a=boot(root());a.dispose();await a.ready;assert.equal(calls,0);
});
