// A supplier code is not necessarily a page in our catalogue. Exercise the real
// SSR route aggregation with unknown codes, both directions and a full top eight.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(process.argv[2] || 'components/AirportBottom.tsx', 'utf8');
const start = source.indexOf("  const inbound = direction === 'arrivals';");
const end = source.indexOf('\n  const airlines = ', start);
assert(start >= 0 && end > start);
const code = ts.transpileModule(source.slice(start, end) + '\nresult = routes;', {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
const airports = new Map(JSON.parse(fs.readFileSync('data/airports.json')).map(a => [a.iata, a]));
assert(!airports.has('DGA')); // Reproduced on BZE; unknown to this catalogue.
const valid = ['JFK','LHR','AMS','CDG','FRA','IST','DXB','SIN','HND'];
for (const direction of ['departures','arrivals']) {
  const make = code => ({ depIata: direction === 'arrivals' ? code : 'BZE',
    arrIata: direction === 'arrivals' ? 'BZE' : code, destination: code, origin: code });
  const flights = [...Array.from({length:20},()=>make('DGA')),make('BZE'),
    ...valid.map(make),make('JFK')];
  const before = JSON.stringify(flights);
  const context = { direction, flights, airport:airports.get('BZE'), locale:'en',
    getAirport: code => airports.get(code.toUpperCase()), localAirlineName: x=>x, result:null };
  vm.runInNewContext(code,context);
  const routes = JSON.parse(JSON.stringify(context.result));
  assert.equal(routes.length,8,direction+' fills eight real destinations');
  assert(routes.every(r=>airports.has(r.iata) && r.iata!=='BZE'),direction+' only resolvable targets');
  assert.equal(routes[0].iata,'JFK');assert.equal(routes[0].n,2);
  assert.equal(JSON.stringify(flights),before,'flight rows retained');
  console.log('PASS '+direction+': no 404 links, eight valid targets, counts and flights preserved');
  const empty = { ...context, flights:[make('DGA'),make('BZE')], result:null };
  vm.runInNewContext(code,empty);
  assert.equal(empty.result.length,0,'no destinations means no route section');
}
