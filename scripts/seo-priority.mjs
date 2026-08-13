// Какие адреса стоит толкать поисковику сегодня — и почему именно эти.
//
// Общий модуль для двух толкателей: scripts/yandex-recrawl.mjs (квота переобхода Вебмастера,
// 150 адресов в сутки) и scripts/indexnow.mjs (Bing + Яндекс, лимит практически не жмёт).
// Оба раньше знали свой список наизусть, и оба списка успели устареть по-разному.
//
// ПОРЯДОК ЗДЕСЬ НЕ ИЗ ГОЛОВЫ. Замер 14.08 разложил спрос без остатка:
//
//   · 99.7% показов Яндекса — кириллические запросы; Google даёт 12 кликов за квартал;
//   · 98.3% визитов приходят на /ru/airport/XXX, на маршруты 42 визита за 30 дней;
//   · Казань и Уфа вдвоём дают 54% всех показов, топ-8 городов — 77%.
//
// То есть это задача не про 6 000 аэропортов и 12 языков, а про полтора десятка аэропортов на
// одном языке. Список поэтому берётся ИЗ ЗАМЕРА, а не из представлений о важности: Метрика
// знает, на какие страницы реально приходят, и знает это заново каждый месяц. Ранжирование по
// serviceLevel дало бы JFK и ORD впереди Казани — по числу рейсов они и правда больше, по
// спросу в единственном живом канале меньше в тридцать раз.
//
// Первыми идут НОВЫЕ адреса. Переобход ценнее всего там, где поисковик ещё не был, а спрос уже
// есть, — и именно это состояние возникает после каждой правки области карты сайта.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const BASE = 'https://airportsboard.live';
export const HOST = 'airportsboard.live';

/** Токен из ~/.env.<name> — там же, где его держат остальные проекты этой машины. */
export function readEnvFile(name) {
  const out = {};
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), `.env.${name}`), 'utf8');
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* нет файла — вызывающий разберётся */ }
  return out;
}

/** Все <loc> живой карты сайта, приведённые к путям без домена. */
export async function sitemapPaths() {
  const idx = await (await fetch(`${BASE}/sitemap.xml`, { headers: { 'user-agent': 'audit-bot' } })).text();
  const children = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const out = [];
  for (const child of children) {
    const xml = await (await fetch(child, { headers: { 'user-agent': 'audit-bot' } })).text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) out.push(new URL(m[1]).pathname);
  }
  return out;
}

/**
 * Аэропорты по СПРОСУ, из Метрики, по убыванию визитов за 30 дней.
 *
 * Счётчик стоит только на русской локали (см. components/YandexMetrica.tsx — tag.js весит
 * 93 КБ, и грузить его читателю в Германии значит платить за рынок, который всё равно не
 * монетизируется). Это ровно тот рынок, ради которого список и составляется, так что
 * ограничение здесь не мешает, а помогает: спрос меряется там, где он есть.
 *
 * Пустой ответ — не ошибка. Вызывающий переходит на запасное ранжирование.
 */
export async function airportsByDemand(days = 30) {
  const env = readEnvFile('yandex-metrika');
  const token = env.YANDEX_OAUTH_TOKEN;
  if (!token) return [];
  const to = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const qs = new URLSearchParams({
    ids: '110112198', metrics: 'ym:s:visits', dimensions: 'ym:s:startURLPathLevel4',
    date1: from, date2: to, limit: '200', sort: '-ym:s:visits',
  });
  try {
    const res = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${qs}`, {
      headers: { Authorization: `OAuth ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const seen = new Map();
    for (const row of json.data ?? []) {
      const code = /\/airport\/([A-Z0-9]{3})\/?$/.exec(row.dimensions[0]?.name ?? '')?.[1];
      if (!code) continue;
      // Один и тот же аэропорт приходит и со слешем, и без — складываем.
      seen.set(code, (seen.get(code) ?? 0) + (row.metrics[0] ?? 0));
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([code, visits]) => ({ code, visits }));
  } catch { return []; }
}

/**
 * Итоговая очередь: сначала новое, потом востребованное, без повторов.
 *
 * `known` — пути, которые толкатель уже отправлял (его файл состояния). Всё, что есть в карте
 * и чего нет в known, считается новым и идёт первым. Дальше — страницы аэропортов по спросу,
 * каждая парой «борт + прилёты», потому что запросы делятся ровно так же и класс «прилёт»
 * даёт лучший CTR на сайте (3.0% против 1.5% у общего «табло»).
 *
 * Возвращает пути, а не адреса: домен приклеивает вызывающий, ему же решать про локаль.
 */
export async function priorityPaths({ known = new Set(), locales = ['ru'], limit = Infinity } = {}) {
  const inMap = await sitemapPaths();
  const mapSet = new Set(inMap);
  const out = [];
  const push = (p) => { if (p && !out.includes(p)) out.push(p); };

  // 1. Новое в карте — то, чего толкатель ещё не отправлял.
  for (const p of inMap) {
    if (known.has(p)) continue;
    for (const loc of locales) push(p.replace(/^\/en\b/, `/${loc}`));
  }

  // 2. По измеренному спросу. Прилёты — только если карта их заявляет: толкать адрес, который
  //    сама карта не рекламирует, значит спорить с собственным сигналом.
  for (const { code } of await airportsByDemand()) {
    for (const loc of locales) {
      if (mapSet.has(`/en/airport/${code}`)) push(`/${loc}/airport/${code}`);
      if (mapSet.has(`/en/airport/${code}/arrivals`)) push(`/${loc}/airport/${code}/arrivals`);
    }
  }

  return { paths: out.slice(0, limit), sitemapSize: inMap.length, fresh: out.length };
}

/** Состояние толкателя: что уже отправляли и когда. Файлы под .gitignore. */
export function loadState(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { sent: {}, runs: [] }; }
}
export function saveState(file, state) {
  fs.writeFileSync(file, JSON.stringify(state, null, 1));
}
