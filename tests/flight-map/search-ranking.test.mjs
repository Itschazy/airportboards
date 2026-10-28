import test from 'node:test';import assert from 'node:assert/strict';
const {createAirportSearch}=await import(`../../public/flight-map/${process.env.MAP_SEARCH_VERSION||'v5'}/entry.js`);
const airports=[{code:'ANF',city:'Антофагаста',name:'Антофагаста'},{code:'AYT',city:'Анталья',name:'Анталия'},{code:'ANR',city:'Антверпен',name:'Антверпен'}];
test('prefix ties prefer existing locale suggestions, without overriding exact matches or recent history',()=>{
 const search=createAirportSearch(airports,'ru');assert.equal(search('Ант')[0].code,'AYT');assert.equal(search('ANF')[0].code,'ANF');assert.equal(search('Антофагаста')[0].code,'ANF');assert.equal(search('Ант',{recent:['ANR']})[0].code,'ANR');assert.ok(search('Ант',{exclude:'AYT'}).every(a=>a.code!=='AYT'));
});
