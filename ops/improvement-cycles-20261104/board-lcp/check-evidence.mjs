// Check real exported evidence plus deliberate corruptions of it. No browser or network.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const input = process.argv[2];
assert.ok(input, 'Pass the folder containing ayt-mobile-{1,2,3}.json');
const originals = [1,2,3].map(n => JSON.parse(readFileSync(path.join(input, `ayt-mobile-${n}.json`), 'utf8')));
const folder = mkdtempSync(path.join(tmpdir(), 'ab-lcp-evidence-'));
const node = report => report.audits['lcp-breakdown-insight'].details.items.find(x => x.type === 'node');
const cases = [
  ['actual current reports', () => {}, null],
  ['legacy airport text', rows => rows.forEach(r => Object.assign(node(r), {selector:'main > div > p',nodeLabel:'Анталия (AYT)'})), null],
  ['duplicate capture', rows => rows[1].fetchTime = rows[0].fetchTime, 'Копия одного прогона'],
  ['extension resource', rows => rows[0].audits['network-requests'].details.items.push({url:'chrome-extension://test/cursor-chat.png'}), 'В замер попало расширение'],
  ['foreign LCP', rows => Object.assign(node(rows[0]), {selector:'div.overlay > img',nodeLabel:'cursor-chat.png'}), 'иной элемент требует разбора'],
  ['mixed LCP candidates', rows => Object.assign(node(rows[1]), {selector:'main > div > p',nodeLabel:'Анталия (AYT)'}), 'Кандидат LCP изменился'],
  ['wrong airport', rows => rows[0].finalDisplayedUrl = 'http://localhost:3155/ru/airport/JFK', 'именно табло AYT'],
  ['production URL', rows => rows[0].finalDisplayedUrl = 'https://airportsboard.live/ru/airport/AYT', 'локальной фикстуре'],
  ['simulated timing', rows => rows[0].configSettings.throttlingMethod = 'simulate', 'Не смешивать'],
  ['mixed CPU profiles', rows => rows[1].configSettings.throttling.cpuSlowdownMultiplier = 6, 'Профиль и URL'],
  ['run warning', rows => rows[0].runWarnings.push('Background tab'), 'Предупреждения Lighthouse'],
  ['slow LCP', rows => rows[0].audits['largest-contentful-paint'].numericValue = 5000, 'Регрессия первого экрана'],
];
try {
  for (const [label, mutate, expected] of cases) {
    const rows = structuredClone(originals); mutate(rows);
    const files = rows.map((r, i) => { const file=path.join(folder,`${i}.json`);writeFileSync(file,JSON.stringify(r));return file; });
    const run=spawnSync(process.execPath,['scripts/check-lcp-reports.mjs',...files],{encoding:'utf8'});
    if(expected) {assert.notEqual(run.status,0,label);assert.ok(run.stderr.includes(expected),`${label}: wrong failure: ${run.stderr}`);}
    else assert.equal(run.status,0,run.stderr);
    console.log(`PASS ${label}`);
  }
} finally { rmSync(folder,{recursive:true,force:true}); }
