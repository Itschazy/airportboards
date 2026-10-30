import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/airport-title.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {compactAirportTitle:f}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
for(const [before,expected] of [
 ['Kempegowda International Airport, Bangalore (BLR) Live Arrivals & Departures','Kempegowda Airport, Bangalore (BLR) Live Arrivals & Departures'],
 ['Dallas Fort Worth International Airport (DFW) Live Arrivals & Departures','Dallas Fort Worth Airport (DFW) Live Arrivals & Departures'],
 ['Eleftherios Venizelos International Airport, Athens (ATH) Live Arrivals','Eleftherios Venizelos Airport, Athens (ATH) Live Arrivals'],
]){assert.equal(f(before,'en'),expected);assert.ok(expected.length<=70);}
for(const locale of ['ru','de','fr','es','it','tr','zh','ja','ko','ar','hi']) {
 const s='Example International Airport '.repeat(4);assert.equal(f(s,locale),s);
}
assert.ok(f('Baltimore/Washington International Thurgood Marshall Airport (BWI) Live Arrivals & Departures','en').length<=70);
const short='Heathrow Airport (LHR) Live Arrivals & Departures';assert.equal(f(short,'en'),short);
const stale='Kempegowda International Airport, Bangalore (BLR) Arrivals & Departures';
assert.ok(!f(stale,'en').includes('Live'));assert.ok(f(stale,'en').includes('(BLR)'));
const distinct='A very long unique personal airport name that must never be truncated (AAA)';assert.equal(f(distinct,'en'),distinct);
assert.equal(f('Онлайн-табло аэропорта Шереметьево, Москва (SVO) — прилеты и вылеты сегодня','ru'),'Табло Шереметьево, Москва (SVO) — прилеты и вылеты сегодня');
console.log('PASS: airport title identity, locale-scoped, <=70 examples, short/stale preservation');
