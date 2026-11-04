// Сравнение реального растеризованного SVG с утверждённой версией из Git.
// Количество тегов само по себе не гарантирует сохранение рисунка: потерянный
// transform или stroke способен незаметно изменить десятки копий. Сравниваем
// ВСЕ RGBA-байты обеих тем, включая retina-масштабы телефона и монитора.
// Это проверка вида через librsvg/sharp, НЕ браузерный замер скорости или LCP.
// Usage: node scripts/check-pattern-render.mjs <baseline-commit>
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const revision=process.argv[2];
assert.match(revision||'',/^[a-f0-9]{7,40}$/,'Передай SHA утверждённого рисунка');
for(const theme of ['dark','light']) {
  const path=`public/pattern-${theme}.svg`;
  const before=execFileSync('git',['show',`${revision}:${path}`]);
  const after=readFileSync(path);
  for(const width of [1150,1800,2300,3450,4200]) {
    const render=input=>sharp(input,{density:72*width/1800}).ensureAlpha().raw().toBuffer();
    const original=await render(before), optimized=await render(after);
    assert.ok(original.equals(optimized),`${theme} ${width}px: рисунок изменился`);
    console.log(`PASS ${theme} ${width}px: identical RGBA ${createHash('sha256').update(optimized).digest('hex')}`);
  }
}
