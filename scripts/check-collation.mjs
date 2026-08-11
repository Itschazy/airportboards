// Is a list the reader sees actually in that language's alphabetical order?
//
// The A–Z index was sorted by the ENGLISH name and then printed the localised one, so it looked
// shuffled to everyone except an English reader. Measured on /az/a before the fix, share of
// adjacent pairs out of order: hi 51%, ar 48%, ko 46%, ja 45%, zh 43%, ru 36%, de 19%, en 0%.
// The Russian page opened "Ла-Корунья, Аахен-Мерцбрюк, Ольборг".
//
// The order is read out of the page's own ItemList JSON-LD, which mirrors what is rendered —
// so this checks the published artefact, not a re-implementation of the sort. Comparison uses
// Intl.Collator for the locale, because "alphabetical" is a different function per language:
// Swedish puts Å after Z, German does not, and Cyrillic and Devanagari share nothing with
// either.
//
// Usage:  node scripts/check-collation.mjs [base-url]    (default http://localhost:3002)

const BASE = process.argv[2] || 'http://localhost:3002';
const LOCALES = ['en', 'ru', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ar', 'hi', 'ko'];
const LETTERS = ['a', 'b', 's'];

let failures = 0;

for (const letter of LETTERS) {
  for (const locale of LOCALES) {
    let names;
    try {
      const html = await (await fetch(`${BASE}/${locale}/az/${letter}`,
        { headers: { 'user-agent': 'collation-check' } })).text();
      // The page carries two ItemLists: breadcrumbs and the airports. Take the big one.
      const blocks = [...html.matchAll(/"numberOfItems":(\d+),"itemListElement":\[([\s\S]*?)\}\]/g)];
      const list = blocks.find((b) => Number(b[1]) > 10);
      if (!list) { console.error(`  ✗ ${locale}/${letter}: список аэропортов не найден`); failures++; continue; }
      names = [...list[2].matchAll(/"name":"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse('"' + m[1] + '"'));
    } catch (e) {
      console.error(`  ✗ ${locale}/${letter}: ${e.message}`); failures++; continue;
    }

    const coll = new Intl.Collator(locale, { sensitivity: 'base' });
    const wrong = [];
    for (let i = 0; i < names.length - 1; i++) {
      if (coll.compare(names[i], names[i + 1]) > 0) wrong.push(`${names[i]} › ${names[i + 1]}`);
    }
    if (wrong.length) {
      console.error(`  ✗ ${locale}/${letter}: ${wrong.length} из ${names.length - 1} пар не по алфавиту — ${wrong[0]}`);
      failures++;
    } else if (letter === 'a') {
      console.log(`  ✓ ${locale}: ${names.length} записей по алфавиту (${names.slice(0, 2).join(', ')})`);
    }
  }
}

console.log(failures ? `\n${failures} проблем(ы) сортировки` : '\nсортировка верна во всех локалях');
process.exit(failures ? 1 : 0);
