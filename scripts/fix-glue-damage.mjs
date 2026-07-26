// Repair the word-gluing my own quote-stripping caused, plus two gloss shapes it missed.
//
// The quote rule replaced `"X"` with `X` — correct when the quotes were surrounded by
// spaces, and a splice when the neighbouring character sat flush against the quote:
//
//   tr  «"uçuş tablosu"u»        → «tablosuu»        (case clitic was attached to the quote)
//   ko  «"도착"과 "출발"를»          → «도착과 출발를»      (particle chosen for the quoted form)
//   it  «l'"tabellone voli…"»    → «l'tabellone»     (elision article against a consonant)
//   ru  «онлайн "онлайн-табло"»  → «онлайн онлайн-табло»
//   de  «„Ankünfte"und»          → «Ankünfteund»     (mixed „…" pair, half-stripped)
//
// Each repair is a closed, grammatical rule — no model involved:
//   tablosuu → tablosunu   (accusative of tablosu takes buffer -n-)
//   출발를 → 출발을 / 도착와 → 도착과   (vowel-harmony particles after a consonant)
//   l'tabellone → il tabellone      (elision only before vowels)
//   онлайн онлайн-табло → онлайн-табло
//   Ankünfteund → Ankünfte und (and friends)
//
// Also removed here, being the same defect family the bracket/quote rules missed:
//   ru dash-glosses «… — онлайн-табло — …» (an appositive restating the service noun).
//
//   node scripts/fix-glue-damage.mjs --dry
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data', 'airport-content');
const DRY = process.argv.includes('--dry');

const RULES = [
  { loc: 'tr', from: /\btablosuu\b/g, to: 'tablosunu' },
  { loc: 'tr', from: /\btablosuuna\b/g, to: 'tablosuna' },
  { loc: 'tr', from: /\btablosuunu\b/g, to: 'tablosunu' },
  { loc: 'ko', from: /출발를/g, to: '출발을' },
  { loc: 'ko', from: /도착와/g, to: '도착과' },
  { loc: 'it', from: /\b[Ll]'tabellone\b/g, to: 'il tabellone' },
  { loc: 'it', from: /\ball'tabellone\b/g, to: 'al tabellone' },
  { loc: 'it', from: /\bsull'tabellone\b/g, to: 'sul tabellone' },
  { loc: 'it', from: /\bdell'tabellone\b/g, to: 'del tabellone' },
  { loc: 'it', from: /\bnell'tabellone\b/g, to: 'nel tabellone' },
  { loc: 'ru', from: /(^|[^а-яё-])онлайн\s+онлайн[- ]табло/gi, to: '$1онлайн-табло' },  // JS \b is ASCII-only — powerless beside Cyrillic
  { loc: 'de', from: /\bAnkünfteund\b/g, to: 'Ankünfte und' },
  { loc: 'de', from: /\bAbflügeund\b/g, to: 'Abflüge und' },
  { loc: 'de', from: /\bundAbflüge\b/g, to: 'und Abflüge' },
  // Orphaned German low quotes left when only the closing straight quote was stripped.
  { loc: 'de', from: /„(Ankünfte|Abflüge|Online-Flugtafel)\b(?![^„]*[“”])/g, to: '$1' },
  // Dash-appositive glosses: «…на онлайн-панели — онлайн-табло — и следить…». Both the
  // bracketed and the dashed form restate the service noun; only the brackets were handled.
  { loc: 'ru', from: /\s+—\s+(онлайн-табло|прилёты|вылеты|табло вылетов|табло прилётов)\s+—\s+/g, to: ' ' },
  { loc: 'ru', from: /\s+—\s+(онлайн-табло|прилёты|вылеты)(?=[,.;)])/g, to: '' },
];

let files = 0, hits = 0;
const perRule = new Map();
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.json')).sort()) {
  const p = path.join(DIR, f);
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  let touched = false;
  for (const r of RULES) {
    const t = doc[r.loc];
    if (typeof t !== 'string') continue;
    const out = t.replace(r.from, r.to);
    if (out !== t) {
      const n = (t.match(r.from) || []).length;
      hits += n;
      perRule.set(r.from.source, (perRule.get(r.from.source) || 0) + n);
      doc[r.loc] = out.replace(/[ \t]{2,}/g, ' ');
      touched = true;
    }
  }
  if (touched) {
    files++;
    if (!DRY) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  }
}
console.log(`${DRY ? 'DRY' : 'applied'}: files ${files}, replacements ${hits}`);
for (const [k, v] of [...perRule.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(5)}  ${k}`);
