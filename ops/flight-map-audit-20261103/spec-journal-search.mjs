import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../../public/flight-map/v9/app.js',import.meta.url),'utf8');
// Execute the live renderJournal prefix unchanged; stub only its two DOM fields.
const start=source.indexOf('function renderJournal(){')+'function renderJournal(){'.length;
const end=source.indexOf(" $('#flightList').innerHTML",start);
assert.ok(start>0&&end>start);
const prefix=source.slice(start,end);
const activeSearch=new Function('$','visible','airport','locale','flights',prefix+'\nreturn results;');
const airport={LHR:{city:'London',name:'Heathrow'},IST:{city:'Istanbul',name:'Istanbul Airport'}};
const flights=Array.from({length:20},(_,i)=>({id:'f_'+i,from:'LHR',to:'IST',number:i===0?'TK 476':'AB '+i,date:'2020'}));
const search=query=>activeSearch(selector=>selector==='#historyQuery'?{value:query}:{},()=>flights,airport,'en',flights).map(f=>f.id);
assert.deepEqual(search('TK 476'),['f_0']);
assert.deepEqual(search('tk 476'),['f_0']);
assert.deepEqual(search('TK476'),[]);
console.log(JSON.stringify({source:'public/flight-map/v9/app.js:99-101',history:flights.length,spaced:search('TK 476'),caseInsensitive:search('tk 476'),compact:search('TK476'),expectedCompact:['f_0']}));
