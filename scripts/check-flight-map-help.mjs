#!/usr/bin/env node
/**
 * Справка карты: реальные HTTP/SSR и сверка с каталогами текущего checkout.
 *
 * Одинаково работает до и после выката. Запрашивает только 12 страниц справки,
 * 12 соседних страниц инструмента и один sitemap shard. API рейсов/прогрева
 * здесь нет; каждый запрос идёт с audit-bot, редиректы не преследуются.
 *
 * Usage:
 *   node scripts/check-flight-map-help.mjs [http://localhost:3127]
 *   node scripts/check-flight-map-help.mjs https://airportsboard.live
 *   node scripts/check-flight-map-help.mjs --static-only
 *
 * Без зависимостей и компиляции TS. Из HTML сначала исключаются script/style:
 * RSC повторяет каталог, поэтому совпадение внутри скрипта не доказывает SSR.
 * «Русский» в языковом ряду корректен на любой странице: контроль языка идёт
 * по article, а не по шапке/подвалу с названиями всех двенадцати языков.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const LOCALES = ['ru', 'en', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi'];
const IDS = ['rebuild', 'import', 'backup', 'share'];
// Каталог включает панель соцсетей без выбора региона: сохраняем строгий список, чтобы новый
// ключ не мог незаметно остаться без перевода или попасть только в один язык.
const KEYS = `xDatePrecision xExactDate xYearOnly xYear xUnknownDate xImport xImportHint xRoutes xChooseCSV xPreview xImportPreview xImportSummary xImportErrors xRow xUnknownAirport xInvalidRoute xInvalidDate xAmbiguousDate xInvalidCSV xTooLarge xIgnoredFields xPossibleDuplicates xKeepDuplicates xConfirmImport xImportDone xUndoImport xUndoUnavailable xCSVExport xCSVTemplate xReturnFlight xNextLeg xMore xPortrait xShowStats xShowFlags xEnlarge xSearchHistory xHistorySearchHint xNoMatches xHelp xShareTo xShareOther xShareHint xShareChoose xShareSaveFor xShareUnavailable`.split(' ');
const PUBLIC = 'https://airportsboard.live';
const PATH = '/flight-map/help';
const args = process.argv.slice(2);
const staticOnly = args.includes('--static-only');
const address = args.find(value => !value.startsWith('--')) || 'http://localhost:3127';
const base = new URL(address);
assert.ok(['http:', 'https:'].includes(base.protocol), 'Only HTTP(S) base URLs are supported');
assert.equal(base.pathname.replace(/\/$/, ''), '', 'Pass an origin, not a page URL');
assert.ok(!base.username && !base.password && !base.search && !base.hash, 'No credentials/query/hash in base URL');
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
const placeholders = value => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
const normalized = value => String(value).replace(/\s+/g, ' ').trim();
const expectedAlternates = Object.fromEntries([...LOCALES.map(locale => [locale, `${PUBLIC}/${locale}${PATH}`]), ['x-default', `${PUBLIC}/en${PATH}`]]);

function assertLanguage(value, locale, context) {
  assert.equal(typeof value, 'string', `${context}: string required`);
  assert.ok(value.trim(), `${context}: nonempty string required`);
  const ranges = [
    ['ru', /[\u0400-\u04ff]/u, 'Cyrillic'],
    ['ko', /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u, 'Hangul'],
    ['ja', /[\u3040-\u30ff]/u, 'Kana'],
    ['hi', /[\u0900-\u097f]/u, 'Devanagari'],
    ['ar', /[\u0600-\u06ff]/u, 'Arabic'],
  ];
  for (const [allowed, pattern, name] of ranges) {
    if (locale !== allowed) assert.doesNotMatch(value, pattern, `${context}: unexpected ${name}`);
  }
  if (!['zh', 'ja'].includes(locale)) assert.doesNotMatch(value, /[\u3400-\u9fff]/u, `${context}: unexpected CJK`);
  // Счёт количества не ловит закрывающий изолятор раньше открывающего.
  let depth = 0;
  for (const char of value) {
    if (/[\u2066-\u2068]/u.test(char)) depth++;
    if (char === '\u2069') assert.ok(--depth >= 0, `${context}: unexpected bidi terminator`);
  }
  assert.equal(depth, 0, `${context}: unclosed bidi isolate`);
}

function checkCatalogues() {
  const source = json('lib/flight-map/enhancements/ru.json');
  const all = {};
  for (const folder of ['enhancements', 'help']) {
    const actual = readdirSync(new URL(`../lib/flight-map/${folder}/`, import.meta.url)).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort();
    assert.deepEqual(actual, [...LOCALES].sort(), `${folder}: all twelve locales, no accidental extra files`);
  }
  for (const locale of LOCALES) {
    const messages = json(`lib/flight-map/enhancements/${locale}.json`);
    assert.deepEqual(Object.keys(messages).sort(), [...KEYS].sort(), `${locale}: enhancement keys`);
    for (const key of KEYS) {
      assertLanguage(messages[key], locale, `${locale}.${key}`);
      assert.deepEqual(placeholders(messages[key]), placeholders(source[key]), `${locale}.${key}: placeholders`);
    }
    assert.match(messages.xTooLarge, /(?<!\d)5000(?!\d)/);
    assert.match(messages.xTooLarge, /(?<!\d)2\s*(?:MB|МБ|Mo|ميغابايت)/u);
    assert.match(messages.xPortrait, /(?<!\d)4:5(?!\d)/);
    const copy = json(`lib/flight-map/help/${locale}.json`);
    assert.deepEqual(Object.keys(copy).sort(), ['title', 'description', 'heading', 'intro', 'backLabel', 'sections'].sort(), `${locale}: help schema`);
    for (const key of ['title', 'description', 'heading', 'intro', 'backLabel']) assertLanguage(copy[key], locale, `${locale}.help.${key}`);
    assert.equal(copy.sections.length, 4, `${locale}: four sections`);
    assert.deepEqual(copy.sections.map(section => section.id), IDS, `${locale}: stable anchors`);
    for (const section of copy.sections) {
      assert.deepEqual(Object.keys(section).sort(), ['id', 'title', 'paragraphs'].sort());
      assertLanguage(section.title, locale, `${locale}.${section.id}.title`);
      assert.equal(section.paragraphs.length, 2, `${locale}.${section.id}: two paragraphs`);
      section.paragraphs.forEach((paragraph, index) => assertLanguage(paragraph, locale, `${locale}.${section.id}.${index}`));
    }
    const prose = copy.sections.flatMap(section => section.paragraphs).join(' ');
    assert.match(prose, /(?<!\d)5000(?!\d)/, `${locale}: 5000-flight limit`);
    assert.match(prose, /(?<!\d)2\s*(?:MB|МБ|Mo|ميغابايت)/u, `${locale}: 2 MB file limit`);
    for (const fixed of ['2024-07-18', '9:16', '1:1', '4:5', 'from,to,date,number', 'SVX–IST–CDG', 'YYYY-MM-DD']) {
      assert.ok(prose.includes(fixed), `${locale}: missing documented format/limit ${fixed}`);
    }
    all[locale] = copy;
  }
  console.log(`PASS static: ${LOCALES.length} languages × ${KEYS.length} UI keys; help schema, placeholders, formats, scripts and bidi`);
  return all;
}

// Эти страницы генерирует React, поэтому все атрибуты экранированы. Разбираем
// атрибуты без зависимости от порядка, регистра hrefLang и вида кавычек;
// числовые entities нужны, в частности, для апострофов и RTL-текста.
function decode(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (whole, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? whole;
    const hex = entity[1].toLowerCase() === 'x';
    const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return point <= 0x10ffff ? String.fromCodePoint(point) : whole;
  });
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4])]));
}
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]));
const withoutScripts = html => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
const text = html => normalized(decode(html.replace(/<[^>]*>/g, ' ')));
function scripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(match => ({ ...attributes(match[1]), body: match[2] }));
}
async function get(path) {
  // Deny-by-construction: a future edit cannot accidentally turn this checker
  // into a buyer of live flight data or follow an external redirect.
  assert.match(path, /^\/(?:[a-z]{2}\/flight-map(?:\/help)?|sitemap\/\d+\.xml)$/);
  const response = await fetch(new URL(path, base), {
    redirect: 'manual', headers: { 'user-agent': 'audit-bot' }, signal: AbortSignal.timeout(90_000),
  });
  const html = await response.text();
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return { html, headers: response.headers };
}
function checkHelp(html, headers, locale, copy) {
  const document = withoutScripts(html);
  const articles = [...document.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)];
  assert.equal(articles.length, 1, `${locale}: one article`);
  const article = articles[0][1];
  const prose = text(article);
  assertLanguage(prose, locale, `${locale}: visible article`);
  assert.doesNotMatch(prose, /undefined|\{\{[^}]+\}\}|\{(?:count|row|code|fields)\}|my-flights-prototype|f_restore_test_20261028/);
  const h1 = [...document.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => text(match[1]));
  assert.deepEqual(h1, [normalized(copy.heading)], `${locale}: current H1`);
  assert.equal(tags(article, 'p').length, 11, `${locale}: breadcrumb, intro, eight section paragraphs, back link`);
  assert.deepEqual(tags(article, 'section').map(section => section.id), IDS, `${locale}: rendered sections`);
  for (const section of copy.sections) {
    assert.ok(prose.includes(normalized(section.title)), `${locale}: visible ${section.id} title`);
    for (const paragraph of section.paragraphs) assert.ok(prose.includes(normalized(paragraph)), `${locale}: current SSR ${section.id} paragraph`);
  }
  const links = tags(document, 'link');
  assert.deepEqual(links.filter(link => link.rel === 'canonical').map(link => link.href), [`${PUBLIC}/${locale}${PATH}`]);
  const alternates = links.filter(link => link.rel === 'alternate' && link.hreflang);
  assert.equal(alternates.length, 13);
  assert.deepEqual(Object.fromEntries(alternates.map(link => [link.hreflang, link.href])), expectedAlternates);
  const title = [...document.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(match => text(match[1]));
  assert.deepEqual(title, [normalized(copy.title)], `${locale}: title`);
  const meta = tags(document, 'meta');
  const value = (name, attribute = 'name') => meta.filter(tag => tag[attribute] === name).map(tag => tag.content);
  assert.deepEqual(value('description'), [copy.description], `${locale}: description`);
  assert.deepEqual(value('robots'), ['index, follow'], `${locale}: robots`);
  assert.ok(!/(?:noindex|nofollow)/i.test(headers.get('x-robots-tag') || ''), `${locale}: X-Robots-Tag`);
  assert.deepEqual(value('og:url', 'property'), [`${PUBLIC}/${locale}${PATH}`]);
  assert.deepEqual(value('og:title', 'property'), [copy.title]);
  assert.deepEqual(value('og:description', 'property'), [copy.description]);
  assert.deepEqual(value('twitter:title'), [copy.title]);
  const anchors = tags(document, 'a').map(anchor => anchor.href);
  for (const language of LOCALES) assert.ok(anchors.includes(`/${language}${PATH}`), `${locale}: visible locale link ${language}`);
  for (const id of IDS) assert.ok(anchors.includes(`#${id}`), `${locale}: section link ${id}`);
  assert.ok(anchors.includes(`/${locale}/flight-map`), `${locale}: relative tool link`);
  const allScripts = scripts(html);
  const graph = allScripts.filter(script => script.type === 'application/ld+json').flatMap(script => {
    const data = JSON.parse(script.body);
    return data['@graph'] || [data];
  });
  const page = graph.filter(node => node['@type'] === 'WebPage');
  assert.equal(page.length, 1);
  assert.equal(page[0].url, `${PUBLIC}/${locale}${PATH}`);
  assert.equal(page[0].inLanguage, locale);
  assert.equal(page[0].name, copy.heading);
  const breadcrumbs = graph.filter(node => node['@type'] === 'BreadcrumbList');
  assert.equal(breadcrumbs.length, 1);
  assert.deepEqual(breadcrumbs[0].itemListElement.map(item => [item.position, item.item]), [[1, `${PUBLIC}/${locale}`], [2, `${PUBLIC}/${locale}/flight-map`], [3, `${PUBLIC}/${locale}${PATH}`]]);
  assert.ok(!graph.some(node => ['FAQPage', 'HowTo'].includes(node['@type'])), `${locale}: no invented FAQ/HowTo`);
  assert.ok(!allScripts.some(script => /\/flight-map\/v\d+\//.test(script.src || '') || 'data-flight-map-boot' in script || 'data-flight-map-layout' in script), `${locale}: map runtime leak`);
  assert.ok(!links.some(link => /preload/.test(link.rel || '') && /\/flight-map\//.test(link.href || '')), `${locale}: map preload leak`);
  assert.ok(!/\/flight-map\/v\d+\//.test(headers.get('link') || ''), `${locale}: map Link header leak`);
  assert.ok(!document.includes('data-flight-map-version='), `${locale}: private journal shell leak`);
}
async function checkSitemap() {
  // Берём число корзин из исходника, но не импортируем TS/приложение, иначе
  // без сборки пришлось бы загружать каталог и окружение Next. На момент
  // появления помощи count=20, её стабильная корзина — /sitemap/11.xml.
  const count = Number(read('lib/airports.ts').match(/export const SITEMAP_FILES\s*=\s*(\d+)/)?.[1]);
  assert.ok(Number.isInteger(count) && count > 0, 'SITEMAP_FILES must be a positive literal');
  let hash = 2166136261;
  for (const char of PATH) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const shard = hash % count;
  const { html: xml } = await get(`/sitemap/${shard}.xml`);
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => match[1]).filter(block => /<loc>[^<]*\/flight-map\/help<\/loc>/.test(block));
  assert.equal(entries.length, 12, 'Sitemap: exactly twelve help URL entries');
  const locations = [];
  for (const block of entries) {
    const loc = decode(block.match(/<loc>([^<]+)<\/loc>/)[1]);
    locations.push(loc);
    const links = tags(block, 'xhtml:link');
    assert.equal(links.length, 13, `${loc}: sitemap alternate count`);
    assert.deepEqual(Object.fromEntries(links.map(link => [link.hreflang, link.href])), expectedAlternates, `${loc}: reciprocal sitemap cluster`);
    assert.ok(links.some(link => link.href === loc), `${loc}: sitemap self-reference`);
    assert.doesNotMatch(block, /<lastmod>/, `${loc}: no fabricated date for this static help page`);
  }
  assert.deepEqual(locations.sort(), LOCALES.map(locale => `${PUBLIC}/${locale}${PATH}`).sort());
  console.log(`PASS sitemap/${shard}.xml: 12 help URLs, reciprocal alternates and no fabricated lastmod`);
}

try {
  const copies = checkCatalogues();
  if (!staticOnly) {
    for (const locale of LOCALES) {
      const { html, headers } = await get(`/${locale}${PATH}`);
      checkHelp(html, headers, locale, copies[locale]);
      const sibling = await get(`/${locale}/flight-map`);
      const links = tags(withoutScripts(sibling.html), 'a');
      assert.ok(links.some(link => link.href === `/${locale}${PATH}`), `${locale}: help link missing from map SSR`);
      console.log(`PASS ${locale}: current help SSR, metadata, schema, anchors, privacy and sibling link`);
    }
    await checkSitemap();
  }
  console.log(`Flight map help: PASS${staticOnly ? ' (static only; HTTP not checked)' : ` (${base.origin})`}`);
} catch (error) {
  console.error(`Flight map help: FAIL — ${error.message}`);
  process.exitCode = 1;
}
