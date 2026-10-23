/** Сбор диагностики не должен обходить отказ от аналитики или региональный запрет.
 * Используем тот же консервативный часовой пояс, что и Метрика; при неизвестном
 * поясе/недоступном storage молчим. Никаких новых cookies или идентификаторов.
 */
export function rumAllowed(host: string, zone: string, choice: string | null, automation: boolean, optOut: boolean, localTest = false): boolean {
  if (automation || optOut || choice === 'denied') return false;
  if (host !== 'airportsboard.live' && host !== 'www.airportsboard.live'
    && !(localTest && ['localhost', '127.0.0.1'].includes(host))) return false;
  if (choice === 'granted') return true;
  if (!zone || !zone.includes('/')) return false;
  const [area, city] = zone.split('/');
  const allowedEurope = 'Moscow Kaliningrad Samara Volgograd Saratov Astrakhan Ulyanovsk Kirov Minsk Kiev Kyiv Chisinau Istanbul'.split(' ');
  if (area === 'Europe') return allowedEurope.includes(city);
  return !(area === 'Atlantic' && 'Canary Madeira Azores Faroe Reykjavik'.split(' ').includes(city));
}

export function rumPage(path: string): { locale: string; page: string; airport: string } | null {
  const m = path.match(/^\/(en|ru|zh|ar|de|ko|ja|fr|es|it|hi|tr)(?:\/airport\/([A-Z]{3})(?:\/(arrivals|departures))?)?\/?$/);
  return m ? { locale: m[1], airport: m[2] || '', page: m[2] ? m[3] === 'arrivals' ? 'arrivals' : 'departures' : 'home' } : null;
}

export function rumBrowser(ua: string): { browser: string; browserMajor: number } {
  const families: [string, RegExp][] = [
    ['yandex', /YaBrowser\/(\d+)/], ['yandex-app', /(?:YaSearchBrowser|YaApp_Android|YaApp_iOS)\/(\d+)/],
    ['samsung', /SamsungBrowser\/(\d+)/], ['edge', /(?:EdgA|EdgiOS|Edg)\/(\d+)/],
    ['opera', /(?:OPR|OPiOS)\/(\d+)/], ['chrome-ios', /CriOS\/(\d+)/],
    ['chrome', /Chrome\/(\d+)/], ['firefox', /(?:Firefox|FxiOS)\/(\d+)/],
    ['safari', /Version\/(\d+).*Safari/],
  ];
  for (const [browser, pattern] of families) {
    const match = ua.match(pattern);
    if (match) return { browser, browserMajor: Math.min(999, Number(match[1])) };
  }
  return { browser: 'other', browserMajor: 0 };
}
