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
// 29.10: прежние ответы «357 км»/«1 ч — медиана сегодня» теряли маршрут
// вне заголовка. Код обоих аэропортов теперь входит и в ответ, и в вопрос
// о длительности. «Сегодня» убрано: используемый снимок может быть старым.
// Метрика/единицы и правила пропуска отсутствующих данных не изменились.
type Labels = {
  /** «{from} — {to}: сколько лететь?» */
  duration_q: string;
  /** «{a} — {b}: {d}, медиана плановых длительностей доступного снимка.» */
  duration_a: string;
  /** «Какое расстояние между {a} и {b}?» */
  distance_q: string;
  /** «Между {a} и {b} около {km} по прямой.» */
  distance_a: string;
  /** «В сохранённом табло {a} — {b} указаны: {list}.» — заголовок home.route_airlines. */
  airlines_a: string;
};

const LABELS: Record<string, Labels> = {
  en: {
    duration_q: '{from} ({a}) — {to} ({b}): how long is the flight?',
    duration_a: '{a} — {b}: scheduled duration in the saved data is {d}, the median of available flights.',
    distance_q: '{a} — {b}: what is the distance?',
    distance_a: 'The straight-line distance between airports {a} and {b} is about {km}, not the actual flight path.',
    airlines_a: 'The saved board for {a} — {b} lists these airlines: {list}.',
  },
  ru: {
    duration_q: '{from} ({a}) — {to} ({b}): сколько лететь?',
    duration_a: '{a} — {b}: плановая длительность по сохранённым данным — {d}, медиана доступных рейсов.',
    distance_q: '{a} — {b}: какое расстояние?',
    distance_a: 'Расстояние между аэропортами {a} и {b} — около {km} по прямой, не фактический трек рейса.',
    airlines_a: 'В сохранённом табло {a} — {b} указаны авиакомпании: {list}.',
  },
  zh: {
    duration_q: '{from} ({a}) — {to} ({b})：飞行时间多久？',
    duration_a: '{a} — {b}：已保存数据中的计划时长为{d}，这是可用航班时长的中位数。',
    distance_q: '{a} — {b}：直线距离多远？',
    distance_a: '机场{a}与{b}之间的直线距离约为{km}，并非飞机实际飞行距离。',
    airlines_a: '{a} — {b}的已保存航班信息板列出了以下航空公司：{list}。',
  },
  ar: {
    duration_q: '{from} ({a}) — {to} ({b}): كم تستغرق الرحلة؟',
    duration_a: '{a} — {b}: المدة المجدولة في البيانات المحفوظة هي {d}، وهي وسيط مدد الرحلات المتاحة.',
    distance_q: '{a} — {b}: كم المسافة؟',
    distance_a: 'تبلغ المسافة بخط مستقيم بين المطارين {a} و{b} نحو {km}، وليست مسافة المسار الفعلي للطائرة.',
    airlines_a: 'تعرض اللوحة المحفوظة للمسار {a} — {b} شركات الطيران التالية: {list}.',
  },
  de: {
    duration_q: '{from} ({a}) — {to} ({b}): Wie lange dauert der Flug?',
    duration_a: '{a} — {b}: Die geplante Dauer beträgt laut gespeicherten Daten {d}, der Median der verfügbaren Flüge.',
    distance_q: '{a} — {b}: Wie groß ist die Entfernung?',
    distance_a: 'Die Luftlinie zwischen den Flughäfen {a} und {b} beträgt etwa {km}, nicht die tatsächliche Flugstrecke.',
    airlines_a: 'Die gespeicherte Tafel für {a} — {b} nennt diese Fluggesellschaften: {list}.',
  },
  ko: {
    duration_q: '{from} ({a}) — {to} ({b}): 비행 시간은 얼마나 되나요?',
    duration_a: '{a} — {b}: 저장된 데이터의 예정 소요 시간은 {d}이며, 확인 가능한 항공편의 중앙값입니다.',
    distance_q: '{a} — {b}: 거리는 얼마인가요?',
    distance_a: '공항 {a}와 {b} 사이의 직선거리는 약 {km}이며, 실제 비행 경로의 거리는 아닙니다.',
    airlines_a: '{a} — {b}의 저장된 운항 안내에는 다음 항공사가 표시됩니다: {list}.',
  },
  ja: {
    duration_q: '{from} ({a}) — {to} ({b})：飛行時間は？',
    duration_a: '{a} — {b}：保存済みデータの予定所要時間は{d}で、取得できた便の中央値です。',
    distance_q: '{a} — {b}：距離は？',
    distance_a: '空港{a}と{b}の直線距離は約{km}です。実際の飛行経路の距離ではありません。',
    airlines_a: '{a} — {b}の保存済み発着案内には、次の航空会社が表示されています：{list}。',
  },
  fr: {
    duration_q: '{from} ({a}) — {to} ({b}) : combien de temps dure le vol ?',
    duration_a: '{a} — {b} : la durée prévue dans les données enregistrées est de {d}, médiane des vols disponibles.',
    distance_q: '{a} — {b} : quelle est la distance ?',
    distance_a: 'La distance à vol d’oiseau entre les aéroports {a} et {b} est d’environ {km}, et non la distance réellement parcourue par l’avion.',
    airlines_a: 'Le tableau enregistré pour {a} — {b} indique les compagnies suivantes : {list}.',
  },
  es: {
    duration_q: '{from} ({a}) — {to} ({b}): ¿cuánto dura el vuelo?',
    duration_a: '{a} — {b}: la duración prevista en los datos guardados es de {d}, la mediana de los vuelos disponibles.',
    distance_q: '{a} — {b}: ¿qué distancia hay?',
    distance_a: 'La distancia en línea recta entre los aeropuertos {a} y {b} es de unos {km}, no la distancia real del vuelo.',
    airlines_a: 'El panel guardado de {a} — {b} muestra estas aerolíneas: {list}.',
  },
  it: {
    duration_q: '{from} ({a}) — {to} ({b}): quanto dura il volo?',
    duration_a: '{a} — {b}: la durata prevista nei dati salvati è di {d}, la mediana dei voli disponibili.',
    distance_q: '{a} — {b}: qual è la distanza?',
    distance_a: 'La distanza in linea d’aria tra gli aeroporti {a} e {b} è di circa {km}, non la distanza effettivamente percorsa dal volo.',
    airlines_a: 'Il tabellone salvato per {a} — {b} riporta queste compagnie aeree: {list}.',
  },
  hi: {
    duration_q: '{from} ({a}) — {to} ({b}): उड़ान में कितना समय लगता है?',
    duration_a: '{a} — {b}: सहेजे गए डेटा में निर्धारित अवधि {d} है, जो उपलब्ध उड़ानों की अवधि का माध्यक है।',
    distance_q: '{a} — {b}: दूरी कितनी है?',
    distance_a: 'हवाई अड्डों {a} और {b} के बीच सीधी दूरी लगभग {km} है, न कि विमान के वास्तविक मार्ग की दूरी।',
    airlines_a: '{a} — {b} के सहेजे गए बोर्ड में ये एयरलाइनें दिखाई गई हैं: {list}।',
  },
  tr: {
    duration_q: '{from} ({a}) — {to} ({b}): uçuş ne kadar sürer?',
    duration_a: '{a} — {b}: kayıtlı verilere göre planlanan süre {d}; bu, mevcut uçuşların medyanıdır.',
    distance_q: '{a} — {b}: mesafe ne kadar?',
    distance_a: '{a} ve {b} havalimanları arasındaki kuş uçuşu mesafe yaklaşık {km}; bu, uçağın gerçek uçuş rotası değildir.',
    airlines_a: '{a} — {b} için kayıtlı panoda şu havayolları yer alır: {list}.',
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
  const codes = { a: opts.fromIata, b: opts.toIata };
  if (opts.durationMin != null) {
    out.push({
      q: fill(L.duration_q, { from: opts.fromCity, to: opts.toCity, ...codes }),
      a: fill(L.duration_a, { d: formatDuration(opts.durationMin, opts.locale), ...codes }),
    });
  }
  if (opts.km != null) {
    out.push({
      q: fill(L.distance_q, codes),
      a: fill(L.distance_a, { km: formatKm(opts.km, opts.locale), ...codes }),
    });
  }
  if (opts.airlines.length) {
    out.push({ q: '', a: fill(L.airlines_a, { list: opts.airlineList, ...codes }) });
  }
  return out;
}

/** Только для проверок: полный набор ключей по локалям. */
export const ROUTE_LABELS = LABELS;
