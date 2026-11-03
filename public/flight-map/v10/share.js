// Композиция по исследованию 14 конкурентов и концепции ChatGPT 28.10.2026:
// карта — главный объект, подписи читаются на 320–375 px, бренд остаётся нашим.
// Растровый AI-макет не используется: география, числа и PNG строятся локально
// из записей пользователя. Нет личного профиля, точных дат и номеров в картинке.
import {escapeXML as esc,distance} from './map.js';

const text=(x,y,value,size,fill,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(value)}</text>`;
const center='text-anchor="middle"';
const bold=center+' font-weight="700" letter-spacing="-1.5"';
// Это страны/территории аэропортов на карте, а не доказательство выхода из
// транзитной зоны. Пустой код в каталоге не превращаем в ещё одну страну.
// Порядок ISO стабилен между форматом/темой; в плотной истории остаётся один
// ряд из 9 флагов и честное «+N», а не неразличимая сетка из сотни миниатюр.
export function cardCountries(model,flights){return [...new Set(flights.flatMap(f=>[model.airport[f.from]?.country,model.airport[f.to]?.country]).filter(c=>/^[A-Z]{2}$/.test(c)))].sort();}
export function flagLayout(countries,compact){
 const visible=countries.slice(0,9),more=Math.max(0,countries.length-visible.length),w=visible.length>6?64:72,h=w*3/4,gap=24,count=visible.length+(more?1:0),total=count*w+Math.max(0,count-1)*gap;
 return {visible,more,w,h,gap,x:(1080-total)/2,y:compact?866:1470};
}
// Подставляются только наши локальные SVG flag-icons (MIT), не пользовательский
// HTML. Inline-векторы нужны вместо emoji/внешних <image>: PNG одинаков на iOS,
// Android и desktop, без сетевой загрузки из самого canvas. У каждого экземпляра
// собственные ids: clipPath/градиент одного флага не меняет соседний.
// Гербы AR/RS и других флагов используют xlink:href. При встраивании
// сохраняем namespace: иначе HTML-preview виден, но Image.decode отклоняет
// SVG как невалидный XML и PNG не создаётся. Проверено 200 маршрутами и 9 гербами.
function flagMarkup(code,source,x,y,w,h,line,muted){
 let vector='';
 if(source){const root=source.match(/^\s*<svg\b[^>]*viewBox="([\d .-]+)"[^>]*>([\s\S]*)<\/svg>\s*$/);if(root){let inner=root[2];const ids=[...inner.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);for(const id of ids){const next='export-'+code+'-'+id;inner=inner.split('id="'+id+'"').join('id="'+next+'"').split('url(#'+id+')').join('url(#'+next+')').split('href="#'+id+'"').join('href="#'+next+'"');}vector=`<svg xmlns:xlink="http://www.w3.org/1999/xlink" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${root[1]}">${inner}</svg>`;}}
 const title=`<title>${code}</title>`;
 if(!vector)return `<g data-country="${code}">${title}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="${line}"/>${text(x+w/2,y+h/2+10,code,28,muted,center+' font-weight="600"')}</g>`;
 return `<g data-country="${code}">${title}<defs><clipPath id="flag-frame-${code}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/></clipPath></defs><g clip-path="url(#flag-frame-${code})">${vector}</g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="${line}" stroke-width="1.5"/></g>`;
}
// Перенос длинного города вместо мелкого текста. Название не обрезается:
// аварийно длинные слова делятся, максимум каталога проверяется тестом.
export function cityLines(value,limit=23){
 // Считаем видимые графемы: UTF-16 slice раньше разрывал составные индийские
 // буквы/emoji, а CJK занимал вдвое больше места, чем оценка латинских букв.
 const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(String(value))].map(x=>x.segment):Array.from(String(value));
 const width=v=>/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(v)?2:1;
 const lines=[];let line=[],size=0;
 for(const part of parts){
  if(size+width(part)>limit&&line.length){
   const lastSpace=line.lastIndexOf(' ');
   if(lastSpace>0){lines.push(line.slice(0,lastSpace).join(''));line=line.slice(lastSpace+1);size=line.reduce((n,v)=>n+width(v),0);}
   else{lines.push(line.join(''));line=[];size=0;}
  }
  if(!line.length&&/^\s+$/.test(part))continue;
  line.push(part);size+=width(part);
 }
 if(line.length)lines.push(line.join('').trimEnd());return lines;
}
// Один выбор записей используется до загрузки ресурсов и при рендере. Полный
// YYYY-MM-DD и явно неполный YYYY попадают в один год; префикс «20» не может
// случайно выбрать всю историю. Повреждённый маршрут не пропускаем молча: это
// исказило бы цифры экспорта и скрывало бы проблему исходного журнала.
export function selectFlights(model,{flights,kind='map',year,flightId},t){
 if(!Array.isArray(flights)||!['map','year','flight'].includes(kind))throw Error(t('m151'));
 if(kind==='year'&&!/^\d{4}$/.test(String(year)))throw Error(t('m151'));
 if(kind==='flight'&&(typeof flightId!=='string'||!flightId))throw Error(t('m151'));
 const selected=kind==='year'?flights.filter(f=>typeof f?.date==='string'&&/^\d{4}(?:-\d{2}-\d{2})?$/.test(f.date)&&f.date.slice(0,4)===String(year)):kind==='flight'?flights.filter(f=>f?.id===flightId):flights;
 const validAirport=code=>/^[A-Z]{3}$/.test(code)&&model.airport[code]&&Number.isFinite(model.airport[code].lat)&&Number.isFinite(model.airport[code].lon);
 if(!selected.length||selected.some(f=>!f||!validAirport(f.from)||!validAirport(f.to)))throw Error(t('m151'));
 return selected;
}
// Существующие story/square с включёнными блоками сохраняют координаты v5.
// При скрытии статистики/флагов освобождённое место занимает карта, а не дыра.
// Portrait — реальный 4:5, без обрезки квадратного или story-изображения.
export function cardLayout(format,showStats=true,showFlags=true){
 const config={story:{height:1920,brand:207,title:330,subtitle:396,mapTop:475,stats:1320,flags:1470,footer:1620,demo:1680},square:{height:1080,brand:88,title:170,subtitle:226,mapTop:280,stats:758,flags:866,footer:976,demo:1030},portrait:{height:1350,brand:110,title:205,subtitle:265,mapTop:315,stats:1028,flags:1136,footer:1246,demo:1300}}[format];
 if(!config)throw Error('Invalid export format');
 const short=format!=='story',stats=config.stats+(showFlags?0:short?108:110);
 const bottom=showStats?stats-(short?73:125):showFlags?config.flags-75:config.footer-110;
 return {...config,stats,mapBottom:bottom,short};
}
export function buildCard(model,fonts,{flights,kind='map',year,flightId,format='story',light=false,demo=false,flagAssets={},i18n,showStats=true,showFlags=true}){
 const {t,locale,countLabel,statLabel}=i18n,fmt=n=>Math.round(n).toLocaleString(locale);
 const fs=selectFlights(model,{flights,kind,year,flightId},t),layout=cardLayout(format,showStats,showFlags);
 const W=1080,H=layout.height,compact=layout.short,single=kind==='flight';
 const fg=light?'#17191d':'#f7f8fa',muted=light?'#565d67':'#b1b8c4',bg=light?'#fafbfc':'#111419',line=light?'#dce1e7':'#343a43',land=light?'#e8edf3':'#253343',accent=light?'#086ad7':'#459fff';
 const sum=fs.reduce((n,f)=>n+distance(model.airport[f.from],model.airport[f.to]),0),countryCodes=cardCountries(model,fs),countries=countryCodes.length;
 const rows=single?Math.max(...[fs[0].from,fs[0].to].map(c=>cityLines(model.airport[c].city).length)):1;
 const mapY=Math.max(layout.mapTop,single?(format==='portrait'?285:compact?250:415)+(rows-1)*37:layout.mapTop),mapH=layout.mapBottom-mapY;
 if(mapH<100)throw Error(t('m151'));
 const box=model.fit(fs,960/mapH);
 // 320 — масштаб типографики карты, а не разрешение PNG. На 1080px подписи
 // имеют 30–33px и остаются читаемыми после уменьшения до ширины телефона.
 // Уже открытая вкладка может впервые открыть экспорт после выката, сохранив
 // старый createMap в памяти. У прежней географии не было маркера и вложенных
 // групп: сохраняем прежнее разделение, чтобы такой экспорт не ломался.
 const mapBody=model.body(fs,box,320,null,false),geographyEnd='<!--map-geography-end-->',marker=mapBody.indexOf(geographyEnd),cut=marker<0?mapBody.indexOf('</g>')+4:marker+geographyEnd.length;
 const frame=`x="60" y="${mapY}" width="960" height="${mapH}" viewBox="${box.x} ${box.y} ${box.w} ${box.h}"`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" lang="${esc(locale)}"><defs><style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fonts[0]});font-weight:100 900}@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fonts[1]});font-weight:100 900;unicode-range:U+0400-052F}@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fonts[2]});font-weight:100 900;unicode-range:U+0100-02FF,U+1E00-1EFF}text{font-family:Inter,Arial,sans-serif;unicode-bidi:plaintext}.land{fill:${land};stroke:${line};stroke-width:.5;vector-effect:non-scaling-stroke}.country-border{fill:none;stroke:${light?'#b9c8d7':'#465a70'};stroke-width:.65;stroke-opacity:.65;vector-effect:non-scaling-stroke}.flight-path{fill:none;stroke:${accent};stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke}.route-halo{fill:none;stroke:${bg};stroke-width:6;vector-effect:non-scaling-stroke;opacity:.7}.airport-ring{fill:${accent};opacity:.1}.airport-dot{fill:${accent};stroke:${bg};stroke-width:2;vector-effect:non-scaling-stroke}.airport-label{fill:${fg};font-weight:650;paint-order:stroke;stroke:${bg};stroke-linejoin:round}.airport-city{font-weight:400}</style><linearGradient id="edge" x2="0" y2="1"><stop stop-color="black"/><stop offset=".035" stop-color="white"/><stop offset=".965" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="mapFade"><rect width="1080" height="${mapH}" y="${mapY}" fill="url(#edge)"/></mask></defs><rect width="1080" height="${H}" fill="${bg}"/>`;
 const brandY=layout.brand;
 // Векторный самолёт стабилен в SVG/canvas и не зависит от системного emoji.
 svg+=`<g transform="translate(396 ${brandY-32}) scale(1.6)" fill="${fg}"><path d="M22 16v-2L14 9V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5z"/></g>`+text(575,brandY,'airportsboard',40,fg,center+' font-weight="700" letter-spacing="-1"');
 if(single){
  const f=fs[0],y=format==='portrait'?208:compact?173:337;
  svg+=text(265,y,f.from,compact?70:100,fg,bold)+text(815,y,f.to,compact?70:100,fg,bold)+text(540,y-8,'→',42,muted,center);
  for(const [x,code] of [[265,f.from],[815,f.to]])cityLines(model.airport[code].city).forEach((v,i)=>{svg+=text(x,y+45+i*37,v,32,muted,center);});
 }else{
  svg+=text(540,layout.title,kind==='year'?t("m152"):t("m153"),compact?56:72,fg,bold+((kind==='year'?t('m152'):t('m153')).length>27?' textLength="900" lengthAdjust="spacingAndGlyphs"':''));
  svg+=text(540,layout.subtitle,kind==='year'?String(year):t("m154"),36,muted,center);
 }
 // Убираем широкую тёмную дымку прежнего экспорта: короткое затухание только
 // по краям не прячет острова и границы. Линии и точки остаются контрастными.
 svg+=`<g mask="url(#mapFade)"><svg ${frame}>${mapBody.slice(0,cut)}</svg></g><svg ${frame}>${mapBody.slice(cut)}</svg>`;
 if(showStats){
 const sy=layout.stats,values=[fmt(fs.length),fmt(countries),'≈ '+fmt(sum)],labels=[statLabel('flights',fs.length),t("m155"),t("m156")];
 labels[1]=statLabel('countries',countries);
 [220,540,860].forEach((x,i)=>{const size=values[i].length>9?Math.min(48,Math.floor(300/(values[i].length*.61))):values[i].length>7?56:70;svg+=text(x,sy,values[i],size,fg,bold)+text(x,sy+55,labels[i],Math.min(32,Math.floor(270/Math.max(1,[...labels[i]].length)*1.7)),muted,center);});
 svg+=`<path d="M380 ${sy-49}v110M700 ${sy-49}v110" stroke="${line}" stroke-width="2"/>`;
 }
 if(showFlags){
 const flags={...flagLayout(countryCodes,compact),y:layout.flags};
 flags.visible.forEach((code,i)=>{svg+=flagMarkup(code,flagAssets[code],flags.x+i*(flags.w+flags.gap),flags.y,flags.w,flags.h,line,muted);});
 if(flags.more)svg+=text(flags.x+flags.visible.length*(flags.w+flags.gap)+flags.w/2,flags.y+flags.h/2+11,'+'+flags.more,32,muted,center+' font-weight="600"');
 }
 svg+=text(540,layout.footer,'airportsboard.live',36,muted,center);
 if(demo)svg+=text(540,layout.demo,t("m158"),28,muted,center);
 svg+='</svg>';
 const caption=(!showStats?(single?`${model.airport[fs[0].from].city} → ${model.airport[fs[0].to].city}`:kind==='year'?t("yearTitle",{year}):t("m153")):single?`${t("m159",{p0:(model.airport[fs[0].from].city),p1:(model.airport[fs[0].to].city),p2:(fmt(sum))})}`:`${t("m162",{p0:(kind==='year'?t("yearTitle",{year}):t("m153")),p1:(fs.length),p2:(locale==='ar'?t('m016'):countLabel('flights',fs.length)),p3:(countries),p4:(locale==='ar'?t('m155'):countLabel('countries',countries)),p5:(fmt(sum))})}`)+'\nhttps://airportsboard.live/'+i18n.locale+'/flight-map'+(demo?t("m163"):'');
 return {svg,caption,width:W,height:H};
}
export async function createExporter(model,i18n){
 const encode=async name=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch('/fonts/'+name,{signal:controller.signal});if(!r.ok)throw Error('font');const b=new Uint8Array(await r.arrayBuffer());let s='';for(const v of b)s+=String.fromCharCode(v);return btoa(s);}finally{clearTimeout(timer);}};
 // Раньше флаги начинали загружаться только после всех шрифтов: лишний
 // сетевой круг на первом экспорте. Загружаем их параллельно, без подготовки
 // PNG до открытия share. Ошибка шрифта не закрепляется навсегда в promise.
 let fontsPromise;
 const loadFonts=()=>fontsPromise??=Promise.all(['inter-latin.woff2','inter-cyrillic.woff2','inter-latin-ext.woff2'].map(encode)).catch(e=>{fontsPromise=null;throw e;});
 const flags=new Map();
 async function flag(code){
  if(!/^[A-Z]{2}$/.test(code))return '';
  if(!flags.has(code))flags.set(code,(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);try{const r=await fetch('/flight-map/v1/flags/'+code.toLowerCase()+'.svg',{signal:controller.signal});if(!r.ok)throw Error('flag');return await r.text();}catch{return '';}finally{clearTimeout(timer);}})());
  const result=await flags.get(code);if(!result)flags.delete(code);return result;
 }
 async function png(card){
  const url=URL.createObjectURL(new Blob([card.svg],{type:'image/svg+xml;charset=utf-8'}));let canvas;
  try{const img=new Image();img.src=url;await img.decode();canvas=document.createElement('canvas');canvas.width=card.width;canvas.height=card.height;const context=canvas.getContext('2d');if(!context)throw Error('canvas');context.drawImage(img,0,0);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG')),'image/png'));}
  finally{URL.revokeObjectURL(url);if(canvas){canvas.width=0;canvas.height=0;}}
 }
 return {build:async options=>{const fs=selectFlights(model,options,i18n.t);cardLayout(options.format||'story',options.showStats!==false,options.showFlags!==false);const [fonts,entries]=await Promise.all([loadFonts(),Promise.all((options.showFlags===false?[]:cardCountries(model,fs).slice(0,9)).map(async code=>[code,await flag(code)]))]);return buildCard(model,fonts,{...options,i18n,flagAssets:Object.fromEntries(entries)});},png};
}
