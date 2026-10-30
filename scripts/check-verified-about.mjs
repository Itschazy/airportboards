// Выполняем настоящий server helper с изолированным источником справочной.
// Никаких Next runtime, рейсов или сети: проверяем найденный пропуск CJK20
// и сохранение границы старой сгенерированной прозы, а не копию условий теста.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync('lib/airport-content.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const guides=new Map();const fallback='Verified boundary: legacy Russian paragraph remains long enough.';
const exports={};
vm.runInNewContext(compiled,{exports,process:{cwd:()=>'/fixture'},require:name=>{
 if(name==='fs')return {readFileSync:()=>JSON.stringify({ru:fallback,en:'English legacy text must not leak to other locales.'})};
 if(name==='path')return path;
 if(name==='@/lib/airport-guide')return {getAirportGuide:(code,locale)=>guides.get(code+':'+locale)};
 throw new Error('Unexpected dependency: '+name);
}});
const get=exports.getAirportContent;
for(const [locale,about] of [['zh','根西机场位于岛屿南部的Forest教区。'],['ja','空港バスの案内'],['ru','Проверенные факты.']]) {
 guides.set('GCI:'+locale,{about});assert.equal(get('GCI',locale),about,locale);
}
guides.set('GCI:de',{about:'   '});assert.equal(get('GCI','de'),null);
assert.equal(get('XXX','en'),null);assert.equal(get('XXX','de'),null);
assert.equal(get('XXX','ru'),fallback);
console.log('PASS: короткий проверенный about ZH/JA/RU виден; пустой не виден; старый RU сохранён, EN fallback не протекает.');
