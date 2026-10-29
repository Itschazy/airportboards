// Дополнение к числовому сторожу: check:scripts не охватывает airport-guide.
// Проверяем именно новые справочные, включая about и мобильные hints.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
const scripts={ru:['Cyrillic'],zh:['Han'],ja:['Han','Hiragana','Katakana'],ko:['Hangul','Han'],ar:['Arabic'],hi:['Devanagari']};
let count=0;
for(const locale of locales)for(const code of ['EDI','LBA','NCL','GLA','DMM']) {
 const g=JSON.parse(fs.readFileSync(`data/airport-guide/${locale==='ru'?'':locale+'/'}${code}.json`));
 const blocks=Array.isArray(g.blocks)?g.blocks:Object.values(g.blocks);
 assert.ok(g.about?.length>20,locale+'/'+code+': about');
 const letters=[...['Latin',...(scripts[locale]||[])].map(s=>new RegExp(`\\p{Script_Extensions=${s}}`,'u'))];
 const text=[g.about,...blocks.flatMap(b=>[b.title,b.hint,b.text])].join(' ');
 const foreign=[...new Set([...text].filter(c=>/\p{Letter}/u.test(c)&&!letters.some(r=>r.test(c))))];
 assert.deepEqual(foreign,[],locale+'/'+code+': foreign letters');
 for(const b of blocks)assert.ok([...b.hint].length<=(['zh','ja','ko'].includes(locale)?18:35),locale+'/'+code+': hint '+b.hint);
 count++;
}
console.log('PASS',count,'файлов: about, язык алфавита, длина hints; бренды латиницей разрешены.');
