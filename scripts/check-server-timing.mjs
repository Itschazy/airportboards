// Exercise the actual collector helper: stale browser-cache timings must not be
// reported as a fresh server measurement. No browser, network or paid data needed.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=fs.readFileSync('lib/rum-server-timing.ts','utf8');
const ctx={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx);
const read=ctx.exports.readServerTiming;
const timing=(name,duration=0,description='')=>({name,duration,description});
const nav={transferSize:500,workerStart:0,requestStart:100,responseStart:500,serverTiming:[timing('ab-edge',120),timing('ab-origin',100),timing('ab-cache',0,'MISS')]};
let passed=0;
function check(name,n,expected){assert.deepEqual(JSON.parse(JSON.stringify(read(n))),expected,name);passed++;console.log('PASS '+name);}
const unknown={edgeHeader:-1,originHeader:-1,serverCache:'unknown'};
check('MISS uses current header timings',nav,{edgeHeader:120,originHeader:100,serverCache:'MISS'});
for(const status of ['BYPASS','EXPIRED','REVALIDATED'])check(status,{...nav,serverTiming:[timing('ab-edge',120),timing('ab-origin',100),timing('ab-cache',0,status)]},{edgeHeader:120,originHeader:100,serverCache:status});
for(const status of ['HIT','STALE','UPDATING'])check(status+' has no current upstream duration',{...nav,serverTiming:[timing('ab-edge',4),timing('ab-origin',100),timing('ab-cache',0,status)]},{edgeHeader:4,originHeader:-1,serverCache:status});
for(const patch of [{transferSize:0},{transferSize:undefined},{workerStart:20},{serverTiming:undefined},{serverTiming:[]},{serverTiming:[timing('ab-edge',100)]}])check('unavailable/cached/worker '+JSON.stringify(patch),{...nav,...patch},unknown);
check('zero measured duration is valid',{...nav,serverTiming:[timing('ab-edge',0),timing('ab-origin',0),timing('ab-cache',0,'MISS')]},{edgeHeader:0,originHeader:0,serverCache:'MISS'});
check('missing origin is unknown, not zero',{...nav,serverTiming:[timing('ab-edge',4),timing('ab-cache',0,'MISS')]},{edgeHeader:4,originHeader:-1,serverCache:'MISS'});
for(const value of [-1,NaN,Infinity,300001])check('invalid edge '+value,{...nav,serverTiming:[timing('ab-edge',value),timing('ab-cache',0,'MISS')]},unknown);
check('duplicates rejected',{...nav,serverTiming:[...nav.serverTiming,timing('ab-edge',1)]},unknown);
check('arbitrary description rejected',{...nav,serverTiming:[timing('ab-edge',5),timing('ab-cache',0,'private-user-data')]},unknown);
check('inconsistent origin is omitted',{...nav,serverTiming:[timing('ab-edge',20),timing('ab-origin',100),timing('ab-cache',0,'MISS')]},{edgeHeader:20,originHeader:-1,serverCache:'MISS'});
check('edge cannot exceed browser request by seconds',{...nav,serverTiming:[timing('ab-edge',2000),timing('ab-cache',0,'MISS')]},unknown);
console.log(`PASS ${passed} server timing controls`);
