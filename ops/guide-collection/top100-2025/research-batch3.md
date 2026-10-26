# Партия 3: официальные источники

Обычный Chrome, по одной странице. Полные DOM-снимки /tmp/airports-top100-batch3/. Черновики для независимой проверки.

## MEX
3 блока поактуальномусайтуAICM,испанскаяверсия. Пуэрта7/2источникоднозначнодвери,негейтыпосадки. Plantabajaпереведено«наземныйуровень»,неошибочныйэтаж1. Тарифметробуса/шкафчиковневыдуман. Officialtaxiстраницатолькосписокоператоровбезусловий,вблокнепревращали. ПолныеDOMMEX-*.txt.
```json
{
  "iata": "MEX",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "Metrobús из обоих терминалов",
      "text": "Metrobús связывает аэропорт с центром Мехико. Посадка — у двери 7 терминала 1 и у двери 2 терминала 2. Оплата производится картой Metrobús, которую можно приобрести и пополнить в автоматах в зонах посадки и высадки обоих терминалов. Режим работы — с 04:30 до полуночи с понедельника по субботу и с 05:00 до полуночи по воскресеньям и праздникам.",
      "source": "aicm.com.mx",
      "url": "https://www.aicm.com.mx/pasajeros/servicios/prestadores-de-servicios/transportes/metrobus"
    },
    {
      "id": "terminals",
      "title": "Терминалы",
      "hint": "Бесплатный Aerotrén, 05:00–23:00",
      "text": "Бесплатный Aerotrén перевозит пассажиров между терминалами 1 и 2 ежедневно с 05:00 до 23:00. Для поездки необходимо предъявить посадочный талон. Перевозить собак разрешено только в клетках и в пустых вагонах; в поезде нельзя есть, пить и курить.",
      "source": "aicm.com.mx",
      "url": "https://www.aicm.com.mx/pasajeros/servicios/servicios-aicm/aerotren"
    },
    {
      "id": "storage",
      "title": "Камера хранения",
      "hint": "Круглосуточно в Т1 и Т2",
      "text": "В терминале 1 на наземном уровне работает круглосуточная камера хранения MEXICANA DE LOCKERS, помещение E-41. В терминале 2 на наземном уровне круглосуточно доступны пункты VIAJES KOKAI в помещениях ALL45 и ALL46.",
      "source": "aicm.com.mx",
      "url": "https://www.aicm.com.mx/pasajeros/servicios/prestadores-de-servicios/locker"
    }
  ]
}
```

## BLR
4 блока. УKidsPlayAreaреальнаяпустаякарточка(screenshot),поэтомунеписали. ЦеныParkingвDOMбезвалюты,неперенесенычислы150/300идругиебезденежнойединицы;использованыоднозначныебесплатныеинтервалы/платнаяEVзарядка. НазваниеWiFiнастраницеразныйрегистрBLR_FREE_WIFI/BLR_Free_WiFi,использованоповторённоеBLR_FREE_WIFI. НикакойPIN/паспортнепередавались,прочитанатолькоинструкция.
```json
{
  "iata": "BLR",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "Автобусы BMTC Vayu Vajra",
      "text": "Автобусы BMTC Vayu Vajra с кондиционером связывают аэропорт с городом. При посадке принимаются наличные и платежи UPI. Справочная BMTC доступна по телефонам +91 7760991250 и +91 7760991269.",
      "source": "bengaluruairport.com",
      "url": "https://www.bengaluruairport.com/travellers/transport-parking/airport-VayuVajra"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "KSTDC и машины с водителями-женщинами",
      "text": "В аэропорту предлагаются такси с кондиционером и без него; машины без кондиционера обслуживает только KSTDC. У KSTDC также есть седаны с кондиционером, которыми управляют женщины. Такси KSTDC оснащены GPS, GPRS и принтерами для расчётных документов.",
      "source": "bengaluruairport.com",
      "url": "https://www.bengaluruairport.com/travellers/transport-parking/airport-taxi"
    },
    {
      "id": "parking",
      "title": "Парковка",
      "hint": "Бесплатные короткие остановки",
      "text": "На автомобильных парковках P3 и P4 терминала 1 первые 15 минут бесплатны, на P2 терминала 2 — первые 10 минут. Для электромобилей у терминала 1 предусмотрена платная медленная зарядка, у терминала 2 — платная быстрая. Для автомобилей категории 4W в зонах посадки прибывающих пассажиров обоих терминалов бесплатное пребывание ограничено 8 минутами.",
      "source": "bengaluruairport.com",
      "url": "https://www.bengaluruairport.com/travellers/transport-parking/parking"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "BLR_FREE_WIFI, SIM или ваучер",
      "text": "Для входа в BLR_FREE_WIFI с местной SIM-картой либо международным роумингом нужно выбрать Local Phone Number на странице входа и указать данные и одноразовый код OTP. Без такой SIM-карты можно получить ваучер в WiFi Voucher Kiosk в зоне международных прилётов, отсканировав страницу паспорта с фотографией и посадочный талон. При отсутствии посадочного талона аэропорт предлагает обратиться к виртуальной информационной стойке за PIN Wi‑Fi. Код ваучера вводится на странице входа в сеть.",
      "source": "bengaluruairport.com",
      "url": "https://www.bengaluruairport.com/travellers/services/all-facilities/wifi-services"
    }
  ]
}
```

## BOS
4 блока. WiFiрекламное«6Gspeeds»непереносилоськакскорость. Паромнаясезоннаядатас2025непереносилась. Наtransportстраницеразныеуказанияшаттлов88/22/33,номервtransportнебрали;подробнонаотдельнойстраницеподтверждёнмаршрут11. ПолныеDOMBOS-*.txt.
```json
{
  "iata": "BOS",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "Silver Line SL1 до South Station",
      "text": "Автобус MBTA Silver Line 1 (SL1) останавливается у всех терминалов и связывает аэропорт с South Station. Поездка из аэропорта в центр бесплатна и включает бесплатную пересадку на Red Line. До Blue Line можно добраться через Airport Station, от которой к терминалам ходят бесплатные аэропортовые шаттлы.",
      "source": "massport.com",
      "url": "https://www.massport.com/logan-airport/getting-to-logan/public-transportation"
    },
    {
      "id": "terminals",
      "title": "Терминалы",
      "hint": "Бесплатные шаттлы Massport",
      "text": "Бесплатные шаттлы Massport связывают терминалы с Rental Car Center, причалом водного транспорта и Airport Station линии Blue Line. Автобусы оборудованы низким полом, багажными полками и подъёмниками для инвалидных колясок; основные рейсы к терминалам, станции метро и прокату обычно идут каждые 5–6 минут. Маршрут 11 соединяет терминалы A, B, C и E ежедневно с 09:00 до 22:00. Остановки находятся у бордюра на нижнем уровне каждого терминала и обозначены Shuttle Bus.",
      "source": "massport.com",
      "url": "https://www.massport.com/logan-airport/getting-to-logan/on-airport-shuttle"
    },
    {
      "id": "kids",
      "title": "С ребёнком",
      "hint": "Kidport после досмотра",
      "text": "Игровые зоны Kidport находятся после досмотра: в спутниковом здании терминала A у выхода на посадку A18, в терминале B у B16 и в торговом переходе к выходам B30–B36, в терминале C перед C25. В каждом терминале есть комнаты для кормления и ухода за малышами. Семейные туалеты доступны до и после досмотра во всех терминалах; в них есть туалет, раковина и откидной пеленальный столик.",
      "source": "massport.com",
      "url": "https://www.massport.com/logan-airport/at-the-airport/passenger-services"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Бесплатная сеть BOSWifi",
      "text": "В аэропорту предоставляется бесплатный Wi‑Fi. Для подключения нужно выбрать сеть BOSWifi и принять условия использования.",
      "source": "massport.com",
      "url": "https://www.massport.com/logan-airport/at-the-airport/passenger-services"
    }
  ]
}
```

## LGW
3 блока. Рекламныеоценки/советыпроребёнка/староелетнеерасписаниеGWRнепереносились. ПлатныйPremiumWiFi5£/24чнеобязателен,небрал. Безрегистрации/формemail. ПолныеDOMLGW-*.txt.
```json
{
  "iata": "LGW",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "Gatwick Express: 30 минут",
      "text": "Gatwick Express без остановок связывает аэропорт с London Victoria за 30 минут и отправляется 2 раза в час. Southern обслуживает London Victoria, Clapham Junction, Brighton и другие города юго-востока; Thameslink — London Bridge, Blackfriars, City Thameslink, Farringdon и St Pancras International. Железнодорожная станция расположена у South Terminal примерно в 5 минутах ходьбы от зон прилёта и вылета. Для поездок в Лондон принимаются бесконтактные банковские карты и Oyster, кроме 60+ Oyster photocard.",
      "source": "gatwickairport.com",
      "url": "https://www.gatwickairport.com/transport-options/train.html"
    },
    {
      "id": "kids",
      "title": "С ребёнком",
      "hint": "Бесплатные Kids Zones",
      "text": "В обоих терминалах есть бесплатные игровые зоны Kids Zones в залах вылета. Для семей с маленькими детьми в колясках предусмотрены отдельные полосы досмотра Assisted Travel and family lanes. В аэропорту есть оборудованные комнаты для кормления и переодевания малышей, в том числе в зонах регистрации, пересадок и после паспортного контроля прилёта. Все рестораны обоих терминалов могут подогреть детскую бутылочку перед вылетом.",
      "source": "gatwickairport.com",
      "url": "https://www.gatwickairport.com/passenger-guides/travelling-with-children.html"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Бесплатно, без лимита времени",
      "text": "Для бесплатного Wi‑Fi нужно выбрать Free Gatwick Wi-Fi Vinci Airports, затем Free Superfast Wi-Fi и указать действительный адрес электронной почты. Подключение бесплатное и без ограничения времени, со скоростью до 50 Мбит/с. Бесплатные точки зарядки есть в обоих терминалах до и после досмотра.",
      "source": "gatwickairport.com",
      "url": "https://www.gatwickairport.com/passenger-guides/wifi-charging.html"
    }
  ]
}
```

## SYD
3 блока. СостоянияаккордеоновпрочитаныпослеоткрытияисохраненыполнымDOM. НеобещалчтотооT2/T3wifiпостраницеT1;AerotelвArrivalHallподтверждённооднойфразой,отдельныйблокнеформировалсябезусловий. Динамическиеsecuritywaittimesнепереносились.
```json
{
  "iata": "SYD",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "terminals",
      "title": "Терминалы",
      "hint": "Бесплатный автобус каждые 15 минут",
      "text": "Между T1 International и внутренними терминалами T2 и T3 нельзя пройти пешком. Бесплатный Terminal Transfer Bus курсирует каждые 15 минут с 05:30 до 22:30; поездка занимает 10 минут. У T1 остановка находится на уровне прилёта снаружи зала Arrival Hall B, у T2 и T3 — снаружи каждого терминала на уровне прилёта.",
      "source": "sydneyairport.com.au",
      "url": "https://www.sydneyairport.com.au/parking-and-transport/arriving/international/get-to-your-next-flight"
    },
    {
      "id": "kids",
      "title": "С ребёнком",
      "hint": "Игровые зоны T1",
      "text": "В T1 International детская интерактивная зона с сенсорными экранами находится у выхода на посадку 10, игровая площадка McDonalds — у выхода 50, цифровая зона совместно с Museum of Applied Arts and Science — у выхода 53. Рядом с зонами выдачи багажа есть туалеты, родительские комнаты и места для кормления.",
      "source": "sydneyairport.com.au",
      "url": "https://www.sydneyairport.com.au/info-sheet/travelling-with-children"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Sydney Airport Free WiFi в T1",
      "text": "Бесплатный Wi‑Fi доступен по всему T1 International. Нужно выбрать Sydney Airport Free WiFi, ответить на вопросы, прочитать условия и нажать Proceed. Затем показывается рекламное сообщение и открывается веб-сайт.",
      "source": "sydneyairport.com.au",
      "url": "https://www.sydneyairport.com.au/info-sheet/T1-facilities-and-services"
    }
  ]
}
```

## SGN
3 блока официального оператора SASCO. Сайт ACV показал WAF; защиты не обходились (SGN-waf.txt). Полные DOM SGN-wifi/sleep/lounges.txt. Цены залов за 4 часа подряд; условия для детей младше 5 лет не указаны и не придуманы. Не использованы неоднозначная подпись 1st Floor и рекламные оценки скорости.
```json
{
  "iata": "SGN",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "lounges",
      "title": "Apricot Business Lounge",
      "hint": "После досмотра в T2",
      "text": "Зал Apricot Business Lounge находится после досмотра в зоне международных вылетов терминала 2 и работает круглосуточно. Посещение длится не более 4 часов подряд: для пассажиров старше 12 лет цена составляет 945 000 VND, для детей от 5 до 12 лет — 472 500 VND. В зале есть шведский стол, напитки, массажные кресла, душевые и Wi-Fi.",
      "source": "sasco.com.vn",
      "url": "https://www.sasco.com.vn/en/products/phong-cho-apricot-2069"
    },
    {
      "id": "sleep",
      "title": "SASCO Sleep Zone",
      "hint": "У выхода на посадку 27",
      "text": "Зона сна SASCO находится после досмотра в зале международных вылетов терминала 2, рядом с выходом на посадку 27, и работает круглосуточно. Комната стоит 180 000 VND в час; минимальное время использования — 2 часа. В комнате есть односпальная кровать, вентилятор и розетка; предоставляются охлаждающее полотенце и бутылка минеральной воды.",
      "source": "sasco.com.vn",
      "url": "https://www.sasco.com.vn/en/sleep-zone"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "В общественных зонах",
      "text": "В общественных зонах внутренних и международного терминалов доступна бесплатная сеть FreeWifi TanSonNhat AirPort. Подключение работает круглосуточно, без ограничения времени.",
      "source": "sasco.com.vn",
      "url": "https://www.sasco.com.vn/en/airport-facilities/wifi-san-bay-646"
    }
  ]
}
```

## NRT
4 блока, полные DOM NRT-terminals/storage/kids/wifi.txt. Не смешаны сутки по 24 часа с дневным тарифом до полуночи. Не копировались все размеры ящиков и отдельные тарифы extra-large, чтобы блок оставался читаемым.
```json
{
  "iata": "NRT",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "terminals",
      "title": "Между терминалами",
      "hint": "Бесплатные автобусы",
      "text": "До досмотра между терминалами курсируют бесплатные автобусы; между терминалами 2 и 3 также можно пройти по пешеходному переходу. Кольцевой маршрут следует в порядке терминал 1 — терминал 3 — терминал 2: поездка между 1 и 3 занимает около 14 минут, между 3 и 2 — около 3 минут, между 2 и 1 — около 10 минут. Есть также отдельные маршруты между терминалами 1 и 2 и между терминалами 2 и 3.",
      "source": "narita-airport.jp",
      "url": "https://www.narita-airport.jp/en/access/shuttlebus/"
    },
    {
      "id": "storage",
      "title": "Автоматические камеры хранения",
      "hint": "Тариф зависит от расположения",
      "text": "В аэропорту есть камеры хранения с оплатой по дням и по времени. Для камер с дневным тарифом небольшой, средний и большой ящики стоят соответственно 400 JPY, 600 JPY и 800 JPY за использование в день; новый оплачиваемый день начинается в полночь, максимальный срок — 8 дней. В основном здании терминала 2 на уровне B1 и терминала 3 на уровне 2 действует тариф по времени: до 6 часов небольшой ящик стоит 300 JPY, средний — 500 JPY, большой — 600 JPY, а каждые следующие 24 часа — соответственно 400 JPY, 600 JPY и 800 JPY.",
      "source": "narita-airport.jp",
      "url": "https://www.narita-airport.jp/en/service/delivery/locker/"
    },
    {
      "id": "kids",
      "title": "Комнаты для младенцев",
      "hint": "Во всех терминалах",
      "text": "Комнаты для младенцев есть во всех терминалах: в них предусмотрены кабина для кормления грудью, пеленальный стол, умывальник и горячая вода. Мужчины могут пользоваться всеми удобствами, кроме кабины для кормления грудью.",
      "source": "narita-airport.jp",
      "url": "https://www.narita-airport.jp/en/service/child/baby/"
    },
    {
      "id": "wifi",
      "title": "Wi-Fi и розетки",
      "hint": "Во всех терминалах и автобусах",
      "text": "Бесплатный Wi-Fi доступен во всех терминалах и в автобусах между терминалами: выберите FreeWiFi-NARITA и подтвердите условия использования и предупреждение о безопасности на странице подключения. Сервис не требует предварительной настройки защиты; аэропорт рекомендует VPN тем, кому нужно защищённое соединение. Розетками в терминалах можно пользоваться бесплатно.",
      "source": "narita-airport.jp",
      "url": "https://www.narita-airport.jp/en/service/internet/power-outlet/"
    }
  ]
}
```

## RUH
Пробел: kkia.sa/en/services/wifi блокирует Cloudflare (RUH-waf.txt). Официальный Plaza Premium показывает явное сообщение TRAVEL ADVISORY: аэропорт временно закрыт, работа зала приостановлена (RUH-lounge-suspended.txt), поэтому обычный режим 24/7 не публикуется как действующий. Marriott RUH airport overview не загрузился после последовательной проверки AX и скриншота (тайм-аут CDP); предупреждений не обходил. Поиск официального оператора метро не дал пригодной первичной страницы с условиями проезда; поисковые сниппеты и AI Overview не использованы.
```json
{
  "iata": "RUH",
  "checked": "2026-10-26",
  "blocks": []
}
```

## MEL
5 блоков; полные DOM MEL-wifi/services/transport.txt. Интервал SkyBus сформулирован в источнике неоднозначно (peak times 7am and 7pm), поэтому не копировался. Не добавлялись тарифы и обещания времени в пути, которых на выбранных страницах нет.
```json
{
  "iata": "MEL",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Автобусы в город",
      "hint": "SkyBus и общественные маршруты",
      "text": "SkyBus Melbourne City Express ежедневно соединяет аэропорт со станцией Southern Cross с 04:00 до 01:00; остановки находятся у терминалов 1, 3 и 4. Билеты продаются онлайн, в автоматах у остановок, а за наличные — в Prosegur и Smart Carte в зале прилёта терминала 2. Общественные автобусы PTV отправляются из наземного транспортного узла терминала 4.",
      "source": "melbourneairport.com.au",
      "url": "https://www.melbourneairport.com.au/bus-services"
    },
    {
      "id": "storage",
      "title": "Хранение багажа",
      "hint": "Терминалы 2 и 4",
      "text": "Автоматические камеры хранения находятся на наземном уровне парковки терминала 4 под эскалаторами. Сервис Smartecarte на наземном уровне зала прилёта терминала 2 работает ежедневно с 06:00 до полуночи и также предлагает печать и отправку факсов.",
      "source": "melbourneairport.com.au",
      "url": "https://www.melbourneairport.com.au/facilities-services"
    },
    {
      "id": "sleep",
      "title": "Отели у терминалов",
      "hint": "Переходы и трансфер",
      "text": "PARKROYAL Melbourne Airport соединён с внутренними и международным терминалами надземными пешеходными переходами. Holiday Inn Melbourne Airport находится в 400 метрах от терминалов и по запросу предоставляет своим гостям бесплатный автобус до терминала и обратно.",
      "source": "melbourneairport.com.au",
      "url": "https://www.melbourneairport.com.au/facilities-services"
    },
    {
      "id": "kids",
      "title": "Комнаты для родителей",
      "hint": "Во всех терминалах",
      "text": "Места для смены подгузников есть во всех терминалах. В терминале 2 до досмотра на уровне 1 они расположены у зон регистрации M и F, а после досмотра на уровне 1 — после Duty Free и напротив выходов на посадку 3 и 16. В зале прилёта терминала 2 на наземном уровне комната находится напротив камеры хранения Smartcarte.",
      "source": "melbourneairport.com.au",
      "url": "https://www.melbourneairport.com.au/facilities-services"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Терминалы 2, 3 и 4",
      "text": "Бесплатная сеть Airport Free Wi-Fi доступна в терминалах 2, 3 и 4, включая общественные зоны и залы ожидания. В терминале 1, которым управляет Qantas, эта сеть недоступна. Бесплатное подключение не зашифровано.",
      "source": "melbourneairport.com.au",
      "url": "https://www.melbourneairport.com.au/wi-fi"
    }
  ]
}
```

## DUB
4 блока; полные DOM DUB-wifi/storage/taxi/transport.txt. Часы упаковки багажа и бюро находок не подменяют часы офиса; не заявлено круглосуточное хранение. Ориентировочная цена такси явно не фиксированная.
```json
{
  "iata": "DUB",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Автобусы в Дублин",
      "hint": "Зоны посадки у терминалов",
      "text": "Dublin Express отправляется из зон 1 и 21 к остановкам в центре Дублина, включая Temple Bar, Trinity College, O’Connell Street и станцию Heuston. Aircoach отправляется из зон 2 и 20 в Дублин, другие районы графства и Северную Ирландию. Маршруты Transport for Ireland обслуживаются из зон 11, 13 и 15.",
      "source": "dublinairport.com",
      "url": "https://www.dublinairport.com/to-from-the-airport/by-bus/dublin-buses"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "У обоих терминалов",
      "text": "Такси доступны круглосуточно снаружи обоих терминалов; на стоянках работают диспетчеры. Стоимость определяется счётчиком с учётом расстояния, дня и времени поездки, а пассажир имеет право получить чек таксометра. Аэропорт указывает ориентир 30–45 EUR до центра Дублина.",
      "source": "dublinairport.com",
      "url": "https://www.dublinairport.com/to-from-the-airport/by-taxi"
    },
    {
      "id": "storage",
      "title": "Сервисы багажа",
      "hint": "Smarte Carte",
      "text": "Smarte Carte предлагает хранение и упаковку багажа, продажу дорожных принадлежностей и пересылку багажа. Пункты находятся в зале прилёта терминала 1 слева после главного входа и в зоне вылета терминала 2 у стойки регистрации American Airlines; часы работы офиса — ежедневно 05:00–21:00. Багажные тележки в обоих терминалах предоставляются бесплатно.",
      "source": "dublinairport.com",
      "url": "https://www.dublinairport.com/at-the-airport/facilities/luggage-facilities"
    },
    {
      "id": "wifi",
      "title": "Wi-Fi и печать",
      "hint": "Без регистрации в сети",
      "text": "Бесплатная сеть Dublin Airport Wi-Fi не требует регистрации: выберите её в настройках устройства и нажмите Connect во всплывающем окне. Печать доступна в Smarte Carte Baggage Services в зале прилёта терминала 1 с 06:00 до 19:00; стоимость — 10 EUR за объём до 20 страниц.",
      "source": "dublinairport.com",
      "url": "https://www.dublinairport.com/at-the-airport/facilities/wifi-printing-services"
    }
  ]
}
```

## MSP
4 блока; полные DOM MSP-wifi/sleep/transport/taxi.txt. Не перепутано круглосуточное сообщение между терминалами с часами полного маршрута. Не перенесены самостоятельные советы аэропорта про обмен данными поездки, чтобы справочная не превращалась в набор советов.
```json
{
  "iata": "MSP",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "METRO Blue Line",
      "hint": "В город и между терминалами",
      "text": "METRO Blue Line останавливается у обоих терминалов: поездка до Mall of America занимает около 12 минут, до Warehouse District в центре Миннеаполиса — около 25 минут. Полный маршрут работает примерно с 05:00 до полуночи с интервалом 15–20 минут, а бесплатный проезд между станциями терминалов доступен круглосуточно и не требует билета. Городской автобус 54 отправляется из Transit Center на уровне 1 парковки Silver Ramp; у терминала 2 посадки на городские автобусы нет.",
      "source": "mspairport.com",
      "url": "https://www.mspairport.com/directions-and-transportation/ground-transportation/light-rail-transit"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Стоянки у обоих терминалов",
      "text": "В терминале 1 к такси ведут указатели с уровня Tram Level (уровень T); в терминале 2 стоянка находится в Ground Transport Center на наземном уровне Purple Ramp напротив терминала. Сотрудники помогают найти такси ежедневно с 06:00 до 01:00, а в остальное время посадка остаётся доступной самостоятельно. Аэропорт указывает среднюю стоимость 39–49 USD до центра Миннеаполиса и 31–38 USD до центра Сент-Пола; начальная сумма на счётчике 6,50 USD включает посадку 2,50 USD и аэропортовый сбор 4 USD.",
      "source": "mspairport.com",
      "url": "https://www.mspairport.com/directions-and-transportation/ground-transportation/taxi-service"
    },
    {
      "id": "sleep",
      "title": "Тихие зоны отдыха",
      "hint": "После досмотра в терминале 1",
      "text": "В терминале 1 после досмотра есть две тихие зоны с креслами на уровне Mezzanine над Airport Mall. К ним можно подняться на один уровень по лестнице или на лифте у входов в пассажирские галереи E и F; зоны подходят для чтения, отдыха, медитации и молитвы.",
      "source": "mspairport.com",
      "url": "https://www.mspairport.com/index%2Ephp/airport/service-amenities"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Сеансы по 4 часа",
      "text": "Сеть MSP Airport WiFi доступна во всех общественных зонах обоих терминалов; при первом подключении нужно принять условия использования. Бесплатный сеанс длится 4 часа, после его окончания можно начать ещё один бесплатный сеанс. Количество таких сеансов не ограничено.",
      "source": "mspairport.com",
      "url": "https://www.mspairport.com/airport/service-amenities/wi-fi"
    }
  ]
}
```

## LIS
4 блока, полные DOM LIS-transport/terminals/kids/wifi.txt. В семейном источнике подпись Before Security T2 противоречит подробному тексту про кормление: использовано более конкретное ограничение only Non-Schengen after passport control. Детская площадка у Gate44 закрыта — не обещана. Возраст/вес колясок не пересказывался из неоднозначного up to. Независимая проверка: спорное предложение про T2 удалено, поскольку подробный текст и метки расположения противоречат друг другу.
```json
{
  "iata": "LIS",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Метро в Лиссабон",
      "hint": "Aeroporto — Saldanha",
      "text": "В аэропорту есть станция метро: поездка по линии Aeroporto — Saldanha в центр Лиссабона занимает около 20 минут. Для проезда можно приобрести электронную пополняемую карту Navegante за 0,50 EUR; она подходит для метро и автобусов Carris.",
      "source": "lisbonairport.pt",
      "url": "https://www.lisbonairport.pt/en/lis/access-parking/getting-to-and-from-the-airport/public-transportation"
    },
    {
      "id": "terminals",
      "title": "Терминал 2",
      "hint": "Бесплатный автобус от T1",
      "text": "Терминал 2 предназначен только для вылетов и закрыт с 00:30 до 03:30. Из терминала 1 до него ходит бесплатный автобус с 03:30 до 00:30 следующего дня: отправление из зоны вылета каждого терминала каждые 12 минут, дорога занимает около 3 минут.",
      "source": "lisbonairport.pt",
      "url": "https://www.lisbonairport.pt/en/lis/access-parking/getting-to-and-from-the-airport/terminal-2"
    },
    {
      "id": "kids",
      "title": "Семейные услуги",
      "hint": "Комнаты и пеленальные столы",
      "text": "Пеленальные комнаты терминала 1 находятся как в общественной зоне, так и в зоне ограниченного доступа; в них есть раковина, пеленальный стол и столешница. В терминале 1 предусмотрены места для кормления грудью в общественной семейной комнате и после досмотра рядом с выходом на посадку 15.",
      "source": "lisbonairport.pt",
      "url": "https://www.lisbonairport.pt/en/lis/services-shopping/essential-services/family-services"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Без ограничения времени",
      "text": "В аэропорту доступен бесплатный Wi-Fi без ограничения времени. Выберите сеть _VINCI Airports WiFi, откройте браузер, примите условия использования и нажмите Connect.",
      "source": "lisbonairport.pt",
      "url": "https://www.lisbonairport.pt/en/lis/services-shopping/essential-services/free-wifi"
    }
  ]
}
```
