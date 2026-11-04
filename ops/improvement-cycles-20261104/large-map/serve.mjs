import http from 'node:http';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../../../',import.meta.url);
const before=execFileSync('git',['show','ca0720ab:public/flight-map/v10/map.js'],{cwd:root});
const files=new Map([
 ['/','ops/improvement-cycles-20261104/large-map/browser.html'],
 ['/after.js','public/flight-map/v10/map.js'],['/data.js','public/flight-map/v9/data.js'],
 ['/geo-data.js','public/flight-map/v6/data.js'],['/catalogue.json','public/flight-map/v9/catalogue-en.json'],
 ['/geography.json','public/flight-map/v6/geography.json']
]);
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=files.get(url.pathname);
 if(url.pathname==='/before.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(before);return;}
 if(!file){res.writeHead(404);res.end();return;}
 try{res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript','Cache-Control':'no-store'});res.end(await fs.readFile(new URL(file,root)));}
 catch{res.writeHead(500);res.end();}
}).listen(3146,'127.0.0.1',()=>console.log('http://127.0.0.1:3146/'));
