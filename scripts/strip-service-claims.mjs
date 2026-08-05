// Remove the sentence that names operating airlines from airports the site says have none.
//
// A page whose <title> reads "No scheduled flights" and whose next paragraph says Ryanair and
// Wizz Air fly to Warsaw and Berlin is not a thin page — it is a page that contradicts itself
// in public. Live example before this ran: /ru/airport/LWO, an airport in a country whose
// civil airspace has been closed since February 2022.
//
// Three sources disagree on these airports, and the least reliable one is the one asserting
// service:
//   - the provider feed measured zero (data/airport-service.json),
//   - Wikipedia has no airline table for it (data/airport-wiki-routes.json),
//   - a model-generated paragraph says airlines operate there.
// The first two are independent of each other and agree. So the paragraph loses.
//
// Deliberately NOT regenerating anything: the rest of each paragraph (location, terminals,
// history, transport) is genuine, and rewriting prose through a model is how this corpus
// acquired 122,602 defects the last time. This drops exactly the offending sentence.
//
// Scope is narrow by construction — only airports where the page actually prints the
// "no scheduled flights" claim, i.e. measured zero AND no Wikipedia airlines. An airport with
// a route table renders "Airlines and Destinations" instead and has nothing to contradict.
//
// Usage:  node scripts/strip-service-claims.mjs [--write]

import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');

/** How much prose must survive for the paragraph to still be worth publishing. */
const MIN_KEEP = 120;

const svc = JSON.parse(fs.readFileSync(path.join('data', 'airport-service.json'), 'utf8'));
const levels = svc.airports ?? svc;
const wiki = JSON.parse(fs.readFileSync(path.join('data', 'airport-wiki-routes.json'), 'utf8')).airports ?? {};
const hasWikiAirlines = (i) => Array.isArray(wiki[i]?.airlines) && wiki[i].airlines.length > 0;

// A raw zero is NOT what the page prints. lib/warm.ts downgrades a zero to "unknown" whenever
// OurAirports contradicts it (1,060 codes), and an unknown airport never claims to have no
// flights — so it has nothing to contradict. Filtering on the raw measurement instead of the
// published verdict would have "fixed" pages that were already honest.
const unverified = new Set(JSON.parse(
  fs.readFileSync(path.join('data', 'airport-service-unverified.json'), 'utf8')).codes ?? []);
/**
 * Mirror of hasNoService() in lib/warm.ts — the function that decides whether the page prints
 * "no scheduled flights" at all. Getting this wrong in either direction wastes the whole pass:
 * filtering on the raw zero targets pages that are already honest, and forgetting the wiki
 * branch MISSES the worst cases. LWO is the proof — measured zero, downgraded to unknown by
 * the cross-check, yet still printing "Регулярных рейсов нет" because its article says the
 * airport has no commercial service. That is the page this whole script was written for.
 */
const claimsNoService = (i) => {
  const raw = Number(levels[i]);
  const level = (raw === 0 && unverified.has(i)) ? null : (Number.isFinite(raw) ? raw : null);
  if (level !== null && level > 0) return false;
  if (hasWikiAirlines(i)) return false;
  if (level === 0) return true;
  return wiki[i]?.status === 'no_commercial_service';
};

// Proper nouns, so one list covers all twelve locales — carrier names are not translated.
// `\b` is useless against Chinese and Japanese, which is fine: the names stay Latin there too.
// `LOT` on its own is dropped and only `LOT Polish` kept: Lot is a French département, and
// "Lot-et-Garonne" / "departamento de Lot" made AGF and ZAO look like airline claims.
// `Emirates` is likewise required NOT to be the tail of "United Arab Emirates" (see COUNTRY
// below) — that one turned a correct sentence about a military air base into a false positive.
const CARRIERS = /\b(Ryanair|Wizz\s?Air|SkyUp|Turkish Airlines|Lufthansa|Aeroflot|Pobeda|S7|Emirates|Qatar Airways|airBaltic|Pegasus|AJet|Utair|Belavia|KLM|Air France|British Airways|easyJet|Vueling|SunExpress|FlyDubai|Azur Air|Nordwind|Red Wings|Uzbekistan Airways|Air Astana|SCAT|Somon Air|Azerbaijan Airlines|AZAL|LOT Polish)\b/i;

// A carrier name alone is NOT the defect, and treating it as one would have destroyed truthful
// content. Caught in the dry run before any write:
//   ADA/en — "No major airline is currently based at ADA; PREVIOUS services were mainly
//             operated by Turkish Airlines…"      ← accurate history, must stay
//   AAQ/de — "…VOR DER AUSSETZUNG des regulären Verkehrs nutzten…"   ← accurate history
//   LWO/ru — "В аэропорту базируются или регулярно работают … ВЫПОЛНЯЮТ рейсы"  ← false
// Only the present tense contradicts a page that says there are no scheduled flights. So the
// burden is inverted: a sentence is removed only when it makes a live claim in this locale's
// own words, and anything else is reported for a human rather than guessed at.
const PRESENT = {
  en: /\b(operates?|operating|serves?|serving|flies|fly|are based|is based|currently (?:operate|serve|fly))\b/i,
  ru: /(базиру[ею]тся|работают|выполня[ею]т|обслуживают|лета[ею]т|соединя[ею]т)/i,
  de: /\b(fliegen|bedienen|betreiben|sind stationiert|verbinden)\b/i,
  fr: /\b(desserv|oper|relient|proposent|effectuent)/i,
  es: /\b(oper[ao]|sirven|vuelan|conectan|enlazan)/i,
  it: /\b(oper[ao]|servono|volano|collegano)/i,
  tr: /(hizmet ver|uçuş düzenl|sefer düzenl|bağlant[ıi] sağl)/i,
  pt: /\b(oper[ao]|servem|voam|ligam)/i,
  ar: /(تشغل|تخدم|تسير|تربط)/,
  zh: /(运营|执飞|提供航班|通航)/,
  ja: /(就航|運航|運行)/,
  ko: /(운항|취항)/,
  hi: /(संचालित|उड़ान भरत|सेवा देत)/,
};

// Explicitly historical: if the sentence carries one of these, it is describing the past even
// if a present-tense verb appears elsewhere in it, and it stays.
const PAST = {
  en: /\b(previous|formerly|former|until|no longer|used to|were|was|has served|have served|has operated|have operated|suspended|ceased|before|military)\b/i,
  ru: /(ранее|прежде|до\s|бывш|прекращ|приостанов|не выполняются|выполнялись|были)/i,
  de: /\b(früher|ehemals|vor der|bis|nicht mehr|eingestellt|ausgesetzt|nutzten|flogen)\b/i,
  fr: /\b(auparavant|anciennement|jusqu|ne\s+.{0,12}\s*plus|suspendu|cessé|desservaient)\b/i,
  es: /\b(anteriormente|antiguamente|hasta|ya no|suspendid|ces[óo]|operaban|han? operado|han? incluido|han? servido)\b/i,
  it: /\b(precedentemente|un tempo|fino a|non più|sospes|cessat|operavano|ha servito|hanno servito|ha operato|hanno operato)\b/i,
  tr: /(eskiden|önceden|kadar|artık|askıya|durduruldu|ediyordu)/i,
  pt: /\b(anteriormente|antigamente|at[ée]|j[áa] n[ãa]o|suspens|cess)\b/i,
  ar: /(سابقا|سابقًا|حتى|لم يعد|تعليق|توقف|عند التشغيل|استخدمته|كان)/,
  zh: /(此前|曾经|曾經|以前|不再|暂停|暫停|已停)/,
  ja: /(かつて|以前|過去|停止|運休|廃止|していた|していました|でした)/,
  ko: /(이전|과거|중단|폐지|했었|였습니다|웠습니다)/,
  hi: /(पहले|पूर्व में|तक|अब नहीं|निलंबित|बंद)/,
};

// Same splitter as strip-board-promise.mjs, and for the same reason: CJK does not put a space
// after 。 or ！, so requiring whitespace makes an entire Chinese paragraph one "sentence".
const SPLIT = /(?<=[。！？])|(?<=[.!?।])\s+/;
const CJK = new Set(['zh', 'ja']);

const dir = path.join('data', 'airport-content');
let touchedFiles = 0, removed = 0, tooShort = 0, multi = 0;
const skipped = [];

for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const iata = path.basename(f, '.json');
  if (!claimsNoService(iata)) continue;
  // Only where an INDEPENDENT source confirms the airport has no commercial service. Without
  // that, the contradiction has two possible culprits and the paragraph is not obviously the
  // guilty one: a Turkish regional airport our probe missed would have a truthful paragraph
  // and a false title, and deleting the truth to protect the error is the wrong repair. Those
  // go to data/airport-service-unverified.json instead, which stops the page asserting
  // anything it cannot support and leaves the prose alone.
  if (wiki[iata]?.status !== 'no_commercial_service') continue;
  const p = path.join(dir, f);
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;

  for (const [locale, text] of Object.entries(doc)) {
    if (typeof text !== 'string' || !text) continue;
    const sents = text.split(SPLIT);
    // A carrier name that IS the airport's own IATA code is the airport talking about itself:
    // KLM is Kolhapur, LOT is Łódź, and both matched the airline list until this check.
    // Country and region names that contain a carrier name.
    const COUNTRY = /(Arab\s+Emirates|Emiratos?\s+Árabes|Émirats\s+arabes|Arabischen\s+Emirate|Emirati\s+Arabi|Birleşik\s+Arap|阿拉伯联合酋长国|アラブ首長国|아랍에미리트|संयुक्त अरब)/i;
    const present = PRESENT[locale], past = PAST[locale];
    const isHit = (s) => {
      const m = s.match(CARRIERS);
      if (!m || m[0].toUpperCase() === iata) return false;
      if (/^emirates$/i.test(m[0]) && COUNTRY.test(s)) return false;   // страна, не авиакомпания
      if (!present || !present.test(s)) return false;   // no live claim → nothing to fix
      if (past && past.test(s)) return false;           // describing the past → truthful
      return true;
    };
    const hits = sents.filter(isHit);
    if (!hits.length) continue;
    if (hits.length > 1) { multi++; skipped.push(`${iata}/${locale}: ${hits.length} предложений с перевозчиками`); continue; }
    const kept = sents.filter(s => !isHit(s)).join(CJK.has(locale) ? '' : ' ').replace(/\s+/g, ' ').trim();
    if (kept.length < MIN_KEEP) { tooShort++; skipped.push(`${iata}/${locale}: осталось ${kept.length} знаков`); continue; }
    if (process.argv.includes('--show')) console.log(`  [${iata}/${locale}] ${hits[0].replace(/\s+/g,' ').slice(0,130)}`);
    doc[locale] = kept;
    removed++; changed = true;
  }

  if (changed) {
    touchedFiles++;
    if (WRITE) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  }
}

console.log(`файлов ${WRITE ? 'переписано' : 'изменилось бы'}: ${touchedFiles}`);
console.log(`предложений удалено          : ${removed}`);
console.log(`не тронуто (слишком коротко) : ${tooShort}`);
console.log(`не тронуто (2+ предложений)  : ${multi}`);
if (skipped.length) console.log(`\nне тронуты:\n  ${skipped.join('\n  ')}`);
if (!WRITE) console.log('\nСухой прогон — ничего не записано. Повтори с --write.');
