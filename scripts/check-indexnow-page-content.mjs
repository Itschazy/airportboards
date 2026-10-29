// Проверяем поведение на копии редакционных файлов, без сети и секретов.
// Изменение контента должно обнаруживаться, а живые рейсы и часы — нет.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pageFamily,pageSources,pageContentManifest} from './indexnow-page-content.mjs';
import {emptyState,reconcile,readyEntries} from './indexnow-queue.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ab-page-content-'));
try {
  const sources=new Set(Object.values(pageSources).flat());
  for(const file of [...sources,'data/airports.json','data/airport-names.json','data/city-names.json','data/country-names.json','data/airport-service.json','data/airport-service-unverified.json','data/airlines.json',...['about','contact','privacy','terms'].map(k=>'data/legal/'+k+'.json'),...['en','de','ru'].map(l=>'messages/'+l+'.json')]) {
    fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.copyFileSync(file,path.join(root,file));
  }
  const paths=['/en','/en/airports','/en/airports/united-kingdom','/en/city/london','/en/route/LHR-JFK','/de/route/LHR-JFK','/en/widgets','/en/az/A','/en/about','/ru/about','/en/contact','/de/about','/en/favorites','/en/flight/BA123'];
  const manifest=()=>pageContentManifest(root,paths);
  const before=manifest();
  assert.equal(Object.keys(before).length,11);
  assert.deepEqual(manifest(),before);
  function mutate(file,change,expected) {
    const target=path.join(root,file),old=fs.readFileSync(target,'utf8');
    fs.writeFileSync(target,change(old));
    const after=manifest();
    assert.deepEqual(Object.keys(after).filter(p=>after[p]!==before[p]).sort(),expected.sort(),file);
    fs.writeFileSync(target,old);
  }
  for(const [family,expected] of Object.entries({route:['/en/route/LHR-JFK','/de/route/LHR-JFK'],country:['/en/airports/united-kingdom'],city:['/en/city/london'],widgets:['/en/widgets'],home:['/en'],airports:['/en/airports'],az:['/en/az/A']}))mutate(pageSources[family][0],s=>s+'\n// редакционное изменение\n',expected);
  mutate('lib/route-facts.ts',s=>s+'\n// проверка условия\n',['/en/route/LHR-JFK','/de/route/LHR-JFK']);
  mutate('messages/en.json',s=>{const j=JSON.parse(s);j.home.route_desc+=' checked';return JSON.stringify(j);},['/en','/en/route/LHR-JFK']);
  mutate('components/LocaleLinks.tsx',s=>s+'\n// hreflang\n',Object.keys(before));
  mutate('components/LegalArticle.tsx',s=>s+'\n// prose/schema\n',['/en/about','/ru/about','/en/contact']);
  mutate('messages/en.json',s=>{const j=JSON.parse(s);j.home.airports_count+=' checked';return JSON.stringify(j);},['/en','/en/airports','/en/airports/united-kingdom','/en/az/A']);
  mutate('lib/generic-word.ts',s=>s+'\n// names\n',['/en','/en/airports/united-kingdom','/en/city/london','/en/route/LHR-JFK','/de/route/LHR-JFK','/en/az/A']);
  mutate('data/legal/about.json',s=>{const j=JSON.parse(s);j.en.intro[0]+=' checked';return JSON.stringify(j);},['/en/about']);
  mutate('data/legal/contact.json',s=>{const j=JSON.parse(s);j.ru.intro[0]+=' проверено';return JSON.stringify(j);},[]);
  fs.writeFileSync(path.join(root,'flight-store.json'),'{"updatedAt":123}');
  fs.writeFileSync(path.join(root,'BUILD_ID'),'changed');
  assert.deepEqual(manifest(),before);
  assert.equal(before['/en/route/JFK-LHR'],undefined,'никаких новых направлений без discovery');
  for(const p of ['/en/airport/LHR/departures','/en/settings','/en/my-flights-prototype','/en/route/LHR-LHR','/en/route/lhr-jfk','/de/privacy','/api/cron/warm','/en/airport/LHR?x=1','/xx','https://evil.test/en'])assert.equal(pageFamily(p),null,p);
  const state=emptyState();state.pending['/de/about']={nextAt:0};state.sent['/de/about']={fingerprint:'historic'};
  state.pending['/en/widgets']={nextAt:9999,attempts:2,fingerprint:'same'};
  state.fingerprints['/en/widgets']='same';state.runs=[{accepted:5}];
  reconcile(state,{'/en/widgets':'same'},100);
  assert.equal(state.pending['/de/about'],undefined);
  assert.ok(state.sent['/de/about']);assert.equal(state.runs[0].accepted,5);
  assert.equal(state.pending['/en/widgets'].attempts,2);assert.equal(readyEntries(state,100).length,0);
  const many=Array.from({length:10000},(_,i)=>'/en/city/example-'+i);
  const started=performance.now();const bulk=pageContentManifest(root,many);const ms=performance.now()-started;
  assert.equal(Object.keys(bulk).length,10000);assert.ok(ms<10000,'10k URL: неожиданная CPU-регрессия');
  console.log('PASS: 8 семейств, изменения исходников и переводов, RU/EN legal, допуск URL, сохранение истории/backoff, отсутствие сети/живых данных.');
  console.log('10 000 известных URL: '+ms.toFixed(0)+' мс; это локальный benchmark CLI, не LCP.');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
