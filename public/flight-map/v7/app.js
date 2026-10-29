import{decodeCore}from'./data.js';
import{decodeGeography}from'../v6/data.js';
import{createDeferredSearch}from'./search.js';
import{sameFlights,resizeBox}from'../v5/state.js';
import{createJournalSearch}from'../v4/journal.js';
import{gestureBox}from'../v3/gestures.js';
import{createMap,distance}from'../v6/map.js';
import{latestJob}from'../v2/jobs.js';
import{recentAirports,routePair}from'./entry.js';
import{createSharing}from'../v4/sharing.js';

import{createStorage}from'../v4/storage.js';
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
const [airportData,landData]=await Promise.all([fetch('/flight-map/v7/core-'+locale+'.json',{signal}).then(r=>{if(!r.ok)throw Error('catalogue');return r.json();}),fetch('/flight-map/v6/geography.json',{signal}).then(r=>{if(!r.ok)throw Error('catalogue');return r.json();})]);
if(signal.aborted)return;
const airports=decodeCore(airportData),land=decodeGeography(landData);
const model=createMap(airports,land),airport=model.airport;
// Карта, история, PNG и ввод IATA используют полный основной каталог.
// Поисковые алиасы догружаются отдельно: не блокируют первый кадр и кодовый ввод.
const search=createDeferredSearch(airports,locale,async()=>{const r=await fetch('/flight-map/v7/aliases-'+locale+'.json',{signal});if(!r.ok)throw Error('aliases');return r.json();},signal);
const airportCodes=new Set(airports.map(a=>a.code));
let exporterPromise;
const demo=[['SVX','IST','2025-09-14','TK 476'],['IST','CDG','2025-09-18','TK 1823'],['CDG','IST','2026-02-21','TK 1828'],['IST','SVX','2026-02-22','TK 475'],['SVX','DXB','2026-09-03','FZ 980'],['DXB','BKK','2026-09-04','EK 372']].map((f,id)=>({id:'demo_'+id,from:f[0],to:f[1],date:f[2],number:f[3]}));
let flights=[],personal=[],isDemo=false,period='',selected=null,editing=null,choice={from:null,to:null},box=null,fullBox=null;
let shareKind='map',shareFormat='story',shareLight=false,shareCard=null,shareBlob=null,previewURL=null;
let journalQuery='',journalUndated=false,journalSearch=()=>[];
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
function fit(){box=model.fit(visible(),$('#mapWrap').clientWidth/$('#mapWrap').clientHeight);}
function map(){lastMapWidth=$('#mapWrap').clientWidth;lastMapHeight=$('#mapWrap').clientHeight;const svg=$('#map');svg.setAttribute('viewBox',`${box.x} ${box.y} ${box.w} ${box.h}`);svg.innerHTML=model.body(visible(),box,$('#mapWrap').clientWidth,selected);bindRoutes(svg);$('.map-empty').hidden=visible().length>0;renderSelection($('#mapSelection'));if($('#fullMapDialog').open)drawFull();}
function bindRoutes(svg){svg.querySelectorAll('[data-route]').forEach(p=>p.onclick=()=>{selected=p.dataset.route;render(false);});}
function renderSelection(el){const f=visible().find(x=>x.id===selected);el.hidden=!f;if(!f){el.innerHTML='';return;}el.innerHTML=`<div><strong>${esc(airport[f.from].city)} → ${esc(airport[f.to].city)}</strong><small>${t("m081",{p2:(fmt(km(f)))})}</small></div><button class="icon" aria-label="${esc(t("m082"))}" data-route-share>↗</button><button class="icon" aria-label="${esc(t("m083"))}" data-unselect>×</button>`;el.querySelector('[data-unselect]').onclick=()=>{selected=null;render(false);};el.querySelector('[data-route-share]').onclick=()=>{if($('#fullMapDialog').open){close($('#fullMapDialog'),()=>makeShare('flight'));return;}makeShare('flight');};}
function drawFull(){const fs=visible(),wrap=$('#fullMapCanvas');if(!fullBox)fullBox=model.fit(fs,wrap.clientWidth/wrap.clientHeight);wrap.innerHTML=`<svg viewBox="${fullBox.x} ${fullBox.y} ${fullBox.w} ${fullBox.h}" aria-label="${esc(t("m084"))}">${model.body(fs,fullBox,wrap.clientWidth,selected)}</svg>`;bindRoutes(wrap);renderSelection($('#fullMapSelection'));}
// Миллионы километров в большом журнале выходили за колонку на 320px.
// Уменьшаем только число, которое действительно не помещается; обычные значения
// сохраняют текущий шрифт. Пересчёт нужен также после поворота экрана.
function fitStats(){for(const b of $$('#stats .stat b')){b.style.fontSize='';const available=b.parentElement.clientWidth-8, width=b.getBoundingClientRect().width;if(width>available&&available>0)b.style.fontSize=Math.max(14,Math.floor(parseFloat(getComputedStyle(b).fontSize)*available/width))+'px';}}
function render(reset=true){if(reset)journalLimit=50;$('#storageStatus').textContent=storageError||(isDemo?t("m085"):t("m086")+personal.length+' '+countLabel('flights',personal.length));$('#storageStatus').classList.toggle('storage-error',!!storageError);const stats=totals();$('.atlas').classList.toggle('is-empty',stats.flights===0);if(reset||!box)fit();map();$('#stats').innerHTML=`<div class="stat"><b>${stats.flights}</b><span>${statLabel('flights',stats.flights)}</span></div><div class="stat"><b>${stats.countries}</b><span>${statLabel('countries',stats.countries)}</span></div><div class="stat"><b>${fmt(stats.km)}</b><span>${t("m088")}</span></div>`;
 fitStats();$('#journalCount').textContent=period||t("m089");
 const years=[...new Set(flights.map(f=>f.date?.slice(0,4)).filter(Boolean))].sort().reverse();$('#period').innerHTML=`<option value="">${t("m007")}</option>`+years.map(y=>`<option value="${y}">${y}</option>`).join('');$('#period').value=period;
 $('#shareNudge').hidden=flights.length===0;$$('[data-action="share"]').forEach(b=>b.disabled=!flights.length);
 $('.demo-bar').querySelector('span').textContent=isDemo?t("m090"):t("m091");$('#clearDemo').textContent=isDemo?t("m092"):t("m004");
 journalSearch=createJournalSearch(visible(),airport);renderJournal();
}
function renderJournal(){
 const results=journalSearch(journalQuery).filter(f=>!journalUndated||!f.date);
 $('#journalTools').hidden=!flights.length;$('#clearJournal').hidden=!journalQuery&&!journalUndated;
 $('#journalResults').textContent=(journalQuery||journalUndated)?`${t("m093",{p0:(results.length),p1:(visible().length)})}`:'';
 $('#flightList').innerHTML=results.slice(0,journalLimit).map(f=>`<article class="flight${selected===f.id?' selected':''}" tabindex="0" role="button" aria-label="${esc(airport[f.from].city+' — '+airport[f.to].city)}" data-id="${f.id}"><div class="flight-top"><span>${f.date?new Date(f.date+'T12:00:00').toLocaleDateString(locale,{day:'numeric',month:'short',year:'numeric'}):t("m094")}${f.number?' · '+esc(f.number):''}</span><button aria-label="${esc(t("m095",{p5:f.from+' — '+f.to}))}" data-edit="${f.id}">···</button></div><div class="route"><div><strong>${f.from}</strong><small>${esc(airport[f.from].city)}</small></div><div class="route-line"><span>✈</span></div><div><strong>${f.to}</strong><small>${esc(airport[f.to].city)}</small></div></div></article>`).join('')||`<div class="empty-list">${journalQuery||journalUndated?t("m096"):t("m097")}</div>`;
 $('#flightList').querySelectorAll('[data-id]').forEach(el=>{const choose=()=>{selected=el.dataset.id;render(false);$('.atlas').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};el.onclick=e=>{if(!e.target.closest('[data-edit]'))choose();};el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('[data-edit]')){e.preventDefault();choose();}};});
 // Журнал раскрывается порциями: 5000 записей не создают сразу 50 000 DOM-узлов.
 // Карта, статистика, backup и экспорт всегда используют полный набор.
 $('#moreFlights')?.remove();if(results.length>journalLimit){const more=document.createElement('button');more.id='moreFlights';more.className='primary';more.style.width='100%';more.textContent=t("m098")+Math.min(50,results.length-journalLimit);more.onclick=()=>{journalLimit+=50;renderJournal();$('#flightList [data-id]:nth-child('+Math.max(1,journalLimit-49)+')')?.focus({preventScroll:true});};$('#flightList').after(more);}
 $$('[data-edit]').forEach(el=>el.onclick=()=>openForm(el.dataset.edit));
}
listen($('#journalSearch'),'input',()=>{journalQuery=$('#journalSearch').value;journalLimit=50;renderJournal();});
listen($('#undatedOnly'),'change',()=>{journalUndated=$('#undatedOnly').checked;journalLimit=50;renderJournal();});
$('#clearJournal').onclick=()=>{journalQuery='';journalUndated=false;$('#journalSearch').value='';$('#undatedOnly').checked=false;journalLimit=50;renderJournal();$('#journalSearch').focus();};
let toastTimer;function toast(s){$('#toast').onclick=null;$('#toast').style.pointerEvents='none';$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
// A local history entry lets Android/browser Back close a sheet instead of
// leaving the map. Closing by Escape/cross removes the same entry exactly once.
let afterClose=null;
function close(d,next=null){afterClose=next;d.close();}
function open(d){if(d.open||signal.aborted)return;history.pushState({...history.state,abDialog:d.id},'',location.href);d.dataset.history='1';d.showModal();document.body.style.overflow='hidden';}
listen(window,'popstate',()=>{for(const d of $$('dialog[open]')){delete d.dataset.history;d.close();}const next=afterClose;afterClose=null;next?.();});
$$('dialog .close').forEach(b=>b.onclick=()=>close(b.closest('dialog')));
$$('dialog').forEach(d=>{d.addEventListener('close',()=>{if(signal.aborted)return;document.body.style.overflow=beforeOverflow;syncStored();if(d.dataset.history&&history.state?.abDialog===d.id){delete d.dataset.history;history.back();}});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close(d);}});});
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
function quickRoutes(){const last=personal.at(-1),area=$('#quickRoutes');area.hidden=editing!==null||!last;area.innerHTML='';if(area.hidden)return;
 for(const [label,from,to] of [[t("m099"),last.from,last.to],[t("m100"),last.to,last.from]]){const b=document.createElement('button');b.type='button';b.className='quick-route';b.textContent=`${label} \u2066${from} → ${to}\u2069`;b.setAttribute('aria-label',`${label}: ${airport[from].city} → ${airport[to].city}`);b.onclick=()=>{setAirport('from',from);setAirport('to',to);hideSuggestions();$('#saveFlight').focus();};area.append(b);}
}
function resetForm(f=null,from=null){$('#flightForm').reset();$('.extra-fields').open=!!f;$('#formError').textContent='';$('#formStatus').textContent='';hideSuggestions();setAirport('from',f?.from||from);setAirport('to',f?.to||null);$('#date').value=f?.date||'';$('#number').value=f?.number||'';$('#saveFlight').textContent=f?t("m101"):t("m015");$('#saveMore').hidden=!!f;$('#saveFlight').disabled=$('#saveMore').disabled=false;quickRoutes();}
function openForm(id=null){if(saving)return;if(id===null&&isDemo){syncStored();flights=personal;isDemo=false;selected=null;period='';const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);render();}formRevision++;editing=id;const f=flights.find(f=>f.id===id);resetForm(f);$('#formTitle').textContent=f?(isDemo?t("m102"):t("m103")):t("m015");$('#deleteFlight')?.remove();if(f){const b=document.createElement('button');b.id='deleteFlight';b.type='button';b.textContent=t("m104");b.className='delete-flight';b.onclick=async()=>{if(saving)return;saving=true;try{const saved=f;if(!await applyFlights(flights.filter(x=>x.id!==f.id)))return;const deletedDemo=isDemo;close($('#addDialog'));render();toast(t("m105"));$('#toast').style.pointerEvents='auto';$('#toast').onclick=async()=>{if(isDemo!==deletedDemo)return;if(!await applyFlights([...flights,saved]))return;render();toast(t("m106"));$('#toast').onclick=null;$('#toast').style.pointerEvents='none';};}finally{saving=false;}};$('#flightForm').append(b);}open($('#addDialog'));if(!f)$('#from').focus();}
for(const side of ['from','to']){
 const input=$('#'+side),list=$('#'+side+'Results');
 const choose=code=>{setAirport(side,code);hideSuggestions();if(side==='from')$('#to').focus();else $('#saveFlight').focus();};
 const show=async()=>{
  hideSuggestions();const revision=suggestionRevision,value=input.value,options={recent:recentAirports(personal),exclude:choice[side==='from'?'to':'from']};
  const active=()=>!signal.aborted&&revision===suggestionRevision&&$('#addDialog').open&&document.activeElement===input;
  let rows=search.instant(value,options);
  if(!rows){
   if(!search.ready){list.innerHTML=`<p class="search-empty" role="status">${esc(t('searchLoading'))}</p>`;input.setAttribute('aria-expanded','true');input.setAttribute('aria-busy','true');revealSuggestions();}
   try{rows=await search.query(value,options);}catch{
    if(!active())return;input.removeAttribute('aria-busy');input.setAttribute('aria-expanded','true');list.innerHTML=`<p class="search-empty" role="status">${esc(t('searchLoadError'))}</p><button type="button">${esc(t('retry'))}</button>`;list.querySelector('button').onclick=()=>{input.focus();};return;
   }
  }
  // Поздний ответ не открывает закрытую форму и не заменяет более новый запрос.
  if(!active())return;input.removeAttribute('aria-busy');
  list.innerHTML=rows.map(a=>`<button type="button" role="option" aria-selected="false" data-code="${a.code}"><span>${esc(a.city)}${a.name!==a.city?`<small>${esc(a.name)}</small>`:''}</span><b>${a.code}</b></button>`).join('')||`<p class="search-empty">${t("m107")}</p>`;input.setAttribute('aria-expanded','true');revealSuggestions();
  list.querySelectorAll('button').forEach((b,i)=>{b.onclick=()=>choose(b.dataset.code);b.onkeydown=e=>{const bs=[...list.querySelectorAll('button')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();bs[(i+(e.key==='ArrowDown'?1:bs.length-1))%bs.length].focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();input.focus();hideSuggestions();}};});
 };
 input.oninput=()=>{choice[side]=null;$('#formError').textContent='';const pair=routePair(input.value,airportCodes);if(pair){setAirport('from',pair.from);setAirport('to',pair.to);hideSuggestions();$('#saveFlight').focus();return;}show();};
 input.onfocus=()=>{if(choice[side])input.select();else show();};
 input.onkeydown=e=>{if((e.key==='ArrowDown'||e.key==='Enter')&&!e.isComposing&&list.querySelector('[data-code]')){e.preventDefault();if(e.key==='Enter')choose(list.querySelector('[data-code]').dataset.code);else list.querySelector('[data-code]').focus();}if(e.key==='Escape'&&list.childElementCount){e.preventDefault();e.stopPropagation();hideSuggestions();}};
}
// Закрываем после click, не pointerdown: исчезновение списка сдвигает нижний
// sheet между нажатием и отпусканием, из-за чего первый tap по кнопке пропадал.
// composedPath сохраняет исходное поле даже после перерисовки его подсказок.
listen(root,'click',e=>{const path=e.composedPath();if(path.includes($('#addDialog'))&&!path.some(el=>el.classList?.contains('airport-field')))hideSuggestions();});
$('.swap').onclick=()=>{const from=choice.from,to=choice.to,fromText=$('#from').value,toText=$('#to').value;choice={from:to,to:from};$('#from').value=toText;$('#to').value=fromText;hideSuggestions();};
$('#flightForm').onsubmit=async e=>{e.preventDefault();if(saving)return;
 if($('#date').value>todayString){$('#formError').textContent=t("m108");return;}
 if(!choice.from||!choice.to){$('#formError').textContent=t("m109");$('#'+(!choice.from?'from':'to')).focus();return;}
 if(choice.from===choice.to){$('#formError').textContent=t("m110");return;}
 const revision=formRevision,wasNew=editing===null,more=wasNew&&e.submitter?.id==='saveMore';
 const f={id:editing??(isDemo?'demo_'+newId():newId()),from:choice.from,to:choice.to,date:$('#date').value,number:$('#number').value.trim()};
 // Блокировка ставится до await Web Locks: двойной tap не создаёт две записи.
 saving=true;$('#saveFlight').disabled=$('#saveMore').disabled=true;
 try{if(!await applyFlights(wasNew?[...flights,f]:flights.map(x=>x.id===editing?f:x)))return;if(signal.aborted)return;
  period='';selected=f.id;if(!isDemo)track('saved');render();
  if(revision!==formRevision||!$('#addDialog').open)return;
  if(more){editing=null;resetForm(null,f.to);$('#formStatus').textContent=`${t("m111",{p0:(f.from),p1:(f.to)})}`;$('#addDialog').scrollTop=0;$('#to').focus();}
  else{close($('#addDialog'));toast(wasNew?t("m112"):t("m113"));}
 }finally{saving=false;if(!signal.aborted){$('#saveFlight').disabled=$('#saveMore').disabled=false;}}
};
$('#clearDemo').onclick=()=>{syncStored();if(isDemo){flights=personal;isDemo=false;}else{personal=flights;flights=structuredClone(demo);isDemo=true;}selected=null;period='';const url=new URL(location.href);if(isDemo)url.searchParams.set('demo','');else url.searchParams.delete('demo');history.replaceState(history.state,'',url);render();};
$('#period').onchange=()=>{period=$('#period').value;selected=null;fullBox=null;render();};
$('#fit').onclick=()=>{fit();map();};for(const [id,f] of [['zoomIn',.8],['zoomOut',1.25]])$('#'+id).onclick=()=>{if(box.w*f<50||box.w*f>1100)return;box={...box,x:box.x+box.w*(1-f)/2,y:box.y+box.h*(1-f)/2,w:box.w*f,h:box.h*f};map();};
// Резервная копия относится к журналу. Тема и язык остаются в настоящих настройках сайта.
$('#openBackup').onclick=()=>open($('#backupDialog'));
// PNG готов до пользовательского tap: iOS требует navigator.share прямо
// из жеста. Очередь коалесцирует быстрые переключения, старый результат не
// перетирает новую карточку или ошибку; при сетевой ошибке загрузку можно повторить.
const shareJobs=latestJob({
 async run(options,current){
  exporterPromise??=import(/* webpackIgnore: true */ '/flight-map/v5/exporter.js').then(m=>m.createExporter(model,i18n)).catch(e=>{exporterPromise=null;throw e;});
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
  $('#nativeShare').hidden=!can;$('#nativeShare').disabled=!can||sharingBusy;
  $('#shareStatus').textContent=can?t("m118"):t("m119");
  track('export',{export_kind:options.kind,format:options.format});
 },
 error(){if(signal.aborted||!$('#shareDialog').open)return;$('#sharePreview').setAttribute('aria-busy','false');$('#shareStatus').textContent=t("m120");}
});
function refreshShare(){shareBlob=null;shareCard=null;shareFile=null;$('#sharePreview').setAttribute('aria-busy','true');$('#nativeShare').disabled=true;$('#download').disabled=true;$('#copyCaption').disabled=true;$('#shareStatus').textContent=t("m121");
 $$('.share-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shareKind===shareKind)));$$('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===shareFormat)));
 $('#shareYear').hidden=shareKind!=='year';$('#shareFlight').hidden=shareKind!=='flight';$('#caption').hidden=true;
 shareJobs.push({flights,kind:shareKind,year:$('#shareYear').value,flightId:$('#shareFlight').value,format:shareFormat,light:shareLight,demo:isDemo});
}
listen($('#shareDialog'),'close',()=>{shareJobs.cancel();shareBlob=null;shareCard=null;shareFile=null;if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}$('#sharePreview').innerHTML='';});
function makeShare(kind='map'){if(!flights.length){toast(t("m122"));return;}shareKind=kind==='map'&&period?'year':kind;shareLight=document.documentElement.dataset.theme==='light'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: light)').matches);
 const years=[...new Set(flights.map(f=>f.date?.slice(0,4)).filter(Boolean))].sort().reverse();$('#shareYear').innerHTML=years.map(y=>`<option>${y}</option>`).join('');$('[data-share-kind="year"]').disabled=!years.length;if(period&&years.includes(period))$('#shareYear').value=period;
 $('#shareFlight').innerHTML=flights.map(f=>`<option value="${f.id}">${f.from} → ${f.to}${f.date?' · '+f.date:''}</option>`).join('');$('#shareFlight').value=selected??flights[flights.length-1].id;$('#sharePreview').innerHTML='';open($('#shareDialog'));refreshShare();}
$$('[data-share-kind]').forEach(b=>b.onclick=()=>{shareKind=b.dataset.shareKind;refreshShare();});$$('[data-format]').forEach(b=>b.onclick=()=>{shareFormat=b.dataset.format;refreshShare();});$('#shareYear').onchange=$('#shareFlight').onchange=refreshShare;$('#exportTheme').onclick=()=>{shareLight=!shareLight;refreshShare();};
$('#download').onclick=()=>{if(!shareBlob)return;const a=document.createElement('a'),u=URL.createObjectURL(shareBlob);a.href=u;a.download=`airportsboard-${shareKind}-${shareFormat}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);$('#shareStatus').textContent=t("m123");};
// Двойной tap не запускает второе системное окно. После закрытия/смены
// картинки старый promise не меняет статус нового предпросмотра.
$('#nativeShare').onclick=()=>{if(!shareFile||sharingBusy)return;const file=shareFile;sharingBusy=true;$('#nativeShare').disabled=true;
 try{Promise.resolve(shareImage(navigator,file)).then(()=>{if(!signal.aborted&&shareFile===file&&$('#shareDialog').open)$('#shareStatus').textContent=t("m124");}).catch(e=>{if(!signal.aborted&&shareFile===file&&$('#shareDialog').open)$('#shareStatus').textContent=e.name==='AbortError'?t("m125"):t("m126");}).finally(()=>{sharingBusy=false;if(!signal.aborted)$('#nativeShare').disabled=!shareFile||!canShareImage(navigator,shareFile);});}
 catch{sharingBusy=false;$('#nativeShare').disabled=false;$('#shareStatus').textContent=t("m127");}
};
$('#serviceLinks').innerHTML=serviceLinks().map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${x.name}</a>`).join('');
$('#shareService').hidden=typeof navigator.share!=='function';
$('#shareService').onclick=()=>{try{Promise.resolve(navigator.share({title:t("m128"),text:INVITE,url:SHARE_URL})).catch(e=>{if(!signal.aborted&&e.name!=='AbortError')$('#linkStatus').textContent=t("m129");});}catch{$('#linkStatus').textContent=t("m129");}};
$('#copyService').onclick=async()=>{try{await navigator.clipboard.writeText(SHARE_URL);if(!signal.aborted)$('#linkStatus').textContent=t("m130");}catch{if(!signal.aborted){$('#serviceUrl').hidden=false;$('#serviceUrl').select();$('#linkStatus').textContent=t("m131");}}};
$('#copyCaption').onclick=async()=>{if(!shareCard)return;try{await Promise.race([navigator.clipboard.writeText(shareCard.caption),new Promise((_,reject)=>setTimeout(()=>reject(new Error('clipboard-timeout')),1500))]);$('#shareStatus').textContent=t("m132");}catch{$('#caption').hidden=false;$('#caption').select();$('#shareStatus').textContent=t("m133");}};
$('#expandMap').onclick=()=>{if(!visible().length)return;fullBox=null;open($('#fullMapDialog'));drawFull();};
function zoomFull(f){if(!fullBox)return;const w=Math.min(Math.max(1500,fullBox.w),Math.max(60,fullBox.w*f));f=w/fullBox.w;if(f===1)return;fullBox={...fullBox,x:fullBox.x+fullBox.w*(1-f)/2,y:fullBox.y+fullBox.h*(1-f)/2,w,h:fullBox.h*f};drawFull();}
$('#fullZoomIn').onclick=()=>zoomFull(.8);$('#fullZoomOut').onclick=()=>zoomFull(1.25);$('#fullFit').onclick=()=>{fullBox=null;drawFull();};
// Два пальца увеличивают карту вокруг их середины, один перемещает её.
// После поднятия пальца начинаем отсчёт заново: иначе pinch превращался бы
// в скачок single-pan. Pointercancel/закрытие сбрасывают жест. На каждом кадре
// меняем только viewBox; береговая линия и подписи обновляются после жеста.
let panFrame=0,moved=false,gesture=null;const pointers=new Map(),full=$('#fullMapCanvas');
const point=e=>{const r=full.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
function beginGesture(){gesture=fullBox?{box:{...fullBox},points:[...pointers.values()]}:null;}
function paintGesture(){if(!panFrame)panFrame=requestAnimationFrame(()=>{panFrame=0;if(fullBox)full.querySelector('svg')?.setAttribute('viewBox',`${fullBox.x} ${fullBox.y} ${fullBox.w} ${fullBox.h}`);});}
full.onpointerdown=e=>{if((e.pointerType==='mouse'&&e.button!==0)||pointers.size>=2)return;if(!pointers.size)moved=false;pointers.set(e.pointerId,point(e));beginGesture();};
full.onpointermove=e=>{if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,point(e));const points=[...pointers.values()];if(points.length===2||points.some((p,i)=>Math.hypot((p.x-gesture.points[i].x)*full.clientWidth,(p.y-gesture.points[i].y)*full.clientHeight)>6))moved=true;if(!moved)return;for(const id of pointers.keys())full.setPointerCapture(id);fullBox=gestureBox(gesture.box,gesture.points,points);paintGesture();};
const endGesture=e=>{if(!pointers.delete(e.pointerId))return;if(pointers.size){beginGesture();return;}gesture=null;if(panFrame){cancelAnimationFrame(panFrame);panFrame=0;}if(moved&&$('#fullMapDialog').open)drawFull();};
full.onpointerup=full.onpointercancel=endGesture;
full.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
listen($('#fullMapDialog'),'close',()=>{pointers.clear();gesture=null;if(panFrame){cancelAnimationFrame(panFrame);panFrame=0;}});
listen(full,'keydown',e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0'){fullBox=null;drawFull();}else zoomFull(e.key==='-'?1.25:.8);}});
$$('[data-action]').forEach(b=>b.onclick=e=>{e.preventDefault();switch(b.dataset.action){case'add':openForm();break;case'share':makeShare('map');break;}});

// Import preview and saving share the same validation path, so a corrupt backup
// cannot silently turn a complete journal into a partial one.
async function applyFlights(next){try{if(isDemo){flights=next;return true;}if(!store)throw Error(t("m134"));personal=await store.writeAsync(next);flights=personal;storageError='';return !signal.aborted;}catch(e){storageError=e.message;$('#formError').textContent=e.message;$('#restoreError').textContent=e.message;$('#storageStatus').textContent=e.message;toast(e.message);return false;}}
// Закрытие sheet раньше всегда делало render+fit: теряло пользовательский zoom
// и повторно рисовало SVG после каждого сохранения. Перечитываем хранилище для
// межвкладочных изменений, но перерисовываем только действительно новые записи.
function syncStored(){if(!store||signal.aborted)return;try{const next=store.read(),changed=!sameFlights(personal,next),hadError=!!storageError;personal=next;if(!isDemo)flights=personal;storageError='';if(period&&!flights.some(f=>f.date.startsWith(period)))period='';if(changed||hadError)render();}catch(e){storageError=e.message;$('#storageStatus').textContent=e.message;}}
listen(window,'storage',e=>{if(e.key!==KEY&&e.key!==null)return;if($('dialog[open]'))return;syncStored();});
function downloadText(text,name){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);}
$('#backup').onclick=()=>{syncStored();if(storageError){try{const raw=localStorage.getItem(KEY);if(raw!==null)downloadText(raw,'airportsboard-unreadable-original.json');else toast(storageError);}catch{toast(storageError);}return;}track('backup');downloadText(backup(personal),'airportsboard-backup-'+todayString+'.json');$('#backupStatus').textContent=t("m135");};
$('#restoreFile').onchange=async e=>{const revision=++restoreRevision,file=e.target.files?.[0];e.target.value='';if(!file)return;$('#backupStatus').textContent=t("m136");try{if(file.size>MAX_BYTES)throw Error(t("m137"));const text=await file.text();if(revision!==restoreRevision||!$('#backupDialog').open)return;const incoming=parse(text,new Set(airports.map(a=>a.code)));syncStored();if(storageError)throw Error(storageError);const result=merge(personal,incoming);pendingRestore=incoming;$('#restoreSummary').textContent=`${t("m138",{p0:(result.added),p1:(result.existing),p2:(result.conflicts)})}`;$('#restoreError').textContent='';$('#restoreConfirm').disabled=!result.added;$('#restoreList').innerHTML=incoming.slice(0,5).map(f=>`<li>${esc(airport[f.from].city)} → ${esc(airport[f.to].city)} <small>${esc(f.date||t("m020"))}</small></li>`).join('');$('#backupStatus').textContent='';close($('#backupDialog'),()=>open($('#restoreDialog')));}catch(e){$('#backupStatus').textContent=e.message;}};
$('#restoreConfirm').onclick=async()=>{if(!pendingRestore)return;try{const result=merge(personal,pendingRestore);if(!store)throw Error(t("m139"));personal=await store.writeAsync(result.flights);if(signal.aborted)return;flights=personal;isDemo=false;period='';selected=null;const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);pendingRestore=null;storageError='';close($('#restoreDialog'));render();track('restore');toast(t("m140")+result.added);}catch(e){$('#restoreError').textContent=e.message;}};

$$('button').forEach(b=>b.disabled=false);root.removeAttribute('aria-busy');render();track('open');
// Не создаём длинную задачу индекса внутри mount. Ошибка фоновой загрузки
// показывается только при поиске, где доступен retry; карта остаётся рабочей.
search.prepare().then(()=>{if(!signal.aborted)root.dataset.searchReady='true';}).catch(()=>{});let resize;
// Клавиатура меняет viewport, но обычно не размеры карты. Не пересоздаём
// журнал/географию и не сбрасываем zoom на каждый resize. При повороте экрана
// сохраняем центр и ширину видимой области, меняя только её пропорции.
listen(window,'resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{
 fitStats();const w=$('#mapWrap').clientWidth,h=$('#mapWrap').clientHeight;
 if(w>0&&h>0&&(w!==lastMapWidth||h!==lastMapHeight)){lastMapWidth=w;lastMapHeight=h;box=resizeBox(box,w/h);map();}
 if($('#fullMapDialog').open){const wrap=$('#fullMapCanvas');if(wrap.clientWidth&&wrap.clientHeight){fullBox=resizeBox(fullBox,wrap.clientWidth/wrap.clientHeight);drawFull();}}
},100);});

signal.addEventListener('abort',()=>{
 clearTimeout(toastTimer);clearTimeout(resize);shareJobs.cancel();restoreRevision++;if(panFrame)cancelAnimationFrame(panFrame);
 document.body.style.overflow=beforeOverflow;
 for(const d of $$('dialog[open]')){delete d.dataset.history;d.close();}
 if(previewURL)URL.revokeObjectURL(previewURL);
},{once:true});
}
