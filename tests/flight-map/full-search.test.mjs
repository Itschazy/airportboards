import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync,gzipSync}from'node:zlib';
import{decodeCatalogue,loadPayload}from'../../public/flight-map/v9/data.js';import{createSearch}from'../../public/flight-map/v9/search.js';import{createAirportSearch}from'../../public/flight-map/v8/entry.js';
const bytes=p=>fs.readFileSync(new URL('../../public/flight-map/'+p,import.meta.url)),read=p=>JSON.parse(bytes(p));
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])test(locale+': full first results and all data match the original catalogue',async()=>{
 const data=read(`v9/catalogue-${locale}.json`),source=read(`v4/airports-${locale}.json`),airports=decodeCatalogue(data);
 const module=await import('data:text/javascript;base64,'+brotliDecompressSync(bytes(`v9/catalogue-${locale}.js.br`)).toString('base64'));assert.deepEqual(module.default,data);
 assert.deepEqual(airports,source);assert.equal(airports.length,6074);assert.deepEqual(brotliDecompressSync(bytes(`v9/catalogue-${locale}.json.br`)),bytes(`v9/catalogue-${locale}.json`));
 const search=createSearch(airports,locale),expected=createAirportSearch(source,locale);
 for(const q of ['Paris','London','Heathrow','Челя','Chelyabinsk','東京','दिल्ली','دبي','CDG',source[500].city,'nosuchairport'])assert.deepEqual((await search.query(q)).map(a=>a.code),expected(q).map(a=>a.code),q);
 if(locale==='it')assert.ok((await search.query('Paris')).some(a=>a.code==='CDG'));
 assert.equal(search.ready,true);
 const old=gzipSync(bytes(`v7/core-${locale}.json`)).length+gzipSync(bytes(`v7/aliases-${locale}.json`)).length;
 assert.ok(bytes(`v9/catalogue-${locale}.json.br`).length<old*.85,'transfer reduction at least15%');
});
test('Brotli payload has a normal JSON fallback; abort never starts fallback',async()=>{
 const calls=[],value={ok:true};assert.deepEqual(await loadPayload('catalogue-ru',null,async url=>{calls.push(url);return {ok:true,json:async()=>{if(url.endsWith('.br'))throw Error('unsupported encoding');return value;}};}),value);assert.equal(calls.length,2);
 const c=new AbortController();let requests=0;await assert.rejects(loadPayload('catalogue-ru',c.signal,async()=>{requests++;c.abort();throw new DOMException('Aborted','AbortError');}),{name:'AbortError'});assert.equal(requests,1);
});
test('full index honours cancellation and excludes selected destination',async()=>{
 const a=decodeCatalogue(read('v9/catalogue-ru.json')),c=new AbortController(),s=createSearch(a,'ru',c.signal);const p=s.prepare();c.abort();await assert.rejects(p,{name:'AbortError'});await assert.rejects(s.query('CEK'),{name:'AbortError'});
 const ready=createSearch(a,'ru');assert.deepEqual(await ready.query('CEK',{exclude:'CEK'}),[]);
});
test('geography is unchanged including compressed response',()=>{assert.deepEqual(read('v9/geography.json'),read('v6/geography.json'));assert.deepEqual(brotliDecompressSync(bytes('v9/geography.json.br')),bytes('v9/geography.json'));});

test('fast ASCII normalization preserves Unicode and search punctuation',async()=>{
 const {normalize:current}=await import('../../public/flight-map/v9/entry.js'),{normalize:previous}=await import('../../public/flight-map/v8/entry.js');
 for(let a=0;a<128;a++)for(let b=0;b<128;b++){const value=String.fromCharCode(a,b);assert.equal(current(value),previous(value));}
 for(const value of ['İSTANBUL','Aéroport de Paris','São Paulo','Ёлки-Челябинск','東京 羽田','दिल्ली','دُبَيّ','서울—仁川','ＡＢＣ １２３','Kelvin','Straße'])assert.equal(current(value),previous(value),value);
});

test('module success avoids JSON; cancelled import never mounts or falls back',async()=>{
 const value={columns:[],aliases:[]};let requests=0;const request=async()=>{requests++;throw Error('unexpected fetch');};
 assert.equal(await loadPayload('test',null,request,async()=>({default:value})),value);assert.equal(requests,0);
 const c=new AbortController();let finish;const promise=loadPayload('test',c.signal,request,()=>new Promise(resolve=>finish=resolve));c.abort();finish({default:value});await assert.rejects(promise,{name:'AbortError'});assert.equal(requests,0);
});
