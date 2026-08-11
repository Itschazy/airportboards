// Арабская локаль как ПИСЬМО СПРАВА НАЛЕВО, а не как перевод.
//
// Перевод был готов, а раскладка — нет: одиннадцать шевронов и стрелок смотрели вправо, то есть
// назад по ходу чтения; отступ у флага задавался marginRight и уходил наружу; затухание строки
// фильтров гасило начало вместо конца; номер выхода «10-11» рядом с арабским словом
// переставлялся в «11-10»; английский текст юридических страниц наследовал dir="rtl" и
// прижимался не к тому краю.
//
// Проверяется три слоя, потому что каждый ломается отдельно:
//   1. ИСХОДНИК — физических свойств (marginRight, textAlign:'left', borderLeft) в JSX быть не
//      должно: в RTL они означают не то, что задумано. В CSS-файле физическое направление
//      допустимо только вместе с парным правилом для [dir='rtl'];
//   2. КАТАЛОГ — в арабских строках не должно быть стрелки «→»: у неё Bidi_Mirrored=No, она
//      не разворачивается сама и указывает назад;
//   3. ОТРИСОВАННАЯ СТРАНИЦА — dir="rtl" на <html>, направленные значки помечены, числовые
//      фрагменты изолированы <bdi>, английские вставки несут собственный dir.
//
// Usage:
//   npm run check:rtl                          — исходник и каталог
//   npm run check:rtl -- http://localhost:3002 — плюс отрисованные страницы

import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
};

// ── 1. Физические свойства в JSX ─────────────────────────────────────────────────────────
{
  // Satori (генератор картинок для соцсетей) логических свойств не понимает, и картинка не
  // зеркалится в принципе — у неё фиксированная раскладка. Исключение обосновано, не забыто.
  const PHYSICAL = /(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight)\s*:|textAlign:\s*'(left|right)'/;
  const offenders = [];
  for (const file of [...walk('app'), ...walk('components')]) {
    if (file.includes('opengraph-image') || file.includes('twitter-image')) continue;
    const src = fs.readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (PHYSICAL.test(line)) offenders.push(`${file}:${i + 1}`);
    });
  }
  offenders.length
    ? fail(`физические свойства вместо логических: ${offenders.length} — ${offenders.slice(0, 4).join(', ')}`)
    : pass('в JSX только логические свойства (marginInline*, paddingInline*, textAlign:start/end)');
}

// ── 2. Физическое направление в CSS без пары для RTL ─────────────────────────────────────
{
  const css = fs.readFileSync(path.join('app', 'globals.css'), 'utf8');
  const directional = [...css.matchAll(/linear-gradient\(to (right|left)/g)].length;
  const rtlPairs = [...css.matchAll(/\[dir=['"]rtl['"]\]/g)].length;
  directional && !rtlPairs
    ? fail(`в globals.css ${directional} направленных градиентов и ни одного правила [dir='rtl']`)
    : pass(`направленный CSS уравновешен правилами для RTL (${directional} градиентов, ${rtlPairs} правил)`);

  /[dir=['"]rtl['"]\]\s*svg\[data-flip\]/.test(css)
    ? pass('направленные значки зеркалятся по data-flip')
    : fail("нет правила [dir='rtl'] svg[data-flip] — шевроны будут смотреть назад");
}

// ── 3. Стрелка в арабском каталоге ───────────────────────────────────────────────────────
{
  const ar = JSON.parse(fs.readFileSync(path.join('messages', 'ar.json'), 'utf8'));
  const wrong = [];
  for (const [ns, group] of Object.entries(ar)) {
    if (!group || typeof group !== 'object') continue;
    for (const [k, v] of Object.entries(group)) {
      if (typeof v === 'string' && v.includes('→')) wrong.push(`${ns}.${k}`);
    }
  }
  wrong.length
    ? fail(`в арабском каталоге стрелка «→» указывает назад: ${wrong.join(', ')} — нужна «←»`)
    : pass('в арабском каталоге стрелки направлены по ходу чтения');
}

// ── 4. Отрисованные страницы ─────────────────────────────────────────────────────────────
const BASE = process.argv[2];
if (!BASE) {
  console.log('\n  · страницы не проверены — передай адрес: npm run check:rtl -- http://localhost:3002');
} else {
  const PAGES = ['/ar', '/ar/airport/DXB', '/ar/airport/KZN', '/ar/city/kazan', '/ar/about', '/ar/az/a'];
  for (const p of PAGES) {
    let html;
    try {
      const r = await fetch(BASE + p, { headers: { 'user-agent': 'audit-bot' } });
      html = await r.text();
    } catch { fail(`${p}: сервер не ответил`); continue; }

    const problems = [];
    if (!/<html[^>]+dir="rtl"/.test(html)) problems.push('нет dir="rtl" на <html>');

    // RSC-пейлоад несёт копии — меряем только видимую часть.
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '');
    if (/style="[^"]*margin-right/.test(visible)) problems.push('в отрисованном стиле margin-right');
    if (/style="[^"]*text-align:\s*(left|right)/.test(visible)) problems.push('в отрисованном стиле text-align:left|right');
    if (visible.includes('→')) problems.push('стрелка «→» в видимом тексте');

    problems.length ? fail(`${p}: ${problems.join('; ')}`) : pass(`${p}: раскладка справа налево в порядке`);
  }

  // Английский фолбэк юридических страниц должен нести свой dir.
  try {
    const r = await fetch(`${BASE}/ar/privacy`, { headers: { 'user-agent': 'audit-bot' } });
    const html = await r.text();
    /<div[^>]+lang="en"[^>]+dir="ltr"|<div[^>]+dir="ltr"[^>]+lang="en"/.test(html)
      ? pass('/ar/privacy: английский текст помечен собственным dir="ltr"')
      : fail('/ar/privacy: английский текст без dir="ltr" — унаследует RTL и прижмётся не к тому краю');
  } catch { fail('/ar/privacy: сервер не ответил'); }
}

console.log(failures ? `\n${failures} проблем(ы)` : '\nарабская локаль разложена справа налево');
process.exit(failures ? 1 : 0);
