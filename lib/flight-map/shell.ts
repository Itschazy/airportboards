import shell from './shell-i18n.json';
import { flightMapMessages, locales, escapeHTML } from './localization';
import { runtimeUrl } from './runtime-url';
import { createI18n } from '../../public/flight-map/v4/i18n';

/**
 * HTML-оболочка карты перелётов для одной локали — без Next.
 *
 * Зачем вынесено из app/[locale]/flight-map/page.tsx. Ту же оболочку соберёт приложение — на
 * этапе сборки, node-скриптом (mobile/scripts/build-map-shell.mjs): у WebView нет сервера,
 * который заполнил бы шаблон на лету. Вторая копия заполнения разошлась бы с сайтом при первой
 * же правке шаблона, а движок карты (public/flight-map/v9) ищет в разметке конкретные id —
 * расхождение проявилось бы мёртвыми кнопками, как уже было с кэшем движка (runtime-url.ts).
 *
 * Поэтому здесь нет ничего из Next: только JSON-каталоги, fs (отпечаток движка) и чистый
 * createI18n из замороженного v4. Вызывается и из страницы, и из обычного node (jiti/tsx с
 * алиасом `@` на корень репозитория — его использует localization.ts); проверка —
 * tests/flight-map-shell.test.mjs.
 *
 * Блок SEO/FAQ остаётся заботой страницы: `info` подставляется между метками
 * flight-map-seo, как раньше. Без `info` метки остаются пустыми — в шаблоне между ними ничего
 * нет, и приложению поисковый текст не нужен.
 */
export type FlightMapShell = {
  locale: string;
  html: string;
  /** Каталог сообщений движка (locales + enhancements) — его же получает FlightMap. */
  messages: Record<string, unknown>;
  /** Адрес движка с отпечатком сборки, см. runtime-url.ts. */
  runtimeUrl: string;
};

/**
 * Для node-скрипта и любого, у кого каталога ещё нет: загрузить каталог и заполнить.
 */
export async function flightMapShell(locale: string, opts: { info?: string } = {}): Promise<FlightMapShell> {
  if (!(locales as readonly string[]).includes(locale)) throw new Error(`flight-map shell: unknown locale ${locale}`);
  const messages = await flightMapMessages(locale);
  return { locale, html: fillFlightMapShell(locale, messages, opts), messages, runtimeUrl };
}

/**
 * Заполнение шаблона по уже загруженному каталогу — синхронно, и страница зовёт именно его.
 *
 * Не из экономии. Порядок, в котором серверный рендер выпускает куски RSC-нагрузки, зависит
 * от числа ожиданий на пути страницы: лишний await переставил куски, сменил их номера и место
 * preload-скрипта страницы, и HTML карты перестал совпадать с прежним байт-в-байт на всех 12
 * локалях (замерено при выносе). Страница ждёт каталог ровно там же, где ждала до выноса.
 */
export function fillFlightMapShell(locale: string, messages: Record<string, unknown>, { info }: { info?: string } = {}): string {
  // Нулевая статистика и пустой список печатаются сервером, а не движком: первый кадр без JS
  // иначе показывал бы пустые плитки, а движок перерисует их из журнала при запуске.
  const { statLabel } = createI18n(locale, messages);
  const stats = `<div class="stat"><b>0</b><span>${escapeHTML(statLabel('flights',0))}</span></div><div class="stat"><b>0</b><span>${escapeHTML(statLabel('countries',0))}</span></div><div class="stat"><b>0</b><span>${escapeHTML(messages.m088)}</span></div>`;
  const html = (shell as string).replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHTML(key === 'locale' ? locale : messages[key]))
    .replace('<div class="stats" id="stats"></div>', `<div class="stats" id="stats">${stats}</div>`)
    .replace('<div id="flightList"></div>', `<div id="flightList"><div class="empty-list">${escapeHTML(messages.m097)}</div></div>`);
  return info === undefined ? html : html.replace(/<!-- flight-map-seo:start -->[\s\S]*?<!-- flight-map-seo:end -->/, info);
}
