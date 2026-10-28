// Export is composed independently from the zoomed live map. Every image fits
// its own routes, embeds our local Inter font, and has a labelled demo watermark.
// No public profile exists in this prototype: never fabricate a working share URL.
import{escapeXML as esc,distance,plural}from'./map.js';
export async function createExporter(model){
 const encode=async url=>{const b=new Uint8Array(await(await fetch(url)).arrayBuffer());let s='';for(const v of b)s+=String.fromCharCode(v);return btoa(s);};
 const fonts=await Promise.all(['inter-latin.woff2','inter-cyrillic.woff2'].map(n=>encode('/assets/'+n)));
 const fmt=n=>Math.round(n).toLocaleString('ru-RU');
 const text=(x,y,value,size=24,fill='#fff',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(value)}</text>`;
 function build({flights,kind,year,flightId,format,light,demo}){const fs=kind==='year'?flights.filter(f=>f.date?.startsWith(year)):kind==='flight'?flights.filter(f=>f.id===flightId):flights;
 const W=1080,H=format==='square'?1080:1920,fg=light?'#171717':'#ffffff',muted=light?'#666b73':'#9399a4',bg=light?'#f8f9fb':'#090a0d',line=light?'#dce0e6':'#292d35',land=light?'#e3e7ec':'#191e27',accent=light?'#0664c7':'#0a84ff';
 const codes=[...new Set(fs.flatMap(f=>[f.from,f.to]))],sum=fs.reduce((n,f)=>n+distance(model.airport[f.from],model.airport[f.to]),0),countries=new Set(codes.map(c=>model.airport[c].country)).size;
 const single=kind==='flight',compact=H===1080,headline=single?'Один перелёт. Новые места.':kind==='year'?'Мой год в небе':'Моя карта перелётов',label=kind==='year'?year:'МОИ ПУТЕШЕСТВИЯ';
 const mapY=compact?250:440,mapH=compact?460:830,box=model.fit(fs,960/mapH);
 let mapBody=model.body(fs,box,480,null,false);
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fonts[0]})}@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fonts[1]});unicode-range:U+0400-052F}text{font-family:Inter,Arial,sans-serif}.land{fill:${land};stroke:${line};stroke-width:.6;vector-effect:non-scaling-stroke}.flight-path{fill:none;stroke:${accent};stroke-width:3;vector-effect:non-scaling-stroke}.airport-dot{fill:${fg};stroke:${accent};stroke-width:2;vector-effect:non-scaling-stroke}.airport-label{fill:${fg};font-weight:600;paint-order:stroke;stroke:${bg};stroke-width:3}</style><radialGradient id="edge"><stop offset="55%" stop-color="white"/><stop offset="100%" stop-color="black"/></radialGradient><mask id="mapFade" maskUnits="userSpaceOnUse" x="60" y="${mapY}" width="960" height="${mapH}"><rect x="60" y="${mapY}" width="960" height="${mapH}" fill="url(#edge)"/></mask></defs><rect width="1080" height="${H}" fill="${bg}"/>`;
 svg+=text(64,88,'airportsboard',25,fg,'font-weight="700"')+text(1016,88,demo?'ПРИМЕР':label,18,muted,'text-anchor="end" letter-spacing="2"');
 if(single&&fs[0]){let f=fs[0];svg+=text(64,compact?177:245,f.from,compact?72:100,fg,'font-weight="700" letter-spacing="-4"')+text(1016,compact?177:245,f.to,compact?72:100,fg,'font-weight="700" text-anchor="end" letter-spacing="-4"')+text(540,compact?170:230,'→',45,muted,'text-anchor="middle"');svg+=text(64,compact?217:305,model.airport[f.from].city,22,muted)+text(1016,compact?217:305,model.airport[f.to].city,22,muted,'text-anchor="end"');}
 else{svg+=text(64,compact?175:235,headline,compact?52:66,fg,'font-weight="700" letter-spacing="-2"');svg+=text(64,compact?220:300,kind==='year'?year+' · места, которые остались со мной':'Все мои маршруты',compact?22:28,muted);}
 const cut=mapBody.indexOf('</g>')+4,frame=`x="60" y="${mapY}" width="960" height="${mapH}" viewBox="${box.x} ${box.y} ${box.w} ${box.h}"`;
 // Fade only the land: endpoint labels and routes must stay readable at edges.
 svg+=`<g mask="url(#mapFade)"><svg ${frame}>${mapBody.slice(0,cut)}</svg></g><svg ${frame}>${mapBody.slice(cut)}</svg>`;
 const sy=compact?772:1380;svg+=`<path d="M64 ${sy-36}H1016" stroke="${line}"/>`;
 const vals=single?[fmt(sum),'2',countries]:[fs.length,countries,fmt(sum)],labs=single?['км между аэропортами','аэропорта',plural(countries,['страна','страны','стран'])+' на карте']:[plural(fs.length,['перелёт','перелёта','перелётов']),plural(countries,['страна','страны','стран'])+' на карте','километров ≈'];
 [64,400,736].forEach((x,i)=>{svg+=text(x,sy+45,vals[i],compact?58:70,fg,'font-weight="700" letter-spacing="-2"')+text(x,sy+88,labs[i],18,muted);});
 svg+=text(64,compact?966:1725,single?'Куда полетим дальше?':'А как выглядит твоя карта?',compact?27:36,fg,'font-weight="600"');
 svg+=text(64,H-60,'airportsboard.live',21,muted)+text(1016,H-60,demo?'ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ':'РАССТОЯНИЕ ПРИБЛИЗИТЕЛЬНО',13,muted,'text-anchor="end" letter-spacing="1"')+'</svg>';
 const caption=(single&&fs[0]?`${model.airport[fs[0].from].city} → ${model.airport[fs[0].to].city}. ${fmt(sum)} км между аэропортами.`:`${kind==='year'?'Мой '+year+' год':'Моя карта перелётов'}: ${fs.length} ${plural(fs.length,['перелёт','перелёта','перелётов'])}, ${countries} ${plural(countries,['страна','страны','стран'])} на карте, примерно ${fmt(sum)} км.`)+'\n'+(single?'Куда полетим дальше?':'А как выглядит твоя карта?')+'\nairportsboard.live'+(demo?'\nДемонстрационный пример.':'');
 return{svg,caption,width:W,height:H};
 }
 async function png(card){const url=URL.createObjectURL(new Blob([card.svg],{type:'image/svg+xml;charset=utf-8'}));try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=card.width;canvas.height=card.height;canvas.getContext('2d').drawImage(img,0,0);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG')),'image/png'));}finally{URL.revokeObjectURL(url);}}
 return{build,png};
}
