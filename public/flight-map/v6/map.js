// The map is local SVG, not remote tiles. Great-circle samples and unwrapped
// longitudes keep Pacific routes short; fitting includes the whole arc, not just
// its endpoints. These are approximate connections, not a flight's recorded trajectory.
export const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const plural=(n,forms)=>forms[n%100>=11&&n%100<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];
export function distance(a,b){const r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lon-a.lon)*r;return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2)));}
// Одна линия на пару аэропортов, но все записи остаются в статистике и журнале.
// Раньше 5000 повторов давали 11 МБ SVG и тысячи совпадающих hit-targets.
// Выделенная запись имеет приоритет, иначе линия открывает последний перелёт.
export function uniqueRoutes(flights,selected=null){
 const routes=new Map();
 for(const f of flights){const key=[f.from,f.to].sort().join(':');const previous=routes.get(key);
  if(!previous||f.id===selected||(previous.id!==selected&&(f.date||'')>=(previous.date||'')))routes.set(key,f);
 }
 return [...routes.values()];
}
export function createMap(airports,land){
 const airport=Object.fromEntries(airports.map(a=>[a.code,a]));
 // Mercator preserves familiar local shapes; clamp polar data to keep every
 // coordinate finite. Detailed 50m coastlines are simplified offline, so no
 // tile provider, WebGL bundle or network request accompanies map interaction.
 const xy=a=>[(a.lon+180)*1000/360,500-1000/(2*Math.PI)*Math.log(Math.tan(Math.PI/4+Math.max(-85,Math.min(85,a.lat))*Math.PI/360))];
 // Береговая линия оставлена 50m: не теряем острова и не меняем геометрию
 // коротких/тихоокеанских маршрутов ради оформления. Тонкие сухопутные границы
 // Natural Earth (public domain) дают ориентиры внутри больших материков.
 // Старый массив также поддерживается: открытый до выката клиент может иметь
 // старую копию JSON. Границы — один локальный путь, без тайлов и геосервисов.
 const path=(lines,closed)=>lines.map(r=>'M'+r.map(([lon,lat])=>xy({lon,lat}).map(n=>n.toFixed(2)).join(',')).join('L')+(closed?'Z':'')).join('');
 // v6 получает заранее спроецированные пути; все строки проверены против v2.
 const geom=land.geom??path(Array.isArray(land)?land:land.land,true),borders=land.geom!==undefined?land.borders:path(Array.isArray(land)?[]:land.borders||[],false);
 function center(fs){const xs=[...new Set(fs.flatMap(f=>[f.from,f.to]))].map(c=>xy(airport[c])[0]).sort((a,b)=>a-b);if(!xs.length)return 570;let best=-1,start=xs[0];for(let i=0;i<xs.length;i++){let end=xs[(i+1)%xs.length]+(i===xs.length-1?1000:0),gap=end-xs[i];if(gap>best){best=gap;start=end;}}return (start+(1000-best)/2)%1000;}
 const unwrap=(x,c)=>x+Math.round((c-x)/1000)*1000;
 function point(code,c){const [x,y]=xy(airport[code]);return [unwrap(x,c),y];}
 const arcCache=new Map();
 function arc(f,c){const key=f.from+':'+f.to+':'+c;if(arcCache.has(key))return arcCache.get(key);const a=airport[f.from],b=airport[f.to],rad=Math.PI/180;
  const v=p=>[Math.cos(p.lat*rad)*Math.cos(p.lon*rad),Math.cos(p.lat*rad)*Math.sin(p.lon*rad),Math.sin(p.lat*rad)];let av=v(a),bv=v(b),omega=Math.acos(Math.max(-1,Math.min(1,av.reduce((n,x,i)=>n+x*bv[i],0)))),sin=Math.sin(omega),last=point(f.from,c)[0],out=[];
  for(let i=0;i<=48;i++){let t=i/48,p;if(Math.abs(sin)<1e-6){p={lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t};}else{let q=av.map((x,j)=>(x*Math.sin((1-t)*omega)+bv[j]*Math.sin(t*omega))/sin);p={lat:Math.atan2(q[2],Math.hypot(q[0],q[1]))/rad,lon:Math.atan2(q[1],q[0])/rad};}let [x,y]=xy(p);x=unwrap(x,last);last=x;out.push([x,y]);}if(arcCache.size>=512)arcCache.delete(arcCache.keys().next().value);arcCache.set(key,out);return out;
 }
 function fit(fs,ratio=1.5){fs=uniqueRoutes(fs);const c=center(fs);if(!fs.length)return{x:365,y:200,w:480,h:480/ratio,c};let bounds=[Infinity,Infinity,-Infinity,-Infinity];for(const f of fs)for(const [x,y] of arc(f,c)){bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];}let [minX,minY,maxX,maxY]=bounds;let w=Math.max(110,maxX-minX+70),h=Math.max(80,maxY-minY+70);if(w/h<ratio)w=h*ratio;else h=w/ratio;return{x:(maxX+minX)/2-w/2,y:(maxY+minY)/2-h/2,w,h,c};}
 let serial=0;
 function body(fs,box,width=375,selected=null,interactive=true){fs=uniqueRoutes(fs,selected);let s=box.w/width,codes=[...new Set(fs.flatMap(f=>[f.from,f.to]))],landId='coast-'+(++serial),out=`<g><defs><g id="${landId}"><path class="land" d="${geom}"/>${borders?`<path class="country-border" fill="none" stroke="#8997a7" stroke-opacity=".45" stroke-width=".6" vector-effect="non-scaling-stroke" d="${borders}"/>`:''}</g></defs><use href="#${landId}"/><use transform="translate(-1000 0)" href="#${landId}"/><use transform="translate(1000 0)" href="#${landId}"/></g><!--map-geography-end-->`;
  for(const f of fs){let d='M'+arc(f,box.c).map(p=>p.map(n=>n.toFixed(2)).join(',')).join('L');out+=`<path class="route-halo" d="${d}"/><path class="flight-path${f.id===selected?' selected':''}" d="${d}"/>`;if(interactive)out+=`<path class="route-hit" data-route="${f.id}" d="${d}"><title>${escapeXML(f.from+' — '+f.to)}</title></path>`;}
  // Cities make a personal map readable without knowing IATA codes. Place
  // the selected route first and try both sides; omit colliding labels rather
  // than layering text over neighbouring airports on narrow phones.
  // Для плотной сети сначала подписи главных узлов, затем периферии.
  // Ограничиваем только подписи, не историю или количество точек на карте.
  const degree=new Map();for(const f of fs)for(const code of [f.from,f.to])degree.set(code,(degree.get(code)||0)+1);
  codes.sort((a,b)=>(degree.get(b)-degree.get(a))||a.localeCompare(b));
  const selectedFlight=fs.find(f=>f.id===selected);
  if(selectedFlight)codes.sort((a,b)=>Number([selectedFlight.from,selectedFlight.to].includes(b))-Number([selectedFlight.from,selectedFlight.to].includes(a)));
  let labels=[];for(const code of codes){let [x,y]=point(code,box.c),name=airport[code].city;
   const city=name.length>18?name.slice(0,17)+'…':name,w=Math.max(35,city.length*5.5)*s,h=30*s;
   out+=`<circle class="airport-ring" cx="${x}" cy="${y}" r="${6*s}"/><circle class="airport-dot" cx="${x}" cy="${y}" r="${2.5*s}"/>`;
   if(labels.length>=18)continue;let spot=null;for(const [dx,dy] of [[10,-12],[-10,-12],[10,25],[-10,25]]){const left=dx>0?x+dx*s:x+dx*s-w,top=y+dy*s-12*s,r={x:left,y:top,w,h};if(left<box.x+4*s||left+w>box.x+box.w-4*s||top<box.y||top+h>box.y+box.h)continue;if(labels.some(p=>r.x<p.x+p.w+5*s&&r.x+r.w+5*s>p.x&&r.y<p.y+p.h+4*s&&r.y+r.h+4*s>p.y))continue;spot=r;break;}
   if(!spot)continue;labels.push(spot);out+=`<text class="airport-label" x="${spot.x}" y="${spot.y+10*s}" style="font-size:${11*s}px;stroke-width:${3*s}px">${code}</text><text class="airport-label airport-city" x="${spot.x}" y="${spot.y+24*s}" style="font-size:${10*s}px;stroke-width:${3*s}px">${escapeXML(city)}</text>`;
  }return out;
 }
 return{airport,fit,body,arc,point};
}
