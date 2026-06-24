#!/usr/bin/env node
/**
 * check-lang.mjs — automated language-mixing / localization audit for airportsboard.live
 *
 * Fetches a sample of pages per locale (raw SSR HTML, no JS) and flags:
 *   - untranslated i18n keys leaking into the page  (e.g. "home.sec_countries")
 *   - unrendered ICU placeholders in visible text    (e.g. "{airport}")
 *   - wrong-script text for the locale               (Cyrillic on a zh page, etc.)
 *   - English UI on a non-EN page                    (hero/title still in English)
 *   - message-file parity + English-identical values (untranslated strings)
 *   - airport-content data leakage                   (Russian words in non-ru content)
 *
 * Usage:
 *   node scripts/check-lang.mjs                # fetch live site + check local data
 *   node scripts/check-lang.mjs --no-fetch     # only check messages/ and data/ locally
 *   node scripts/check-lang.mjs --host 95.81.103.82   # override resolve IP
 *   node scripts/check-lang.mjs --json         # machine-readable output
 *
 * Exit code is non-zero if any HIGH-severity issue is found (CI-friendly).
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ── Config ──────────────────────────────────────────────────────────────────
const ROOT = process.cwd();
const DOMAIN = 'airportsboard.live';
const ARGS = process.argv.slice(2);
const RESOLVE_IP = argVal('--host', '95.81.103.82');
const NO_FETCH = ARGS.includes('--no-fetch');
const AS_JSON = ARGS.includes('--json');

const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
const RTL = new Set(['ar']);

// Pages sampled per locale. Mix of homepage + hubs in different countries so we
// exercise city/country localization (Moscow/RU, New York/US, Tokyo/JP, Dubai/AE).
const SAMPLE_PATHS = ['', '/airport/SVO', '/airport/JFK', '/airport/HND', '/airport/DXB'];

// Unicode script ranges. A page in locale L should not contain script from a
// "foreign" range (beyond unavoidable ASCII codes/IATA and brand names).
const SCRIPTS = {
  cyrillic: /[Ѐ-ӿ]/,
  cjk:      /[　-ヿ㐀-䶿一-鿿가-힯]/, // Han+Kana+Hangul
  arabic:   /[؀-ۿݐ-ݿ]/,
  devanagari: /[ऀ-ॿ]/,
};
// Which foreign scripts are forbidden in each locale's *visible* text.
const FORBIDDEN = {
  en: ['cyrillic', 'cjk', 'arabic', 'devanagari'],
  de: ['cyrillic', 'cjk', 'arabic', 'devanagari'],
  fr: ['cyrillic', 'cjk', 'arabic', 'devanagari'],
  es: ['cyrillic', 'cjk', 'arabic', 'devanagari'],
  it: ['cyrillic', 'cjk', 'arabic', 'devanagari'],
  tr: ['cyrillic', 'cjk', 'arabic', 'devanagari'],
  ru: ['cjk', 'arabic', 'devanagari'],          // Cyrillic is native
  zh: ['cyrillic', 'arabic', 'devanagari'],     // CJK is native
  ja: ['cyrillic', 'arabic', 'devanagari'],
  ko: ['cyrillic', 'arabic', 'devanagari'],
  ar: ['cyrillic', 'cjk', 'devanagari'],        // Arabic is native
  hi: ['cyrillic', 'cjk', 'arabic'],            // Devanagari is native
};

// English UI phrases that must NOT appear (verbatim, word-boundary) on a non-EN page.
// Kept conservative to avoid false positives on loanwords (Terminal, Gate, Check-in).
const ENGLISH_MARKERS = [
  'in real time', 'Airport boards', 'Flight Board', 'Arrivals & Departures',
  'Frequently asked questions', 'Show more', 'Read more', 'View all',
  'On time', 'Boarding now', 'Final call', 'Departures today', 'Arrivals today',
];

// i18n namespaces — used to detect literal keys like "home.sec_countries" leaking out.
const NAMESPACES = ['nav', 'board', 'status', 'meta', 'airport_info', 'home', 'ui'];

const findings = [];
function add(sev, area, locale, msg, sample) {
  findings.push({ sev, area, locale, msg, sample: sample ? String(sample).slice(0, 160) : undefined });
}

function argVal(flag, def) {
  const i = ARGS.indexOf(flag);
  return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : def;
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
// Strip <script>/<style> and tags so we only inspect *visible* text. This is
// crucial: the next-intl message bundle and JSON-LD are shipped inside <script>
// and legitimately contain English/placeholders/all scripts — never flag those.
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tag(html, re) { const m = html.match(re); return m ? m[1].trim() : ''; }
function htmlLang(html) { return tag(html, /<html[^>]*\blang="([^"]*)"/i); }
function htmlDir(html)  { return tag(html, /<html[^>]*\bdir="([^"]*)"/i); }
function title(html)    { return tag(html, /<title[^>]*>([\s\S]*?)<\/title>/i); }
function metaDesc(html) { return tag(html, /<meta\s+name="description"\s+content="([^"]*)"/i); }
function h1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

async function fetchPage(locale, p) {
  const url = `https://${DOMAIN}/${locale}${p}`;
  // Use --resolve so local DNS (which does not resolve the domain) is bypassed.
  const { execFileSync } = await import('node:child_process');
  try {
    return execFileSync('curl', [
      '-s', '--max-time', '20',
      '--resolve', `${DOMAIN}:443:${RESOLVE_IP}`, url,
    ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    add('HIGH', 'fetch', locale, `Failed to fetch ${url}: ${e.message}`);
    return '';
  }
}

// ── Check 1: message-file parity + English-identical values ───────────────────
function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const v = obj[k]; const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
// A value that is *only* ICU placeholders / punctuation / codes is language-neutral.
function isNeutral(s) {
  return s.replace(/\{[^}]+\}/g, '').replace(/[\s()\-—–→|/.,:]+/g, '').trim().length === 0;
}
function checkMessages() {
  const dir = path.join(ROOT, 'messages');
  if (!fs.existsSync(dir)) { add('HIGH', 'messages', '-', 'messages/ directory not found'); return; }
  const M = {};
  for (const l of LOCALES) {
    const f = path.join(dir, `${l}.json`);
    if (!fs.existsSync(f)) { add('HIGH', 'messages', l, `messages/${l}.json missing`); continue; }
    try { M[l] = flatten(JSON.parse(fs.readFileSync(f, 'utf8'))); }
    catch (e) { add('HIGH', 'messages', l, `messages/${l}.json invalid JSON: ${e.message}`); }
  }
  if (!M.en) return;
  const enKeys = Object.keys(M.en);
  for (const l of LOCALES) {
    if (l === 'en' || !M[l]) continue;
    const lk = new Set(Object.keys(M[l]));
    const missing = enKeys.filter(k => !lk.has(k));
    const extra = Object.keys(M[l]).filter(k => !(k in M.en));
    if (missing.length) add('HIGH', 'messages', l, `${missing.length} missing key(s)`, missing.join(', '));
    if (extra.length)   add('LOW',  'messages', l, `${extra.length} extra key(s)`, extra.join(', '));
    // English-identical (likely untranslated) — skip neutral/placeholder-only values.
    const ident = enKeys.filter(k =>
      typeof M.en[k] === 'string' && M[l][k] === M.en[k] &&
      M.en[k].trim() && !isNeutral(M.en[k]));
    if (ident.length) {
      // Loanwords commonly kept verbatim across Latin locales — downgrade to LOW.
      const loanwords = new Set(['Terminal', 'Gate', 'Status', 'Check-in', 'Home', 'Route', 'Destination', 'h', 'm']);
      const real = ident.filter(k => !loanwords.has(M.en[k]));
      if (real.length) add('MEDIUM', 'messages', l, `${real.length} value(s) identical to English (likely untranslated)`,
        real.map(k => `${k}="${M.en[k]}"`).join(' | '));
    }
  }
}

// ── Check 2: airport-content data leakage (Russian in non-ru values) ──────────
function checkAirportContent() {
  const dir = path.join(ROOT, 'data/airport-content');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const perLocale = {};
  let firstSample = null;
  for (const f of files) {
    let o; try { o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    for (const l of LOCALES) {
      if (l === 'ru') continue;
      if (typeof o[l] === 'string' && SCRIPTS.cyrillic.test(o[l])) {
        perLocale[l] = (perLocale[l] || 0) + 1;
        if (!firstSample) {
          const m = o[l].match(/.{0,30}[Ѐ-ӿ][Ѐ-ӿ \-]+.{0,10}/);
          firstSample = `${f} (${l}): …${m ? m[0].trim() : ''}…`;
        }
      }
    }
  }
  const total = Object.values(perLocale).reduce((a, b) => a + b, 0);
  if (total) add('HIGH', 'data/airport-content', '-',
    `${total} content value(s) contain Cyrillic in a non-ru locale ` +
    `(${Object.entries(perLocale).map(([k, v]) => `${k}:${v}`).join(', ')})`, firstSample);
}

// ── Check 3: per-page SSR checks ──────────────────────────────────────────────
function checkPage(locale, p, html) {
  if (!html) return;
  const label = `/${locale}${p || ' (home)'}`;
  const vis = visibleText(html);

  // <html lang> / dir
  const lang = htmlLang(html);
  if (lang !== locale) add('HIGH', 'html-lang', locale, `${label}: <html lang="${lang}"> != "${locale}"`);
  const dir = htmlDir(html);
  if (RTL.has(locale) && dir !== 'rtl') add('HIGH', 'html-dir', locale, `${label}: expected dir="rtl", got "${dir || 'none'}"`);
  if (!RTL.has(locale) && dir === 'rtl') add('MEDIUM', 'html-dir', locale, `${label}: unexpected dir="rtl"`);

  // Empty/missing SEO essentials
  if (!title(html)) add('HIGH', 'seo', locale, `${label}: empty <title>`);
  if (!metaDesc(html)) add('MEDIUM', 'seo', locale, `${label}: missing meta description`);
  if (p && !h1(html)) add('MEDIUM', 'seo', locale, `${label}: missing <h1>`);

  // Literal i18n keys leaking into visible text (e.g. "home.sec_countries")
  const keyRe = new RegExp(`\\b(${NAMESPACES.join('|')})\\.[a-z][a-z0-9_]+\\b`, 'g');
  const keyHits = [...new Set(vis.match(keyRe) || [])];
  if (keyHits.length) add('HIGH', 'i18n-key', locale, `${label}: literal i18n key(s) in visible text`, keyHits.join(', '));

  // Unrendered ICU placeholders in visible text (e.g. "{airport}", "{iata}")
  const phHits = [...new Set(vis.match(/\{[a-z][a-z0-9]*\}/g) || [])];
  if (phHits.length) add('HIGH', 'placeholder', locale, `${label}: unrendered placeholder(s) in visible text`, phHits.join(', '));

  // Wrong-script text for this locale (visible text only)
  for (const script of (FORBIDDEN[locale] || [])) {
    const re = SCRIPTS[script];
    if (re.test(vis)) {
      const m = vis.match(new RegExp(`.{0,25}${re.source}{1,}.{0,15}`));
      add('HIGH', 'wrong-script', locale, `${label}: foreign ${script} script in visible text`, m ? m[0] : '');
    }
  }

  // English UI markers on a non-EN page (title + h1 + visible body)
  if (locale !== 'en') {
    const hay = `${title(html)} ${h1(html)} ${vis}`;
    for (const marker of ENGLISH_MARKERS) {
      const re = new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(hay)) { add('HIGH', 'english-on-nonEN', locale, `${label}: English UI string "${marker}"`, hay.match(re)?.[0]); }
    }
    // Duplicated phrase in <title> (the "in real time in real time" bug)
    const t = title(html).replace(/&amp;/g, '&');
    const dup = t.match(/(\b[\p{L}]{4,}(?:\s+[\p{L}]+){0,3})\s+\1\b/u);
    if (dup) add('MEDIUM', 'title-dup', locale, `${label}: duplicated phrase in <title>`, dup[1]);
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function main() {
  checkMessages();
  checkAirportContent();

  if (!NO_FETCH) {
    for (const locale of LOCALES) {
      for (const p of SAMPLE_PATHS) {
        const html = await fetchPage(locale, p);
        checkPage(locale, p, html);
      }
    }
  }

  if (AS_JSON) { console.log(JSON.stringify(findings, null, 2)); }
  else {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    findings.sort((a, b) => order[a.sev] - order[b.sev] || a.area.localeCompare(b.area));
    const icon = { HIGH: 'x', MEDIUM: '!', LOW: '.' };
    if (!findings.length) console.log('OK — no language-mixing issues found.');
    for (const f of findings) {
      console.log(`[${icon[f.sev]}] ${f.sev.padEnd(6)} ${f.area.padEnd(20)} ${f.locale.padEnd(3)} ${f.msg}`);
      if (f.sample) console.log(`           ↳ ${f.sample}`);
    }
    const counts = findings.reduce((a, f) => (a[f.sev] = (a[f.sev] || 0) + 1, a), {});
    console.log(`\nSummary: ${counts.HIGH || 0} high, ${counts.MEDIUM || 0} medium, ${counts.LOW || 0} low`);
  }

  if (findings.some(f => f.sev === 'HIGH')) process.exit(1);
}

main();
