#!/usr/bin/env node
// What the tiered warmer is aiming for, and how much of that each airlabs plan actually buys.
//
// The tier intervals in lib/warm.ts are a TARGET, not a schedule. Demand is deliberately set
// above the current plan: tickBudget() spends whatever is left of the month, and dueAirports()
// orders by how overdue each board is relative to its own tier, so a tight budget slows every
// tier proportionally rather than starving the tail. Read "achieved" as "how close to target
// this plan gets you".
//
// Usage: node scripts/warm-plan.mjs [cap ...]      e.g. node scripts/warm-plan.mjs 95000 195000
import fs from 'fs';

const CAPS = process.argv.slice(2).map(Number).filter(Boolean);
const PLANS = CAPS.length ? CAPS : [95000, 195000];
const RESERVE = Number(process.env.AIRLABS_HUMAN_RESERVE ?? 3000);
const svc = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8')).airports;

// Keep in sync with TIERS in lib/warm.ts.
const TIERS = [
  { name: 'mega', min: 400, intervalMin: 120, skipNight: false },
  { name: 'hub', min: 150, intervalMin: 240, skipNight: true },
  { name: 'major', min: 40, intervalMin: 720, skipNight: true },
  { name: 'mid', min: 10, intervalMin: 1440, skipNight: true },
  { name: 'small', min: 1, intervalMin: 1440, skipNight: true },
];

const rows = TIERS.map(t => ({ ...t, airports: 0, reqDay: 0 }));
let noService = 0;
for (const n of Object.values(svc)) {
  if (!n) { noService++; continue; }
  rows[TIERS.findIndex(t => n >= t.min)].airports++;
}

const fmtInterval = m => (m >= 1440 ? `${m / 1440}d` : `${m / 60}h`);
let demandDay = 0;
const probed = Object.keys(svc).length;
console.log(`\nprobed ${probed} airports — ${probed - noService} with service, ${noService} without\n`);
console.log('tier    airports  target       req/day    req/month');
for (const r of rows) {
  const night = r.skipNight ? 5 / 6 : 1;
  r.reqDay = Math.round(r.airports * 2 * ((24 * 60) / r.intervalMin) * night);
  demandDay += r.reqDay;
  console.log(`${r.name.padEnd(8)}${String(r.airports).padStart(7)}  ${('every ' + fmtInterval(r.intervalMin)).padEnd(11)}${String(r.reqDay).padStart(8)}${String(r.reqDay * 30).padStart(13)}`);
}
const demand = demandDay * 30;
console.log(`${'TARGET'.padEnd(8)}${''.padStart(7)}  ${''.padEnd(11)}${String(demandDay).padStart(8)}${String(demand).padStart(13)}`);

console.log(`\nplan           spendable    achieved   effective cadence`);
for (const cap of PLANS) {
  const spendable = cap - RESERVE;
  const ratio = Math.min(1, spendable / demand);
  const mult = 1 / ratio;
  const eff = mult <= 1.05 ? 'at target' : `target × ${mult.toFixed(1)} (mid/small ≈ every ${mult.toFixed(1)}d)`;
  console.log(`${cap.toLocaleString().padEnd(15)}${spendable.toLocaleString().padEnd(13)}${(Math.round(ratio * 100) + '%').padEnd(11)}${eff}`);
}
console.log(`\n${RESERVE.toLocaleString()} held back for live human page views, which spend the same quota`);
console.log(`(override with AIRLABS_HUMAN_RESERVE). Everything else is spent — the warmer`);
console.log(`always uses the full remaining budget, it just gets closer to target on a bigger plan.`);
console.log(`\nthe ${noService} airports with no scheduled service are never probed —`);
console.log(`they render an honest "no scheduled flights" page instead.\n`);
