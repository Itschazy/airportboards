// Совместим с ежедневным вызовом на сервере: discovery + до 100 URL из очереди.
// --worker: только изменения контента и оставшаяся очередь, без чтения sitemap.
// --dry: полностью локальный просмотр, без сети и записи. На Mac отправка запрещена.
// Почему отдельный worker: Bing 29.10 отметил IndexNow is in batch mode. Дневной
// массовый набор заменён устойчивой очередью; расписание установки — в ops/bing-growth-20261029.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {readState,writeState,contentManifest,reconcile,drain,locales,validPath,discoverPaths,assertPublished,readyEntries} from './indexnow-queue.mjs';
const dry=process.argv.includes('--dry');
const worker=process.argv.includes('--worker')||process.argv.includes('--no-fresh');
const file=path.join(os.homedir(),'airportsboard-data','seo','indexnow-v2.json');
if(!dry) {
  if(process.platform!=='linux'||process.cwd()!=='/var/www/airportsboard') throw new Error('Отправка только с production-сервера; локально используйте --dry');
  // Оба запуска (daily и worker) и сборка разделяют один flock вне git clean.
  if(!process.argv.includes('--locked')) {
    const result=spawnSync('flock',['-n','-E','75','/var/tmp/airportsboard-build-cache.lock',process.execPath,...process.argv.slice(1),'--locked'],{stdio:'inherit'});
    if(result.status===75) console.log('IndexNow: сборка/другой запуск занят; очередь остаётся до следующего тика');
    process.exit(result.status===75?0:result.status??1);
  }
  // git reset происходит ДО build: исходники уже новые, приложение ещё старое.
  // Используем запечённый SHA процесса, а не HEAD API, чтобы не объявлять черновик опубликованным.
  const sha=execFileSync('git',['rev-parse','--short=12','HEAD'],{encoding:'utf8'}).trim();
  const config=JSON.parse(fs.readFileSync('.next/required-server-files.json','utf8'));
  const response=await fetch('http://127.0.0.1:3000/api/health',{headers:{'user-agent':'audit-bot'},signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error('IndexNow: health недоступен');
  assertPublished(sha,config.config?.env?.NEXT_PUBLIC_RUM_RELEASE,(await response.json()).release);
}
const state=readState(file);
if(!worker&&!dry) {
  try {
    const discovered=await discoverPaths();
    // sitemap использует en + hreflang: уведомление каждого канонического перевода.
    const expanded=discovered.flatMap(p=>p.startsWith('/en')?locales.map(l=>p.replace(/^\/en(?=\/|$)/,'/'+l)):[p]);
    state.catalogue=[...new Set([...state.catalogue,...expanded.filter(validPath)])];
  } catch(e) { console.log('IndexNow: sitemap недоступна; сохранённая очередь продолжается:',e.message); }
}
reconcile(state,contentManifest(process.cwd(),state.catalogue));
if(dry) { console.log(JSON.stringify({dry:true,pending:Object.keys(state.pending).length,first:readyEntries(state).slice(0,20).map(([p])=>p)},null,2));process.exit(0); }
writeState(file,state);
// Публичный ключ владения не выводим. Состояние старой версии не перезаписываем:
// её sent мог быть ложным при частичной ошибке; первый v2-проход идёт постепенно.
const keyFile=fs.readdirSync('public').find(f=>/^[0-9a-f]{32}\.txt$/.test(f));
if(!keyFile) throw new Error('IndexNow: ключ не найден');
const key=keyFile.slice(0,-4);
const result=await drain(state,{key,persist:s=>writeState(file,s)});
console.log('IndexNow:',JSON.stringify(result));
if(result.failed) process.exitCode=1;
