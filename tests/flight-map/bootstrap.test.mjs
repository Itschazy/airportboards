import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../lib/site-bootstrap.ts',import.meta.url),'utf8');
const script=source.match(/String.raw`([\s\S]*)`;/)[1];
test('real inline bootstrap parses and applies saved theme and safe favourites',()=>{
 for(const theme of ['light','dark']){const added=[],root={dataset:{}},context={localStorage:{getItem:k=>k==='ab_theme'?theme:JSON.stringify([{iata:'CEK'},{iata:"'><script>"}])},document:{documentElement:root,createElement:()=>({}),head:{appendChild:s=>added.push(s.textContent)}}};
 new vm.Script(script).runInNewContext(context);assert.equal(root.dataset.theme,theme);assert.equal(root.dataset.fav,'1');assert.equal(added.length,1);assert.ok(added[0].includes("[data-iata='CEK']"));assert.ok(!added[0].includes('<script>'));}
});
test('storage denial does not stop page bootstrap',()=>assert.doesNotThrow(()=>new vm.Script(script).runInNewContext({localStorage:{getItem(){throw Error('denied');}}})));
