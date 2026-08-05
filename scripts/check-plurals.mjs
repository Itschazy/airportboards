// Compile every count-bearing message on every locale and format it for a spread of numbers.
//
// Written after 56 country pages shipped "1 airports" — one served airport in Paraguay, Bahrain,
// Lebanon and 53 others, in whichever of the twelve languages the reader arrived in. The strings
// interpolated a bare {count} next to a hard-coded plural noun, so no number could ever come out
// right except by accident.
//
// Two failure modes this catches, and the second is the sneaky one:
//   - a malformed ICU message (unbalanced braces, unknown category) throws at format time, which
//     in a page means a 500 rather than a typo;
//   - a plural that silently never matches. Hand ICU a pre-formatted STRING like "1 234" instead
//     of the number 1234 and every value falls through to `other` — the message compiles, the
//     page renders, and the grammar is wrong again with nothing to show for it. So this asserts
//     that at least one locale with a real one/other distinction actually PRODUCES different
//     output for 1 and for 2.
//
// zh, ja, ko and tr are expected to have no plural syntax: none of them inflects a noun after a
// numeral, so `{count} 个机场` is correct for every value and wrapping it would be noise.
//
// Usage:  npm run check:plurals

import fs from 'node:fs';
import { IntlMessageFormat } from 'intl-messageformat';

const KEYS = ['airports_count', 'country_desc', 'country_none', 'city_desc',
  'country_split', 'country_split_partial'];
const NUMBERS = [0, 1, 2, 3, 5, 11, 21, 100, 1234];
/** Locales whose nouns do not inflect after a numeral — no plural syntax expected. */
const NO_PLURAL = new Set(['zh', 'ja', 'ko', 'tr']);

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };

for (const f of fs.readdirSync('messages').filter(f => f.endsWith('.json'))) {
  const locale = f.replace('.json', '');
  const home = JSON.parse(fs.readFileSync(`messages/${f}`, 'utf8')).home ?? {};

  for (const key of KEYS) {
    const msg = home[key];
    if (typeof msg !== 'string') { fail(`${locale}/${key}: ключа нет`); continue; }

    const rendered = new Set();
    for (const count of NUMBERS) {
      try {
        rendered.add(new IntlMessageFormat(msg, locale).format({ count, served: count, rest: count, country: 'X', city: 'Y', date: '1 января' }));
      } catch (e) {
        fail(`${locale}/${key} при count=${count}: ${e.message.slice(0, 90)}`);
      }
    }

    // Distinctness check, only where the language actually distinguishes and only on the key
    // whose whole job is "N airports" — the descriptions may legitimately phrase around it.
    if (key === 'airports_count' && !NO_PLURAL.has(locale)) {
      const one = new IntlMessageFormat(msg, locale).format({ count: 1, served: 1, rest: 1, country: 'X', city: 'Y', date: 'd' });
      const two = new IntlMessageFormat(msg, locale).format({ count: 2, served: 2, rest: 2, country: 'X', city: 'Y', date: 'd' });
      if (String(one).replace(/\d/g, '') === String(two).replace(/\d/g, '')) {
        fail(`${locale}/${key}: 1 и 2 дают одну и ту же форму — множественное число не работает`);
      }
    }
  }
}

if (!failures) {
  console.log(`проверено ${KEYS.length} ключей × 12 локалей × ${NUMBERS.length} значений — плюрализация в порядке`);
  const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf8')).home.airports_count;
  const ru = JSON.parse(fs.readFileSync('messages/ru.json', 'utf8')).home.airports_count;
  for (const n of [1, 2, 5, 21]) {
    console.log(`  ${n}: ${new IntlMessageFormat(en, 'en').format({ count: n })}`
      + ` | ${new IntlMessageFormat(ru, 'ru').format({ count: n })}`);
  }
}
process.exit(failures ? 1 : 0);
