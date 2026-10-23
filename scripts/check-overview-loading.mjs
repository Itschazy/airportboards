// Реальный OverviewMetrics: не запрашивает скрытый блок и не принимает ответ
// другого аэропорта после перехода. Управляем только hooks, видимостью и сетью.
import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
let slots=[],cursor=0,effects=[],tree,calls=[],observers=[];
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>x===b[i]);
const hooks={useState(v){const i=cursor++;slots[i]??={value:v};return[slots[i].value,x=>slots[i].value=x];},useRef(v){const i=cursor++;slots[i]??={current:v};return slots[i];},useEffect(f,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>slots[i].cleanup=f());}}};
const jsx=(type,props)=>({type,props});
const context={exports:{},AbortController,fetch:(url,options)=>new Promise((resolve,reject)=>calls.push({url,options,resolve:data=>resolve({ok:true,json:async()=>data}),reject})),IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.stopped=true;}},require:n=>n==='react'?hooks:n==='react/jsx-runtime'?{jsx,jsxs:jsx}:{} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/AirportExtras.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
let iata='AYT';function render(){cursor=0;tree=context.exports.OverviewMetrics({iata,depLabel:'Вылеты',arrLabel:'Прилёты'});if(tree?.props.ref)tree.props.ref.current={};for(const e of effects.splice(0))e();}
let fails=0;const check=(ok,msg)=>{console.log((ok?'PASS ':'FAIL ')+msg);if(!ok)fails++;};
render();check(calls.length===0,'нет запроса счётчиков скрытой справки при первой загрузке');
if(!observers.length){console.log('FAIL нет наблюдателя видимости');process.exit(1);}
observers.at(-1).fn([{isIntersecting:false}]);check(calls.length===0,'невидимый блок не запрашивается');
observers.at(-1).fn([{isIntersecting:true}]);observers.at(-1).fn([{isIntersecting:true}]);check(calls.length===1,'видимый блок запускает только один запрос');const old=calls[0];
iata='UFA';render();check(old.options.signal.aborted,'смена аэропорта отменяет старый запрос');observers.at(-1).fn([{isIntersecting:true}]);const fresh=calls.at(-1);fresh.resolve({UFA:{dep:42,arr:24}});await new Promise(setImmediate);render();const expected=JSON.stringify(tree);check(expected.includes('42'),'новый аэропорт получает свои счётчики');
old.resolve({AYT:{dep:999,arr:999}});await new Promise(setImmediate);render();check(!JSON.stringify(tree).includes('999'),'поздний ответ старого аэропорта не заменяет новые числа');
for(const s of slots)s?.cleanup?.();slots=[];effects=[];calls=[];delete context.IntersectionObserver;render();check(calls.length===1,'старый браузер без observer сохраняет загрузку счётчиков');calls[0].reject(new Error('offline'));await new Promise(setImmediate);render();check(!JSON.stringify(tree).includes('NaN'),'offline не ломает страницу');
process.exitCode=fails?1:0;
