// Регрессии 29.10: unknown исчезал из каталога; дата маршрута бралась от другого
// store-key. Проверяем выполняемый код со снимками разного возраста и реальный SSR,
// а не наличие слов в исходнике. По умолчанию только localhost, никогда платные API.
// Usage: node scripts/check-sitewide-answers.mjs [http://localhost:3128]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const base = process.argv[2] || 'http://localhost:3128';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname), 'тест синтетических снимков — только локально');
const compile = source => ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const i18n = {exports:{}};
vm.runInNewContext(compile(fs.readFileSync('lib/i18n.ts','utf8')), i18n);
const factsModule = {exports:{}, require: id => {assert.equal(id,'@/lib/i18n');return i18n.exports;}};
vm.runInNewContext(compile(fs.readFileSync('lib/route-facts.ts','utf8')), factsModule);
const locales = i18n.exports.locales;
const source = fs.readFileSync('lib/flights.ts','utf8');
const ast = ts.createSourceFile('flights.ts',source,ts.ScriptTarget.Latest,true);
const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'getRouteStats');
assert(declaration);
const now = Date.now();
const pairKey = 'departures:dep_iata=SVO&arr_iata=LED';
const boardKey = 'departures:dep_iata=SVO';
const row = duration => ({dep_iata:'SVO',arr_iata:'LED',dep_time_ts:100000,arr_time_ts:100000+duration*60});
for (const test of [
 {name:'парный снимок вчера, полный борт новее', pair:[row(80),row(120),row(90)],board:[row(160)],stamp:now-86400000,wantDuration:90,wantCount:3,key:pairKey},
 {name:'чётная медиана 60 и 120 равна 90',pair:[row(60),row(120)],board:[],stamp:now-1,wantDuration:90,wantCount:2,key:pairKey},
 {name:'одна отметка не длительность',pair:[{dep_iata:'SVO',arr_iata:'LED',arr_time_ts:5400}],board:[],stamp:now-1,wantDuration:null,wantCount:1,key:pairKey},
 {name:'fallback полного борта и фильтр направления',pair:[],board:[row(75),{...row(60),arr_iata:'AYT'}],stamp:now-3600000,wantDuration:75,wantCount:1,key:boardKey},
 {name:'пустой набор без даты',pair:[],board:[],stamp:null,wantDuration:null,wantCount:0,key:null},
 {name:'непригодная длительность не выдумывается',pair:[row(1),row(1500)],board:[],stamp:now-1,wantDuration:null,wantCount:2,key:pairKey},
 {name:'отсутствующая дата',pair:[row(90)],board:[],stamp:null,wantDuration:90,wantCount:1,key:pairKey},
 {name:'будущая дата отвергается',pair:[row(90)],board:[],stamp:now+86400000,wantDuration:90,wantCount:1,key:pairKey},
]) {
 const calls=[];let used=null;const context={exports:{},fetchRaw:async(query,direction,opts)=>{assert.equal(opts.live,false);calls.push(query);return query.includes('&')?test.pair:test.board;},getStaleTs:key=>{used=key;return test.stamp;},Date};
 vm.runInNewContext(compile(declaration.getText(ast)),context);
 const result = await context.exports.getRouteStats('svo','led');
 assert.equal(result.count,test.wantCount,test.name);assert.equal(result.durationMin,test.wantDuration,test.name);
 assert.equal(result.fetchedAtMs,test.stamp>0&&test.stamp<=now?test.stamp:null,test.name);assert.equal(used,test.key,test.name);
 assert.equal(calls.length,test.pair.length?1:2);console.log('✓ '+test.name);
}
// Частичный ответ поставщика: дата берётся только от тех часов, которые выводит row.
const routeDecl = ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='getRoute');
for (const test of [
 {name:'плановые часы с чужим estimated_ts', actual:false, dep_time_ts:1793317800,dep_estimated_ts:1793404200,want:1793317800},
 {name:'ожидаемые часы и их дата',actual:true,dep_time_ts:1793317800,dep_estimated_ts:1793404200,want:1793404200},
 {name:'ожидаемые часы без даты не получают плановую дату',actual:true,dep_time_ts:1793317800,want:null},
 {name:'нет плановой отметки — не подставлять estimated_ts',actual:false,dep_estimated_ts:1793404200,want:null},
 {name:'непригодная Date не ломает SSR',actual:true,dep_estimated_ts:1e20,want:null},
]) {
 const raw={dep_iata:'SVO',arr_iata:'LED',...test};
 const context={exports:{},Date,fetchRaw:async()=>[raw],mapFlight:()=>({scheduled:'23:50',...(test.actual?{actual:'00:25'}:{})})};
 vm.runInNewContext(compile(routeDecl.getText(ast)),context);
 const rows=await context.exports.getRoute('SVO','LED','ru');assert.equal(rows[0].departureDateTs,test.want,test.name);console.log('✓ '+test.name);
}
let requests=0;
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|&#160;/g,' ');
async function read(path){requests++;const r=await fetch(base+path,{headers:{'user-agent':'audit-bot'}});assert.equal(r.status,200,path);return await r.text();}
const textOf = h => decode(h.replace(/<!--[\s\S]*?-->/g,'').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
const meta = (h,name) => decode(h.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] || '');
const links = (h,locale) => [...h.replace(/<script[\s\S]*?<\/script>/gi,'').matchAll(new RegExp(`href="(/${locale}/airport/[A-Z0-9]{3})"`,'g'))].map(x=>x[1]);
function schemas(h){return [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const d=JSON.parse(m[1]);return d['@graph']||[d];});}
const keys = d => Object.entries(d).flatMap(([k,v]) => v && typeof v === 'object' && !Array.isArray(v) ? keys(v).map(x=>k+'.'+x) : [k]).sort();
const baseline=keys(JSON.parse(fs.readFileSync('messages/en.json')));
for(const locale of locales){
 const m=JSON.parse(fs.readFileSync(`messages/${locale}.json`));assert.deepEqual(keys(m),baseline,locale+' keys');
 const items=factsModule.exports.routeFacts({locale,fromCity:'City A',toCity:'City B',fromIata:'SVO',toIata:'LED',durationMin:90,km:635,airlines:['Test'],airlineList:'Test'});
 assert.equal(items.length,3);for(const item of items){assert(item.a.includes('SVO')&&item.a.includes('LED'));assert(!/\{\w+\}/.test(item.a));if(locale==='ar')assert(!/[٠-٩۰-۹]/.test(item.a));}
 assert.equal(factsModule.exports.routeFacts({locale,fromCity:'A',toCity:'B',fromIata:'SVO',toIata:'LED',durationMin:null,km:null,airlines:[],airlineList:''}).length,0);
 const route=await read(`/${locale}/route/SVO-LED`);const ld=schemas(route);const faq=ld.find(x=>x['@type']==='FAQPage');assert(faq);const text=textOf(route);
 for(const q of faq.mainEntity){assert(text.includes(q.acceptedAnswer.text.replace(/\s+/g,' ')));assert(q.acceptedAnswer.text.includes('SVO')&&q.acceptedAnswer.text.includes('LED'));}
 const modified=ld.find(x=>x['@type']==='WebPage').dateModified;assert(modified);assert.equal(route.match(/<time dateTime="([^"]*)"/)?.[1],modified);
 assert(!/сегодня|today|heute|今日|本日|오늘|du jour|di oggi|de hoy|bugünkü|اليوم|आज/i.test(decode(route.match(/<title>(.*?)<\/title>/)?.[1]||'')),locale+' neutral title');
 assert(text.includes(m.home.route_departure_time.replace('{iata1}','SVO')));
 const rowDates=[...route.matchAll(/<li\b[^>]*>((?:(?!<\/li>)[\s\S])*?)<\/li>/g)].map(m=>m[1].match(/<time dateTime="([^"]+)"[^>]*>([^<]+)<\/time>/)).filter(Boolean);
 assert(rowDates.length>0,locale+' дата отдельного вылета');
 for(const [,iso,label] of rowDates){const date=new Date(iso);assert(Number.isFinite(date.getTime()));const expected=new Intl.DateTimeFormat(i18n.exports.numLocale(locale),{timeZone:'Europe/Moscow',day:'numeric',month:'short',year:'numeric'}).format(date);assert.equal(decode(label),expected,locale+' дата в поясе SVO');}
 const country=await read(`/${locale}/airports/united-kingdom`);const list=schemas(country).find(x=>x['@type']==='ItemList');assert(list);
 const visible=links(country,locale);
 assert.equal(new Set(visible).size,list.numberOfItems,locale+' full visible country list');assert.deepEqual(visible,list.itemListElement.map(x=>new URL(x.url||x.item).pathname),locale+' order');
 assert(textOf(country).includes(m.home.grid_unknown));
 const city=await read(`/${locale}/city/london`);assert(textOf(city).includes('IATA'),locale+' точный код аэропорта в каталоге города');
 const widgets=await read(`/${locale}/widgets`);assert(textOf(widgets).includes(m.home.widgets_intro));
 const event=await read(`/${locale}/event/f1-singapore`);
 const eventText=textOf(event);const eventData=JSON.parse(fs.readFileSync('data/events/f1-singapore.json'));
 for(const airport of eventData.meta.airports){const unit=new Intl.NumberFormat(i18n.exports.numLocale(locale),{style:'unit',unit:'kilometer',unitDisplay:'short'}).format(airport.km);assert(eventText.includes(`≈${unit} · ${eventData.meta.venue}`.replace(/\s+/g,' ')),locale+' расстояние события и единица');}
 assert(eventText.includes(m.event.past_title),locale+' архивное предупреждение');

 console.log(`✓ ${locale}: ключи, факты, SSR FAQ/дата, полный каталог, виджеты`);
}
for(const country of ['norway','canada','russia']){const $=await read('/ru/airports/'+country);const list=schemas($).find(x=>x['@type']==='ItemList');const visible=links($,'ru');assert.equal(new Set(visible).size,list.numberOfItems);assert.deepEqual(visible,list.itemListElement.map(x=>new URL(x.url||x.item).pathname));console.log('✓ каталог '+country);}
for(const locale of ['ru','en','de']){const $=await read(`/${locale}/about`);const text=textOf($);assert(!text.includes('{served}'));assert(!/at least daily|не реже раза в сутки/.test(text));if(locale==='de'){assert(meta($,'robots').includes('noindex'));assert($.match(/<link rel="canonical" href="([^"]*)"/)?.[1].includes('/de/about'));}console.log('✓ about '+locale+' и честный fallback');}
const empty=await read('/en/route/DME-LHR');assert(meta(empty,'robots').includes('noindex'));assert(!schemas(empty).find(x=>x['@type']==='WebPage').dateModified);assert.equal([...empty.matchAll(/<time\b/g)].length,0);
console.log(`PASS: ${requests} локальных SSR запросов + исполняемые регрессии снимков/12 переводов`);
