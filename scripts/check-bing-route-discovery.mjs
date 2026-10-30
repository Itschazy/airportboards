import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {emptyState,reconcile,readyEntries} from './indexnow-queue.mjs';
const demand=JSON.parse(fs.readFileSync('data/search-demand-routes.json','utf8'));
assert.deepEqual(Object.keys(demand).sort(),['BER-AYT','BRS-PMI','MEL-PER']);
// Выполняем именно цикл sitemap с подставленным только хранилищем, без сети.
// Наличие спроса не должно обходить robots-предикат пустого маршрута.
const source=fs.readFileSync('app/sitemap.ts','utf8');
const start=source.indexOf('const seenPair = new Set<string>();');
const end=source.indexOf('\n  }',start);
assert.ok(start>0&&end>start);
const body=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const run=new Function('getTopRoutes','searchDemandRoutes','getRoute','entry',`return (async()=>{const entries=[];${body};return entries})()`);
const alive=new Set(['MEL-PER','BRS-PMI']);
const result=await run(()=>({MEL:['MEL-PER']}),demand,async(a,b)=>alive.has(a+'-'+b)?[{}]:[],p=>[p]);
assert.deepEqual(result.sort(),['/route/BRS-PMI','/route/MEL-PER']);
const state=emptyState();
const paths=['/en/route/MEL-PER','/de/route/BER-AYT','/en/route/BRS-PMI'];
reconcile(state,Object.fromEntries([...paths,'/fr/route/MEL-PER'].map(p=>[p,'same'])),100);
for(const p of paths)assert.equal(state.pending[p].priority,0);
assert.equal(state.pending['/fr/route/MEL-PER'].priority,2);
state.pending[paths[0]].attempts=3;state.pending[paths[0]].nextAt=999;
reconcile(state,Object.fromEntries(paths.map(p=>[p,'same'])),200);
assert.equal(state.pending[paths[0]].attempts,3);assert.equal(state.pending[paths[0]].nextAt,999);
assert.ok(!readyEntries(state,200).some(([p])=>p===paths[0]));
console.log('PASS: demand routes deduplicated, empty/noindex excluded, exact locale priority, retry preserved');
