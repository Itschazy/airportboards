import{createDialogHistory}from'../v8/dialogs.js';
import{decodeCatalogue,loadPayload}from'./data.js';
import{decodeGeography}from'../v6/data.js';
import{createSearch}from'./search.js';
import{sameFlights}from'../v5/state.js';
import{mapFrame,validMapBox,viewportPoint}from'../v10/viewport.js';
import{gestureBox}from'../v3/gestures.js';
import{createMap,distance}from'../v10/map.js';
import{latestJob}from'../v2/jobs.js';
import{recentAirports,routePair}from'../v8/entry.js';
import{createSharing}from'../v4/sharing.js';
import{socialGroupForLocale,socialGroups,socialApps,moreIcon}from'../v10/social.js';

import{createStorage}from'../v10/storage.js';
import{validateDate,formatHistoryDate,localToday}from'../v10/history.js';
import{createI18n}from'../v4/i18n.js';
// DOM остров принадлежит только карте: Next монтирует/размонтирует оболочку,
// а обработчики, запросы и таймеры живут до abort. Повторный переход через
// таббар не должен оставлять старые listeners или сбрасывать настройки темы.
export async function mount(root,{signal,locale='ru',messages,track=()=>{}}){
const i18n=createI18n(locale,messages),{t,countLabel,statLabel}=i18n;
const {KEY,newId,createStore,backup,parse,merge,MAX_BYTES}=createStorage(t);
const {canShareImage,shareImage,serviceLinks,INVITE,SHARE_URL}=createSharing(t,locale);
const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
const listen=(target,event,handler)=>target.addEventListener(event,handler,{signal});
const beforeOverflow=document.body.style.overflow;
// Главное действие не ждёт каталога. Остальные кнопки включаются в конце

// mount, и правильно: без данных им нечего делать. Но «Добавить перелёт» —

// единственное, ради чего сюда приходят с пустой картой, и приглушённой она

// стояла до конца загрузки, а потом на глазах оживала. Теперь она активна

// сразу и помнит нажатие: форму откроет, как только каталог приедет —

// раньше её всё равно нечем наполнить.

let earlyAdd=false;

const addButtons=$$('[data-action="add"]');

addButtons.forEach(b=>{b.disabled=false;b.onclick=e=>{e.preventDefault();earlyAdd=true;b.setAttribute('aria-busy','true');};});
// Полный словарь приходит одним ответом, а индекс строится одновременно
// с географией. Полные имена/алиасы и ранжирование сохранены на всех языках;
// два независимых запроса core/aliases больше не дают неполную выдачу.
let search;
const [airports,landData]=await Promise.all([
 loadPayload('catalogue-'+locale,signal).then(data=>{
  const airports=decodeCatalogue(data);search=createSearch(airports,locale,signal);
  search.prepare().then(()=>{if(!signal.aborted){root.dataset.searchReady='true';root.dataset.searchComplete='true';}}).catch(()=>{});
  return airports;
 }),
 loadPayload('geography',signal)
]);
if(signal.aborted)return;
const model=createMap(airports,decodeGeography(landData)),airport=model.airport;
const airportCodes=new Set(airports.map(a=>a.code));
let exporterPromise;
const demo=[['SVX','IST','2025-09-14','TK 476'],['IST','CDG','2025-09-18','TK 1823'],['CDG','IST','2026-02-21','TK 1828'],['IST','SVX','2026-02-22','TK 475'],['SVX','DXB','2026-09-03','FZ 980'],['DXB','BKK','2026-09-04','EK 372']].map((f,id)=>({id:'demo_'+id,from:f[0],to:f[1],date:f[2],number:f[3]}));
let flights=[],personal=[],isDemo=false,period='',selected=null,editing=null,choice={from:null,to:null},box=null,fullBox=null;
let shareKind='map',shareFormat='story',shareLight=false,shareCard=null,shareBlob=null,previewURL=null;
// Строка состояния осталась ТОЛЬКО для сбоя: про удачное сохранение человеку
// сообщать нечего, он видит свой перелёт на карте.
let journalLimit=50,shareFile=null,sharingBusy=false;
let store,storageError='',pendingRestore=null,restoreRevision=0;
try{store=createStore(localStorage,new Set(airports.map(a=>a.code)));flights=personal=store.read();}catch(e){storageError=t("m080")+e.message;}
if(new URLSearchParams(location.search).has('demo')){flights=structuredClone(demo);isDemo=true;}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString(locale);
function km(f){return distance(airport[f.from],airport[f.to]);}
function visible(){return flights.filter(f=>!period||f.date?.startsWith(period));}
function totals(){let f=visible(),codes=[...new Set(f.flatMap(x=>[x.from,x.to]))];return {flights:f.length,countries:new Set(codes.map(c=>airport[c].country).filter(c=>/^[A-Z]{2}$/.test(c))).size,km:f.reduce((n,f)=>n+km(f),0),codes};}
let lastMapWidth=0,lastMapHeight=0;
function fit(){const wrap=$('#mapWrap');box=mapFrame(model,visible(),null,wrap.clientWidth,wrap.clientHeight)?.box??null;}
function map(){const wrap=$('#mapWrap'),frame=mapFrame(model,visible(),box,wrap.clientWidth,wrap.clientHeight);if(!frame)return;box=frame.box;lastMapWidth=frame.width;lastMapHeight=frame.height;const svg=$('#map');svg.setAttribute('viewBox',`${box.x} ${box.y} ${box.w} ${box.h}`);svg.innerHTML=model.body(visible(),box,frame.width,selected);bindRoutes(svg);$('.map-empty').hidden=visible().length>0;renderSelection($('#mapSelection'));if($('#fullMapDialog').open)drawFull();}
function bindRoutes(svg){svg.querySelectorAll('[data-route]').forEach(p=>p.onclick=()=>{selected=p.dataset.route;render(false);});}
function renderSelection(el){const f=visible().find(x=>x.id===selected);el.hidden=!f;if(!f){el.innerHTML='';return;}el.innerHTML=`<div><strong>${esc(airport[f.from].city)} → ${esc(airport[f.to].city)}</strong><small>${t("m081",{p2:(fmt(km(f)))})}</small></div><button class="icon" aria-label="${esc(t("m082"))}" data-route-share>↗</button><button class="icon" aria-label="${esc(t("m083"))}" data-unselect>×</button>`;el.querySelector('[data-unselect]').onclick=()=>{selected=null;render(false);};el.querySelector('[data-route-share]').onclick=()=>{if($('#fullMapDialog').open){close($('#fullMapDialog'),()=>makeShare('flight'));return;}makeShare('flight');};}
function drawFull(){const fs=visible(),wrap=$('#fullMapCanvas'),frame=mapFrame(model,fs,fullBox,wrap.clientWidth,wrap.clientHeight);if(!frame)return;fullBox=frame.box;wrap.innerHTML=`<svg viewBox="${fullBox.x} ${fullBox.y} ${fullBox.w} ${fullBox.h}" aria-label="${esc(t("m084"))}">${model.body(fs,fullBox,frame.width,selected)}</svg>`;bindRoutes(wrap);renderSelection($('#fullMapSelection'));}
// Миллионы километров в большом журнале выходили за колонку на 320px.

// Уменьшаем только число, которое действительно не помещается; обычные значения

// сохраняют текущий шрифт. Пересчёт нужен также после поворота экрана.

function fitStats(){for(const b of $$('#stats .stat b')){b.style.fontSize='';const available=b.parentElement.clientWidth-8, width=b.getBoundingClientRect().width;if(width>available&&available>0)b.style.fontSize=Math.max(14,Math.floor(parseFloat(getComputedStyle(b).fontSize)*available/width))+'px';}}

function render(reset=true){
 // Удаление последнего перелёта года раньше рисовало пустую историю до reload:
 // period сбрасывался лишь при закрытии sheet, уже после render. Нормализуем
 // фильтр ДО totals/map; при исчезнувшем периоде сбрасываем и старый масштаб.
 // Проверяется активным render в audit-regressions и удалением через UI.
 if(period&&!flights.some(f=>f.date?.startsWith(period))){period='';box=null;fullBox=null;}
 if(selected&&!visible().some(f=>f.id===selected))selected=null;
 if(reset)journalLimit=50;$('#storageStatus').textContent=storageError;$('#storageStatus').classList.toggle('storage-error',!!storageError);const stats=totals();$('.atlas').classList.toggle('is-empty',stats.flights===0);if(reset||!box)fit();map();$('#stats').innerHTML=`<div class="stat"><b>${stats.flights}</b><span>${statLabel('flights',stats.flights)}</span></div><div class="stat"><b>${stats.countries}</b><span>${statLabel('countries',stats.countries)}</span></div><div class="stat"><b>${fmt(stats.km)}</b><span>${t("m088")}</span></div>`;

 fitStats();
 const years=[...new Set(flights.map(f=>f.date?.slice(0,4)).filter(Boolean))].sort().reverse();const periods=[['',t("m007")],...years.map(y=>[y,y])];$('#periodValue').textContent=(periods.find(([v])=>v===period)??periods[0])[1];$('#periodList').innerHTML=periods.map(([v,l])=>`<li><button type="button" class="period-item${v===period?' is-on':''}" aria-current="${v===period}" data-period="${esc(v)}">${esc(l)}</button></li>`).join('');$('#periodList').querySelectorAll('button').forEach(b=>b.onclick=()=>{period=b.dataset.period;selected=null;fullBox=null;$('#periodMenu').open=false;render();});

 $$('[data-action="share"]').forEach(b=>b.disabled=!flights.length);

 renderJournal();
}
function renderJournal(){
 // Поиск относится только к журналу: карта и экспорт сохраняют выбранный период.
 const query=$('#historyQuery').value.trim().toLocaleLowerCase(locale);
 // Номер на билете бывает «TK 476», а вводят «tk476». Пробелы/регистр не
 // меняют его смысл. IATA сравниваем независимо от турецкого lowercase I→ı;
 // названия городов по-прежнему используют правила текущего языка.
 const compact=query.replace(/\s+/g,'').toUpperCase();
 $('#journalSearch').hidden=flights.length<20&&!query;
 const results=visible().filter(f=>!query||[f.from,f.to,f.number].some(v=>v.replace(/\s+/g,'').toUpperCase().includes(compact))||[airport[f.from].city,airport[f.to].city,airport[f.from].name||'',airport[f.to].name||''].some(v=>v.toLocaleLowerCase(locale).includes(query))).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 $('#flightList').innerHTML=results.slice(0,journalLimit).map(f=>`<article class="flight${selected===f.id?' selected':''}" tabindex="0" role="button" aria-label="${esc(airport[f.from].city+' — '+airport[f.to].city)}" data-id="${f.id}"><div class="flight-top"><span>${f.date?formatHistoryDate(f.date,locale):t("m094")}${f.number?' · '+esc(f.number):''}</span><button aria-label="${esc(t("m095",{p5:f.from+' — '+f.to}))}" data-edit="${f.id}">···</button></div><div class="route"><div><strong>${f.from}</strong><small>${esc(airport[f.from].city)}</small></div><div class="route-line"><span>✈</span></div><div><strong>${f.to}</strong><small>${esc(airport[f.to].city)}</small></div></div></article>`).join('')||`<div class="empty-list">${query?t("xNoMatches"):t("m097")}</div>`;
 $('#flightList').querySelectorAll('[data-id]').forEach(el=>{const choose=()=>{selected=el.dataset.id;render(false);$('.atlas').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};el.onclick=e=>{if(!e.target.closest('[data-edit]'))choose();};el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('[data-edit]')){e.preventDefault();choose();}};});
 // Журнал раскрывается порциями: 5000 записей не создают сразу 50 000 DOM-узлов.
 // Карта, статистика, backup и экспорт всегда используют полный набор.
 $('#moreFlights')?.remove();if(results.length>journalLimit){const more=document.createElement('button');more.id='moreFlights';more.className='primary';more.style.width='100%';more.textContent=t("m098")+Math.min(50,results.length-journalLimit);more.onclick=()=>{journalLimit+=50;renderJournal();$('#flightList [data-id]:nth-child('+Math.max(1,journalLimit-49)+')')?.focus({preventScroll:true});};$('#flightList').after(more);}
 $$('[data-edit]').forEach(el=>el.onclick=()=>openForm(el.dataset.edit));
}
let toastTimer;function toast(s){$('#toast').onclick=null;$('#toast').style.pointerEvents='none';$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
// История окон снимается асинхронно: контроллер не даёт старому popstate
// закрыть следующий sheet при быстром сохранении/шейринге (см. dialogs.js).
const dialogs=createDialogHistory({
 history:{get state(){return history.state;},url:()=>location.href,pushState:(...args)=>history.pushState(...args),back:()=>history.back()},
 dialogs:()=>$$('dialog'),aborted:()=>signal.aborted,
 onOpen:()=>{document.body.style.overflow='hidden';},
 onClose:()=>{document.body.style.overflow=beforeOverflow;syncStored();}
});
const {open,close}=dialogs;
listen(window,'popstate',dialogs.pop);
$$('dialog .close').forEach(b=>b.onclick=()=>close(b.closest('dialog')));
$$('dialog').forEach(d=>{listen(d,'cancel',e=>{e.preventDefault();close(d);});listen(d,'close',()=>dialogs.closed(d));listen(d,'click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close(d);}});});
// Экранная клавиатура может уменьшать только visual viewport (Safari/Android).
// Нижняя форма ограничивается видимой областью; zoom пользователя не отменяем.
const viewport=window.visualViewport;
function fitEntryViewport(){const normal=!viewport||Math.abs(viewport.scale-1)<.05;root.style.setProperty('--entry-height',(normal&&viewport?viewport.height:innerHeight)+'px');root.style.setProperty('--entry-bottom',(normal&&viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0)+'px');revealSuggestions();}
if(viewport){listen(viewport,'resize',fitEntryViewport);listen(viewport,'scroll',fitEntryViewport);}listen(window,'resize',fitEntryViewport);fitEntryViewport();
const today=new Date(),todayString=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');$('#date').max=todayString;
// Добавление из примера всегда начинает личную запись. Иначе пользователь
// получал «добавлен», но после обновления терял введённый реальный перелёт.
// Старая форма каждый раз начиналась с нуля и оставляла клавиатуру поверх Save.
// Недавние аэропорты и обратный маршрут берём только из личной локальной истории.
// Дату/номер не копируем в новый рейс: это незаметно создавало бы ложные записи.
// Подсказки раскрываются только с первой буквы. Список висит НАД формой, и на
// пустом поле он закрывал бы её прежде, чем человек что-то сделал, — а при
// открытии окна фокус в «Откуда» ставится кодом, без всякого его участия.
let formRevision=0,saving=false;
// На 320×568 второй список оказывался за закреплённой кнопкой Save.
// Прокручиваем только sheet и только после раскладки: сохраняем место для
// видимых подсказок, не меняя размеры контролов/дизайн соседних страниц.
function revealSuggestions(){requestAnimationFrame(()=>{
 if(signal.aborted||!$('#addDialog').open)return;
 const input=document.activeElement;if(input!==$('#from')&&input!==$('#to'))return;
 const list=$('#'+input.id+'Results');if(!list.childElementCount)return;
 const overlap=list.getBoundingClientRect().bottom-$('.form-actions').getBoundingClientRect().top+8;
 if(overlap>0)$('#addDialog').scrollTop+=overlap;
});}
let suggestionRevision=0;
function hideSuggestions(){suggestionRevision++;for(const side of ['from','to']){$('#'+side+'Results').innerHTML='';$('#'+side).setAttribute('aria-expanded','false');$('#'+side).removeAttribute('aria-busy');}}
function setAirport(side,code){choice[side]=code;const a=airport[code];$('#'+side).value=a?`${a.city} · ${a.code}`:'';$('#formError').textContent='';}
// Панель «Дата и номер рейса» свёрнута ВСЕГДА, и при правке тоже (решение
// владельца 31.10.2026). Прежде правка открывала её, чтобы показать уже
// введённые дату и номер; теперь их видно только после раскрытия — зато окно
// правки открывается тем же коротким видом, что и окно добавления.
function syncDatePrecision(){const precision=$('#datePrecision').value;$('#dayField').hidden=precision!=='day';$('#yearField').hidden=precision!=='year';precisionSelect.sync();}
// HTML max тоже должен разрешать уже сохранённую дату после смены пояса.
// Новая запись ограничена сегодняшним днём; при каждом открытии обновляем max.
function resetForm(f=null,from=null){const now=localToday();$('#date').max=f?.date?.length===10&&f.date>now?f.date:now;$('#flightForm').reset();$('.extra-fields').open=false;$('#formError').textContent='';hideSuggestions();setAirport('from',f?.from||from);setAirport('to',f?.to||null);$('#datePrecision').value=f?.date?.length===4?'year':f&&!f.date?'unknown':'day';$('#date').value=f?.date?.length===10?f.date:'';$('#flightYear').value=f?.date?.length===4?f.date:'';syncDatePrecision();$('#addDialog .entry-more').open=false;$('#returnFlight').hidden=$('#nextLeg').hidden=!f;$('#number').value=f?.number||'';$('#saveFlight').textContent=f?t("m101"):t("m015");$('#saveFlight').disabled=false;}
function openForm(id=null){if(saving)return;track('progress',{step:'form_open'});if(id===null&&isDemo){syncStored();flights=personal;isDemo=false;selected=null;period='';const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);render();}formRevision++;editing=id;const f=flights.find(f=>f.id===id);resetForm(f);$('#formTitle').textContent=f?(isDemo?t("m102"):t("m103")):t("m015");$('#deleteFlight')?.remove();if(f){const b=document.createElement('button');b.id='deleteFlight';b.type='button';b.textContent=t("m104");b.className='delete-flight';b.onclick=async()=>{if(saving)return;saving=true;try{const saved=f;if(!await applyFlights(flights.filter(x=>x.id!==f.id)))return;const deletedDemo=isDemo;close($('#addDialog'));render();toast(t("m105"));$('#toast').style.pointerEvents='auto';$('#toast').onclick=async()=>{if(isDemo!==deletedDemo)return;if(!await applyFlights([...flights,saved]))return;render();toast(t("m106"));$('#toast').onclick=null;$('#toast').style.pointerEvents='none';};}finally{saving=false;}};$('#flightForm').append(b);}open($('#addDialog'));}
for(const side of ['from','to']){
 const input=$('#'+side),list=$('#'+side+'Results');
 // В покое в поле стоит его название («Откуда»), по фокусу — что именно сюда
 // вводят. Исходные строки берём из разметки: переводов в коде нет.
 const label=input.placeholder,hint=input.dataset.hint||label;
 const choose=code=>{track('progress',{step:side+'_selected'});setAirport(side,code);hideSuggestions();if(side==='from')$('#to').focus();else $('#saveFlight').focus();};
 const show=async()=>{

  hideSuggestions();const revision=suggestionRevision,value=input.value,options={recent:recentAirports(personal),exclude:choice[side==='from'?'to':'from']};

  const active=()=>!signal.aborted&&revision===suggestionRevision&&$('#addDialog').open&&document.activeElement===input;

  let rows=search.instant(value,options);

  if(!rows){

   {list.innerHTML=`<p class="search-empty" role="status">${esc(t('searchLoading'))}</p>`;input.setAttribute('aria-expanded','true');input.setAttribute('aria-busy','true');revealSuggestions();}

   // Retry должен повторить запрос: один focus раньше оставлял ошибку навсегда
   // до нового ввода. Проверка исполняет этот обработчик и считает запросы.
   try{rows=await search.query(value,options);}catch{

    if(!active())return;track('progress',{step:'search_error'});input.removeAttribute('aria-busy');input.setAttribute('aria-expanded','true');list.innerHTML=`<p class="search-empty" role="status">${esc(t('searchLoadError'))}</p><button type="button">${esc(t('retry'))}</button>`;list.querySelector('button').onclick=()=>{input.focus();show();};return;

   }

  }

  // Поздний ответ не открывает закрытую форму и не заменяет более новый запрос.

  if(!active())return;input.removeAttribute('aria-busy');
  list.innerHTML=rows.map(a=>`<button type="button" role="option" aria-selected="false" data-code="${a.code}"><span>${esc(a.city)}${a.name!==a.city?`<small>${esc(a.name)}</small>`:''}</span><b>${a.code}</b></button>`).join('')||`<p class="search-empty">${t("m107")}</p>`;input.setAttribute('aria-expanded','true');revealSuggestions();
  list.querySelectorAll('button').forEach((b,i)=>{b.onclick=()=>choose(b.dataset.code);b.onkeydown=e=>{const bs=[...list.querySelectorAll('button')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();bs[(i+(e.key==='ArrowDown'?1:bs.length-1))%bs.length].focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();input.focus();hideSuggestions();}};});
 };
 input.oninput=()=>{choice[side]=null;$('#formError').textContent='';const pair=routePair(input.value,airportCodes);if(pair){track('progress',{step:'from_selected'});track('progress',{step:'to_selected'});setAirport('from',pair.from);setAirport('to',pair.to);hideSuggestions();$('#saveFlight').focus();return;}show();};
 // Пустое поле сразу предлагает недавние аэропорты/локальный стартовый
 // набор: первый перелёт можно добавить двумя выборами, без ввода кодов.
 // Это тот же instant-поиск, без ожидания индекса и без сетевого запроса.
 input.onfocus=()=>{input.placeholder=hint;if(!choice[side]){show();return;}if(matchMedia('(pointer:fine)').matches)input.select();else input.setSelectionRange(input.value.length,input.value.length);};

 input.onblur=()=>{input.placeholder=label;};

 input.onkeydown=e=>{if((e.key==='ArrowDown'||e.key==='Enter')&&!e.isComposing&&list.querySelector('[data-code]')){e.preventDefault();if(e.key==='Enter')choose(list.querySelector('[data-code]').dataset.code);else list.querySelector('[data-code]').focus();}if(e.key==='Escape'&&list.childElementCount){e.preventDefault();e.stopPropagation();hideSuggestions();}};
}
// Закрываем после click, не pointerdown: исчезновение списка сдвигает нижний
// sheet между нажатием и отпусканием, из-за чего первый tap по кнопке пропадал.
// composedPath сохраняет исходное поле даже после перерисовки его подсказок.
listen(root,'click',e=>{const path=e.composedPath();if(path.includes($('#addDialog'))&&!path.some(el=>el.classList?.contains('airport-field')))hideSuggestions();});
$('.swap').onclick=()=>{const from=choice.from,to=choice.to,fromText=$('#from').value,toText=$('#to').value;choice={from:to,to:from};$('#from').value=toText;$('#to').value=fromText;hideSuggestions();};
$('#flightForm').onsubmit=async e=>{e.preventDefault();if(saving)return;track('progress',{step:'save_attempt'});
 const date=$('#datePrecision').value==='unknown'?'':$('#datePrecision').value==='year'?$('#flightYear').value.trim():$('#date').value;
 if(!validateDate(date,{today:localToday(),allowFuture:!!editing&&flights.some(f=>f.id===editing&&f.date===date)}).valid){track('progress',{step:'validation_error'});$('#formError').textContent=t('xInvalidDate');return;}
 if(!choice.from||!choice.to){track('progress',{step:'validation_error'});$('#formError').textContent=t(!choice.from&&!choice.to?"m109":!choice.from?"m164":"m165");$('#'+(!choice.from?'from':'to')).focus();return;}
 if(choice.from===choice.to){track('progress',{step:'validation_error'});$('#formError').textContent=t("m110");return;}
 const revision=formRevision,wasNew=editing===null,wasEmpty=personal.length===0;
 const f={id:editing??(isDemo?'demo_'+newId():newId()),from:choice.from,to:choice.to,date,number:$('#number').value.trim()};
 // Блокировка ставится до await Web Locks: двойной tap не создаёт две записи.
 saving=true;$('#saveFlight').disabled=true;
 try{if(!await applyFlights(wasNew?[...flights,f]:flights.map(x=>x.id===editing?f:x)))return;if(signal.aborted)return;
  period='';selected=f.id;if(!isDemo){track('saved');track('progress',{step:wasNew?(wasEmpty?'first_saved':'new_saved'):'edited'});}render();
  if(revision!==formRevision||!$('#addDialog').open)return;
  close($('#addDialog'));toast(wasNew?t("m112"):t("m113"));
 }finally{saving=false;if(!signal.aborted)$('#saveFlight').disabled=false;}
};
// Список закрывается щелчком мимо него — как любое меню на сайте.
listen(root,'click',e=>{const m=$('#periodMenu');if(m.open&&!e.composedPath().includes(m))m.open=false;});
// Кнопки #fit на малой карте больше нет (30.10.2026): рядом стоит «на весь экран»,
// и два похожих значка подряд читались как одна и та же кнопка. Сама функция fit()
// осталась — ею открывается карта и ею же работает сброс в полноэкранном окне.
for(const [id,f] of [['zoomIn',.8],['zoomOut',1.25]])$('#'+id).onclick=()=>{if(!validMapBox(box)||box.w*f<50||box.w*f>1100)return;box={...box,x:box.x+box.w*(1-f)/2,y:box.y+box.h*(1-f)/2,w:box.w*f,h:box.h*f};map();};
// Резервная копия относится к журналу. Тема и язык остаются в настоящих настройках сайта.
$('#openBackup').onclick=()=>open($('#backupDialog'));
// PNG готов до пользовательского tap: iOS требует navigator.share прямо
// из жеста. Очередь коалесцирует быстрые переключения, старый результат не
// перетирает новую карточку или ошибку; при сетевой ошибке загрузку можно повторить.
const shareJobs=latestJob({
 async run(options,current){
  exporterPromise??=import(/* webpackIgnore: true */ '/flight-map/v10/exporter.js').then(m=>m.createExporter(model,i18n)).catch(e=>{exporterPromise=null;throw e;});
  const exp=await exporterPromise;if(!current()||signal.aborted)return;
  const card=await exp.build(options);if(!current()||signal.aborted)return;
  const blob=await exp.png(card);return {card,blob};
 },
 done(result,options){if(!result||signal.aborted||!$('#shareDialog').open)return;
  const {card,blob}=result;shareCard=card;shareBlob=blob;$('#caption').value=card.caption;
  $('#sharePreview').setAttribute('aria-busy','false');if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(blob);
  $('#sharePreview').innerHTML=`<img src="${previewURL}" alt="${esc(t("m117",{p1:(options.kind==='flight'?t("m114"):options.kind==='year'?t("m115"):t("m116"))}))}" width="${card.width}" height="${card.height}">`;
  $('#download').disabled=false;$('#copyCaption').disabled=false;
  shareFile=new File([blob],'airportsboard-my-flights.png',{type:'image/png'});const can=canShareImage(navigator,shareFile);
  syncShareTargets();
  $('#shareStatus').textContent=can?'':t('xShareUnavailable');
  track('export',{export_kind:options.kind,format:options.format});
 },
 error(){if(signal.aborted||!$('#shareDialog').open)return;$('#sharePreview').setAttribute('aria-busy','false');$('#shareStatus').textContent=t("m120");}
});
// Свой выпадающий список вместо системного.
//
// Системный список рисует браузер, и задать в нём можно только цвет пунктов —
// на десктопе это серое окно операционной системы посреди стеклянной шторки.
// Поэтому список заменён, а нативный <select> ОСТАВЛЕН в разметке: он хранит
// значение и по-прежнему шлёт change, так что остальной код про подмену не
// знает. Из дерева доступности он убран, вместо него кнопка role=combobox и
// список role=listbox с клавиатурой: стрелки, Home/End, Enter, Esc.
function enhanceSelect(select){
 const wrap=document.createElement('div');wrap.className='ab-select';
 const btn=document.createElement('button');btn.type='button';btn.className='ab-select-btn';
 btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');
 const label=select.getAttribute('aria-label');if(label){btn.setAttribute('aria-label',label);}
 const value=document.createElement('span');value.className='ab-select-value';btn.append(value);
 btn.insertAdjacentHTML('beforeend','<svg class="ab-select-chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.6 6 6.4 11 1.6"/></svg>');
 const pop=document.createElement('div');pop.className='ab-select-pop';pop.setAttribute('role','listbox');pop.hidden=true;
 if(label)pop.setAttribute('aria-label',label);
 select.after(wrap);wrap.append(btn,pop);
 select.classList.add('ab-select-native');select.setAttribute('aria-hidden','true');select.tabIndex=-1;
 const render=()=>{pop.innerHTML='';
  [...select.options].forEach((o,i)=>{const item=document.createElement('div');
   item.className='ab-select-item';item.setAttribute('role','option');item.tabIndex=-1;
   item.dataset.index=String(i);item.setAttribute('aria-selected',String(i===select.selectedIndex));
   item.textContent=o.text;pop.append(item);});
  value.textContent=select.options[select.selectedIndex]?.text??'';};
 const shut=focus=>{if(pop.hidden)return;pop.hidden=true;btn.setAttribute('aria-expanded','false');if(focus)btn.focus();};
 const show=()=>{if(!pop.hidden)return;render();pop.hidden=false;btn.setAttribute('aria-expanded','true');
  const cur=pop.children[Math.max(0,select.selectedIndex)];if(cur){cur.focus();cur.scrollIntoView({block:'nearest'});}};
 // change шлём ВРУЧНУЮ: программная смена selectedIndex события не рождает.
 const pick=i=>{if(i<0||i>=select.options.length)return;select.selectedIndex=i;render();shut(true);
  select.dispatchEvent(new Event('change',{bubbles:true}));};
 btn.onclick=()=>{if(pop.hidden)show();else shut(true);};
 btn.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();show();}};
 pop.onclick=e=>{const it=e.target.closest('.ab-select-item');if(it)pick(Number(it.dataset.index));};
 pop.onkeydown=e=>{const items=[...pop.children],i=items.indexOf(document.activeElement);
  if(e.key==='Escape'){e.preventDefault();shut(true);}
  else if(e.key==='ArrowDown'){e.preventDefault();(items[Math.min(items.length-1,i+1)]||items[0]).focus();}
  else if(e.key==='ArrowUp'){e.preventDefault();(items[Math.max(0,i-1)]||items[0]).focus();}
  else if(e.key==='Home'){e.preventDefault();items[0].focus();}
  else if(e.key==='End'){e.preventDefault();items[items.length-1].focus();}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(i);}
  else if(e.key==='Tab'){shut(false);}};
 listen(document,'pointerdown',e=>{if(!wrap.contains(e.target))shut(false);});
 return {sync(){shut(false);render();wrap.hidden=select.hidden;}};
}
const precisionSelect=enhanceSelect($('#datePrecision'));precisionSelect.sync();
const shareSelects=[enhanceSelect($('#shareYear')),enhanceSelect($('#shareFlight'))];
function refreshShare(){shareBlob=null;shareCard=null;shareFile=null;$('#sharePreview').setAttribute('aria-busy','true');syncShareTargets();$('#download').disabled=true;$('#copyCaption').disabled=true;$('#shareStatus').textContent=t("m121");
 $$('.share-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shareKind===shareKind)));$$('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===shareFormat)));
 $('#shareYear').hidden=shareKind!=='year';$('#shareFlight').hidden=shareKind!=='flight';$('#caption').hidden=true;shareSelects.forEach(s=>s.sync());
 shareJobs.push({flights,kind:shareKind,year:$('#shareYear').value,flightId:$('#shareFlight').value,format:shareFormat,light:shareLight,demo:isDemo,showStats:$('#showStats').checked,showFlags:$('#showFlags').checked});
}
listen($('#shareDialog'),'close',()=>{shareJobs.cancel();shareBlob=null;shareCard=null;shareFile=null;if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}$('#sharePreview').innerHTML='';});
function makeShare(kind='map'){if(!$('#socialTargets').children.length)renderShareTargets();$('#sharePreview').classList.remove('is-enlarged');$('#enlargePreview').setAttribute('aria-expanded','false');if(!flights.length){toast(t("m122"));return;}shareKind=kind==='map'&&period?'year':kind;shareLight=document.documentElement.dataset.theme==='light'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: light)').matches);
 const years=[...new Set(flights.map(f=>f.date?.slice(0,4)).filter(Boolean))].sort().reverse();$('#shareYear').innerHTML=years.map(y=>`<option>${y}</option>`).join('');$('[data-share-kind="year"]').disabled=!years.length;if(period&&years.includes(period))$('#shareYear').value=period;
 $('#shareFlight').innerHTML=flights.map(f=>`<option value="${f.id}">${f.from} → ${f.to}${f.date?' · '+f.date:''}</option>`).join('');$('#shareFlight').value=selected??flights[flights.length-1].id;$('#sharePreview').innerHTML='';open($('#shareDialog'),refreshShare);}
$$('[data-share-kind]').forEach(b=>b.onclick=()=>{shareKind=b.dataset.shareKind;refreshShare();});$$('[data-format]').forEach(b=>b.onclick=()=>{shareFormat=b.dataset.format;refreshShare();});$('#shareYear').onchange=$('#shareFlight').onchange=refreshShare;$('#exportTheme').onclick=()=>{shareLight=!shareLight;refreshShare();};
$('#download').onclick=()=>{if(!shareBlob)return;track('progress',{step:'download'});const a=document.createElement('a'),u=URL.createObjectURL(shareBlob);a.href=u;a.download=`airportsboard-${shareKind}-${shareFormat}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);$('#shareStatus').textContent=t("m123");};
// Иконки подсказывают назначение, но Web Share не умеет выбирать target.
// Всегда передаём настоящий PNG, не заменяем его ссылкой на пустую карту.
// Меню открывается синхронно из tap (Safari activation); никакого await
// перед navigator.share. На неподдерживаемом браузере доступен download.
const socialGroup=socialGroupForLocale(locale);
function syncShareTargets(){$$('[data-social],#nativeShare').forEach(b=>b.disabled=!shareFile||sharingBusy);}
function renderShareTargets(){
 const svg=icon=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg>`;
 $('#socialTargets').dataset.group=socialGroup;
 $('#socialTargets').innerHTML=socialGroups[socialGroup].map(id=>{const app=socialApps[id];return `<button type="button" class="social-target" data-social="${id}" aria-describedby="socialHint"><span class="social-symbol social-logo"><img src="${app.src}" alt="" width="56" height="56" decoding="async"></span><span dir="ltr">${app.name}</span></button>`;}).join('')+`<button type="button" class="social-target" id="nativeShare" aria-describedby="socialHint"><span class="social-symbol social-other">${svg(moreIcon)}</span><span>${esc(t('xShareOther'))}</span></button>`;
 $$('[data-social]').forEach(b=>b.onclick=()=>sendImage(socialApps[b.dataset.social].name));
 $('#nativeShare').onclick=()=>sendImage();syncShareTargets();
}
function sendImage(app){
 if(!shareFile||sharingBusy)return;
 if(!canShareImage(navigator,shareFile)){$('#shareStatus').textContent=app?t('xShareSaveFor',{app}):t('xShareUnavailable');$('#download').focus();return;}
 track('progress',{step:'share_attempt'});const file=shareFile;sharingBusy=true;syncShareTargets();
 $('#shareStatus').textContent=app?t('xShareChoose',{app}):t('xShareHint');
 const current=()=>!signal.aborted&&shareFile===file&&$('#shareDialog').open;
 try{Promise.resolve(shareImage(navigator,file)).then(()=>{track('progress',{step:'share_resolved'});if(current())$('#shareStatus').textContent=t("m124");}).catch(e=>{track('progress',{step:e.name==='AbortError'?'share_cancelled':'share_error'});if(current())$('#shareStatus').textContent=e.name==='AbortError'?t("m125"):t("m126");}).finally(()=>{sharingBusy=false;if(!signal.aborted)syncShareTargets();});}
 catch{track('progress',{step:'share_error'});sharingBusy=false;syncShareTargets();if(current())$('#shareStatus').textContent=t("m127");}
}

$('#serviceLinks').innerHTML=serviceLinks().map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${x.name}</a>`).join('');
$('#shareService').hidden=typeof navigator.share!=='function';
$('#shareService').onclick=()=>{try{Promise.resolve(navigator.share({title:t("m128"),text:INVITE,url:SHARE_URL})).catch(e=>{if(!signal.aborted&&e.name!=='AbortError')$('#linkStatus').textContent=t("m129");});}catch{$('#linkStatus').textContent=t("m129");}};
$('#copyService').onclick=async()=>{try{await navigator.clipboard.writeText(SHARE_URL);if(!signal.aborted)$('#linkStatus').textContent=t("m130");}catch{if(!signal.aborted){$('#serviceUrl').hidden=false;$('#serviceUrl').select();$('#linkStatus').textContent=t("m131");}}};
$('#copyCaption').onclick=async()=>{if(!shareCard)return;try{await Promise.race([navigator.clipboard.writeText(shareCard.caption),new Promise((_,reject)=>setTimeout(()=>reject(new Error('clipboard-timeout')),1500))]);$('#shareStatus').textContent=t("m132");}catch{$('#caption').hidden=false;$('#caption').select();$('#shareStatus').textContent=t("m133");}};
$('#expandMap').onclick=()=>{if(!visible().length)return;fullBox=null;open($('#fullMapDialog'),drawFull);};
function zoomFull(f){if(!validMapBox(fullBox))return;const w=Math.min(Math.max(1500,fullBox.w),Math.max(60,fullBox.w*f));f=w/fullBox.w;if(f===1)return;fullBox={...fullBox,x:fullBox.x+fullBox.w*(1-f)/2,y:fullBox.y+fullBox.h*(1-f)/2,w,h:fullBox.h*f};drawFull();}
$('#fullZoomIn').onclick=()=>zoomFull(.8);$('#fullZoomOut').onclick=()=>zoomFull(1.25);$('#fullFit').onclick=()=>{fullBox=null;drawFull();};
// Два пальца увеличивают карту вокруг их середины, один перемещает её.
// После поднятия пальца начинаем отсчёт заново: иначе pinch превращался бы
// в скачок single-pan. Pointercancel/закрытие сбрасывают жест. На каждом кадре
// меняем только viewBox; береговая линия и подписи обновляются после жеста.
let panFrame=0,moved=false,gesture=null;const pointers=new Map(),full=$('#fullMapCanvas');
const point=e=>viewportPoint(e,full.getBoundingClientRect());
function beginGesture(){gesture=validMapBox(fullBox)?{box:{...fullBox},points:[...pointers.values()]}:null;}
function paintGesture(){if(!panFrame)panFrame=requestAnimationFrame(()=>{panFrame=0;if(validMapBox(fullBox))full.querySelector('svg')?.setAttribute('viewBox',`${fullBox.x} ${fullBox.y} ${fullBox.w} ${fullBox.h}`);});}
full.onpointerdown=e=>{if((e.pointerType==='mouse'&&e.button!==0)||pointers.size>=2)return;const p=point(e);if(!p)return;if(!pointers.size)moved=false;pointers.set(e.pointerId,p);beginGesture();};
full.onpointermove=e=>{if(!pointers.has(e.pointerId)||!gesture)return;const p=point(e);if(!p)return;pointers.set(e.pointerId,p);const points=[...pointers.values()];if(points.length===2||points.some((p,i)=>Math.hypot((p.x-gesture.points[i].x)*full.clientWidth,(p.y-gesture.points[i].y)*full.clientHeight)>6))moved=true;if(!moved)return;for(const id of pointers.keys())full.setPointerCapture(id);fullBox=gestureBox(gesture.box,gesture.points,points);paintGesture();};
const endGesture=e=>{if(!pointers.delete(e.pointerId))return;if(pointers.size){beginGesture();return;}gesture=null;if(panFrame){cancelAnimationFrame(panFrame);panFrame=0;}if(moved&&$('#fullMapDialog').open)drawFull();};
full.onpointerup=full.onpointercancel=endGesture;
full.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
listen($('#fullMapDialog'),'close',()=>{pointers.clear();gesture=null;if(panFrame){cancelAnimationFrame(panFrame);panFrame=0;}});
listen(full,'keydown',e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0'){fullBox=null;drawFull();}else zoomFull(e.key==='-'?1.25:.8);}});
$$('[data-action]').forEach(b=>b.onclick=e=>{e.preventDefault();switch(b.dataset.action){case'add':openForm();break;case'share':makeShare('map');break;}});


// Дополнительные действия не занимают первый экран. Предварительная проверка
// не меняет историю; импорт и отмена проходят под той же блокировкой хранилища,
// что обычное сохранение, поэтому соседняя вкладка не теряет свои записи.
$('#datePrecision').onchange=syncDatePrecision;
$('#historyQuery').oninput=()=>{journalLimit=50;renderJournal();};
for(const [id,reverse] of [['returnFlight',true],['nextLeg',false]])$('#'+id).onclick=()=>{
 const f=flights.find(f=>f.id===editing);if(!f)return;
 if(isDemo){syncStored();flights=personal;isDemo=false;selected=null;period='';const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);render();}
 editing=null;formRevision++;resetForm(null,f.to);if(reverse)setAirport('to',f.from);
 $('#deleteFlight')?.remove();$('#formTitle').textContent=t('m015');$('#'+(reverse?'saveFlight':'to')).focus();
};
$('#enlargePreview').onclick=()=>{const enlarged=$('#sharePreview').classList.toggle('is-enlarged');$('#enlargePreview').setAttribute('aria-expanded',String(enlarged));if(enlarged)$('#sharePreview').scrollIntoView({block:'start',behavior:'auto'});};
$('#showStats').onchange=$('#showFlags').onchange=refreshShare;
let transferPromise,pendingImport=null,importRevision=0,importBusy=false,importFormat='auto';
// Парсер CSV загружается только по требованию, а не при первом открытии карты.
const transfer=()=>transferPromise??=import(/* webpackIgnore: true */ '/flight-map/v10/transfer.js').then(m=>m.createTransfer({codes:airportCodes,newId})).catch(e=>{transferPromise=null;throw e;});
function importMessage(e){
 const key=({file_size:'xTooLarge',record_limit:'xTooLarge',date_ambiguous:'xAmbiguousDate',airport_unknown:'xUnknownAirport',route_same:'xInvalidRoute',route_format:'xInvalidRoute'})[e.code]||(e.code?.startsWith('date_')?'xInvalidDate':'xInvalidCSV');
 return (e.line?t('xRow',{row:e.line})+': ':'')+t(key,key==='xUnknownAirport'?{code:e.value}:{});
}
function invalidateImport(){importRevision++;pendingImport=null;$('#importPreview').hidden=true;$('#confirmImport').disabled=true;$('#importError').textContent='';}
function showImport(){invalidateImport();$('#importText').value='';importFormat='auto';$('#keepDuplicates').checked=false;open($('#importDialog'));}
$('#openImport').onclick=()=>close($('#addDialog'),showImport);
$('#backupImport').onclick=()=>close($('#backupDialog'),showImport);
$('#importText').oninput=()=>{importFormat='auto';invalidateImport();};
$('#keepDuplicates').onchange=()=>{$('#confirmImport').disabled=!pendingImport||pendingImport.errors.length>0||!pendingImport.rows.length||(pendingImport.rows.some(f=>f.duplicateOf)&&!$('#keepDuplicates').checked);};
async function previewImport(){
 const revision=++importRevision;pendingImport=null;$('#confirmImport').disabled=true;$('#importError').textContent='';
 try{const api=await transfer();if(revision!==importRevision||signal.aborted)return;syncStored();if(storageError)throw Error(storageError);
 const result=api.parse($('#importText').value,{format:importFormat,current:personal});pendingImport=result;
 $('#importPreview').hidden=false;$('#importSummary').textContent=t('xImportSummary',{count:result.rows.length});
 $('#importRows').innerHTML=result.rows.slice(0,20).map(f=>`<li><bdi>${esc(f.from)} → ${esc(f.to)}</bdi>${f.date?' · '+esc(formatHistoryDate(f.date,locale)):''}${f.number?' · '+esc(f.number):''}</li>`).join('');
 const duplicateCount=result.rows.filter(f=>f.duplicateOf).length;
 $('#duplicatesOption').hidden=!duplicateCount;$('#keepDuplicates').checked=false;
 $('#importWarnings').textContent=result.warnings.map(w=>w.code==='fields_ignored'?t('xIgnoredFields',{fields:w.fields.join(', ')}):w.code==='duplicates'?t('xPossibleDuplicates',{count:w.count}):'').filter(Boolean).join(' ');
 $('#importError').textContent=result.errors.length?t('xImportErrors')+' '+result.errors.slice(0,8).map(importMessage).join(' '):'';
 $('#confirmImport').disabled=!!result.errors.length||!result.rows.length||!!duplicateCount;
 }catch(e){if(revision===importRevision)$('#importError').textContent=e.message||t('xInvalidCSV');}
}
$('#previewImport').onclick=previewImport;
$('#importFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;invalidateImport();const revision=importRevision;
 try{if(file.size>MAX_BYTES){$('#importError').textContent=t('xTooLarge');return;}const text=await file.text();if(signal.aborted||revision!==importRevision||!$('#importDialog').open)return;$('#importText').value=text;importFormat='csv';await previewImport();}catch{if(!signal.aborted&&revision===importRevision&&$('#importDialog').open)$('#importError').textContent=t('xInvalidCSV');}
};
$('#confirmImport').onclick=async()=>{if(importBusy||!pendingImport||pendingImport.errors.length||!store)return;const revision=importRevision;importBusy=true;$('#confirmImport').disabled=true;for(const id of ['importText','importFile','previewImport','keepDuplicates'])$('#'+id).disabled=true;
 try{const result=await store.importAsync(pendingImport.rows,{allowDuplicates:$('#keepDuplicates').checked});if(signal.aborted)return;
 if(result.requiresConfirmation){if(revision===importRevision&&$('#importDialog').open)await previewImport();return;}
 personal=flights=result.flights;isDemo=false;period='';selected=null;storageError='';if(revision===importRevision)pendingImport=null;
 const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);
 render();if(revision===importRevision&&$('#importDialog').open)close($('#importDialog'));track('saved');toast(t('xImportDone',{count:result.added}));
 // Undo остаётся кнопкой в окне резервной копии, а не исчезает через 3 секунды.
 $('#undoImport')?.remove();const undo=document.createElement('button');undo.id='undoImport';undo.type='button';undo.className='text-action';undo.textContent=t('xUndoImport');$('#openBackup').after(undo);
 undo.onclick=async()=>{if(undo.disabled)return;undo.disabled=true;try{const undone=await store.undoImportAsync(result.receipt);if(signal.aborted)return;personal=flights=undone.flights;if(period&&!flights.some(f=>f.date.startsWith(period)))period='';if(selected&&!flights.some(f=>f.id===selected))selected=null;render();undo.remove();toast(undone.preserved?t('xUndoUnavailable'):t('xUndoImport'));}catch(e){undo.disabled=false;toast(e.message);}};
 }catch(e){if(!signal.aborted&&revision===importRevision&&$('#importDialog').open)$('#importError').textContent=e.message;}finally{importBusy=false;if(!signal.aborted){for(const id of ['importText','importFile','previewImport','keepDuplicates'])$('#'+id).disabled=false;$('#keepDuplicates').onchange();}}
};
listen($('#importDialog'),'close',()=>{importRevision++;pendingImport=null;});
$('#csvTemplate').onclick=()=>downloadText('from,to,date,number\r\nLHR,JFK,2020,\r\n','airportsboard-template.csv','text/csv;charset=utf-8');
$('#exportCSV').onclick=async()=>{try{syncStored();if(storageError)throw Error(storageError);const api=await transfer();downloadText(api.exportCSV(personal),'airportsboard-flights-'+todayString+'.csv','text/csv;charset=utf-8');}catch(e){$('#backupStatus').textContent=e.message;}};

// Import preview and saving share the same validation path, so a corrupt backup
// cannot silently turn a complete journal into a partial one.
async function applyFlights(next){try{if(isDemo){flights=next;return true;}if(!store)throw Error(t("m134"));personal=await store.writeAsync(next);flights=personal;storageError='';return !signal.aborted;}catch(e){track('progress',{step:'save_error'});storageError=e.message;$('#formError').textContent=e.message;$('#restoreError').textContent=e.message;$('#storageStatus').textContent=e.message;toast(e.message);return false;}}
// Закрытие sheet раньше всегда делало render+fit: теряло пользовательский zoom
// и повторно рисовало SVG после каждого сохранения. Перечитываем хранилище для
// межвкладочных изменений, но перерисовываем только действительно новые записи.
function syncStored(){if(!store||signal.aborted)return;try{const next=store.read(),changed=!sameFlights(personal,next),hadError=!!storageError;personal=next;if(!isDemo)flights=personal;storageError='';if(changed||hadError||(period&&!flights.some(f=>f.date?.startsWith(period))))render();}catch(e){storageError=e.message;$('#storageStatus').textContent=e.message;}}
listen(window,'storage',e=>{if(e.key!==KEY&&e.key!==null)return;if($('dialog[open]'))return;syncStored();});
function downloadText(text,name,type='application/json'){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);}
$('#backup').onclick=()=>{syncStored();if(storageError){try{const raw=localStorage.getItem(KEY);if(raw!==null)downloadText(raw,'airportsboard-unreadable-original.json');else toast(storageError);}catch{toast(storageError);}return;}track('backup');downloadText(backup(personal),'airportsboard-backup-'+todayString+'.json');$('#backupStatus').textContent=t("m135");};
$('#restoreFile').onchange=async e=>{const revision=++restoreRevision,file=e.target.files?.[0];e.target.value='';if(!file)return;$('#backupStatus').textContent=t("m136");try{if(file.size>MAX_BYTES)throw Error(t("m137"));const text=await file.text();if(revision!==restoreRevision||!$('#backupDialog').open)return;const incoming=parse(text,new Set(airports.map(a=>a.code)));syncStored();if(storageError)throw Error(storageError);const result=merge(personal,incoming);pendingRestore=incoming;$('#restoreSummary').textContent=`${t("m138",{p0:(result.added),p1:(result.existing),p2:(result.conflicts)})}`;$('#restoreError').textContent='';$('#restoreConfirm').disabled=!result.added;$('#restoreList').innerHTML=incoming.slice(0,5).map(f=>`<li>${esc(airport[f.from].city)} → ${esc(airport[f.to].city)} <small>${esc(f.date||t("m020"))}</small></li>`).join('');$('#backupStatus').textContent='';close($('#backupDialog'),()=>open($('#restoreDialog')));}catch(e){$('#backupStatus').textContent=e.message;}};
$('#restoreConfirm').onclick=async()=>{if(!pendingRestore)return;try{const result=merge(personal,pendingRestore);if(!store)throw Error(t("m139"));personal=await store.writeAsync(result.flights);if(signal.aborted)return;flights=personal;isDemo=false;period='';selected=null;const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);pendingRestore=null;storageError='';close($('#restoreDialog'));render();track('restore');toast(t("m140")+result.added);}catch(e){$('#restoreError').textContent=e.message;}};

$$('button').forEach(b=>b.disabled=false);syncShareTargets();$('#confirmImport').disabled=true;addButtons.forEach(b=>b.removeAttribute('aria-busy'));document.documentElement.removeAttribute('data-flights');root.removeAttribute('aria-busy');render();root.dataset.mapReady='true';track('open');
if(earlyAdd)openForm();
// Не создаём длинную задачу индекса внутри mount. Ошибка фоновой загрузки

// показывается только при поиске, где доступен retry; карта остаётся рабочей.

let resize;
// Клавиатура меняет viewport, но обычно не размеры карты. Не пересоздаём
// журнал/географию и не сбрасываем zoom на каждый resize. При повороте экрана
// сохраняем центр и ширину видимой области, меняя только её пропорции.
function resizeMaps(){
 if(signal.aborted)return;
 fitStats();const w=$('#mapWrap').clientWidth,h=$('#mapWrap').clientHeight;
 if(w>0&&h>0&&(w!==lastMapWidth||h!==lastMapHeight||!validMapBox(box)))map();
 else if($('#fullMapDialog').open)drawFull();
}
function scheduleResize(){clearTimeout(resize);resize=setTimeout(resizeMaps,100);}
listen(window,'resize',scheduleResize);
// После hidden→visible/смены языка размеры могут вернуться без window.resize.
// Наблюдаем именно оба контейнера, не генерируем пустые кадры в цикле rAF.
const mapObserver=typeof ResizeObserver==='function'?new ResizeObserver(scheduleResize):null;
mapObserver?.observe($('#mapWrap'));mapObserver?.observe($('#fullMapCanvas'));

signal.addEventListener('abort',()=>{
 clearTimeout(toastTimer);clearTimeout(resize);mapObserver?.disconnect();shareJobs.cancel();restoreRevision++;if(panFrame)cancelAnimationFrame(panFrame);
 document.body.style.overflow=beforeOverflow;
 for(const d of $$('dialog[open]')){delete d.dataset.history;d.close();}
 if(previewURL)URL.revokeObjectURL(previewURL);
},{once:true});
}
