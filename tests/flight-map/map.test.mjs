import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,distance} from '../../public/flight-map/v2/map.js';
const airports=JSON.parse(fs.readFileSync(new URL('../../public/flight-map/v1/airports.json',import.meta.url))),land=JSON.parse(fs.readFileSync(new URL('../../public/flight-map/v1/land-v2.json',import.meta.url)));
const m=createMap(airports,land);
test('Pacific route uses short wrap and fits entire projected arc',()=>{const f={id:'f_pacific',from:'NRT',to:'SFO'};const b=m.fit([f],375/240),pts=m.arc(f,b.c);assert.ok(b.w<650);for(const [x,y] of pts)assert.ok(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);assert.ok(distance(m.airport.NRT,m.airport.SFO)>8000);assert.ok(distance(m.airport.NRT,m.airport.SFO)<9000);assert.ok(!m.body([f],b).includes('NaN'));});
test('5000 records can be fitted without a spread-argument stack overflow',()=>{const flights=Array.from({length:5000},(_,i)=>({id:'f_'+i,from:'LHR',to:'SIN'}));const b=m.fit(flights);assert.ok(Number.isFinite(b.x+b.y+b.w+b.h));});
test('land path is defined once, and city labels remain local escaped text',()=>{const f={id:'f_test',from:'SVX',to:'BKK'},b=m.fit([f]);const body=m.body([f],b);assert.equal((body.match(/<defs>/g)||[]).length,1);assert.equal((body.match(/<use /g)||[]).length,3);assert.ok(body.includes('Екатеринбург'));assert.ok(body.includes('Бангкок'));});
