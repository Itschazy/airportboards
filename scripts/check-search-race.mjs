// Исполняем настоящий AirportSearch с управляемыми ответами сети и минимальным
// адаптером React hooks. Это тест гонки состояния/Enter, не замена браузерному UX-тесту.
// До исправления первый assert воспроизводит AYT + Enter -> JFK.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync(process.argv[2] || 'components/AirportSearch.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
let slots=[], cursor=0, effects=[], dirty=false, tree, currentLocale='ru';
const depsEqual=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
const hooks={
  useState(init){const i=cursor++;slots[i]??={value:typeof init==='function'?init():init};return [slots[i].value,v=>{const n=typeof v==='function'?v(slots[i].value):v;if(!Object.is(n,slots[i].value)){slots[i].value=n;dirty=true;}}];},
  useRef(v){const i=cursor++;slots[i]??={current:v};return slots[i];},
  useCallback(fn,deps){const i=cursor++;if(!depsEqual(slots[i]?.deps,deps))slots[i]={fn,deps};return slots[i].fn;},
  useMemo(fn,deps){const i=cursor++;if(!depsEqual(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},
  useEffect(fn,deps){const i=cursor++;if(!depsEqual(slots[i]?.deps,deps)){const prev=slots[i];slots[i]={deps};effects.push(()=>{prev?.cleanup?.();slots[i].cleanup=fn();});}},
};
const calls=[], routes=[];
const context={exports:{},require(name){if(name==='@/lib/quick-search'){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/quick-search.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,m);return m.exports;}if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'};if(name==='next/navigation')return {useRouter:()=>({push:p=>routes.push(p),prefetch(){}})};if(name==='next-intl')return {useTranslations:()=>x=>x};if(name==='@/lib/track')return {track(){},GOALS:{}};throw Error(name);},
  setTimeout,clearTimeout,AbortController,document:{addEventListener(){},removeEventListener(){}},localStorage:{getItem(){return '[]';},setItem(){}},fetch(url,options){return new Promise((resolve,reject)=>calls.push({url,options,resolve:data=>resolve({ok:true,json:async()=>Array.isArray(data)?{airports:data}:data}),reject}));}};
vm.runInNewContext(js,context);
function render(){do{dirty=false;cursor=0;tree=context.exports.AirportSearch({locale:currentLocale,placeholder:'search'});for(const f of effects.splice(0))f();}while(dirty);}
function input(node=tree){if(!node||typeof node!=='object')return null;if(node.type==='input')return node;const children=[node.props?.children].flat(Infinity);for(const child of children){if(child==null)continue;const found=input(child);if(found)return found;}return null;}
function change(value){input().props.onChange({target:{value}});render();}
function enter(){input().props.onKeyDown({key:'Enter',nativeEvent:{isComposing:false},preventDefault(){}});render();}
async function tick(){await new Promise(r=>setTimeout(r,120));render();}
const airport=iata=>({iata,name:iata,city:iata,country:'test',iso2:'TR'});
render();await tick();calls[0].resolve({airports:[airport('JFK')],quick:[['CEK','Челябинск','Челябинск','Россия','RU']]});await tick();
input().props.onFocus();render();await tick();
change('челя');
assert.ok(input().props['aria-expanded'],'Челябинск должен появляться без сетевого ответа после загрузки компактных подсказок');
enter();assert.equal(routes.at(-1),'/ru/airport/CEK');routes.length=0;

const popular=calls.at(-1);
change('AYT');enter();assert.equal(routes.length,0,'Ранний Enter не должен выбирать старый JFK');
await tick();const ayt=calls.at(-1);ayt.resolve([airport('AYT')]);await tick();
// Даже если отменённый transport всё-таки вернул старый ответ, он не меняет AYT.
popular.resolve([airport('JFK')]);await tick();enter();assert.equal(routes.at(-1),'/ru/airport/AYT');
change('KZN');await tick();const old=calls.at(-1);change('OVB');await tick();calls.at(-1).resolve([airport('OVB')]);await tick();old.resolve([airport('KZN')]);await tick();enter();assert.equal(routes.at(-1),'/ru/airport/OVB');
change('missing');await tick();calls.at(-1).reject(new Error('offline'));await tick();const count=routes.length;enter();assert.equal(routes.length,count);
// Уточнение существующего запроса не должно снимать выпадающий список до ответа.
function findRole(role,node=tree){
  if(!node||typeof node!=='object')return null;
  if(typeof node.type==='function')return findRole(role,node.type(node.props));
  if(node.props?.role===role)return node;
  for(const child of [node.props?.children].flat(Infinity)){if(child==null)continue;const found=findRole(role,child);if(found)return found;}
  return null;
}
change('тесто');await tick();calls.at(-1).resolve([{...airport('CEK'),city:'Тестоград'}]);await tick();
assert.ok(findRole('listbox'),'Есть результат для чел');
change('тестог');
assert.ok(findRole('listbox'),'Список не должен исчезать при чел → челя до нового ответа');
assert.equal(findRole('listbox').props['aria-busy'],true,'Ожидающий список сообщает о загрузке');
assert.equal(findRole('option').props.disabled,true,'Старый результат нельзя выбрать касанием');
const beforePending=routes.length;enter();assert.equal(routes.length,beforePending,'Старый результат нельзя выбрать Enter');
await tick();calls.at(-1).resolve([{...airport('CEK'),city:'Тестоград'}]);await tick();
assert.equal(findRole('option').props.disabled,false);enter();assert.equal(routes.at(-1),'/ru/airport/CEK');
change('тесто');await tick();calls.at(-1).resolve([airport('CEK')]);await tick();
change('тестонет');await tick();calls.at(-1).resolve([]);await tick();
assert.equal(findRole('listbox'),null,'Пустой новый ответ убирает старую подсказку');
const previousCalls=calls.length;
change('AYT');enter();assert.equal(routes.at(-1),'/ru/airport/AYT','Повторный запрос выбирается без ожидания сети');
await tick();assert.equal(calls.length,previousCalls,'Повтор запроса не отправляет сетевой запрос');
// Поздний bootstrap не должен сбрасывать уже полученный поиск.
for(const s of slots)s?.cleanup?.();slots=[];effects=[];dirty=false;calls.length=0;routes.length=0;
render();await tick();const lateBootstrap=calls[0];
input().props.onFocus();render();change('AYT');await tick();calls.at(-1).resolve([airport('AYT')]);await tick();
lateBootstrap.resolve({airports:[airport('JFK')],quick:[['CEK','Челябинск','Челябинск','Россия','RU']]});await tick();
enter();assert.equal(routes.at(-1),'/ru/airport/AYT','Поздний словарь не подменяет текущий запрос');
change('челя');const beforeIME=routes.length;
input().props.onKeyDown({key:'Enter',nativeEvent:{isComposing:true},preventDefault(){}});render();
assert.equal(routes.length,beforeIME,'IME Enter не выбирает аэропорт до завершения ввода');
currentLocale='it';render();const beforeLocale=routes.length;enter();
assert.equal(routes.length,beforeLocale,'Словарь и кэш прежнего языка не выбираются в новой локали');
for(const s of slots)s?.cleanup?.();slots=[];effects=[];dirty=false;calls.length=0;routes.length=0;currentLocale='ru';
render();await tick();const delayedDictionary=calls[0];input().props.onFocus();render();change('челя');await tick();
calls.at(-1).reject(new Error('offline'));await tick();
delayedDictionary.resolve({airports:[],quick:[['CEK','Челябинск','Челябинск','Россия','RU']]});await tick();
enter();assert.equal(routes.at(-1),'/ru/airport/CEK','Поздний словарь помогает даже после ошибки полного поиска');
// Пустое поле не раскрывает список: истории в этом прогоне нет (localStorage
// отдаёт []), а популярные направления на пустом поле больше не показываем.
for(const s of slots)s?.cleanup?.();slots=[];effects=[];dirty=false;calls.length=0;routes.length=0;currentLocale='ru';
render();await tick();calls[0].resolve({airports:[airport('JFK')],quick:[['CEK','Челябинск','Челябинск','Россия','RU']]});await tick();
input().props.onFocus();render();
const options=(node=tree,found=[])=>{if(!node||typeof node!=='object')return found;if(node.props?.role==='option')found.push(node);for(const child of [node.props?.children].flat(Infinity))if(child!=null)options(child,found);return found;};
assert.equal(options().length,0,'Пустое поле без истории не показывает ни одной подсказки');
assert.equal(input().props['aria-expanded'],false,'Пустое поле не объявляет раскрытый список');
for(const s of slots)s?.cleanup?.();
// Повреждённая или устаревшая история не должна ломать настоящее поле поиска.
// Проверяем не отдельный parser, а фокус, рендер опций и выбор через Enter.
for (const stored of ['null', '{}', '[null,42,{}]', 'invalid JSON', ' '.repeat(16_385), JSON.stringify([
  null, {...airport('BAD/../../api'), city:'Broken'},
  {...airport('CEK'), city:'Челябинск'}, {...airport('CEK'), city:'Duplicate'},
  ...['AYT','KZN','UFA','SVO','OVB','JFK'].map(airport),
])]) {
  slots=[];effects=[];dirty=false;calls.length=0;routes.length=0;
  context.localStorage.getItem=()=>stored;
  render();input().props.onFocus();render();
  const list=findRole('listbox');
  if (stored.includes('Челябинск')) {
    assert.ok(list, 'Валидные строки сохраняются среди повреждённых');
    function collectOptions(node=tree, found=[]) {
      if(!node || typeof node!=='object') return found;
      if(typeof node.type==='function') return collectOptions(node.type(node.props),found);
      if(node.props?.role==='option') found.push(node);
      for(const child of [node.props?.children].flat(Infinity)) if(child!=null) collectOptions(child,found);
      return found;
    }
    assert.equal(collectOptions().length,5,'История ограничена пятью уникальными аэропортами');
    input().props.onKeyDown({key:'ArrowDown',nativeEvent:{isComposing:false},preventDefault(){}});render();
    enter();assert.equal(routes.at(-1),'/ru/airport/CEK','Первый валидный аэропорт выбирается');
  } else {
    assert.equal(list,null,'Некорректная история не даёт опций');
    change('челя');await tick();calls.at(-1).resolve([airport('CEK')]);await tick();
    enter();assert.equal(routes.at(-1),'/ru/airport/CEK','Поиск работает после некорректной истории');
  }
  for(const s of slots)s?.cleanup?.();
}
console.log('PASS: ранний Enter, поздний популярный ответ, обратный порядок ответов, ошибка сети, непрерывные подсказки, быстрый Челябинск, повтор без сети, поздний словарь, IME, смена локали, offline fallback, пустое поле без подсказок, повреждённая и ограниченная история');
