import { numLocale } from '@/lib/i18n';

/**
 * Ответы страницы маршрута — собранные ИЗ ЗАМЕРОВ, а не написанные.
 *
 * Разбор 14.08 нашёл, что страница маршрута — самый тонкий из заявленных в карте типов:
 * 1 012 знаков, НОЛЬ заголовков второго уровня, из разметки только BreadcrumbList. Для
 * сравнения, у страницы аэропорта двенадцать h2 и четыре типа структурных данных. Таких
 * страниц 454, и все они в карте сайта — то есть ровно тот класс, за который Google пометил
 * 5 324 адреса «просканирована, не проиндексирована».
 *
 * ЧТО ЗДЕСЬ МОЖНО И ЧЕГО НЕЛЬЗЯ. Прозу писать нельзя: сайт уже отклонён AdSense 03.08 с
 * формулировкой «бесполезный контент», и генерировать текст ради объёма значит повторить
 * причину отказа. Поэтому здесь ровно та же конструкция, что у FAQ страницы аэропорта,
 * который прошёл под тем же ограничением: ВОПРОС — заголовок, ОТВЕТ — предложение, в котором
 * единственное содержательное место занимает измеренное число. Ни одного утверждения, которое
 * нельзя проверить по данным.
 *
 * Единицы измерения НЕ ПЕРЕВОДЯТСЯ ВРУЧНУЮ. «ч», «мин», «км», «Std.», «시간», «كم» и разделители
 * разрядов выдаёт Intl по локали — двенадцать языков бесплатно и без единой опечатки. Локаль
 * берётся через numLocale, иначе арабский печатал бы восточные цифры (٢٬٣٥٧) там, где весь
 * остальной сайт печатает западные: система счисления закреплена в lib/i18n.ts, и обходить её
 * здесь означало бы завести на одной странице две.
 *
 * Ответы — полными предложениями, потому что цитировать фрагмент, который вне контекста ничего
 * не значит, отвечающая машина не может. «357 км» само по себе не ответ; «Расстояние между
 * AMS и LHR — 357 км по прямой» — ответ.
 */

/**
 * ИМЕНА СОБСТВЕННЫЕ ОСТАЮТСЯ В ИМЕНИТЕЛЬНОМ — отсюда двоеточие вместо предлогов.
 *
 * Первая версия спрашивала «Сколько лететь из {from} в {to}?» и печатала «Сколько лететь из
 * Москва в Санкт-Петербург»: getCityName отдаёт название в именительном, а русский предлог
 * требует родительного. То же сломалось бы в немецком (артикль), французском (élision) и
 * далее по списку.
 *
 * Склонять названия на двенадцати языках нельзя — это ровно та задача, от которой в этом коде
 * уже отказались осознанно: в EXT_LABELS ради этого стоит «до аэропорта {a}» вместо «до {a}»,
 * потому что «до Минеральные Воды» и "vom Frankfurt" были сломаны на каждом склоняемом имени.
 *
 * Поэтому здесь конструкция «{from} — {to}: вопрос?». Она даёт имена в именительном на любом
 * языке, сохраняет их в заголовке (а значит и совпадение с запросом), и повторяет форму
 * заголовка первого уровня, который и так читается «Москва (SVO) → Санкт-Петербург (LED)».
 */
type Labels = {
  /** «{from} — {to}: сколько лететь?» */
  duration_q: string;
  /** «{d} — медиана по сегодняшнему расписанию.» */
  duration_a: string;
  /** «Какое расстояние между {a} и {b}?» */
  distance_q: string;
  /** «{km} по прямой.» */
  distance_a: string;
  /** «На маршруте работают: {list}.» — заголовком служит существующий ключ home.route_airlines. */
  airlines_a: string;
};

const LABELS: Record<string, Labels> = {
  en: {
    duration_q: '{from} — {to}: how long is the flight?',
    duration_a: '{d} — the median of today’s schedule.',
    distance_q: '{a} — {b}: what is the distance?',
    distance_a: '{km} in a straight line.',
    airlines_a: 'On today’s board this route is operated by {list}.',
  },
  ru: {
    duration_q: '{from} — {to}: сколько лететь?',
    duration_a: '{d} — медиана по сегодняшнему расписанию.',
    distance_q: '{a} — {b}: какое расстояние?',
    distance_a: '{km} по прямой.',
    airlines_a: 'По сегодняшнему табло маршрут выполняют: {list}.',
  },
  zh: {
    duration_q: '{from} — {to}：飞行时间多久？',
    duration_a: '{d}，为今日时刻表的中位数。',
    distance_q: '{a} — {b}：直线距离多远？',
    distance_a: '直线距离{km}。',
    airlines_a: '根据今日航班动态，执飞该航线的航空公司为：{list}。',
  },
  ar: {
    duration_q: '{from} — {to}: كم تستغرق الرحلة؟',
    duration_a: '{d} — الوسيط وفق جدول اليوم.',
    distance_q: '{a} — {b}: كم المسافة؟',
    distance_a: '{km} بخط مستقيم.',
    airlines_a: 'وفق لوحة اليوم، تُشغّل هذا المسار: {list}.',
  },
  de: {
    duration_q: '{from} — {to}: Wie lange dauert der Flug?',
    duration_a: '{d} — der Median des heutigen Flugplans.',
    distance_q: '{a} — {b}: Wie groß ist die Entfernung?',
    distance_a: '{km} Luftlinie.',
    airlines_a: 'Laut heutiger Anzeigetafel wird die Strecke von {list} bedient.',
  },
  ko: {
    duration_q: '{from} — {to}: 비행 시간은 얼마나 되나요?',
    duration_a: '{d}이며, 오늘 시간표의 중앙값입니다.',
    distance_q: '{a} — {b}: 거리는 얼마인가요?',
    distance_a: '직선거리로 {km}입니다.',
    airlines_a: '오늘 운항 정보 기준으로 이 노선은 {list}이(가) 운항합니다.',
  },
  ja: {
    duration_q: '{from} — {to}：飛行時間は？',
    duration_a: '{d}（本日の時刻表の中央値）。',
    distance_q: '{a} — {b}：距離は？',
    distance_a: '直線距離で{km}。',
    airlines_a: '本日の発着案内では、この路線を{list}が運航しています。',
  },
  fr: {
    duration_q: '{from} — {to} : combien de temps dure le vol ?',
    duration_a: '{d} — la médiane des horaires du jour.',
    distance_q: '{a} — {b} : quelle est la distance ?',
    distance_a: '{km} à vol d’oiseau.',
    airlines_a: 'D’après le tableau du jour, la liaison est assurée par {list}.',
  },
  es: {
    duration_q: '{from} — {to}: ¿cuánto dura el vuelo?',
    duration_a: '{d}, la mediana del horario de hoy.',
    distance_q: '{a} — {b}: ¿qué distancia hay?',
    distance_a: '{km} en línea recta.',
    airlines_a: 'Según el panel de hoy, la ruta la operan {list}.',
  },
  it: {
    duration_q: '{from} — {to}: quanto dura il volo?',
    duration_a: '{d}, la mediana degli orari di oggi.',
    distance_q: '{a} — {b}: qual è la distanza?',
    distance_a: '{km} in linea d’aria.',
    airlines_a: 'Secondo la bacheca di oggi, la rotta è operata da {list}.',
  },
  hi: {
    duration_q: '{from} — {to}: उड़ान में कितना समय लगता है?',
    duration_a: '{d} — आज के शेड्यूल का माध्यक।',
    distance_q: '{a} — {b}: दूरी कितनी है?',
    distance_a: 'सीधी रेखा में {km}।',
    airlines_a: 'आज के बोर्ड के अनुसार यह मार्ग {list} संचालित करती हैं।',
  },
  tr: {
    duration_q: '{from} — {to}: uçuş ne kadar sürer?',
    duration_a: '{d} — bugünkü tarifenin ortancası.',
    distance_q: '{a} — {b}: mesafe ne kadar?',
    distance_a: 'Kuş uçuşu {km}.',
    airlines_a: 'Bugünkü tabloya göre bu hattı {list} işletiyor.',
  },
};

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

/** Длительность в единицах локали: «1 ч 15 мин», «1 Std. 15 Min.», «1小时15分钟». */
export function formatDuration(minutes: number, locale: string): string {
  const nl = numLocale(locale);
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const unit = (value: number, u: 'hour' | 'minute') =>
    new Intl.NumberFormat(nl, { style: 'unit', unit: u, unitDisplay: 'short' }).format(value);
  if (!h) return unit(m, 'minute');
  if (!m) return unit(h, 'hour');
  return `${unit(h, 'hour')} ${unit(m, 'minute')}`;
}

/** Расстояние в единицах локали: «2 357 км», «2,357 km», «٢٣٥٧ كم» — с западными цифрами. */
export function formatKm(km: number, locale: string): string {
  return new Intl.NumberFormat(numLocale(locale), { style: 'unit', unit: 'kilometer', unitDisplay: 'short' }).format(km);
}

export type RouteFact = { q: string; a: string };

/**
 * Пары «вопрос — ответ» для страницы маршрута. Пусто там, где нечего измерить: маршрут без
 * годных отметок времени не получает вопроса о длительности, а не получает выдуманный ответ.
 */
export function routeFacts(opts: {
  locale: string;
  fromCity: string; toCity: string;
  fromIata: string; toIata: string;
  durationMin: number | null;
  km: number | null;
  airlines: string[];
  airlineList: string;
}): RouteFact[] {
  const L = LABELS[opts.locale] ?? LABELS.en;
  const out: RouteFact[] = [];
  if (opts.durationMin != null) {
    out.push({
      q: fill(L.duration_q, { from: opts.fromCity, to: opts.toCity }),
      a: fill(L.duration_a, { d: formatDuration(opts.durationMin, opts.locale) }),
    });
  }
  if (opts.km != null) {
    out.push({
      q: fill(L.distance_q, { a: opts.fromIata, b: opts.toIata }),
      a: fill(L.distance_a, { km: formatKm(opts.km, opts.locale) }),
    });
  }
  if (opts.airlines.length) {
    out.push({ q: '', a: fill(L.airlines_a, { list: opts.airlineList }) });
  }
  return out;
}

/** Только для проверок: полный набор ключей по локалям. */
export const ROUTE_LABELS = LABELS;
