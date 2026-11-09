// Офлайн-аудит реальных generateMetadata: все аэропорты × 12 локалей × 3 страницы.
// Только хранилище заменено синтетическим свежим снимком, UI-модули не рендерятся.
// Это НЕ HTTP-обход и НЕ доказательство текущей индексации или реальных рейсов.
// Длина title/description — диагностический сигнал, не универсальный SEO-запрет.
// Usage: node scripts/audit-airport-metadata.mjs /absolute/report.json
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createTranslator} from 'next-intl';
const require=createRequire(path.resolve('package.json')), cache=new Map(), translations=new Map();
if (!process.argv[2]) throw Error('Укажите путь JSON отчёта');
let mode='fresh';
const flights={getBoard:async()=>mode==='empty'?[]:[{flight_iata:'TEST1'}],getBoardFetchedAt:()=>mode==='empty'?null:Date.now()-(mode==='stale'?86400000:1000)};
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 const exports={};cache.set(file,exports);
 const ctx={exports,process,Buffer,console,Date,URL,Intl,setTimeout,clearTimeout,fetch:()=>{throw Error('Network forbidden in offline metadata audit')}};
 ctx.require=n=>{
  if(n==='next-intl/server')return {setRequestLocale(){},getTranslations:async({locale,namespace})=>{const key=locale+'/'+namespace;if(!translations.has(key))translations.set(key,createTranslator({locale,namespace,messages:JSON.parse(fs.readFileSync('messages/'+locale+'.json','utf8')),onError:e=>{throw e}}));return translations.get(key)}};
  if(n==='next/navigation')return {notFound(){throw Error('notFound')},permanentRedirect(){throw Error('redirect')}};
  if(n==='@/lib/flights')return flights;
  if(n==='@/lib/live-board'||n.startsWith('@/components/')||n==='next/link')return {};
  if(!n.startsWith('@/')&&!n.startsWith('.'))return require(n);
  const p=n.startsWith('@/')?path.resolve(n.slice(2)):path.resolve(path.dirname(file),n);
  return load([p,p+'.ts',p+'.tsx',p+'.json'].find(x=>fs.existsSync(x)&&fs.statSync(x).isFile())??p);
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx,{filename:file});return exports;
}
const {getAllIataCodes,getAirport}=load('lib/airports.ts');
const {advertisedInSitemap,serviceLevel,tierOf}=load('lib/warm.ts');
const pageKinds=['','arrivals','departures'];
const pages=Object.fromEntries(pageKinds.map(k=>[k,load('app/[locale]/airport/[iata]/'+(k?k+'/':'')+'page.tsx')]));
const locales=fs.readdirSync('messages').filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5));
const report={at:new Date().toISOString(),scope:'Actual generateMetadata functions, all catalogue airports x 12 locales x 3 views; synthetic fresh nonempty store. Offline, not production crawl.',counts:{},longTitles:[],errors:[],descriptionLengths:{},scopeDecisions:{}};
for(const iata of ['BHO','PLN','ELQ','HRE'])report.scopeDecisions[iata]={level:serviceLevel(iata),tier:tierOf(serviceLevel(iata)),advertised:advertisedInSitemap(iata)};
for(const locale of locales){
 let checked=0;const long=[],lengths=[];
 for(const iata of getAllIataCodes())for(const kind of pageKinds){
  const url=`/${locale}/airport/${iata}${kind?'/'+kind:''}`;
  try{
   const m=await pages[kind].generateMetadata({params:Promise.resolve({locale,iata})});checked++;
   if(typeof m.title!=='string'||!m.title.trim()||typeof m.description!=='string'||!m.description.trim())report.errors.push({url,error:'missing title/description'});
   if(/\{(?:airport|iata|city|country)\}/.test(m.title+' '+m.description)||/^(meta|home)\./.test(m.title)||/^(meta|home)\./.test(m.description))report.errors.push({url,error:'unexpanded translation'});
   if (!m.title.includes(iata)) report.errors.push({url,error:'missing airport identity'});
   const expectedCanonical=`https://airportsboard.live/${locale}/airport/${iata}${kind==='arrivals'?'/arrivals':''}`;
   if(m.alternates?.canonical!==expectedCanonical)report.errors.push({url,error:'wrong canonical'});
   if(m.title.length>70)long.push({url,title:m.title,length:m.title.length,advertised:advertisedInSitemap(iata),index:m.robots?.index});
   lengths.push(m.description.length);
  }catch(e){report.errors.push({url,error:String(e)})}
 }
 report.counts[locale]={checked,longTitles:long.length,advertisedLongTitles:long.filter(x=>x.advertised&&x.index!==false).length};
 report.longTitles.push(...long);lengths.sort((a,b)=>a-b);report.descriptionLengths[locale]={min:lengths[0],median:lengths[Math.floor(lengths.length/2)],max:lengths.at(-1)};
 console.log(locale,JSON.stringify(report.counts[locale]));
}
report.stateChecks=[];
for(mode of ['stale','empty'])for(const locale of locales)for(const iata of ['HRE','ATH','JFK','TKQ','DME','TXL'])for(const kind of pageKinds){try{const m=await pages[kind].generateMetadata({params:Promise.resolve({locale,iata})});report.stateChecks.push({mode,url:`/${locale}/airport/${iata}/${kind}`,title:m.title,description:m.description,robots:m.robots});}catch(e){report.errors.push({mode,locale,iata,kind,error:String(e)})}}
fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});
fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2));
console.log(JSON.stringify({errors:report.errors.length,examples:report.errors.slice(0,3),scope:report.scopeDecisions}));

if(report.errors.length) process.exitCode=1;
