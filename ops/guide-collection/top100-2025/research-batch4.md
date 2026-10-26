# Партия 4: официальные источники

Обычный Chrome, по одной странице. Полные DOM-снимки /tmp/airports-top100-batch4/. Черновики для независимой проверки.

## ORY
4 блока; полные DOM ORY-transport/storage/kids/wifi.txt. В источнике хранения рекламное any time противоречит 07–21 — использованы конкретные часы. Тарифы наземных автобусов внутренне разнятся, не использованы. Не копировались общие советы по роумингу/банкингу.
```json
{
  "iata": "ORY",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Метро из Парижа",
      "hint": "Линия 14 без пересадок",
      "text": "Линия метро 14 идёт до станции Orly Airport без пересадки от Châtelet, Gare de Lyon, Bercy и Saint-Lazare; поездка из центра Парижа занимает около 25–35 минут. Билет Paris Région <> Airports стоит 14 EUR в одну сторону: его можно приобрести в автомате и использовать с Navigo Easy либо через приложение Île-de-France Mobilités. Альтернатива — RER B до Antony и далее Orlyval, поездка из центра занимает около 35–45 минут и также стоит 14 EUR.",
      "source": "parisaeroport.fr",
      "url": "https://www.parisaeroport.fr/en/passengers/transport-parking/public-transport-paris/best-way-to-get-there/ory"
    },
    {
      "id": "storage",
      "title": "Хранение багажа",
      "hint": "Orly 3, уровень 0",
      "text": "Bagages du Monde находится в Orly 3 на уровне 0 до досмотра рядом с зоной прилёта и работает ежедневно 07:00–21:00. Багаж проверяют рентгеном и хранят под видеонаблюдением; тариф зависит от размера и срока хранения. Также доступны гардероб для аксессуаров и специального багажа и аренда коляски или автокресла.",
      "source": "parisaeroport.fr",
      "url": "https://www.parisaeroport.fr/en/passengers/at-the-airport/services/luggage-storage/ory"
    },
    {
      "id": "kids",
      "title": "Комнаты для младенцев",
      "hint": "После досмотра в Orly 3 и 4",
      "text": "Пеленальные комнаты в туалетных блоках работают круглосуточно и оснащены пеленальными столами и детскими туалетами. Отдельные комнаты для младенцев после досмотра в Orly 3 и Orly 4 на уровне 1 доступны бесплатно круглосуточно: там есть индивидуальные ниши с кроватками, сиденьями, высокими стульчиками, подогревателями бутылочек и микроволновыми печами.",
      "source": "parisaeroport.fr",
      "url": "https://www.parisaeroport.fr/en/passengers/at-the-airport/services/family-areas/ory"
    },
    {
      "id": "wifi",
      "title": "Wi-Fi и зарядка",
      "hint": "Во всех терминалах",
      "text": "Бесплатная сеть WIFI-AIRPORT доступна во всех терминалах, зонах посадки и получения багажа; после выбора сети откройте браузер для перехода на страницу подключения. В терминалах есть USB и розетки европейских типов C, E и F. Бесплатные запираемые ячейки ChargeBox для зарядки телефона доступны круглосуточно.",
      "source": "parisaeroport.fr",
      "url": "https://www.parisaeroport.fr/en/passengers/at-the-airport/services/wifi/ory"
    }
  ]
}
```

## KIX
4 блока; полные DOM KIX-terminals/storage/kids/wifi.txt. Пункт хранения 1F закрывается 31.10.2026 18:00 — не включён в постоянную справочную. Слово gate в трансферных инструкциях не использовано для дверей терминала. Полноширинный ＃ SSID приведён обычным #.
```json
{
  "iata": "KIX",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "terminals",
      "title": "Между терминалами",
      "hint": "Бесплатный автобус",
      "text": "Терминалы 1 и 2 находятся примерно в 4 километрах друг от друга. Между Aeroplaza и терминалом 2 курсирует бесплатный автобус; поездка занимает 7–9 минут.",
      "source": "kansai-airport.or.jp",
      "url": "https://www.kansai-airport.or.jp/en/flight/route/transit"
    },
    {
      "id": "storage",
      "title": "Хранение багажа",
      "hint": "До досмотра в терминале 1",
      "text": "На уровне 4 терминала 1 до досмотра работают пункты хранения багажа Yamato Transport в северной части и JAL ABC в южной. Часы Yamato Transport — 06:30–22:30, JAL ABC — 06:30–23:00 с последним приёмом в 22:30.",
      "source": "kansai-airport.or.jp",
      "url": "https://www.kansai-airport.or.jp/en/service/delivery/baggage-checkroom"
    },
    {
      "id": "kids",
      "title": "Комнаты для младенцев",
      "hint": "Для всей семьи",
      "text": "Комнатами для младенцев может пользоваться вся семья; зона для кормления грудью и сцеживания предназначена только для женщин. В комнатах есть места для смены подгузников, специальные контейнеры для них и горячая вода для приготовления смеси; в большинстве комнат предусмотрены микроволновые печи.",
      "source": "kansai-airport.or.jp",
      "url": "https://www.kansai-airport.or.jp/en/service/child/babyroom"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Без предварительной заявки",
      "text": "Бесплатная сеть доступна в терминале 1, кроме части маршрутов международного прилёта, на автобусной станции терминала 1, железнодорожной станции, в Aeroplaza и терминале 2. Выберите #AirportFreeWiFi-Kansai или #AirportFreeWiFi-Kansai2.4G; предварительная заявка не нужна, но нужно согласиться с правилами использования. Данные между устройством и точкой доступа не зашифрованы.",
      "source": "kansai-airport.or.jp",
      "url": "https://www.kansai-airport.or.jp/en/service/internet/free-wifi"
    }
  ]
}
```

## ATH
Ограниченная справочная: 1 содержательный блок официального оператора отеля. Сайт аэропорта и STASY показали Cloudflare-проверку, не обходил (ATH-waf/m​​etro-waf.txt). Полный DOM ATH-sleep.txt. Поездка до Syntagma и оценочные обещания источника отеля о других объектах не копировались: отель первичный только для своей услуги.
```json
{
  "iata": "ATH",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "sleep",
      "title": "Sofitel Athens Airport",
      "hint": "В 2 минутах пешком от аэропорта",
      "text": "Отель Sofitel Athens Airport находится в 2 минутах пешком от международного аэропорта Афин. В отеле есть крытый бассейн, фитнес-центр, ресторан, бар и Wi-Fi; заезд начинается в 13:00, выезд — до 11:00.",
      "source": "all.accor.com",
      "url": "https://all.accor.com/hotel/3167/index.en.shtml"
    }
  ]
}
```

## HAN
3 подтверждённых блока. Полные DOM HAN-services/wifi/shuttle-conflict.txt. У T2 источники противоречат друг другу: новый перечень amenities Columns18–19 Lane1, страница shuttle Columns11–12 Lane2. Обе точные позиции T2 исключены, также противоречивые часы 01:00/01:15. Душевые T1/HallE лишь запланированы на декабрь2026 — не опубликованы как действующие.
```json
{
  "iata": "HAN",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "terminals",
      "title": "Между терминалами",
      "hint": "Бесплатный NIA Shuttle Bus",
      "text": "Бесплатный NIA Shuttle Bus связывает внутренний терминал T1 и международный терминал T2. В терминале T1 посадка находится в крыле A на уровне 1.",
      "source": "noibaiairport.vn",
      "url": "https://noibaiairport.vn/en/passenger-amenities-at-noi-bai-international-airport-nid21337.html"
    },
    {
      "id": "kids",
      "title": "Услуги для семей",
      "hint": "Коляски и комнаты ухода",
      "text": "Бесплатные детские коляски доступны после досмотра: в терминале T1 и зале E на уровне 2, в терминале T2 на уровнях 2 и 3. В T2 после досмотра на уровне 3 есть две комнаты ухода за младенцами; пеленальные столы также предусмотрены в некоторых туалетах терминалов.",
      "source": "noibaiairport.vn",
      "url": "https://noibaiairport.vn/en/passenger-amenities-at-noi-bai-international-airport-nid21337.html"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Зоны ожидания T1 и T2",
      "text": "Бесплатный Wi-Fi доступен в пассажирских зонах ожидания внутренних и международного терминалов. Выберите сеть @Airport Free Wifi - Goldsun и нажмите Connect to the Internet на автоматически открывшейся странице. В расширенной части T2 установка оборудования ещё продолжается.",
      "source": "noibaiairport.vn",
      "url": "https://noibaiairport.vn/en/free-internet-wifi-nid60.html"
    }
  ]
}
```

## PMI
4 блока; полные DOM PMI-transport/taxi/lounges/wifi.txt. Временное объявление переноса остановок20авг–19сент не используется. Formentor закрыт на ремонт и не обещан. Цена зала отсутствует на странице — не выдумана.
```json
{
  "iata": "PMI",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Автобусы в Пальму",
      "hint": "Маршруты A1, A2 и 34",
      "text": "Маршрут A1 связывает аэропорт с центром Пальмы, A2 — с S’Arenal, а 34 — с Hospital Son Espases. Остановки A1 в аэропорту находятся на уровне 0 у прилёта и на уровне 2 у вылета.",
      "source": "aena.es",
      "url": "https://www.aena.es/en/palma-de-mallorca/getting-there/bus.html"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Стоянка на уровне 0",
      "text": "Обозначенная стоянка такси находится у прилёта на уровне 0 терминала. Номер службы такси для пассажиров с ограниченной подвижностью — +34 971 703 529.",
      "source": "aena.es",
      "url": "https://www.aena.es/en/palma-de-mallorca/getting-there/taxi.html"
    },
    {
      "id": "lounges",
      "title": "Valldemossa VIP Lounge",
      "hint": "Зона вылета, уровень 4",
      "text": "Valldemossa VIP Lounge находится на уровне 4 в торговой части зоны посадки, доступной только пассажирам шенгенских и нешенгенских рейсов. Зал работает с 05:00 до полуночи; максимальное посещение — 3 часа непосредственно перед вылетом по расписанию. В зале есть питание, рабочие места, принтер и информация о рейсах.",
      "source": "aena.es",
      "url": "https://www.aena.es/en/palma-de-mallorca/vip-services/vip-lounge/sala-vip-valldemossa.html&p=1575049752114"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Подтвердите электронную почту",
      "text": "Подключитесь к сети Airport Free Wifi Aena и откройте приветственную страницу как гость с адресом электронной почты либо войдите в Aena Club. На подтверждение электронной почты предоставляются 15 минут бесплатного доступа; после подтверждения ограничений по времени нет.",
      "source": "aena.es",
      "url": "https://www.aena.es/en/palma-de-mallorca/airport-services/wi-fi.html"
    }
  ]
}
```

## CTU
4 блока с собственных китайских страниц, полные DOM CTU-transport/taxi/terminals/storage.txt. 门 у внешних площадок переведено дверь, не boarding gate. Парковка: тарифная таблица не объясняет бесплатный период, отдельное актуальное объявление есть, но для экономии спорный блок не публиковался. Отели на открытой странице — лишь названия, без содержательных условий.
```json
{
  "iata": "CTU",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Метро",
      "hint": "Линии 10, 19 и 30",
      "text": "Линия метро 10 обслуживает оба терминала; в терминале 2 вход находится на уровне B2 в проходах L2, L3 и L4. Станция Shuangliu Airport Terminal 2 East обслуживается линиями 19 и 30, доступ к ней — через проход L3 на уровне B2 терминала 2. Линия 19 связывает её с Tianfu Airport Terminal 1 & 2 и Tianfu Airport North.",
      "source": "cdairport.com",
      "url": "https://www.cdairport.com/traffic3.aspx?t=36"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Снаружи зоны прилёта",
      "text": "У терминала 1 стоянка такси находится примерно в 50 метрах к югу снаружи двери 6 уровня прилёта. У терминала 2 посадка расположена у пешеходного перехода уровня прилёта; телефон транспортного надзора — 12328.",
      "source": "cdairport.com",
      "url": "https://www.cdairport.com/traffic3.aspx?t=31"
    },
    {
      "id": "terminals",
      "title": "Между терминалами",
      "hint": "Бесплатный автобус",
      "text": "Между терминалами 1 и 2 работает бесплатный автобус, а пеший переход занимает около 8–10 минут. Остановка у терминала 1 находится на южной площадке снаружи двери 3, у терминала 2 — на северной площадке снаружи двери 9.",
      "source": "cdairport.com",
      "url": "https://www.cdairport.com/traffic3.aspx?t=199"
    },
    {
      "id": "storage",
      "title": "Хранение багажа",
      "hint": "Документ и досмотр обязательны",
      "text": "Пункт хранения терминала 1 находится к северу от зоны досмотра B, терминала 2 — за островком регистрации P; оба начинают работу за 2 часа до первого вылета своего терминала и заканчивают после завершения его вылетов. Небольшой ящик стоит 8 CNY за срок до 6 часов, 13 CNY до 12 часов и 18 CNY до 24 часов, затем добавляется 2 CNY за каждые следующие 6 часов; срок меньше 6 часов оплачивается как 6 часов. При сдаче нужен действующий документ, а багаж подлежит проверке; для получения требуются квитанция и документ, предъявленный при сдаче. Внешние аккумуляторы и литиевые батареи на хранение не принимаются.",
      "source": "cdairport.com",
      "url": "https://www.cdairport.com/guide3.aspx?t=16&cid=19#nav"
    }
  ]
}
```

## DTW
Ограниченная справочная: 2 подтверждённых блока операторов. Сайт аэропорта показал Cloudflare (DTW-waf.txt). Marriott после первоначального пустого экрана всё же загрузился — проверено полным DOM DTW-sleep.txt, первоначальный blank.txt тоже уже содержит контент, не является доказательством недоступности. Полный DOM транспорта DTW-transport.txt использует Evans, не устаревшее North из старого FAQ.
```json
{
  "iata": "DTW",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "FAST Michigan 261",
      "hint": "В центр Детройта",
      "text": "Маршрут FAST Michigan 261 обслуживает терминалы Evans и McNamara аэропорта, Dearborn, Inkster, Corktown и центр Детройта. Автобусы FAST работают ежедневно, включая поздний вечер и выходные, а в часы пик интервал составляет примерно 15–20 минут. Посадка и высадка выполняются только на обозначенных остановках FAST; в автобусах есть Wi-Fi.",
      "source": "smartbus.org",
      "url": "https://www.smartbus.org/ridesmart-fast"
    },
    {
      "id": "sleep",
      "title": "The Westin в McNamara",
      "hint": "Отель внутри терминала",
      "text": "The Westin Detroit Metropolitan Airport находится внутри терминала McNamara. В отеле есть крытый бассейн, фитнес-центр и рестораны; заезд с 15:00, выезд до 12:00. Минимальный возраст для оформления заезда — 21 год.",
      "source": "marriott.com",
      "url": "https://www.marriott.com/en-us/hotels/dtwma-the-westin-detroit-metropolitan-airport/overview/"
    }
  ]
}
```

## LGA
4 блока; полные DOM LGA-transport/taxi/terminals/wifi.txt. Не пересказывались ориентировочные тарифы такси, поскольку таблица исключает tips/tolls/congestion pricing; не обещана итоговая цена из стартовой суммы.
```json
{
  "iata": "LGA",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Бесплатный Q70 LGA Link",
      "hint": "К метро от терминалов B и C",
      "text": "Бесплатный автобус Q70 LGA Link обслуживает терминалы B и C и соединяет аэропорт с пересадочными узлами метро Jackson Heights–Roosevelt Avenue и 74 St–Broadway. Автобусы MTA доступны для пассажиров на инвалидных колясках и оборудованы пандусами.",
      "source": "laguardiaairport.com",
      "url": "https://www.laguardiaairport.com/transportation/public-transport"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Без предварительного заказа",
      "text": "Такси доступны у всех терминалов без предварительного заказа: диспетчер направляет пассажиров из очереди к свободному автомобилю. Стоимость рассчитывается по расстоянию и времени, начальная сумма на счётчике — 3 USD; при посадке в аэропорту также действует сбор PANYNJ 2 USD. Доступные для инвалидных колясок такси стоят столько же, сколько обычные; вызвать их можно по телефону +1 646 599 9999.",
      "source": "laguardiaairport.com",
      "url": "https://www.laguardiaairport.com/transportation/taxi-service"
    },
    {
      "id": "terminals",
      "title": "All Terminals Shuttle",
      "hint": "Бесплатно круглосуточно",
      "text": "Бесплатный All Terminals Shuttle курсирует между всеми терминалами и также останавливается у предварительно оплачиваемой Economy Lot (Parking Lot 7), Hangar 7 South и 94th Street. Он работает круглосуточно: каждые 15 минут в часы пик и каждые 20 минут в остальное время.",
      "source": "laguardiaairport.com",
      "url": "https://www.laguardiaairport.com/transportation/all-terminals-shuttle"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Сеть _Free LGA WiFi",
      "text": "Для бесплатного подключения выберите сеть _Free LGA WiFi. Поддержка работает круглосуточно по телефону +1 800 880 4117.",
      "source": "laguardiaairport.com",
      "url": "https://www.laguardiaairport.com/explore-lga/services"
    }
  ]
}
```

## ZRH
4 блока; полные DOM ZRH-transport/storage/kids/wifi.txt. Фраза refresh automatically after one hour в Wi-Fi не объясняет, после какого события, поэтому не превращена в обещание нового сеанса через час. Длительности8h — непрерывно, не активное время.
```json
{
  "iata": "ZRH",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Поезд в Цюрих",
      "hint": "15 минут до главного вокзала",
      "text": "Поезда SBB из аэропорта до главного вокзала Цюриха отправляются каждые 10 минут, поездка занимает 15 минут. Аэропорт также связан регулярными поездами с другими регионами Швейцарии и соседними странами.",
      "source": "flughafen-zuerich.ch",
      "url": "https://www.flughafen-zuerich.ch/en/passengers/practical/parking-and-transport/train-tram-and-bus"
    },
    {
      "id": "storage",
      "title": "Хранение багажа",
      "hint": "Arrivals 2, уровень 0",
      "text": "Камера хранения с сотрудником находится в Arrivals 2 терминала 2 на уровне 0 рядом с информационной стойкой и работает ежедневно 06:00–22:00. За одно место багажа до 25 кг и размером не более 90 × 60 × 35 см тариф составляет 15 CHF до 4 часов, 18 CHF до 8 часов и 22 CHF до 24 часов; оплата вносится заранее, максимальный срок хранения — 3 месяца. Автоматические камеры SBB у Check-in 3 в Airport Shopping доступны круглосуточно.",
      "source": "flughafen-zuerich.ch",
      "url": "https://www.flughafen-zuerich.ch/en/passengers/practical/services/services-for-travellers/baggageservices"
    },
    {
      "id": "kids",
      "title": "Family Services",
      "hint": "Пассажирская зона A",
      "text": "Family Services в пассажирской зоне A бесплатно доступны семьям всех авиакомпаний. Есть пеленальные столы, тихая комната для кормления с детскими кроватками, место для ползания и зона питания с микроволновой печью; для старших детей — игрушки, компьютерные игры и настольный футбол. Присмотр за детьми не предоставляется: ребёнок должен оставаться со взрослым.",
      "source": "flughafen-zuerich.ch",
      "url": "https://www.flughafen-zuerich.ch/en/passengers/practical/services/services-for-travellers/family-services"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "8 часов с первого входа",
      "text": "Сеть Zurich Airport предоставляет 8 часов бесплатного доступа, отсчитываемых непрерывно с первого входа. Зарегистрироваться можно по SMS, введя номер телефона и полученный код, либо по посадочному талону и удостоверению личности: код выдаётся на WiFi Station или информационной стойке. Если возникли проблемы, помогают стойки Service & Information.",
      "source": "flughafen-zuerich.ch",
      "url": "https://www.flughafen-zuerich.ch/en/passengers/practical/services/wifi-and-internet"
    }
  ]
}
```

## VIE
4 блока; полные DOM VIE-transport/lounges/sleep/kids.txt. CAT временно заменён автобусами и внутренне противоречиво описан train/bus — не использован, сохранён VIE-CAT-temporary-bus.txt. Wi-Fi общая ссылка редиректит на главную, не заявляю SSID или регистрационные условия. Скидочные акции lounge исключены, обычные цены+условия доступа сохранены.
```json
{
  "iata": "VIE",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Поезда в Вену",
      "hint": "S7 и Railjet",
      "text": "Поезд S7 идёт до Wien Mitte около 25 минут с интервалом 30 минут; Railjet до Wien Hauptbahnhof — около 15 минут с интервалом 30 минут. Касса ÖBB находится в зале прилёта, автоматы — там же, в проходах к платформам и на платформах. Из зала прилёта к платформам ведёт короткий защищённый от погоды безбарьерный путь.",
      "source": "viennaairport.com",
      "url": "https://viennaairport.com/en/passengers/arrival__parking/s-bahn__suburban_railway"
    },
    {
      "id": "lounges",
      "title": "VIENNA Lounge",
      "hint": "Терминал 1, уровень 2",
      "text": "VIENNA Lounge находится в терминале 1 на уровне 2 после досмотра и до паспортного контроля; работает ежедневно 04:30–22:00. Вход с действующим посадочным талоном возможен в день вылета начиная за 3,5 часа до отправления, максимальное пребывание — 3 часа; обычная цена — 59 EUR, для детей 4–14 лет — 31 EUR, для детей 0–3 лет — бесплатно. Есть питание, Wi-Fi, рабочие места, зона отдыха, душевые с полотенцами и семейная ванная с пеленальным столом.",
      "source": "viennaairport.com",
      "url": "https://viennaairport.com/en/passengers/airport/lounges/vienna_lounge"
    },
    {
      "id": "sleep",
      "title": "Отели у аэропорта",
      "hint": "NH и Moxy пешком от терминала",
      "text": "В AirportCity рядом с терминалом, в пешей доступности, находятся NH Vienna Airport Conference Center и Moxy Vienna Airport. В NH есть Wi-Fi и звукоизолирующие окна; Moxy предлагает круглосуточные закуски и напитки, бесплатное пользование компьютерами и фитнес-центром и бесплатный Wi-Fi.",
      "source": "viennaairport.com",
      "url": "https://viennaairport.com/en/passengers/airport/hotel__conferences__offices"
    },
    {
      "id": "kids",
      "title": "Игровые зоны и коляски",
      "hint": "У выходов F, C и D",
      "text": "Бесплатный Entertainment Gate у F03 включает двухэтажную игровую конструкцию, отдельную зону для малышей и настольный футбол; детские зоны также есть у C42 и D31–36. Если собственная коляска сдана при регистрации, аэропорт бесплатно предоставляет коляску для пути от досмотра до выхода на посадку; её передают сотруднику выхода при посадке. Пеленальные столы есть почти во всех доступных и семейных туалетах и в больших пассажирских туалетах.",
      "source": "viennaairport.com",
      "url": "https://viennaairport.com/en/passengers/arrival__departure/travelling_with_children"
    }
  ]
}
```

## AUH
4 блока; полные DOM AUH-transport/storage/kids/wifi.txt. Ориентировочную цену publicbus around4AED не превращал в точный тариф. Место хранения typically Arrivals не выдаётся за гарантированное расположение. Семейные стойки и priorityboarding зависят от авиакомпании, в блок не включены как универсальные.
```json
{
  "iata": "AUH",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Городские автобусы",
      "hint": "Карта Hafilat обязательна",
      "text": "Остановки городских автобусов находятся снаружи зоны прилёта; маршруты серии A работают круглосуточно. A1 идёт в Al Zahiyah, A2 — к Khalifa Street, A10 — к MBZ City Bus Station, A40 — к Al Shahama Bus Station. Для проезда нужна карта Hafilat, которую можно купить и пополнить в автоматах рядом с остановками аэропорта; наличные в автобусе не принимаются.",
      "source": "zayedinternationalairport.ae",
      "url": "https://www.zayedinternationalairport.ae/en/parking-and-transport/transport/city-bus-routes-and-timetables"
    },
    {
      "id": "storage",
      "title": "Камера хранения",
      "hint": "Круглосуточно",
      "text": "Хранение одного места багажа стоит 35 AED до 3 часов, 55 AED до 12 часов, 75 AED до 24 часов, 105 AED до 48 часов и 140 AED до 72 часов. После 72 часов к уже начисленным 140 AED добавляется 25 AED за каждый следующий день; неполный период оплачивается как полный. Камера хранения работает круглосуточно, точные условия аэропорт предлагает уточнять у стойки.",
      "source": "zayedinternationalairport.ae",
      "url": "https://www.zayedinternationalairport.ae/en/plan-and-prepare/at-the-airport/baggage-services"
    },
    {
      "id": "kids",
      "title": "Услуги для семей",
      "hint": "Коляски и комнаты кормления",
      "text": "Бесплатные коляски доступны в зоне вылета от регистрации до посадки и со стороны выхода прилёта. Комнаты для смены подгузников и кормления предусмотрены во всех зонах аэропорта и обеспечивают уединение и места для сидения. Тихое пространство Sensory Space находится рядом с выходом на посадку D43.",
      "source": "zayedinternationalairport.ae",
      "url": "https://www.zayedinternationalairport.ae/en/plan-and-prepare/passenger-assistance/family-services"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Без ограничения времени",
      "text": "На территории аэропорта доступен бесплатный Wi-Fi без ограничения времени. Выберите сеть Zayed International Airport Free Wifi и нажмите Connect в приветственном окне; после перехода на сайт аэропорта откроется полный доступ в интернет.",
      "source": "zayedinternationalairport.ae",
      "url": "https://www.zayedinternationalairport.ae/en/general/wifi"
    }
  ]
}
```

## CPH
4 блока; полные DOM CPH-transport/terminals/sleep/wifi.txt. Использована точная маркировка уровня2, не перенумерован этаж. Не обещана спальная комната: sleep-блок про существующие сидения/quietzone.
```json
{
  "iata": "CPH",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Метро в Копенгаген",
      "hint": "15 минут до Nørreport",
      "text": "Станция метро находится непосредственно у терминала 3; до Nørreport поездка занимает 15 минут. Днём и вечером метро ходит каждые 4–6 минут, ночью — каждые 15–20 минут. Билеты продаются на станции и в кассе DSB терминала 3; автоматы принимают монеты и банковские карты, но не банкноты.",
      "source": "cph.dk",
      "url": "https://www.cph.dk/en/parking-transport/bus-train-metro-taxi/metro"
    },
    {
      "id": "terminals",
      "title": "Бесплатный Terminal bus",
      "hint": "Терминалы и парковки",
      "text": "Бесплатный терминальный автобус связывает район парковки P1 и Car Rental с терминалами 2 и 3, станцией метро и поезда у терминала 3 и парковками P15, P17 и P19 на Kystvejen. С 07:00 до 18:00 интервал составляет 10 минут, с 04:00 до 07:00 и с 18:00 до полуночи — 15 минут, с полуночи до 04:00 — 20 минут.",
      "source": "cph.dk",
      "url": "https://www.cph.dk/en/parking-transport/bus-train-metro-taxi/terminal-bus"
    },
    {
      "id": "sleep",
      "title": "Места для отдыха",
      "hint": "Тихая зона у выходов C",
      "text": "Места для сидения есть до и после досмотра и у всех выходов на посадку. Для пассажиров, вылетающих из зоны C, есть тихая зона наверху эскалатора рядом с 7-Eleven на уровне 2. В фуд-корте между выходами A и B и рядом с C у большинства столов предусмотрены розетки.",
      "source": "cph.dk",
      "url": "https://www.cph.dk/en/practical/seating-areas"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "До и после досмотра",
      "text": "Сеть CPH Airport Free Wi-Fi доступна до и после досмотра, а также у всех выходов на посадку. Подключение бесплатно и не требует пароля; зарядные устройства и розетки есть во многих зонах аэропорта и у большинства выходов.",
      "source": "cph.dk",
      "url": "https://www.cph.dk/en/wi-fi"
    }
  ]
}
```
