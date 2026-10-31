// Исполняем production-функцию без импорта хранилища, ключа и сети.
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/warm-budget.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: mod.exports });
const { warmBudget } = mod.exports;
const run = (remaining, human, at, runs = 48) => warmBudget({cap: 1e6, remaining, human}, 100000, runs, new Date(at));
const observed = run(106276, 134937, '2026-10-31T11:30:00Z');
assert(observed.requests > 3500, 'последний день: свободный остаток должен возвращаться в прогрев');
assert(observed.protectedRequests > 4500, 'сохранён запас на live до конца месяца');
assert.equal(run(100,134937,'2026-10-31T11:30Z').requests,0, 'пол40 не должен съедать резерв');
assert.equal(run(0,0,'2026-11-01T00:00Z').requests,0);
assert.equal(run(1e6,0,'2026-11-01T00:00Z').requests,625, 'новый месяц без старого расхода');
assert.equal(run(1e6,0,'2026-11-01T00:00Z',NaN).requests,0);
assert.equal(run(1e6,0,'invalid').requests,0);
assert.equal(run(106276,134937,'2026-11-01T00:30:00+13:00').requests,observed.requests,'UTC граница ledger');
assert(run(106276,300000,'2026-10-31T11:30Z').requests < observed.requests,'рост live уменьшает фон');
for (const dailyLive of [0, 4000, 9000, 18000]) {
  let remaining=1e6,human=0,warm=0;
  for(let tick=0;tick<30*48;tick++) {
    const now=new Date(Date.UTC(2026,10,1)+tick*1800000);
    const b=warmBudget({cap:1e6,remaining,human},100000,48,now);
    assert(b.requests >= 0 && b.requests <= Math.max(0,remaining-b.protectedRequests));
    remaining-=b.requests;warm+=b.requests;
    const live=dailyLive/48;
    assert(remaining>=live,`не хватило на live: ${dailyLive}, tick${tick}`);
    remaining-=live;human+=live;
  }
  assert(remaining<2000,`неиспользованный остаток: ${remaining}`);
  console.log(JSON.stringify({dailyLive,warm,human,remaining}));
}
// Резкий рост живого спроса в последнюю неделю, как в октябрьском журнале.
let remaining = 1e6, human = 0;
for (let tick = 0; tick < 31 * 48; tick++) {
  const now = new Date(Date.UTC(2026, 9, 1) + tick * 1800000);
  const live = (tick < 24 * 48 ? 4000 : 9000) / 48;
  const b = warmBudget({cap: 1e6, remaining, human}, 100000, 48, now);
  remaining -= b.requests;
  assert(remaining >= live, 'скачок спроса: резерв исчерпан');
  remaining -= live; human += live;
}
assert(remaining < 2000);
console.log('October live growth simulation remaining', remaining);
assert.equal(run(1000,0,'2026-11-01T00:00Z').requests,0,'не расходовать live-резерв при почти пустом плане');
assert.equal(run(106276,134937,'2026-10-31T23:59Z').protectedRequests >= 180,true,'минимум один интервал для live');
assert.match(fs.readFileSync('lib/warm.ts','utf8'),/return warmBudget\(usage\(\), humanReserve\(\), runsPerDay, now\)\.requests/);
console.log('PASS warm budget: regression, UTC, reserve, month simulations',observed);
