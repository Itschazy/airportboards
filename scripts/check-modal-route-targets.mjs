// Exercise the real server mapper and the actual modal link predicate. No provider I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
const root = process.argv[2] || '.';
const airports = JSON.parse(fs.readFileSync('data/airports.json','utf8'));
const stubs = `const airports = ${JSON.stringify(airports)};
const airportLabels = {}, airlines = {}, codeMoves = {moves:{}};
const getCityName = c => c;`;
const src = stubs + fs.readFileSync(`${root}/lib/flights.ts`, 'utf8')
  .replace(/^import[\s\S]*?from '[^']*';$/gm, '')
  .replace(/^export type \{[^}]*\}[^;]*;$/gm, '');
const js = ts.transpileModule(src, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {mapFlight} = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const modal = fs.readFileSync(`${root}/components/FlightBoard.tsx`,'utf8');
const predicate = modal.match(/const pair = ([\s\S]*?);\n\s*if \(!pair\)/)?.[1];
assert(predicate, 'actual modal link predicate located');
const linkable = (flight, from, to) => Boolean(vm.runInNewContext(predicate,{flight,routeFrom:{code:from},routeTo:{code:to}}));
for (const direction of ['departures','arrivals']) {
  for (const [from,to,expected] of [['BZE','DGA',false],['DGA','BZE',false],['BZE','BZE',false],['BZE','JFK',true],['JFK','BZE',true],['bze','jfk',true],['BZE','12X',false]]) {
    const raw={flight_iata:'XX123',airline_iata:'XX',flight_number:'123',dep_iata:from,arr_iata:to,dep_time:'2026-11-09 12:00',arr_time:'2026-11-09 14:00',status:'scheduled'};
    const flight=mapFlight(raw,direction,'en',0);
    assert.equal(flight.flight,'XX123','unknown destinations must retain flight rows');
    assert.equal(linkable(flight,from,to),expected,`${direction}: ${from}-${to} route CTA`);
    if(expected) assert.equal(linkable(flight,'LHR',to),false,'mismatched board context cannot authorize another route');
  }
  console.log(`PASS ${direction}: catalogue, self-pair, case, malformed and mismatched codes; rows preserved`);
}
assert.equal(linkable({depIata:'BZE',arrIata:'JFK'},'BZE','JFK'),false,'old client rows without server validation are plain text');
console.log('PASS old cached rows are safe');
