// Жива ли ежедневная автоматика — и не молчит ли она уже третью неделю.
//
// ПОЧЕМУ ЭТО ОТДЕЛЬНАЯ ПРОВЕРКА. Ежедневная задача (~/.claude/scheduled-tasks/
// airportsboard-seo-push) тратит квоту переобхода Вебмастера, толкает изменения в IndexNow и
// запускает двух сторожей дрейфа. То есть она же и есть тот механизм, который замечает, что
// что-то разъехалось. Если умрёт она сама — замечать станет некому: сторожа не запустятся,
// квота будет тихо сгорать по 150 адресов в сутки, а снаружи всё выглядит ровно так же.
//
// Задача идёт только когда открыто приложение, поэтому пропуски — норма, а не авария: за
// 15 дней августа она отработала 8 раз. Ловим не пропуск, а МОЛЧАНИЕ: если последнего прогона
// нет дольше MAX_SILENCE_DAYS, механизм скорее мёртв, чем занят.
//
// Проверка не падает там, где ей нечего знать: на чужой машине или свежем клоне файлов
// состояния нет, и это не провал — они под .gitignore намеренно, потому что описывают
// конкретную машину, а не репозиторий.
//
// Обращений к провайдеру рейсов НОЛЬ: читаются локальные файлы состояния и, если есть токен,
// остаток квоты Вебмастера.
//
// Usage:  node scripts/check-automation-alive.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_SILENCE_DAYS = 5;
const STATES = [
  ['.yandex-recrawl-state.json', 'переобход Вебмастера'],
  ['.indexnow-state.json', 'IndexNow'],
];

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log('жива ли ежедневная автоматика\n');

let known = 0;
for (const [file, label] of STATES) {
  let st;
  try { st = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { console.log(`  · ${label}: файла состояния нет — на этой машине толкатель не запускался, пропуск`); continue; }
  known++;
  const runs = st.runs ?? [];
  if (!runs.length) { say(false, `${label}: состояние есть, но ни одного прогона не записано`); continue; }
  const last = runs[runs.length - 1];
  const days = (Date.now() - Date.parse(last.at)) / 86400_000;
  say(days <= MAX_SILENCE_DAYS,
    `${label}: последний прогон ${last.at.slice(0, 16)} — ${days < 1 ? 'сегодня' : Math.round(days) + ' дн назад'}`
    + (days > MAX_SILENCE_DAYS ? ` (порог ${MAX_SILENCE_DAYS} дн — похоже, задача не идёт)` : ''));
  // Отказы при отправке — отдельный сигнал: прогон может «идти» и ничего не доставлять.
  const recent = runs.slice(-5);
  const ok = recent.reduce((s, r) => s + (r.ok ?? r.n ?? 0), 0);
  const bad = recent.reduce((s, r) => s + (r.fail ?? 0), 0);
  say(ok > 0, `${label}: за последние ${recent.length} прогонов доставлено ${ok}, отказов ${bad}`);
}

if (!known) {
  console.log('\nни одного файла состояния — проверять нечего (это не провал)');
  process.exit(0);
}

// Квота Вебмастера: косвенное, но независимое подтверждение. Толкатель выбирает её досуха,
// поэтому нетронутый остаток в конце суток означает, что сегодня он не отработал.
function envFile(name) {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), `.env.${name}`), 'utf8');
    return Object.fromEntries([...raw.matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/gm)]
      .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]));
  } catch { return {}; }
}
const token = envFile('yandex-webmaster').YANDEX_WEBMASTER_TOKEN;
if (!token) {
  console.log('  · токена Вебмастера нет — остаток квоты не проверен (это не провал)');
} else {
  try {
    const res = await fetch(
      'https://api.webmaster.yandex.net/v4/user/712865004/hosts/https:airportsboard.live:443/recrawl/quota',
      { headers: { Authorization: `OAuth ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const q = await res.json();
    console.log(`  · квота переобхода: ${q.quota_remainder} из ${q.daily_quota} осталось на сегодня`);
  } catch (e) { console.log(`  · квоту прочитать не удалось (${e.message}) — не провал`); }
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nавтоматика подаёт признаки жизни');
process.exit(fails ? 1 : 0);
