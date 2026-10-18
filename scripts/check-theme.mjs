// Проверяем именно ранний скрипт: сохранённый выбор, мусор и запрещённый storage
// не должны ломать страницу или заставлять ждать гидратацию.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync('lib/theme.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};vm.runInNewContext(compiled,{exports});
for(const [stored,expected] of [[null,'system'],['dark','dark'],['light','light'],['system','system'],['bad','system']]) {
 const document={documentElement:{dataset:{}}};
 vm.runInNewContext(exports.THEME_BOOTSTRAP,{document,localStorage:{getItem:()=>stored}});
 assert.equal(document.documentElement.dataset.theme,expected);
}
const document={documentElement:{dataset:{}}};
vm.runInNewContext(exports.THEME_BOOTSTRAP,{document,localStorage:{getItem:()=>{throw Error('denied')}}});
assert.equal(document.documentElement.dataset.theme,'system');
const files=fs.readdirSync('messages').filter(n=>n.endsWith('.json'));
function keys(o,p=''){return Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v,p+k+'.'):[p+k]).sort()}
const base=keys(JSON.parse(fs.readFileSync('messages/en.json')));
assert.equal(files.length,12);
for(const f of files)assert.deepEqual(keys(JSON.parse(fs.readFileSync('messages/'+f))),base,f);
console.log('Тема: 6 сценариев раннего выбора; 12 локалей ключ-в-ключ');
