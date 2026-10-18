// Раньше проверка читала hex из FlightBoard и предполагала чёрный фон. После появления
// двух тем это скрывало бы регрессии светлой палитры. Теперь проверяем реальные токены
// каждого фона, включая поднятые поверхности и полупрозрачную статусную карточку.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const css = fs.readFileSync('app/globals.css', 'utf8');
const palettes = [...css.matchAll(/\{([^{}]*--color-bg:[^{}]*)\}/g)].map(m => Object.fromEntries([...m[1].matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})/gi)].map(v => [v[1],v[2]])));
const rgb = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum = h => rgb(h).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const mix = (a,b,alpha) => '#'+rgb(a).map((n,i)=>Math.round(n*alpha+rgb(b)[i]*(1-alpha)).toString(16).padStart(2,'0')).join('');
assert.equal(palettes.length,3,'светлая + системная тёмная + ручная тёмная');
let count=0;
for(const [i,p] of palettes.entries()) {
 for(const fg of ['text','secondary','past','green','blue','orange','red']) for(const bg of ['bg','surface','raised']) {
  assert.ok(ratio(p[fg],p[bg])>=4.5,`палитра ${i}, ${fg}/${bg}: ${ratio(p[fg],p[bg]).toFixed(2)}`);count++;
 }
 for(const fg of ['green','blue','orange','red','past']) {
  const bg=mix(p[fg],p.surface,.12);
  assert.ok(ratio(p[fg],bg)>=4.5,`палитра ${i}, статусная карточка ${fg}`);count++;
 }
}
const board=fs.readFileSync('components/FlightBoard.tsx','utf8');
assert.ok(!/opacity: isPast \?/.test(board),'прошедшие строки не должны терять контраст всей группой');
assert.ok(!/color:\s*['"]rgba\(/.test(board),'сырой полупрозрачный текст требует отдельного измерения');
console.log(`Контраст: ${count} сочетаний в обеих темах ≥ 4.5:1`);
