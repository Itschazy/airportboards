// Размер и полнота быстрого словаря, настоящий клиентский matcher и 12 локалей.
// Только бесплатный /api/airports/search, всегда audit-bot.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
const base=process.argv[2]||'http://localhost:3099';
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/quick-search.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,module);
const {prepareQuick,quickSearch,prioritizeQuick}=module.exports;
for(const file of fs.readdirSync('messages').filter(f=>f.endsWith('.json'))){
 const locale=file.replace('.json','');
 const res=await fetch(`${base}/api/airports/search?locale=${locale}&bootstrap=1`,{headers:{'user-agent':'audit-bot'}});
 assert.equal(res.status,200);assert.match(res.headers.get('cache-control'),/max-age=3600/);
 const raw=await res.text(),data=JSON.parse(raw);
 assert.equal(data.quick.length,1000);assert.equal(new Set(data.quick.map(r=>r[0])).size,1000);
 const bytes=gzipSync(raw).length;assert.ok(bytes<40000,`${locale}: компактный словарь ${bytes}B`);
 const index=prepareQuick(data.quick);
 for(const code of ['CEK','AYT','SSH','HRG','DME','GYD','IST','OVB','UFA','EVN','TAS','LWN','HKT','KZN','DXB','SVO'])assert.equal(quickSearch(index,code)[0]?.iata,code,`${locale}: ${code} без ожидания API`);
 assert.equal(quickSearch(index,'zzzznosuchairport').length,0);
 if(locale==='ru'){
  for(const [q,code]of [['чел','CEK'],['челя','CEK'],['моск','SVO'],['каз','KZN'],['уфа','UFA']])assert.equal(quickSearch(index,q)[0]?.iata,code,q);
  const kazan=quickSearch(index,'каз');
  const full=await fetch(`${base}/api/airports/search?locale=ru&q=${encodeURIComponent('каз')}`,{headers:{'user-agent':'audit-bot'}}).then(r=>r.json());
  assert.equal(prioritizeQuick(full.airports,kazan)[0]?.iata,'KZN','Казань остаётся первой после полного ответа');
  assert.equal(prioritizeQuick([],kazan).length,0,'Полный пустой ответ убирает предварительную строку');
  const t=performance.now();for(let i=0;i<100;i++)quickSearch(index,'челя');console.log(`ru matcher mean ${((performance.now()-t)/100).toFixed(2)}ms (local CPU, not a phone)`);
 }
 console.log(`PASS ${locale}: 1000 airports, ${bytes}B gzip`);
}
