#!/usr/bin/env node
// Bring data/legal/privacy.json in line with what the site now actually does.
//
// Three fixes, all of them things a regulator or an AdSense reviewer can check in one click:
//
//  1. Google Analytics was never disclosed. It is being added now, so it has to be named,
//     alongside what it collects and how to opt out.
//  2. The Yandex.Metrica section described a counter that ran for every visitor. It now runs
//     only on the Russian-language pages, and session recording (Webvisor) has been turned
//     off — the policy never disclosed that it was on.
//  3. Section 7 promised that EEA/UK visitors "will be shown a consent message ... before
//     non-essential cookies are set". That was false when written. It is true now, via
//     Google Consent Mode v2 plus the notice in components/CookieNotice.tsx, and the wording
//     is tightened to describe the real mechanism rather than a vague promise.
//
// Idempotent: re-running detects the new text and does nothing.
import fs from 'fs';

const FILE = 'data/legal/privacy.json';
const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const GA_SECTION = {
  en: {
    heading: '5a. Analytics — Google Analytics 4',
    body: [
      'We use Google Analytics 4, a web analytics service provided by Google, to understand how visitors find and use the Site.',
      'Google Analytics sets cookies and collects information such as a randomly generated identifier, your approximate location derived from your IP address, device and browser data, the pages you view, the referring source, and the timing of your visit. We have not enabled Google Signals, and we do not send Google Analytics any information that identifies you personally.',
      'Google processes this data as described at: https://policies.google.com/privacy and https://business.safety.google/privacy',
      'Where the EU/UK GDPR applies, Google Analytics is loaded in a consent-denied state until you choose otherwise, so no analytics cookies are set unless you accept them. You can also opt out on any site using the Google Analytics opt-out browser add-on: https://tools.google.com/dlpage/gaoptout',
    ],
  },
  ru: {
    heading: '5a. Аналитика — Google Analytics 4',
    body: [
      'Мы используем Google Analytics 4 — сервис веб-аналитики компании Google — чтобы понимать, как посетители находят Сайт и пользуются им.',
      'Google Analytics устанавливает файлы cookie и собирает такую информацию, как случайно сгенерированный идентификатор, приблизительное местоположение, определённое по IP-адресу, данные об устройстве и браузере, просматриваемые страницы, источник перехода и время визита. Google Signals мы не включали и не передаём в Google Analytics сведений, идентифицирующих вас лично.',
      'Google обрабатывает эти данные в порядке, описанном по адресам: https://policies.google.com/privacy и https://business.safety.google/privacy',
      'Там, где применяется GDPR ЕС/Великобритании, Google Analytics загружается с запретом на хранение данных до тех пор, пока вы не решите иначе, поэтому аналитические cookie не устанавливаются без вашего согласия. Также вы можете отказаться от сбора данных на любых сайтах с помощью официального дополнения Google Analytics: https://tools.google.com/dlpage/gaoptout',
    ],
  },
};

const METRICA_NOTE = {
  en: 'Yandex.Metrica is loaded only on the Russian-language pages of the Site (URLs beginning /ru/). Session recording (Webvisor) is disabled, so mouse movement, keystrokes and page contents are not recorded.',
  ru: 'Яндекс.Метрика загружается только на русскоязычных страницах Сайта (адреса, начинающиеся с /ru/). Запись сессий (Вебвизор) отключена, поэтому движения мыши, нажатия клавиш и содержимое страниц не записываются.',
};

const CONSENT_OLD = {
  en: 'you will be shown a consent message allowing you to make choices about cookies and personalized advertising before non-essential cookies are set',
  ru: 'вам будет показано сообщение о согласии',
};
const CONSENT_NEW = {
  en: 'analytics and advertising storage is disabled by default and no non-essential cookies are set until you choose. A notice at the bottom of the page lets you accept or decline; your choice is remembered in your browser and applied to Google’s tags through Google Consent Mode. You can change it at any time by clearing site data for this Site',
  ru: 'хранение аналитических и рекламных данных отключено по умолчанию, и никакие необязательные cookie не устанавливаются до вашего выбора. Уведомление внизу страницы позволяет принять или отклонить их; ваш выбор сохраняется в браузере и применяется к тегам Google через Google Consent Mode. Изменить его можно в любой момент, очистив данные Сайта в браузере',
};

let changed = 0;

for (const lang of ['en', 'ru']) {
  const sections = doc[lang].sections;

  // 1. add the Google Analytics section right after the Metrica one
  if (!sections.some(s => s.heading === GA_SECTION[lang].heading)) {
    const i = sections.findIndex(s => /Yandex\.Metrica|Яндекс\.Метрика/.test(s.heading));
    sections.splice(i < 0 ? sections.length : i + 1, 0, GA_SECTION[lang]);
    changed++;
    console.log(`${lang}: added "${GA_SECTION[lang].heading}"`);
  }

  // 2. describe the narrowed Metrica scope
  const metrica = sections.find(s => /Yandex\.Metrica|Яндекс\.Метрика/.test(s.heading));
  if (metrica && !metrica.body.some(b => b === METRICA_NOTE[lang])) {
    metrica.body.splice(1, 0, METRICA_NOTE[lang]);
    changed++;
    console.log(`${lang}: documented Metrica scope + Webvisor off`);
  }

  // 3. make the EEA/UK consent claim describe the real mechanism
  for (const s of sections) {
    s.body = s.body.map(line => {
      if (!line.includes(CONSENT_OLD[lang])) return line;
      changed++;
      console.log(`${lang}: rewrote the EEA/UK consent claim in "${s.heading}"`);
      return line.replace(CONSENT_OLD[lang], CONSENT_NEW[lang]);
    });
  }

  // 4. name Google Analytics in the cookie inventory
  for (const s of sections) {
    const i = s.body.findIndex(b => /First-party analytics cookies|Аналитические cookie первой стороны/.test(b));
    if (i < 0) continue;
    if (s.body[i].includes('Google Analytics')) continue;
    s.body[i] = s.body[i]
      .replace('our analytics provider, Yandex.Metrica, sets cookies', 'our analytics providers, Google Analytics and (on Russian-language pages) Yandex.Metrica, set cookies')
      .replace('наш поставщик аналитики, Яндекс.Метрика, устанавливает cookie', 'наши поставщики аналитики — Google Analytics и (на русскоязычных страницах) Яндекс.Метрика — устанавливают cookie');
    changed++;
    console.log(`${lang}: named Google Analytics in the cookie inventory`);
  }
}

if (changed) {
  fs.writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n');
  console.log(`\n${changed} change(s) written to ${FILE}`);
} else {
  console.log('\nalready up to date — nothing written');
}
