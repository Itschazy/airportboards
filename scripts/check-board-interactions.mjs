// Настоящий FlightBoard с управляемыми hooks/ответами сети. Проверяет работу,
// которую не видно в HTTP200: повторный расчёт строк при открытии карточки и
// поздний ответ старой вкладки. Не подменяет браузерный тест касаний/вёрстки.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source = fs.readFileSync(process.argv[2] || 'components/FlightBoard.tsx', 'utf8');
const compile = s => ts.transpileModule(s, {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
let slots=[], cursor=0, effects=[], dirty=false, tree, formatters=0;
const depsEqual=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
const hooks={
  useState(init){const i=cursor++; slots[i]??={value:typeof init==='function'?init():init};return [slots[i].value,v=>{const n=typeof v==='function'?v(slots[i].value):v;if(!Object.is(n,slots[i].value)){slots[i].value=n;dirty=true;}}];},
  useRef(v){const i=cursor++;slots[i]??={current:v};return slots[i];},
  useCallback(fn,deps){const i=cursor++;if(!depsEqual(slots[i]?.deps,deps))slots[i]={fn,deps};return slots[i].fn;},
  useMemo(fn,deps){const i=cursor++;if(!depsEqual(slots[i]?.deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},
  useEffect(fn,deps){const i=cursor++;if(!depsEqual(slots[i]?.deps,deps)){const prev=slots[i];slots[i]={deps};effects.push(()=>{prev?.cleanup?.();slots[i].cleanup=fn();});}},
};
const translations=new Map();const calls=[], timers=new Map();let timerId=0;
const events={document:new Map(),window:new Map()};
const eventTarget=scope=>({addEventListener(name,fn){if(!events[scope].has(name))events[scope].set(name,new Set());events[scope].get(name).add(fn);},removeEventListener(name,fn){events[scope].get(name)?.delete(fn);}});
const fire=(scope,name)=>{for(const fn of [...(events[scope].get(name)||[])])fn();};
const intl=Object.create(Intl);intl.NumberFormat=new Proxy(Intl.NumberFormat,{construct(target,args){formatters++;return Reflect.construct(target,args);}});
const load=name=>{const m={exports:{}};vm.runInNewContext(compile(fs.readFileSync('lib/'+name+'.ts','utf8')),m);return m.exports;};
const context={exports:{},Intl:intl,Date,AbortController,
 require(name){
  if(name==='react')return hooks;
  if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'};
  // Иконка не участвует в сценариях табло; появился отдельный импорт в main.
  if(name==='@/components/DisclosureArrow')return {DisclosureArrow:'svg'};
  if(name==='next/link')return {default:'a'};
  if(name==='next-intl')return {useTranslations:namespace=>{if(!translations.has(namespace))translations.set(namespace,(key,values)=>key+ (values?' '+JSON.stringify(values):''));return translations.get(namespace);}};
  if(name==='@/lib/track')return {track(){},GOALS:{}};
  if(name.startsWith('@/lib/'))return load(name.slice(6));
  throw Error(name);
 },
 setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),
 setInterval(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearInterval:id=>timers.delete(id),
 navigator:{},document:{title:'SEO title',hidden:false,...eventTarget('document')},window:eventTarget('window'),location:{search:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 fetch(url,options){return new Promise((resolve,reject)=>calls.push({url,options,resolve:data=>resolve({ok:true,json:async()=>data}),reject}));}
};
vm.runInNewContext(compile(source+"\nexport { fmtDur };"),context);
const now=Date.now();
const flight=(id,status='delayed')=>({flight:id,airline:'Ural Airlines',destination:'Москва (SVO)',origin:'Москва (SVO)',scheduled:'12:00',status,delay:20,ts:Math.round(now/1000)+3600});
const props={airport:{iata:'AYT',name:'Antalya',city:'Antalya',country:'Turkey',iso2:'TR',tz:'Europe/Istanbul'},locale:'ru',initialFetchedAt:now,initialFlights:Array.from({length:30},(_,i)=>flight('DEP'+i))};
function render(){let n=0;do{assert.ok(n++<20,'render loop');dirty=false;cursor=0;tree=context.exports.FlightBoard(props);for(const f of effects.splice(0))f();}while(dirty);}
function nodes(node=tree){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).filter(n=>n!=null).flatMap(n=>nodes(n))];}
const rows=()=>nodes().filter(n=>n.props?.className==='frow');
const sheet=()=>nodes().find(n=>n.type?.name==='BottomSheet');
const button=key=>nodes().find(n=>(n.type==='button'||n.props.role==='button')&&[n.props.children].flat(Infinity).includes(key));
async function settle(){await new Promise(setImmediate);render();}
let failures=0;function check(ok,label){console.log((ok?'PASS ':'FAIL ')+label);if(!ok)failures++;}
render();assert.equal(rows().length,30);
// Верхняя ссылка видна краулеру и работает нативно с модификатором. Обычный
// клик ниже по-прежнему проверяется реальными гонками ответов двух направлений.
assert.equal(button('arrivals').props.href, '/ru/airport/AYT/arrivals');
assert.equal(button('departures').props.href, '/ru/airport/AYT');
const nativeCalls=calls.length;
for(const modifier of ['metaKey','ctrlKey','shiftKey','altKey']) {
  button('arrivals').props.onClick({button:0,[modifier]:true,preventDefault(){throw Error('modified link intercepted');}});
}
assert.equal(calls.length,nativeCalls,'modified link must not start a background board request');
let spaceClicked=false, spacePrevented=false;
button('arrivals').props.onKeyDown({key:' ',preventDefault(){spacePrevented=true;},currentTarget:{click(){spaceClicked=true;}}});
assert.ok(!spaceClicked&&spacePrevented,'Space down prevents scrolling without repeat activation');
button('arrivals').props.onKeyUp({key:' ',preventDefault(){},currentTarget:{click(){spaceClicked=true;}}});
assert.ok(spaceClicked,'Space up activates the mode');

if (process.env.BOARD_BENCH) {
  const times=[];
  for(let i=0;i<100;i++){
    const row=rows()[0];const start=performance.now();row.props.onClick();render();sheet().props.onClose();render();times.push(performance.now()-start);
  }
  times.sort((a,b)=>a-b);console.log('BENCH parent render, 30 delayed rows, open+close: '+JSON.stringify({medianMs:times[50],p95Ms:times[95]}));
}
formatters=0;const before=rows();before[0].props.onClick();render();
check(sheet().props.flight.flight==='DEP0','карточка открывает выбранный рейс');
check(formatters===0,'открытие карточки не пересчитывает длительности всех строк (создано '+formatters+' форматтеров)');
check(rows()[0]===before[0],'DOM-описание строк переиспользуется при открытии карточки');
sheet().props.onClose();render();
const dep=calls.at(-1);button('arrivals').props.onClick({button:0,preventDefault(){}});render();const arr=calls.at(-1);
check(rows().every(n=>!n.props['aria-label'].includes('DEP')),'в ожидании прилётов не показаны вылеты');
arr.resolve({flights:[flight('ARR1')],fetchedAt:now});await settle();
check(rows()[0]?.props['aria-label'].includes('ARR1'),'получены прилёты');
dep.resolve({flights:[flight('LATE_DEP')],fetchedAt:now});await settle();
check(rows()[0]?.props['aria-label'].includes('ARR1'),'поздний ответ вылетов не подменяет прилёты');
// Возврат показывает свой снимок сразу, но сохраняет запрос проверки свежести.
const beforeReturn=calls.length;button('departures').props.onClick({button:0,preventDefault(){}});render();
check(rows()[0]?.props['aria-label'].includes('DEP0'),'возврат к вылетам немедленно показывает их сохранённый снимок');
check(calls.length===beforeReturn+1,'при возврате всё равно проверяется свежесть через API');
const refresh=calls.at(-1);refresh.resolve({flights:[flight('NEW_DEP','cancelled')],fetchedAt:now+1000});await settle();
check(rows().length===1&&rows()[0].props['aria-label'].includes('NEW_DEP'),'новые данные заменяют кэш и пересчитывают строки');
button('arrivals').props.onClick({button:0,preventDefault(){}});render();const failed=calls.at(-1);
check(rows()[0]?.props['aria-label'].includes('ARR1'),'возврат к прилётам не ждёт сети');
failed.reject(new Error('offline'));await settle();
check(rows()[0]?.props['aria-label'].includes('ARR1'),'ошибка сети сохраняет снимок правильного направления');
const b=rows()[0];nodes().find(n=>n.type==='button'&&n.props['aria-label']==='search_placeholder').props.onClick();render();
check(rows()[0]===b,'раскрытие поиска не перестраивает строки');
const input=nodes().find(n=>n.type==='input');input.props.onChange({target:{value:'missing'}});render();
check(rows().length===0,'поиск по рейсам всё ещё пересчитывает список');
input.props.onChange({target:{value:'ARR'}});render();
check(rows().length===1,'очистка/уточнение поиска возвращает актуальную строку');
// FAQ обещает номер с пробелом или без: проверяем настоящий компонент,
// включая регистр и дефис, а не отдельную копию функции нормализации.
for (const query of ['ARR1', 'arr 1', 'AR-R1']) {
 input.props.onChange({target:{value:query}});render();
 check(rows().length===1&&rows()[0].props['aria-label'].includes('ARR1'),'номер рейса: '+query);
}
// На экране имя локализовано, поиск обязан находить именно видимую строку,
// сохраняя возможность вводить исходное международное название перевозчика.
for (const query of ['Уральские', 'Ural Airlines']) {
 input.props.onChange({target:{value:query}});render();
 check(rows().length===1, 'поиск по названию авиакомпании: '+query);
}
input.props.onChange({target:{value:''}});render();
for(const locale of load('i18n').locales){
 for(const mins of [0,1,21,60,61,125]){
  const l=load('i18n').numLocale(locale);const fmt=(n,unit)=>new Intl.NumberFormat(l,{style:'unit',unit,unitDisplay:'short'}).format(n);
  const h=Math.floor(mins/60),m=mins%60;const expected=h?[fmt(h,'hour'),...(m?[fmt(m,'minute')]:[])].join(' '):fmt(m,'minute');
  assert.equal(context.exports.fmtDur(mins,locale),expected,locale+' duration '+mins);
 }
}
check(true,'длительности идентичны прежнему Intl на 12 языках');
// Новый компонент без ранее загруженных прилётов: ошибка не должна утверждать,
// будто рейсов нет, и не должна оставлять вечное «Обновляем…».
for(const s of slots)s?.cleanup?.();slots=[];effects=[];dirty=false;calls.length=0;
render();button('arrivals').props.onClick({button:0,preventDefault(){}});render();calls.at(-1).reject(new Error('offline'));await settle();
const text=JSON.stringify(tree);
check(text.includes('board_pending')&&!text.includes('no_flights'),'пустой offline-ответ объясняет недоступность данных, а не отсутствие рейсов');
check(!text.includes('updating_now'),'ошибка сети завершает подпись «Обновляем…»');
for(const s of slots)s?.cleanup?.();
slots=[];effects=[];dirty=false;calls.length=0;context.document.title='AYT SEO';
render();fire('window','pointerdown');context.document.hidden=true;fire('document','visibilitychange');
check(context.document.title.includes('DEP0'),'после действия человека фоновая вкладка показывает рейс');
context.document.hidden=false;fire('document','visibilitychange');await settle();
check(context.document.title==='AYT SEO','возврат во вкладку восстанавливает её SEO-заголовок');
context.document.title='CEK SEO';for(const s of slots)s?.cleanup?.();
check(context.document.title==='CEK SEO','очистка старого табло не перезаписывает SEO-заголовок новой страницы');
process.exitCode=failures?1:0;
