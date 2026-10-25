/** Русские названия для перевозчиков, которых русскоязычный читатель знает по-русски.
 *  Справочник data/airlines.json — латиницей, и «Pobeda» на русском табло выглядит чужим.
 *
 *  Общий для строки табло (FlightBoard) и для серверной части страницы аэропорта: ответ FAQ
 *  «какие авиакомпании летают» и раздел «Авиакомпании» печатали «Aeroflot, Pobeda» под
 *  табло, на котором те же рейсы подписаны «Аэрофлот, Победа» (аудит 25.10.2026). Русский
 *  запрос ищет «Аэрофлот», а не «Aeroflot». Остальные локали получают имя как есть. */
const AIRLINE_RU: Record<string, string> = {
  Aeroflot: 'Аэрофлот', Pobeda: 'Победа', 'Rossiya Airlines': 'Россия', 'S7 Airlines': 'S7',
  'Ural Airlines': 'Уральские авиалинии', 'Utair Aviation': 'ЮТэйр', 'Nordwind Airlines': 'Nordwind',
  'Red Wings Airlines': 'Red Wings', 'Smartavia': 'Смартавиа', 'Yakutia Air': 'Якутия',
  'Aurora Airlines': 'Аврора', Azimuth: 'Азимут', Severstal: 'Северсталь',
  'Izhavia': 'Ижавиа', NordStar: 'NordStar', 'UVT aero': 'ЮВТ Аэро',
  'RusLine / Air Volga': 'РусЛайн', 'Belavia': 'Белавиа', 'Yamal Airlines': 'Ямал', };

export function localAirlineName(name: string, locale: string): string {
  return (locale === 'ru' && AIRLINE_RU[name]) || name;
}
