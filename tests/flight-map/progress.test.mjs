import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../../lib/track.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function setup(window){const context={exports:{},window,process:{env:{NEXT_PUBLIC_RUM_RELEASE:'test-release'}}};vm.runInNewContext(js,context);return context.exports.trackMapStep;}
test('map steps use visit parameters, never automatic goals/hits/notBounce, and carry no personal input',()=>{
 const ym=[],ga=[],track=setup({ym:(...x)=>ym.push(x),gtag:(...x)=>ga.push(x)});
 track('first_saved','ru');track('SU1234 Moscow Paris','ru');
 assert.equal(ym.length,1);assert.equal(ym[0][1],'params');
 assert.deepEqual(JSON.parse(JSON.stringify(ym[0][2])),{flight_map_steps:{'test-release':{first_saved:true}}});
 assert.deepEqual(JSON.parse(JSON.stringify(ga)),[['event','flight_map_step',{step:'first_saved',locale:'ru',release:'test-release'}]]);
 track('form_open','en');assert.equal(ym.length,1);assert.equal(ga.length,2);
});
test('unavailable and failing analytics cannot break flight entry',()=>{
 assert.doesNotThrow(()=>setup(undefined)('save_attempt','ru'));
 assert.doesNotThrow(()=>setup({})('save_attempt','ru'));
 let received=0;setup({ym:()=>{throw Error('blocked');},gtag:()=>received++})('ready','ru');assert.equal(received,1);
});
