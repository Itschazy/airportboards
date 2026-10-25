// Сводка прогона замера ИИ-видимости и сравнение двух прогонов одного корпуса.
// Usage:  node ops/ai-visibility/summarize.mjs run-A.json [run-B.json]
import fs from 'node:fs';

const OURS = 'airportsboard.live';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
if (!a) { console.error('usage: summarize.mjs run.json [run2.json]'); process.exit(1); }

function summary(run) {
  const by = {};
  for (const r of run.runs) {
    const k = `${r.engine}/${r.surface}`;
    const s = (by[k] ??= { observed: 0, ours: 0, text: 0, other: {}, hosts: {} });
    if (r.status !== 'observed') { s.other[r.status] = (s.other[r.status] || 0) + 1; continue; }
    s.observed++;
    if (r.ours_in_sources) s.ours++;
    if (r.ours_in_text) s.text++;
    for (const h of r.sources || []) if (h !== OURS) s.hosts[h] = (s.hosts[h] || 0) + 1;
  }
  return by;
}

// Интервал Уилсона, 95%: при 15 наблюдениях 3/15 — это 7–45%, и это надо видеть.
function wilson(k, n) {
  if (!n) return '—';
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return `${Math.round(100 * Math.max(0, c - h))}–${Math.round(100 * Math.min(1, c + h))}%`;
}

const sa = summary(a), sb = b ? summary(b) : null;
if (b && a.corpus_id !== b.corpus_id) console.log(`⚠ разные корпуса (${a.corpus_id} / ${b.corpus_id}) — сравнение недействительно`);
console.log(`${a.run_id}${b ? `  →  ${b.run_id}` : ''}\n`);
for (const k of Object.keys({ ...sa, ...(sb || {}) })) {
  const x = sa[k], y = sb?.[k];
  const fmt = s => (s ? `${s.ours}/${s.observed} (${wilson(s.ours, s.observed)}), в тексте ${s.text}` : '—');
  console.log(`${k.padEnd(22)} ${fmt(x)}${sb ? `   →   ${fmt(y)}` : ''}`);
  const top = Object.entries((y || x).hosts).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([h, n]) => `${h} ${n}`).join(', ');
  if (top) console.log(`${''.padEnd(22)} вместо нас: ${top}`);
}
if (sb) console.log('\nРазница — наблюдаемый дрейф, не эффект правок: один ответ ИИ — выборка, причинных выводов не делать.');
