// Исполняет настоящий inline script и handoff, а не копию очереди. Проверяет
// потерю/двойное выполнение раннего клика и отмену устаревшего намерения.
// Браузерный сценарий с задержанными Next chunks проверяется отдельно.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
const source=fs.readFileSync('lib/board-intent.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
function setup() {
 const listeners=new Map(),windowListeners=new Map();let now=1000;
 const target=list=>({addEventListener(n,f){list.set(n,f);},removeEventListener(n,f){if(list.get(n)===f)list.delete(n);}});
 const board={isConnected:true,attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v);},hasAttribute(k){return this.attrs.has(k);}};
 const context={exports:{},window:target(windowListeners),document:target(listeners),location:{pathname:'/ru/airport/AYT',search:''},Date:{now:()=>now}};
 vm.runInNewContext(compiled,context);vm.runInNewContext(context.exports.boardIntentBootstrap,context);
 const row=key=>({closest:s=>s==='[data-board-flight]'?{closest:()=>board,getAttribute:()=>key,focus:options=>{assert.equal(options.preventScroll,true);context.focusedKey=key;}}:null});
 const dispatch=(type,key='SU112',keyboard)=>{let prevented=false,stopped=false;const event={type,key:keyboard,target:key===null?{closest:()=>null}:row(key),preventDefault(){prevented=true;},stopPropagation(){stopped=true;}};listeners.get(type)?.(event);return {prevented,stopped};};
 return {context,board,listeners,windowListeners,dispatch,claim:()=>context.exports.claimBoardIntent(board),advance:n=>now+=n};
}
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
check('один ранний click передаётся один раз, без React replay',()=>{
 const s=setup();assert.deepEqual(s.dispatch('click'),{prevented:true,stopped:true});assert.equal(s.context.focusedKey,'SU112');assert.equal(s.claim().key,'SU112');assert.equal(s.claim(),null);assert.equal(s.listeners.size,0);assert.equal(s.windowListeners.size,0);assert.equal(s.context.window.__abBoardIntent,undefined);assert.ok(s.board.hasAttribute('data-board-ready'));
 assert.deepEqual(s.dispatch('click'),{prevented:false,stopped:false});
});
check('повторные ранние нажатия сохраняют только последнюю строку',()=>{const s=setup();s.dispatch('click','SU112');s.dispatch('click','U6113');assert.equal(s.claim().key,'U6113');});
for(const key of ['Enter',' '])check('клавиатура '+JSON.stringify(key),()=>{const s=setup();assert.deepEqual(s.dispatch('keydown','SU112',key),{prevented:true,stopped:true});assert.equal(s.claim().keyboard,true);});
for(const key of ['Escape','Tab','a'])check('другая клавиша отменяет выбор: '+key,()=>{const s=setup();s.dispatch('click');s.dispatch('keydown',null,key);assert.equal(s.claim(),null);});
check('другой клик отменяет отложенную карточку',()=>{const s=setup();s.dispatch('click');s.dispatch('click',null);assert.equal(s.claim(),null);});
check('уход со страницы отменяет выбор',()=>{const s=setup();s.dispatch('click');s.windowListeners.get('pagehide')();assert.equal(s.claim(),null);});
for(const part of ['pathname','search'])check('смена URL '+part+' не открывает чужую карточку',()=>{const s=setup();s.dispatch('click');s.context.location[part]+='changed';assert.equal(s.claim(),null);});
check('заменённый DOM-узел не получает старое намерение',()=>{const s=setup();s.dispatch('click');assert.equal(s.context.exports.claimBoardIntent({...s.board}),null);});
check('отсоединённое табло не открывает карточку',()=>{const s=setup();s.dispatch('click');s.board.isConnected=false;assert.equal(s.claim(),null);});
check('через минуту намерение протухает',()=>{const s=setup();s.dispatch('click');s.advance(60001);assert.equal(s.claim(),null);});
check('готовое табло не перехватывается, даже до снятия обработчика',()=>{const s=setup();s.board.setAttribute('data-board-ready','');assert.deepEqual(s.dispatch('click'),{prevented:false,stopped:false});assert.equal(s.claim(),null);});
check('один script не устанавливает второй комплект обработчиков',()=>{const s=setup();const capture=s.listeners.get('click');vm.runInNewContext(s.context.exports.boardIntentBootstrap,s.context);assert.equal(s.listeners.get('click'),capture);});
check('ключ различает повтор номера в соседний день',()=>{const s=setup(),key=s.context.exports.boardFlightKey;assert.notEqual(key({flight:'SU112',ts:1,scheduled:'12:00'}),key({flight:'SU112',ts:86401,scheduled:'12:00'}));assert.equal(key({flight:'SU112',scheduled:'12:00'}),'["SU112",null,"12:00"]');});
const s=setup();console.log(`${count} scenarios; bootstrap ${Buffer.byteLength(s.context.exports.boardIntentBootstrap)} B / ${gzipSync(s.context.exports.boardIntentBootstrap).length} B gzip`);
