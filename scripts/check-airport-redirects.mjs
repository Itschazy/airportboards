// Только безопасные HTTP audit-bot проверки: без браузера и API рейсов.
// Повторяем запросы: одноразовый MISS не ловит потерю Location в ISR HIT.
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:3156';
const locales = ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
let count = 0;
for (const locale of locales) for (const suffix of ['', '/arrivals', '/departures']) {
  for (const [from, to] of [['jfk','JFK'], ['tse','NQZ'], ['TSE','NQZ']]) {
    for (const [method, query] of [['GET',''], ['GET',''], ['HEAD',''], ['GET','?flight=SU123&dir=arrivals']]) {
      const path = `/${locale}/airport/${from}${suffix}${query}`;
      const r = await fetch(new URL(path, base), {method, redirect:'manual', headers:{'user-agent':'audit-bot'}});
      assert.equal(r.status,308,`${method} ${path}`);
      const target = new URL(r.headers.get('location') || '', base);
      assert.equal(target.origin, new URL(base).origin, path+': host');
      assert.equal(target.pathname,`/${locale}/airport/${to}${suffix}`,path+': path');
      assert.equal(target.search,query,path+': selected flight');
      await r.arrayBuffer(); count++;
    }
  }
}
// Каноническая страница не зацикливается; неизвестный вложенный путь остаётся 404.
for (const [path, status] of [['/en/airport/JFK',200],['/en/airport/jfk/unknown',404]]) {
  const r = await fetch(new URL(path,base),{redirect:'manual',headers:{'user-agent':'audit-bot'}});
  assert.equal(r.status,status,path); await r.arrayBuffer(); count++;
}
console.log(`PASS: ${count} airport redirect/route checks, 12 locales, GET repeat + HEAD`);
