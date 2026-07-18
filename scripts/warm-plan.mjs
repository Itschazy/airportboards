#!/usr/bin/env node
// Print what the tiered warmer will actually do, and what it will cost per month, from the
// measured service data. Run this after scripts/discover-schedules.mjs and before changing
// any tier interval — the whole point of the tiers is that the cost is predictable.
//
// Usage: node scripts/warm-plan.mjs [monthlyCap]
import fs from 'fs';

const CAP = Number(process.argv[2]) || 95000;
const svc = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8')).airports;

// Keep in sync with TIERS in lib/warm.ts.
const TIERS = [
  { name: 'mega', min: 400, intervalMin: 180, skipNight: false },
  { name: 'hub', min: 150, intervalMin: 360, skipNight: true },
  { name: 'major', min: 40, intervalMin: 1440, skipNight: true },
  { name: 'mid', min: 10, intervalMin: 4320, skipNight: true },
  { name: 'small', min: 1, intervalMin: 10080, skipNight: true },
];

const rows = TIERS.map(t => ({ ...t, airports: 0 }));
let noService = 0;
for (const n of Object.values(svc)) {
  if (!n) { noService++; continue; }
  rows[TIERS.findIndex(t => n >= t.min)].airports++;
}

let total = 0;
console.log(`\nprobed ${Object.keys(svc).length} airports — ${Object.keys(svc).length - noService} with service, ${noService} without\n`);
console.log('tier    airports  every      req/day   req/month');
for (const r of rows) {
  const perDay = (24 * 60) / r.intervalMin;
  const night = r.skipNight ? 5 / 6 : 1;
  const reqDay = Math.round(r.airports * 2 * perDay * night);
  total += reqDay;
  const hrs = r.intervalMin >= 1440 ? `${r.intervalMin / 1440}d` : `${r.intervalMin / 60}h`;
  console.log(`${r.name.padEnd(8)}${String(r.airports).padStart(7)}  ${hrs.padEnd(9)}${String(reqDay).padStart(8)}${String(reqDay * 30).padStart(12)}`);
}
console.log(`${''.padEnd(8)}${''.padStart(7)}  ${''.padEnd(9)}${String(total).padStart(8)}${String(total * 30).padStart(12)}`);

const monthly = total * 30;
const pct = Math.round((monthly / CAP) * 100);
console.log(`\nprojected ${monthly.toLocaleString()} / ${CAP.toLocaleString()} per month — ${pct}% of budget`);
console.log(monthly < CAP ? `headroom: ${(CAP - monthly).toLocaleString()} requests` : `OVER BUDGET by ${(monthly - CAP).toLocaleString()}`);
console.log(`\ncoverage: every airport with scheduled service gets a real board.`);
console.log(`the ${noService} with none are never probed — they render an honest "no scheduled flights" page.\n`);
