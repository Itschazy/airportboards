// Only local fixture traffic. Holding Next chunks reproduces the visible SSR
// window before React attaches listeners; this is not an Android LCP benchmark.
import http from 'node:http';
let held=true, pending=[], requests=0;
const html=`<!doctype html><meta charset="utf-8"><title>Card cold start — local fixture</title><style>body{margin:0;font:14px system-ui}header{position:fixed;left:390px;top:0;width:650px}button{padding:16px}iframe{width:375px;height:812px;border:0}pre{white-space:pre-wrap}</style><header><h1>SSR before JavaScript</h1><button id="release">Release Next JS</button><pre id="state">Starting</pre></header><iframe src="/ru/airport/AYT?cold=1"></iframe><script>
const frame=document.querySelector('iframe'),output=document.querySelector('#state');const clicks=[];let attached=null;
document.querySelector('#release').onclick=()=>fetch('http://localhost:3192/__release');
setInterval(async()=>{let d=frame.contentDocument;if(d&&d!==attached){attached=d;d.addEventListener('click',e=>{let row=e.target.closest('.frow,button');if(row)clicks.push({label:row.getAttribute('aria-label'),trusted:e.isTrusted,at:Date.now()});},true);}let s=await(await fetch('http://localhost:3192/__status')).json();output.textContent=JSON.stringify({...s,rows:d?.querySelectorAll('.frow').length,ready:d?.querySelector('[data-board-intent]')?.hasAttribute('data-board-ready'),searchOpen:d?.querySelector('.board-search-panel')?!d.querySelector('.board-search-panel').hasAttribute('inert'):false,activeLabel:d?.activeElement?.getAttribute('aria-label'),dialog:d?.querySelector('[role=dialog]')?.getAttribute('aria-label')||false,clicks},null,2);},250);
</script>`;
http.createServer(async(req,res)=>{try{
 if(new URL(req.url,'http://localhost').pathname==='/'){const requested=new URL(req.url,'http://localhost').searchParams.get('locale');const locale=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'].includes(requested)?requested:'ru';res.writeHead(200,{'content-type':'text/html'});res.end(html.replace('/ru/airport/','/'+locale+'/airport/'));return;}
 if(req.url==='/__status'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({held,pending:pending.length,requests}));return;}
 if(req.url==='/__release'){held=false;for(const release of pending)release();pending=[];res.end('released');return;}
 if(/^\/_next\/static\/.*\.js(?:\?|$)/.test(req.url)){requests++;if(held)await new Promise(resolve=>pending.push(resolve));}
 const response=await fetch('http://127.0.0.1:3190'+req.url,{headers:{'user-agent':'local-fixture-proxy','accept':req.headers.accept||'*/*'}});
 const headers=Object.fromEntries(response.headers);for(const h of ['content-length','content-encoding','transfer-encoding','connection'])delete headers[h];headers['cache-control']='no-store';
 res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
}catch(e){res.writeHead(502);res.end(String(e));}}).listen(3191,'127.0.0.1',()=>console.log('Fixture proxy 3191 -> 3190, Next JS held'));

http.createServer((req,res)=>{res.setHeader('access-control-allow-origin','*');res.setHeader('content-type','application/json');if(req.url==='/__reset'){held=true;requests=0;}if(req.url==='/__release'){held=false;for(const release of pending)release();pending=[];}res.end(JSON.stringify({held,pending:pending.length,requests}));}).listen(3192,'127.0.0.1');
