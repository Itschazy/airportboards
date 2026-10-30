// Очередь IndexNow, 29.10.2026. Раньше один успешный POST подтверждал ВЕСЬ набор,
// включая упавшие партии, а неизменившиеся флагманы отправлялись ежедневно.
// Теперь подтверждение принадлежит конкретным URL и версии их содержимого.
// IndexNow обменивается адресами между участниками: успешного ответа одной точки
// достаточно; вторая — fallback. 202 означает приём с проверкой ключа, не индексацию.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pageFamily,pageContentManifest} from './indexnow-page-content.mjs';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const locales = ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
export const endpoints = ['https://api.indexnow.org/indexnow','https://yandex.com/indexnow'];
export const base = 'https://airportsboard.live';
export const priorityCodes=['EDI','LBA','NCL','GLA','DMM','MAN','LHR','RUH','DUB','LGW','STN','MUC'];
// 30.10.2026: Bing-лидеры выше остаются приоритетными, но в очереди общего
// обновления 12,8 тыс. URL русские посадки из Метрики ждали наравне с каталогами.
// Основание — смартфоны из поиска 23–29.10: AYT/SSH/HRG/DME/GYD/IST и следующие
// востребованные табло; BRU/fr и LCY/en — подтверждённые показы Bing и новые справочные.
// Спрос привязан к локали: популярность HRG/ru не означает приоритет HRG на всех языках.
// Лимиты транспорта не меняются. Регрессия проверяет также уже сохранённую очередь.
const ruDemandCodes=['AYT','SSH','HRG','DME','GYD','IST','OVB','UFA','EVN','TAS','LWN','HKT','KZN','DXB'];
// Только локали, в которых Bing запросил эти canonical маршруты; discovery
// по-прежнему берёт их из sitemap, а не безусловно добавляет пустые страницы.
const demandRoutePaths=['/en/route/MEL-PER','/de/route/BER-AYT','/en/route/BRS-PMI'];
function priorityPath(p) {
  if(demandRoutePaths.includes(p))return true;
  const match=/^\/(ru|en|de|fr|es|it|tr|zh|ja|ko|ar|hi)\/airport\/([A-Z]{3})(?:\/arrivals)?$/.exec(p);
  if(!match) return false;
  const [,locale,code]=match;
  return priorityCodes.includes(code) || (locale==='ru' && ruDemandCodes.includes(code))
    || (locale==='fr' && code==='BRU') || (locale==='en' && code==='LCY');
}
export function validPath(p) {
  return typeof p === 'string' && /^\/(ru|en|de|fr|es|it|tr|zh|ja|ko|ar|hi)(?:\/[a-zA-Z0-9-]+)*$/.test(p)
    && !p.endsWith('/departures'); // canonical родителя; индексируемые старые URL не редиректим
}
export function emptyState() { return {version:2, sent:{}, fingerprints:{}, pending:{}, catalogue:[], runs:[]}; }
export function readState(file) {
  try {
    const state=JSON.parse(fs.readFileSync(file,'utf8'));
    const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(state.version!==2 || !record(state.pending) || !record(state.fingerprints) || !record(state.sent) || !Array.isArray(state.catalogue) || !Array.isArray(state.runs)) throw new Error('Неверная схема очереди');
    if(!state.catalogue.every(validPath)) throw new Error('Повреждён каталог очереди');
    for(const [p,item] of Object.entries(state.pending)) {
      if(!validPath(p)||typeof item?.fingerprint!=='string'||!Number.isFinite(item.queuedAt)||!Number.isFinite(item.nextAt)||!Number.isInteger(item.attempts)||item.attempts<0||(item.priority!==undefined&&![0,1,2].includes(item.priority))) throw new Error('Повреждена запись очереди');
    }
    return state;
  } catch(e) { if(e.code==='ENOENT') return emptyState(); throw e; }
}
export function writeState(file,state) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp=file+'.tmp';
  const fd=fs.openSync(tmp,'w',0o600);
  try { fs.writeFileSync(fd,JSON.stringify(state)); fs.fsyncSync(fd); } finally {fs.closeSync(fd);}
  fs.renameSync(tmp,file);
}
export function reconcile(state, manifest, now=Date.now()) {
  // Старый daily раскрывал /en/about на 12 языков, включая 10 постоянных
  // noindex fallback. Исключаем лишь производную pending-работу неподдерживаемых
  // семейств; sent/fingerprints/runs остаются как история, документы не удаляем.
  // Исчезновение из сегодняшней sitemap само по себе ничего здесь не удаляет.
  for(const p of Object.keys(state.pending)) {
    if(!pageFamily(p)) { delete state.pending[p]; continue; }
    // Приоритет — производная политика, а не новая редакция документа. Повышаем
    // существующую запись даже при той же fingerprint; queuedAt/attempts/nextAt
    // сохраняем, иначе обходили бы backoff или омолаживали старую работу.
    if(priorityPath(p)) state.pending[p].priority=0;
  }
  for(const [p,fingerprint] of Object.entries(manifest)) {
    if(!validPath(p)) throw new Error('Недопустимый путь: '+p);
    if(!pageFamily(p))continue;
    if(state.fingerprints[p]===fingerprint) continue;
    // Новый содержательный апдейт не должен ждать за тысячами URL первого discovery.
    const priority=priorityPath(p)?0:state.fingerprints[p]?1:2;
    state.pending[p]={fingerprint, queuedAt:now, attempts:0, nextAt:now, priority};
    state.fingerprints[p]=fingerprint;
  }
  // Удаление URL отражается только полным discovery, не частичным обходом данных.
  // Снятие со sitemap само по себе НЕ удаление: URL может оставаться index/follow.
}
// Fail closed между git reset, swap-build и pm2 restart: проверяем именно
// SHA запущенной сборки, а не только наличие новых JSON на диске.
export function assertPublished(sha, built, running) {
  if(!/^[0-9a-f]{12}$/.test(sha)||built!==sha||running!==sha) throw new Error('IndexNow: новая версия ещё не опубликована целиком');
}
export function readyEntries(state,now=Date.now()) { return Object.entries(state.pending).filter(([p,v])=>pageFamily(p)&&v.nextAt<=now).sort((a,b)=>(a[1].priority??2)-(b[1].priority??2)||a[1].queuedAt-b[1].queuedAt); }
export async function drain(state, {key, persist, fetcher=fetch, now=Date.now(), limit=100, batchSize=50}={}) {
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(batchSize)||batchSize<1||batchSize>50) throw new Error('Лимит очереди');
  const due=readyEntries(state,now).slice(0,limit);
  let accepted=0, failed=0;
  for(let i=0;i<due.length;i+=batchSize) {
    const batch=due.slice(i,i+batchSize);
    let ok=false, rateLimited=false;
    for(const endpoint of endpoints) {
      try {
        const response=await fetcher(endpoint,{method:'POST', headers:{'content-type':'application/json; charset=utf-8','user-agent':'audit-bot'},
          body:JSON.stringify({host:'airportsboard.live',key,keyLocation:`${base}/${key}.txt`,urlList:batch.map(([p])=>base+p)}),signal:AbortSignal.timeout(15000),redirect:'error'});
        console.log('IndexNow:',new URL(endpoint).hostname,response.status,'URLs:',batch.length);
        if(response.status===200||response.status===202) {ok=true;break;}
        if(response.status===429) {rateLimited=true;break;} // не обходим ограничение второй точкой
      } catch { console.log('IndexNow: transport error',new URL(endpoint).hostname); }
    }
    for(const [p,item] of batch) {
      if(state.pending[p]?.fingerprint!==item.fingerprint) continue;
      if(ok) {state.sent[p]=new Date(now).toISOString();delete state.pending[p];accepted++;}
      else {item.attempts++;item.nextAt=now+Math.min(86400000,600000*2**Math.min(item.attempts-1,8));failed++;}
    }
    await persist(state); // crash после POST может повторить партию, но никогда не теряет её
    if(!ok||rateLimited) break; // сбой не превращаем в шквал запросов
  }
  state.runs=[...state.runs,{at:new Date(now).toISOString(),accepted,failed,pending:Object.keys(state.pending).length}].slice(-60);
  await persist(state);
  return {accepted,failed,pending:Object.keys(state.pending).length};
}

// Discovery ограничен официальными sitemap и общим бюджетом 30 с. Не следуем
// произвольным <loc> как ссылкам: повреждённая карта не должна вызвать платное API
// или удерживать общий build-lock бесконечно. На ошибке предыдущий каталог остаётся.
export async function discoverPaths(fetcher=fetch) {
  const total=AbortSignal.timeout(30000);
  const get=async url=> {
    const response=await fetcher(url,{headers:{'user-agent':'audit-bot'},redirect:'error',signal:AbortSignal.any([total,AbortSignal.timeout(15000)])});
    if(!response.ok) throw new Error('Sitemap HTTP '+response.status);
    return response.text();
  };
  const locs=xml=>[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  const index=await get(base+'/sitemap.xml');
  const children=locs(index);
  if(!children.length||children.length>100) throw new Error('Неожиданный sitemap index');
  const paths=[];
  for(const child of children) {
    const url=new URL(child);
    if(url.origin!==base||!/^\/sitemap-\d+\.xml$/.test(url.pathname)||url.search||url.hash) throw new Error('Недопустимая дочерняя sitemap');
    for(const loc of locs(await get(url.href))) {
      const page=new URL(loc);
      if(page.origin===base&&!page.search&&!page.hash&&validPath(page.pathname)) paths.push(page.pathname);
    }
  }
  return [...new Set(paths)];
}

// Хешируем только опубликованный контент, а не время сборки/рейса. Метки checked
// включены: подтверждённое обновление справочной тоже содержательное изменение.
export function contentManifest(root, catalogue=[]) {
  const read=f=>fs.readFileSync(path.join(root,f),'utf8');
  const airportCode=hash(['components/AirportBottom.tsx','lib/airport-title.ts','lib/airport-guide.ts','lib/airport-content.ts',
    'app/[locale]/airport/[iata]/page.tsx','app/[locale]/airport/[iata]/arrivals/page.tsx'].map(read).join('\n'));
  const guides=fs.readdirSync(path.join(root,'data/airport-guide')).filter(f=>/^[A-Z]{3}\.json$/.test(f)).sort();
  const eventCode=hash(['lib/event-content.ts','app/[locale]/event/[slug]/page.tsx','app/[locale]/events/page.tsx'].map(read).join('\n'));
  const events=fs.readdirSync(path.join(root,'data/events')).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(read('data/events/'+f)));
  const mapFiles=['app/[locale]/flight-map/page.tsx','lib/flight-map/content.ts','lib/flight-map/localization.ts'];
  const mapCode=hash(mapFiles.map(read).join('\n'));
  const result={};
  // Порядок из реального Bing 25–26.10, затем остальные. Это приоритет, не фильтр охвата.
  const codes=[...new Set([...priorityCodes,...guides.map(f=>f.slice(0,3))])];
  for(const locale of ['en','de',...locales.filter(l=>l!=='en'&&l!=='de')]) {
    const messages=JSON.parse(read(`messages/${locale}.json`));
    const text=hash(JSON.stringify([messages.home,messages.meta,messages.ui,messages.nav]));
    // Не теряем обновления событий/карты, которые раньше попадали в дневной пакет.
    // Временной статус события меняет хеш ровно один раз, а не ежедневно.
    for(const event of events) {
      if(!event.locales[locale]) continue; // не уведомляем локализованный fallback с noindex

      const end=event.meta.endDate ? Date.parse(event.meta.endDate)+2*86400000 : Date.parse(event.meta.startDate)+3*86400000;
      const status=['cancelled','postponed','past'].includes(event.meta.status)?event.meta.status:Date.now()>end?'past':'scheduled';
      result[`/${locale}/event/${event.meta.slug}`]=hash(eventCode+JSON.stringify([event.meta,event.locales[locale],status]));
    }
    result[`/${locale}/events`]=hash(eventCode+Object.entries(result).filter(([p])=>p.startsWith(`/${locale}/event/`)).map(([,h])=>h).join(''));
    result[`/${locale}/flight-map`]=hash(mapCode+read(`lib/flight-map/locales/${locale}.json`)+read(`lib/flight-map/${locale}.json`));
    for(const code of codes) {
      let guide='';
      if(guides.includes(code+'.json')) {
        guide=read(`data/airport-guide/${code}.json`);
        if(locale!=='ru') guide+=read(`data/airport-guide/${locale}/${code}.json`);
      }
      for(const suffix of ['','/arrivals']) result[`/${locale}/airport/${code}${suffix}`]=hash(airportCode+text+guide);
    }
  }
  // 30.10: постоянный 'discovered' пропускал все следующие изменения route,
  // country/city/widgets/legal/home. Новые hashes только для известных URL;
  // нет живых рейсов/времени сборки и нет расширения индексируемого пространства.
  Object.assign(result,pageContentManifest(root,catalogue.filter(validPath)));
  for(const p of catalogue.filter(validPath)) if(!result[p]&&pageFamily(p)==='airport') {
    const locale=p.split('/')[1];
    result[p]=hash(p+airportCode+read(`messages/${locale}.json`));
  }
  return result;
}
