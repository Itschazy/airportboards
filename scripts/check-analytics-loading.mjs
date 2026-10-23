// Исполняем настоящий SSR bootstrap и клиентский загрузчик без обращений к Google.
// Проверяем очередь consent/config/events, защиту локальных замеров и отсутствие
// преждевременного preload в production HTML. Не является замером LCP.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const snippet={exports:{}};vm.runInNewContext(compile(fs.readFileSync('lib/metrica-snippet.ts','utf8')),snippet);
const gaId='G-TEST';const jsx=(type,props)=>({type,props});
const component={exports:{},process:{env:{NEXT_PUBLIC_GA_ID:gaId}},require:n=>n==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'fragment'}:n==='next/script'?{default:'NextScript'}:n.includes('adsense')?{adsenseClient:''}:snippet.exports};
vm.runInNewContext(compile(fs.readFileSync('components/Analytics.tsx','utf8')),component);
const tree=component.exports.Analytics();const children=[tree.props.children].flat();
const bootstrap=children.find(n=>n?.props?.id==='ga-consent').props.dangerouslySetInnerHTML.__html;
let failures=0;const check=(ok,msg)=>{console.log((ok?'PASS ':'FAIL ')+msg);if(!ok)failures++;};
check(!children.some(n=>n?.type==='NextScript'),'GA не создаёт ранний preload next/script');
for(const [hostname,webdriver,enabled] of [['airportsboard.live',false,true],['www.airportsboard.live',false,true],['ru-test.airportsboard.live',false,true],['localhost',false,false],['127.0.0.1',false,false],['airportsboard.live.evil.com',false,false],['airportsboard.live',true,false]]){
 const w={location:{hostname,href:'https://'+hostname+'/ru/airport/AYT'},navigator:{webdriver,userAgent:'Chrome'},screen:{width:375,height:667},localStorage:{getItem:()=>null},Date};w.window=w;w.document={title:'AYT'};
 vm.runInNewContext(bootstrap,w);
 check(Boolean(w['ga-disable-'+gaId])===!enabled,hostname+' webdriver='+webdriver+': локальная/роботная аналитика выключена');
 const queue=()=>w.dataLayer.map(a=>Array.from(a));
 assert.equal(queue().filter(x=>x[0]==='config').length,1);
 assert.equal(queue()[0][0],'consent');assert.equal(queue()[1][2].analytics_storage,'denied');
 w.gtag('event','flight_card',{from:'row'});
 let effects=[],refs=[],cursor=0,pathname='/ru/airport/AYT',scripts=[];
 w.document.getElementById=id=>scripts.find(s=>s.id===id);
 w.document.createElement=()=>({});w.document.head={appendChild:s=>scripts.push(s)};
 const tracker={...w,exports:{},require:n=>n==='react'?{useEffect:f=>effects.push(f),useRef:v=>refs[cursor++]??(refs[cursor-1]={current:v})}:{usePathname:()=>pathname}};
 vm.runInNewContext(compile(fs.readFileSync('components/GaRouteTracker.tsx','utf8')),tracker);
 const render=()=>{cursor=0;tracker.exports.GaRouteTracker({gaId});for(const e of effects.splice(0))e();};
 render();render();
 check(scripts.length===(enabled?1:0),hostname+': один загрузчик на повторное монтирование, отсутствует вне production');
 if(enabled)check(scripts[0]?.fetchPriority==='low','загрузчик использует низкий сетевой приоритет');
 check(queue().filter(x=>x[0]==='event'&&x[1]==='page_view').length===0,'первый просмотр не дублируется при повторном эффекте');
 pathname='/ru/airport/UFA';w.location.href='https://'+hostname+pathname;render();
 assert.equal(queue().filter(x=>x[1]==='flight_card').length,1);
 check(queue().filter(x=>x[1]==='page_view').length===1,'один page_view при настоящем переходе');
 check(true,'consent/config/раннее событие и SPA page_view сохранены');
}
if(process.argv[2]){for(const p of ['/ru/airport/AYT','/ru/airport/AYT/arrivals','/en/airport/JFK']){
 const r=await fetch(new URL(p,process.argv[2]),{headers:{'user-agent':'audit-bot'}});assert.equal(r.status,200);const h=await r.text();
 check(!/<link[^>]+rel="preload"[^>]+googletagmanager/.test(h),'HTML '+p+': нет раннего preload аналитики');
 check(h.includes('id="ga-consent"')&&h.includes('send_page_view'),p+': SSR consent и первый просмотр сохранены');
}}
process.exitCode=failures?1:0;
