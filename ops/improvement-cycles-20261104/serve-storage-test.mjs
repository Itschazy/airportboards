// Изолированный localhost origin для тестовых данных. Не отдаём репозиторий,
// .env и другие файлы; никаких production/API запросов или ключей.
import http from 'node:http';
import fs from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const allowed=new Map([
 ['/','ops/improvement-cycles-20261104/storage-browser.html'],
 ...['storage.js','storage-lock.js','history.js'].map(name=>['/flight-map/v10/'+name,'public/flight-map/v10/'+name])
]);
http.createServer(async(req,res)=>{
 const file=allowed.get(new URL(req.url,'http://localhost').pathname);
 if(!file){res.writeHead(404);res.end();return;}
 try{res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(await fs.readFile(new URL(file,root)));}
 catch{res.writeHead(500);res.end('Test fixture unavailable');}
}).listen(3144,'127.0.0.1',()=>console.log('Storage test: http://127.0.0.1:3144/'));
