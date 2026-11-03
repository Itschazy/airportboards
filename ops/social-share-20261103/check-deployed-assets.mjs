import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base='https://airportsboard.live',headers={'user-agent':'audit-bot'};
const get=async p=>{const r=await fetch(base+p,{headers,signal:AbortSignal.timeout(45000)});assert.equal(r.status,200,p);return {bytes:Buffer.from(await r.arrayBuffer()),headers:r.headers};};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[];
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const {bytes}=await get('/'+locale+'/flight-map'),html=bytes.toString();
 const runtime=html.match(/href="(\/flight-map\/v9\/runtime\.js\?[^" ]+)"/)?.[1];assert.ok(runtime,locale+' cache-busted runtime');
 const actual=await get(runtime.replaceAll('&amp;','&'));
 assert.equal(sha(actual.bytes),sha(fs.readFileSync('public/flight-map/v9/runtime.js')),locale+' runtime');
 const labels=JSON.parse(fs.readFileSync('lib/flight-map/locales/'+locale+'.json'));
 assert.ok(html.includes(labels.m126)||html.includes(labels.m126.replaceAll('’','&#x27;')),locale+' latest share error');
 rows.push({locale,runtime,sha256:sha(actual.bytes),currentCopy:true});
}
for(const path of ['/flight-map/v10/exporter.js','/flight-map/v10/history.js','/flight-map/v10/storage.js',...['telegram','vk','max','instagram','facebook','threads','x','whatsapp'].map(n=>'/flight-map/brands-v3/'+n+'.webp')]){
 const r=await get(path);assert.equal(sha(r.bytes),sha(fs.readFileSync('public'+path)),path);rows.push({path,bytes:r.bytes.length,sha256:sha(r.bytes),cacheControl:r.headers.get('cache-control')});
}
console.log(JSON.stringify(rows,null,2));
