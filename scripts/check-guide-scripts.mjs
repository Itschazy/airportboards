// Регрессия слепой зоны: check:scripts не обходил airport-guide, и зелёный
// результат ничего не говорил о новых переводах. Проверяем реальный CLI на
// изолированной мини-справочной, не подменяя его алфавитный алгоритм.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const scanner=path.resolve('scripts/check-scripts.mjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ab-guide-alphabet-'));
try {
 fs.mkdirSync(path.join(root,'data/airport-guide/en'),{recursive:true});
 fs.writeFileSync(path.join(root,'data/airport-guide/XAA.json'),JSON.stringify({iata:'XAA',blocks:[{id:'transport',title:'Как доехать',hint:'Автобус 106н',text:'Автобусы 106н, 244-Э и 101 (к). Парковка Р1.'}]}));
 const file=path.join(root,'data/airport-guide/en/XAA.json');
 const check=text=>{
  fs.writeFileSync(file,JSON.stringify({iata:'XAA',blocks:{transport:{title:'Getting there',hint:'Bus 106н',text}}}));
  return spawnSync(process.execPath,[scanner],{cwd:root,encoding:'utf8'});
 };
 assert.equal(check('Buses 106н, 244-Э and 101к.').status,0,'настоящие индексы из оригинала допустимы');
 assert.equal(check('Bus 101 (к).').status,0,'запись индекса в скобках также допустима');
 for(const field of ['about','title','hint']) {
  check('Correct text.');const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  if(field==='about')doc.about='Wrong слово.';else doc.blocks.transport[field]='Wrong слово.';
  fs.writeFileSync(file,JSON.stringify(doc));assert.equal(spawnSync(process.execPath,[scanner],{cwd:root}).status,1,field);
 }
 for(const text of ['An untranslated слово.','Mixed 漢字 in English.','Wrong 999н label.','Broken 106нс suffix.','Unknown 2106н route.','Unknown Р12 car park.']) {
  const result=check(text);assert.equal(result.status,1,text);assert.match(result.stdout,/airport-guide\/en\/XAA/);
 }
 console.log('PASS: airport-guide реально проверяется; чужие слова/алфавиты/неизвестные индексы отклонены, настоящие подписи сохранены.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
