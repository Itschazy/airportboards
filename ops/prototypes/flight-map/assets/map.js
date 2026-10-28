// The map is local SVG, not remote tiles. Great-circle samples and unwrapped
// longitudes keep Pacific routes short; fitting includes the whole arc, not just
// its endpoints. This is still a prototype, not a flight's recorded trajectory.
export const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const plural=(n,forms)=>forms[n%100>=11&&n%100<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];
export function distance(a,b){const r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lon-a.lon)*r;return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2)));}
export function createMap(airports,land){
 const airport=Object.fromEntries(airports.map(a=>[a.code,a]));
 const xy=a=>[(a.lon+180)*1000/360,(90-a.lat)*1000/360];
 const geom=land.map(r=>'M'+r.map(([lon,lat])=>xy({lon,lat}).map(n=>n.toFixed(2)).join(',')).join('L')+'Z').join('');
 function center(fs){const xs=[...new Set(fs.flatMap(f=>[f.from,f.to]))].map(c=>xy(airport[c])[0]).sort((a,b)=>a-b);if(!xs.length)return 570;let best=-1,start=xs[0];for(let i=0;i<xs.length;i++){let end=xs[(i+1)%xs.length]+(i===xs.length-1?1000:0),gap=end-xs[i];if(gap>best){best=gap;start=end;}}return (start+(1000-best)/2)%1000;}
 const unwrap=(x,c)=>x+Math.round((c-x)/1000)*1000;
 function point(code,c){const [x,y]=xy(airport[code]);return [unwrap(x,c),y];}
 function arc(f,c){const a=airport[f.from],b=airport[f.to],rad=Math.PI/180;
  const v=p=>[Math.cos(p.lat*rad)*Math.cos(p.lon*rad),Math.cos(p.lat*rad)*Math.sin(p.lon*rad),Math.sin(p.lat*rad)];let av=v(a),bv=v(b),omega=Math.acos(Math.max(-1,Math.min(1,av.reduce((n,x,i)=>n+x*bv[i],0)))),sin=Math.sin(omega),last=point(f.from,c)[0],out=[];
  for(let i=0;i<=48;i++){let t=i/48,p;if(Math.abs(sin)<1e-6){p={lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t};}else{let q=av.map((x,j)=>(x*Math.sin((1-t)*omega)+bv[j]*Math.sin(t*omega))/sin);p={lat:Math.atan2(q[2],Math.hypot(q[0],q[1]))/rad,lon:Math.atan2(q[1],q[0])/rad};}let [x,y]=xy(p);x=unwrap(x,last);last=x;out.push([x,y]);}return out;
 }
 function fit(fs,ratio=1.5){const c=center(fs);if(!fs.length)return{x:365,y:55,w:480,h:480/ratio,c};let ps=fs.flatMap(f=>arc(f,c)),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);let w=Math.max(110,Math.max(...xs)-Math.min(...xs)+55),h=Math.max(80,Math.max(...ys)-Math.min(...ys)+55);if(w/h<ratio)w=h*ratio;else h=w/ratio;return{x:(Math.max(...xs)+Math.min(...xs))/2-w/2,y:(Math.max(...ys)+Math.min(...ys))/2-h/2,w,h,c};}
 function body(fs,box,width=375,selected=null,interactive=true){let s=box.w/width,codes=[...new Set(fs.flatMap(f=>[f.from,f.to]))],out=`<g><path class="land" d="${geom}"/><path class="land" transform="translate(-1000 0)" d="${geom}"/><path class="land" transform="translate(1000 0)" d="${geom}"/></g>`;
  for(const f of fs){let d='M'+arc(f,box.c).map(p=>p.map(n=>n.toFixed(2)).join(',')).join('L');out+=`<path class="flight-path${f.id===selected?' selected':''}" d="${d}"/>`;if(interactive)out+=`<path class="route-hit" data-route="${f.id}" d="${d}"><title>${escapeXML(f.from+' — '+f.to)}</title></path>`;}
  let labels=[];for(const code of codes){let [x,y]=point(code,box.c),label=[x+7*s,y-8*s];out+=`<circle class="airport-dot" cx="${x}" cy="${y}" r="${2.6*s}"/>`;if(labels.some(p=>Math.abs(p[0]-label[0])<36*s&&Math.abs(p[1]-label[1])<14*s))continue;labels.push(label);out+=`<text class="airport-label" x="${label[0]}" y="${label[1]}" style="font-size:${11*s}px;stroke-width:${2*s}px;stroke-linejoin:round">${code}</text>`;}return out;
 }
 return{airport,fit,body,arc,point};
}
