# Партия 5: официальные источники

Обычный Chrome, по одной странице. Полные DOM-снимки /tmp/airports-top100-batch5/. Черновики для независимой проверки.

## FLL
4 блока; полные DOM FLL-transport/terminals/storage/wifi.txt. Страницы обновлены23.07.2026. Ограниченные дни T2 хранения не смешаны с ежедневным графиком T1/T3; для краткости T2 не включён. CourtesyShuttle не выдан за прямой автобус terminal-to-terminal.
```json
{
  "iata": "FLL",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "BCT и Tri-Rail",
      "hint": "Автобус 1 и поезд",
      "text": "Автобус BCT 1 работает ежедневно; остановка аэропорта находится у Rental Car Center, Stop G. К станции Tri-Rail в Dania Beach из терминалов ходят бесплатные автобусы с нижнего уровня прилёта: от GTA-1 у западного конца терминала 1, GTA-2 между терминалами 2 и 3 и GTA-3 между терминалами 3 и 4. Tri-Rail ежедневно обслуживает округа Miami-Dade, Broward и Palm Beach.",
      "source": "broward.org",
      "url": "https://www.broward.org/airport/Passengers/Transportation"
    },
    {
      "id": "terminals",
      "title": "Между терминалами",
      "hint": "Пешеходные маршруты",
      "text": "Бесплатные автобусы курсируют круглосуточно только между Rental Car Center и терминалами; остановки обозначены на нижнем уровне прилёта. Между терминалами можно пройти по тротуарам у здания или по пешеходному маршруту через парковку либо воспользоваться трамваем парковки.",
      "source": "broward.org",
      "url": "https://www.broward.org/airport/Passengers/Transportation"
    },
    {
      "id": "storage",
      "title": "Хранение багажа",
      "hint": "Терминалы 1 и 3",
      "text": "В терминале 1 камера хранения расположена до досмотра на уровне 2 рядом с выходом из пассажирской галереи B; в терминале 3 — на нижнем уровне получения багажа рядом с офисом багажа JetBlue. Оба пункта работают по будням 08:30–17:30, по субботам и воскресеньям 08:30–18:30. Пункт терминала 4 временно закрыт; сведения о сервисе можно уточнить по телефону +1 954 359 5505.",
      "source": "broward.org",
      "url": "https://www.broward.org/airport/Passengers/Services"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Терминалы и Rental Car Center",
      "text": "Бесплатный Wi-Fi доступен во всех терминалах, пассажирских галереях и Rental Car Center. Официальные сети называются Airport-Wifi-Terminal_1, Airport-Wifi-Terminal_2, Airport-Wifi-Terminal_3, Airport-Wifi-Terminal_4 и Airport-Wifi-Rental_Car_Center. Подключение FLL не требует оплаты; если появляется запрос банковской карты, служба аэропорта принимает обращения по номеру +1 866 435 9355.",
      "source": "broward.org",
      "url": "https://www.broward.org/airport/Passengers/Services"
    }
  ]
}
```

## MAN
4 блока; полные DOM MAN-transport/storage/kids/wifi.txt с открытыми карточками. Страница facilities ещё говорит all three terminals, тогда как актуальная железнодорожная страница перечисляет T2/T3; число терминалов из старой общей формулировки не перенесено. PremiumWiFi2GBP не описывает длительность, цена исключена.
```json
{
  "iata": "MAN",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Поезд в Манчестер",
      "hint": "Около 20 минут до Piccadilly",
      "text": "Поезда TransPennine Express и Northern Rail до Manchester Piccadilly идут около 20 минут и отправляются каждые 10 минут ежедневно. Станция находится между терминалами 2 и 3: до терминала 2 около 10 минут пешком, до терминала 3 — около 5 минут. Терминалы связаны со станцией лифтами, эскалаторами и движущимися дорожками; билеты продаются онлайн, в автоматах и на железнодорожной информационной стойке.",
      "source": "manchesterairport.co.uk",
      "url": "https://www.manchesterairport.co.uk/getting-to-and-from/by-train/"
    },
    {
      "id": "storage",
      "title": "Хранение багажа",
      "hint": "Зона вылета терминала 2",
      "text": "Excess Baggage Company предлагает краткосрочное и длительное хранение багажа в зоне вылета терминала 2. Для вылетающих из терминала 2 также доступны упаковка багажа и организация его доставки по стране и за границу.",
      "source": "manchesterairport.co.uk",
      "url": "https://www.manchesterairport.co.uk/at-the-airport/airport-facilities/"
    },
    {
      "id": "kids",
      "title": "Пеленальные комнаты",
      "hint": "В туалетах или рядом с ними",
      "text": "Пеленальные помещения находятся в женских туалетах или рядом с ними и оснащены стульями для кормления грудью. Кормление разрешено на всей территории аэропорта, оно не ограничивается этими комнатами.",
      "source": "manchesterairport.co.uk",
      "url": "https://www.manchesterairport.co.uk/at-the-airport/airport-facilities/"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "До 2 часов за 24 часа",
      "text": "Бесплатная сеть _FreeWifi предоставляет до 2 часов доступа за каждые 24 часа. Подключаться можно с телефона, планшета или ноутбука; услуга также доступна в залах ожидания и Runway Visitor Park.",
      "source": "manchesterairport.co.uk",
      "url": "https://www.manchesterairport.co.uk/at-the-airport/airport-facilities/"
    }
  ]
}
```

## CJU
4 блока; полные DOM CJU-transport/taxi/kids/wifi.txt. Gate2/3/5 из английской наземной инструкции не переименовывались ни в посадочные выходы, ни в двери: номера в тексте не использованы. WiFi SSID отсутствует в KAC FAQ и не выдуман. Оценки taxi ясно нефиксированные.
```json
{
  "iata": "CJU",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Автобус 600",
      "hint": "Через Jungmun в Seogwipo",
      "text": "Автобус 600 связывает аэропорт Чеджу с Jungmun и Seogwipo KAL Hotel. Из аэропорта первый рейс отправляется в 06:00, последний — в 22:40, интервал составляет 16–40 минут. Оператор Samyeong Transportation отвечает по телефону +82 64 713 7000.",
      "source": "airport.co.kr",
      "url": "https://www.airport.co.kr/jejueng/cms/frCon/index.do?MENU_ID=90"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Ориентировочные цены",
      "text": "Аэропорт оценивает поездку обычным такси до Jeju City Hall примерно в 30 минут и 9 000 KRW, до Jungmun Tourism Complex — в 80 минут и 35 000 KRW. Для такси Deluxe на тех же направлениях указаны ориентиры 16 200 KRW и 63 000 KRW соответственно.",
      "source": "airport.co.kr",
      "url": "https://www.airport.co.kr/jejueng/cms/frCon/index.do?MENU_ID=90"
    },
    {
      "id": "kids",
      "title": "Комната ухода и коляски",
      "hint": "Внутренний терминал, уровень 3",
      "text": "Внутри внутреннего терминала на уровне 3 слева от Domestic Departure B есть комната ухода за детьми с пеленальным местом, умывальником, диваном и комнатой кормления. Коляску можно взять на стойке Comprehensive Information Counter в центре общественного зала ожидания на уровне 3 внутреннего терминала, предъявив удостоверение личности; пользоваться ею можно в общественном зале, после использования её нужно вернуть.",
      "source": "airport.co.kr",
      "url": "https://www.airport.co.kr/jejueng/cms/frCon/index.do?MENU_ID=200"
    },
    {
      "id": "wifi",
      "title": "Wi-Fi и зарядка",
      "hint": "Бесплатная сеть KAC",
      "text": "Korea Airports Corporation предоставляет бесплатный Wi-Fi в аэропортовых терминалах. За уточнением услуг зарядки устройств в Чеджу можно обратиться в Customer Service Team по телефону +82 64 797 2566; KAC предупреждает, что зарядные сервисы могут быть бесплатными или платными.",
      "source": "airport.co.kr",
      "url": "https://www.airport.co.kr/jejueng/cms/frCon/index.do?MENU_ID=300&CONTENTS_NO=8&acd=A1103"
    }
  ]
}
```

## DMK
3 подтверждённых блока; полные DOM DMK-transport/taxi/wifi.txt. ShuttleDMK-BKK: текст05–24,карточкизакрываются22 — временной режим противоречив, бесплатность и boardingpass на этой странице не указаны, блок исключён (DMK-shuttle-conflict.txt). Gate6/8/15 не переименовывались по догадке: использованы только подтверждённые терминалы/уровень/общественнаязона. Тариф21THB за oversizedбагаж в такси не копировался как потенциальная опечатка.
```json
{
  "iata": "DMK",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Автобусы BMTA",
      "hint": "Маршруты A1–A4",
      "text": "A1 идёт к Mo Chit 2 с 05:45 до полуночи, A2 — к Victory Monument с 06:00 до 23:00; оба отправляются каждые 15 минут и стоят 30 THB. A3 до Lumpini Park и A4 до Sanam Luang работают с 06:00 до 23:00 с интервалом 30 минут, проезд стоит 50 THB. Пункты посадки находятся перед Service Hall и в общественной зоне прилёта терминала 1 на уровне 1.",
      "source": "donmueang.airportthai.co.th",
      "url": "https://donmueang.airportthai.co.th/service/transportation/detail/205"
    },
    {
      "id": "taxi",
      "title": "Такси по счётчику",
      "hint": "Плюс аэропортовая доплата",
      "text": "К стоимости по счётчику добавляется доплата 50 THB, а сборы за скоростные и специальные платные дороги оплачивает пассажир. Стойки такси находятся в общественной зоне прилёта на уровне 1 терминалов 1 и 2.",
      "source": "donmueang.airportthai.co.th",
      "url": "https://donmueang.airportthai.co.th/service/transportation/detail/211"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "60 минут после подключения",
      "text": "Выберите сеть Airport Free Wi-Fi by NT, введите электронную почту и отметьте согласие с условиями использования. После успешного подключения нажмите OK: бесплатный доступ предоставляется на 60 минут.",
      "source": "donmueang.airportthai.co.th",
      "url": "https://donmueang.airportthai.co.th/service/airport-guide/detail/2025_Updated_Donmueang_Airport_Free_Wi-Fi_Access"
    }
  ]
}
```

## NKG
Ограниченная справочная: 1 блок официального оператора отеля. Аэропорт njiairport.com показал503защитныймодуль10004 (NKG-waf.txt). Нормальный переход на официальный njmetro.com.cn истёк по времени и не сменил Googleстраницу — это не прочитанный источник и не источник транспортных фактов. Полный DOM NKG-sleep.txt. Транспортные обещания отеля про метро30мин в город не включены: отель первичен для собственной услуги.
```json
{
  "iata": "NKG",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "sleep",
      "title": "Pullman Nanjing Lukou Airport",
      "hint": "Между терминалами 1 и 2",
      "text": "Pullman Nanjing Lukou Airport находится в здании аэропорта и соединяет терминалы 1 и 2, до каждого из них около 2 минут пешком. В отеле есть подогреваемый бассейн под стеклянной крышей, фитнес-центр, рестораны и табло рейсов в номерах. Заезд начинается в 14:00, выезд — до 12:00.",
      "source": "all.accor.com",
      "url": "https://all.accor.com/hotel/8737/index.en.shtml"
    }
  ]
}
```

## MXP
Ограниченная справочная: 2 блока официальных операторов. Собственный аэропортовый сайт действительно показал ERR_CONNECTION_TIMED_OUT после обычного перехода/клика и скриншота, не просто EMPTY (MXP-timeout.txt). Trenord содержит противоречивые first/lasttrain05:00/05:43/21:12/22:43/23:00 — часы исключены,51мин/15EUR совпадают. Полные DOM MXP-transport/sleep.txt.
```json
{
  "iata": "MXP",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Malpensa Express",
      "hint": "Около 51 минуты до Centrale",
      "text": "Поезд Malpensa Express соединяет терминал 1 с Milano Centrale без пересадок примерно за 51 минуту. Билет в одну сторону стоит 15 EUR; его можно купить онлайн на trenord.it, в приложении Trenord, в автоматах, кассах и у уполномоченных продавцов.",
      "source": "malpensaexpress.it",
      "url": "https://www.malpensaexpress.it/en/lines-and-timetable/most-searched-lines/malpensa-aeroporto-t1-milano-centrale-route/"
    },
    {
      "id": "sleep",
      "title": "Sheraton Milan Malpensa",
      "hint": "Прямой доступ к терминалу 1",
      "text": "Sheraton Milan Malpensa Airport Hotel & Conference Centre имеет прямой доступ к терминалу 1. В отеле есть крытый бассейн, фитнес-центр, спа и рестораны; номера категории suite звукоизолированы.",
      "source": "marriott.com",
      "url": "https://www.marriott.com/en-us/hotels/milmp-sheraton-milan-malpensa-airport-hotel-and-conference-centre/overview/"
    }
  ]
}
```

## WUH
Ограниченная справочная: 1 блок официального оператора Fliport. whairport.com и hbairport.com браузер отказался открывать с ERR_BLOCKED_BY_CLIENT, ограничения не обходились. Обычный переход на wuhanrt.com истёк по времени, оставив поисковую страницу: сниппеты не использованы. Полный DOM WUH-sleep.txt. Бесплатность shuttle не заявлена: источник её не подтверждает.
```json
{
  "iata": "WUH",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "sleep",
      "title": "Fliport Garden Hotel",
      "hint": "У терминалов T2 и T3",
      "text": "Wuhan Tianhe Airport Fliport Garden Hotel расположен рядом с терминалами T2 и T3 и предлагает гостям короткий трансфер к аэропорту. В отеле есть Wi-Fi, ресторан, фитнес-зал, прачечная и камера хранения; парковка бесплатна. Для связи с отелем указан телефон +86 27 5018 9888.",
      "source": "fliport.com",
      "url": "https://www.fliport.com/fliport_garden/Wuhanhuayuan/about"
    }
  ]
}
```

## CAI
4 блока. Полные DOM CAI-transport/terminals/lounges/wifi.txt. Аэропортовый сайт открылся нормально, не ограничивались гостиницей. Ahlan тариф обновлён01.09.2026; не смешаны VIP/MeetAssist, египтяне/иностранцы. Orange первичный операторWiFi, ноSSID/OTP/срока в сообщении нет — не добавлены. Конкретные часы закрытияAPM не указаны, не выдуманы.
```json
{
  "iata": "CAI",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Автобусы из аэропорта",
      "hint": "Станция перед терминалом 1",
      "text": "Городские автобусы по направлениям Каира и междугородние автобусы отправляются только со станции на парковке перед терминалом 1. Оттуда есть отправления перевозчиков West Delta, Upper Egypt, East Delta и Super Jet.",
      "source": "cairo-airport.com",
      "url": "https://www.cairo-airport.com/en-us/Services/Passenger-Guide/Move-From-To-Airport"
    },
    {
      "id": "terminals",
      "title": "Automated People Mover",
      "hint": "Бесплатный поезд по аэропорту",
      "text": "Бесплатный Automated People Mover связывает терминал 1, Air Mall, парковку, терминал 2 и терминал 3; полный путь занимает не более 5 минут. Поезд предназначен как для транзитных пассажиров, так и для посетителей общественной части аэропорта; работает 18 часов в сутки, ещё 6 часов отведены на обслуживание.",
      "source": "cairo-airport.com",
      "url": "https://www.cairo-airport.com/Automated-People-Mover"
    },
    {
      "id": "lounges",
      "title": "Ahlan VIP",
      "hint": "Зал и сопровождение",
      "text": "Сервис Ahlan VIP включает сопровождение и зал ожидания с пребыванием до 3 часов; бронирование требуется не менее чем за 48 часов до рейса. Цена VIP для иностранного пассажира — 220 USD, для гражданина Египта — 3 600 EGP. Для стыковочных рейсов стоимость удваивается, а бронирование принимают при интервале между рейсами не менее 4 часов. Двое детей младше 6 лет обслуживаются бесплатно, третий ребёнок младше 6 лет считается отдельным пассажиром.",
      "source": "cairo-airport.com",
      "url": "https://www.cairo-airport.com/Services/Ahlan-Service/Service-Information"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Услуга Orange Egypt",
      "text": "Orange Egypt предоставляет бесплатный Wi-Fi прибывающим и вылетающим пассажирам Каирского аэропорта. Оператор также предоставляет бесплатные станции зарядки телефонов и других электронных устройств.",
      "source": "orange.eg",
      "url": "https://www.orange.eg/en/about/media-center/press-kit/launching-advanced-technological-services-at-cairo-airport-861-event"
    }
  ]
}
```

## HYD
4 блока; полные DOM HYD-transport/kids/wifi.txt. На транспортной странице PushpakPickupPointE противоречит финальному сообщению о переносеPickupPointD — точку посадки не копировал. Tuckitскладскаястраницаобщаябезточногоместа/тарифа,вместопустогоблокаисключена(HYD-storage-notused.txt).
```json
{
  "iata": "HYD",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Pushpak Airport Liner",
      "hint": "Электробусы по городу",
      "text": "Электробусы Pushpak оборудованы кондиционером, зарядками для телефонов и пандусом для инвалидных колясок с механизмом понижения кузова. Маршрут AL до JBS через LB Nagar, Tarnaka и Sangeeth отправляется каждые 20 минут, AC до JBS через Aramghar, NMDC и Punjagutta — каждые 30 минут, AJ до Miyapur через ORR, Gachibowli и JNTU — каждые 15 минут. Информацию можно получить по телефонам +91 40 6944 0000 и +91 73829 25981.",
      "source": "hyderabad.aero",
      "url": "https://www.hyderabad.aero/travellers/to-and-from-airport"
    },
    {
      "id": "taxi",
      "title": "Такси и приложения",
      "hint": "Зоны посадки на парковке",
      "text": "Alyte и Sky Cabs принимают заказы у стоек с посадкой на рампе прилёта и в Carpark Zone D. Для машин по приложениям выделены зоны: Uber — D1 и D2, Rapido — D3 и D4, Ola — D6 и D7. Предоплаченное такси от стойки отправляется из Carpark Zone E по фиксированному тарифу в зависимости от пункта назначения.",
      "source": "hyderabad.aero",
      "url": "https://www.hyderabad.aero/travellers/to-and-from-airport"
    },
    {
      "id": "kids",
      "title": "Комнаты ухода за младенцами",
      "hint": "Ориентируйтесь по указателям",
      "text": "В ключевых зонах терминала предусмотрены закрытые комнаты ухода за младенцами с кондиционером и креслами для кормления грудью. К ближайшей комнате ведут указатели; найти её также помогают информационные стойки.",
      "source": "hyderabad.aero",
      "url": "https://www.hyderabad.aero/rgia/airport-facilities/baby-care-rooms"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "До 4 часов доступа",
      "text": "Подключитесь к Hyderabad Airport-Free-WiFi, выберите код страны, введите мобильный номер и получите SMS-OTP; после ввода кода доступ предоставляется на срок до 4 часов. Альтернатива — отсканировать паспорт на виртуальном информационном экране и использовать показанный код купона. В международной зоне вылета Wi-Fi Kiosk расположен у выхода на посадку 23B, в международной зоне прилёта купон по паспорту можно получить у ленты 12.",
      "source": "hyderabad.aero",
      "url": "https://www.hyderabad.aero/rgia/airport-facilities/wi-fi"
    }
  ]
}
```

## CSX
3 содержательных блока; текущие пассажирские страницы обновлены 21.05.2026. Wi-Fi и спецуслуги не дали текстовых условий, графические тележки не превращены в неподтверждённые услуги. Цены парковки в графике не переписывались. Полные DOM CSX-*.txt.
```json
{
  "iata": "CSX",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Маглев до вокзала",
      "hint": "20 CNY за поездку",
      "text": "Станция маглева аэропорта находится между T1 и T2 рядом с диспетчерской вышкой. Из зоны вылета T2 к ней ведёт переход возле входа 1; из зоны прилёта нужно сначала подняться на уровень вылета. Проезд до станции у Южного железнодорожного вокзала Чанши стоит 20 CNY с человека. На вокзале есть переход к метро линии 2; справочная маглева: +86 731 86859898.",
      "source": "hunanairport.cn",
      "url": "https://www.hunanairport.cn/content/2021/12/16/10625917.html"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Стоянки у T1 и T2",
      "text": "Официальная посадка в такси находится у двери 3 зала прилёта T1 и двери 5 зала прилёта T2. Ориентировочная стоимость до центра Чанши составляет 90 CNY, до Западного автовокзала — 120 CNY, до Южного автовокзала — 110 CNY; эти суммы включают платные дороги и мосты. При отказе ехать по счётчику, отказе в перевозке или завышении цены аэропорт предлагает обращаться к сотрудникам на стоянке.",
      "source": "hunanairport.cn",
      "url": "https://www.hunanairport.cn/content/2021/12/16/10625922.html"
    },
    {
      "id": "parking",
      "title": "Парковка",
      "hint": "Площадки у обоих терминалов",
      "text": "Перед T1 находится парковка P5: зона A непосредственно у терминала, зона B — примерно в 300 м от него. У T2 парковка P1 расположена с северо-запада и предназначена в том числе для ночной стоянки, P2 — перед терминалом для краткой остановки, а P4 — в подземном гараже перед терминалом для ночной стоянки. Оплатить можно наличными, банковской картой, Alipay или WeChat; справочная парковки: +86 731 84798050.",
      "source": "hunanairport.cn",
      "url": "https://www.hunanairport.cn/content/2021/12/16/10625926.html"
    }
  ]
}
```

## PHL
4 блока с официального phl.org. SSID из сторонних пересказов не переносился: страница аэропорта не даёт однозначной технической подписи. Такси: 32 USD только установленная Center City Zone, не весь город; доплата только старше 12, egress к flat rate не добавляется. Полные DOM PHL-*.txt.
```json
{
  "iata": "PHL",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Поезд в центр",
      "hint": "SEPTA Airport Regional Rail",
      "text": "Поезда SEPTA Airport Regional Rail связывают аэропорт с центром Филадельфии каждые 30 минут. Остановки аэропорта обслуживают терминалы A, B, C/D и E/F; все станции этой линии доступны для пассажиров на колясках. На станции William H. Gray III 30th Street можно пересесть на Amtrak и NJ Transit Atlantic City Line. Для оплаты SEPTA принимает бесконтактные карты Visa, Mastercard, Discover и AMEX, а также мобильные платежи.",
      "source": "phl.org",
      "url": "https://www.phl.org/getting-around/public-transportation"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Зона 5 после выдачи багажа",
      "text": "К такси ведут указатели Ground Transportation / Taxis / Zone 5 после выдачи багажа; прибывшим в A-West нужно спуститься на Ground Floor. Поездка из аэропорта в установленную зону Center City стоит 32 USD за первого пассажира, плюс 1 USD за каждого дополнительного пассажира старше 12 лет. Сбор за выезд из аэропорта к этому фиксированному тарифу не добавляется; чаевые в стоимость не входят. Все такси принимают кредитные карты.",
      "source": "phl.org",
      "url": "https://www.phl.org/getting-around/taxis-and-limousines"
    },
    {
      "id": "kids",
      "title": "Кормление ребёнка",
      "hint": "Mamava после досмотра",
      "text": "Бесплатные кабины Mamava после досмотра есть в A-West, переходе B/C, терминалах E и F; внутри предусмотрены скамьи, откидной столик, розетка и запираемая дверь. Приложение Mamava позволяет открыть кабину и посмотреть её доступность. В Minute Suites на переходе между A-East и B после досмотра кормящие матери могут бесплатно пользоваться отдельной комнатой первые 30 минут; телефон: +1 215 9371076.",
      "source": "phl.org",
      "url": "https://www.phl.org/at-phl/services-and-amenities/nursing-stations"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "Без ограничения трафика",
      "text": "Аэропорт предоставляет всем посетителям бесплатный Wi-Fi от AT&T без ограничения трафика. В настройках устройства нужно включить Wi-Fi и выбрать бесплатную сеть аэропорта PHL; для подключения требуется устройство с поддержкой Wi-Fi.",
      "source": "phl.org",
      "url": "https://www.phl.org/at-phl/services-and-amenities/free-wifi"
    }
  ]
}
```

## STN
4 блока. Сайт нормально загрузился после первичного timeout, cookie — Essential Only. В lounge не использована рекламная цена 28.99 GBP для января 2027: взята walk-up от 35 GBP. Не перенесены прежний Escape, неподтверждённый SSID и неоднозначные часы lounge. Полные DOM STN-*.txt.
```json
{
  "iata": "STN",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Поезд в Лондон",
      "hint": "Станция под терминалом",
      "text": "Железнодорожная станция находится прямо под терминалом, примерно в 2 минутах ходьбы; доступны лифты, эскалаторы и пандусы. Stansted Express ходит до London Liverpool Street каждые 15 минут ежедневно, поездка занимает около 48 минут; до Tottenham Hale — около 36 минут. На Stansted Express можно платить бесконтактной банковской картой или мобильным кошельком, но Oyster для поездки в аэропорт или из него не действует.",
      "source": "stanstedairport.com",
      "url": "https://www.stanstedairport.com/getting-to-and-from/by-train/"
    },
    {
      "id": "kids",
      "title": "С детьми",
      "hint": "Пеленание и кормление",
      "text": "Пеленальные места есть в мужских и женских туалетах у регистрации в зоне A, а после досмотра — возле выходов на посадку 13, 33/34, 43 и 59. В зоне международной выдачи багажа пеленальные кабины находятся возле ленты 9; они также есть в главном зале встречи прибывающих. Кормить грудью разрешено по всему аэропорту, а для уединения в Family Room главного зала вылета предусмотрены отдельные кабины.",
      "source": "stanstedairport.com",
      "url": "https://www.stanstedairport.com/at-the-airport/airport-facilities/"
    },
    {
      "id": "lounges",
      "title": "Essence Lounge",
      "hint": "Только для определённых авиалиний",
      "text": "Прежний Escape Lounge в главном терминале закрыт; новый Essence by Escape Lounges обслуживает только пассажиров допущенных авиакомпаний, вылетающих от выходов на посадку 1–19. Пассажиры Ryanair и easyJet попасть туда не могут; после поездки к выходам 1–19 вернуться в главный терминал нельзя. В зал допускают за 3 часа до вылета по расписанию; вход без предварительного бронирования стоит от 35 GBP, дети младше 3 лет проходят бесплатно. Включены холодные блюда, горячие и безалкогольные напитки, вино, бутылочное пиво и Wi-Fi; оплата только картой.",
      "source": "stanstedairport.com",
      "url": "https://www.stanstedairport.com/at-the-airport/escape-lounge/"
    },
    {
      "id": "wifi",
      "title": "Бесплатный Wi-Fi",
      "hint": "2 часа в терминале",
      "text": "В терминале Станстеда и залах отдыха доступен бесплатный Wi-Fi на 2 часа. Для подключения нужно выбрать сеть Wi-Fi аэропорта на телефоне, планшете или ноутбуке.",
      "source": "stanstedairport.com",
      "url": "https://www.stanstedairport.com/at-the-airport/airport-facilities/free-wifi/"
    }
  ]
}
```
