# Партия 2: официальные источники

Обычный Chrome, по одной странице. Полные DOM-снимки /tmp/airports-top100-batch2/. Черновики для независимой проверки.

## HGH
Ограниченная справочная1блок. hzairport.com ENservice и китайские пассажирский/метро URL отдают Error页面出错 и возвращаютглавную, безобхода. Отель проверен на собственной RUстранице IHG с раскрытым Подробнее; нетобещаниябесплатноготрансфера/тарифаметро. ПолныйDOMHGH-sleep.txt.
```json
{
  "iata": "HGH",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "sleep",
      "title": "Где поспать",
      "hint": "Отель у станции Xingang",
      "text": "Holiday Inn Express Hangzhou Airport находится в Dexin Airport City рядом со станцией Xingang линии метро 7, в 1 остановке от аэропорта. В отеле 132 номера, предоставляется бесплатный завтрак и есть Wi‑Fi. Заезд — с 14:00, выезд — до 12:00.",
      "source": "ihg.com",
      "url": "https://www.ihg.com/holidayinnexpress/hotels/ru/ru/hangzhou/hghap/hoteldetail"
    }
  ]
}
```

## SHA
2 блока, проверены модальные карточки LuggageStorage и ChildrenPark с выбраннымTerminal1. Gate6 в DeparturesHall оставлен как исходная подпись: физическая дверь/посадочный выход не доказаны. WiFiкарточка не открылась, факты не взяты. Рекламные/коммерческие списки магазинов не использовались. ПолныеDOMSHA-storage/kids.txt. Повторным обычным открытием карточек сохранены SHA-storage-T1.png и SHA-kids-T1.png с активным Terminal1.
```json
{
  "iata": "SHA",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "storage",
      "title": "Камера хранения",
      "hint": "Хранение до 1 месяца",
      "text": "В терминале 1 камера хранения находится напротив Gate 6 в зале вылета и работает с 07:00 до 20:30, с учётом фактического режима работы на месте. Багаж принимается платно на срок до 1 месяца. Пассажирам с паспортом, дающим право на 240-часовой безвизовый транзит, предоставляют бесплатное хранение 1 места багажа на 72 часа. Для сдачи и получения нужен действительный документ; вещи проверяют рентгеном.",
      "source": "shanghaiairport.com",
      "url": "https://www.shanghaiairport.com/ensh/hqjc/index.html"
    },
    {
      "id": "kids",
      "title": "С ребёнком",
      "hint": "Детские зоны терминала 1",
      "text": "В терминале 1 детские игровые зоны расположены на уровне вылета: у выхода на посадку T10 в зоне международных рейсов, Гонконга, Макао и Тайваня и у выхода T26 в зоне внутренних рейсов. Они открываются в соответствии с режимом выполнения вылетающих рейсов.",
      "source": "shanghaiairport.com",
      "url": "https://www.shanghaiairport.com/ensh/hqjc/index.html"
    }
  ]
}
```

## CKG
2 ограниченных блока по собственным операторам. Официальный аэропорт поискомEN/中文/предполагаемыйCQAне найден: результаты ведут к airline-guide/платформам; первичныеcsairзалаиIHGотеляпрочитаны. МашинныйRUописаниеIHGиспорчен(400Ave/центральнаясвинина/станция), не использован: только однозначный адресfooter/условия/услуги. Часы checkin12AMне переносились, admissionзала неизвестен.
```json
{
  "iata": "CKG",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "lounges",
      "title": "Бизнес-залы",
      "hint": "Зал China Southern в Т3A",
      "text": "Зал China Southern находится у входа в зал G терминала T3A. Он разделён на зоны для участников программы и пассажиров двух премиальных классов, всего предусмотрено 187 мест. В зале есть хранение багажа, деловая зона, массажная зона отдыха, комната матери и ребёнка и душевые.",
      "source": "csair.com",
      "url": "https://www.csair.com/cn/tourguide/airport_service/priority_pass/domestic/18h9nnvi3sef0.shtml"
    },
    {
      "id": "sleep",
      "title": "Где поспать",
      "hint": "Holiday Inn Express Airport Zone",
      "text": "Holiday Inn Express Chongqing Airport Zone находится по адресу No.199 Lianggang Avenue в районе Yubei. В отеле предоставляют бесплатный завтрак, есть Wi‑Fi, парковка и ресторан. Минимальный возраст для самостоятельной регистрации — 18 лет, выезд — до 12:00.",
      "source": "ihg.com",
      "url": "https://www.ihg.com/holidayinnexpress/hotels/ru/ru/chongqing/ckgap/hoteldetail"
    }
  ]
}
```

## KMG
2 блока официального сайта km.ynairport.com, китайская версия. Пассажирские обещанияпроочереди неиспользованы какгарантия. Парковочнаятарифнаястраницассылаетсянаакт2014,ценыизизображениянепереносились. Gate3 на китайском 3号门,переведёнкакдверь,непосадочныйвыход. ПолныеDOMKMG-transport/taxi.txt.
```json
{
  "iata": "KMG",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "Метро 6, станция Airport Center",
      "text": "Линия метро 6 связывает Tangzixiang со станцией Airport Center у аэропорта; на линии предусмотрены пересадки на линии 2, 3 и 4. Станция Airport Center находится на уровне B2 терминала.",
      "source": "km.ynairport.com",
      "url": "https://km.ynairport.com/zhjt/5749.jhtml"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "У двери 3 на уровне B1",
      "text": "Стоянка такси находится напротив двери 3 на уровне B1. Для поездок с пунктом назначения в административных границах Куньмина оплата идёт по счётчику, без доплаты за обратный порожний пробег.",
      "source": "km.ynairport.com",
      "url": "https://km.ynairport.com/zhjt/5752.jhtml"
    }
  ]
}
```

## XIY
НЕ ГОТОВО. Официальный https://www.xxia.com/ из поисковой выдачи в обычном Chrome завершился CDPtimeout, затем Cannot attach to this target; вкладку не обходили. Поиск официального xianrail.com по机场14 не дал первичных страниц; IHGпоairport выдаёт городскиеотели, не доказанную гостиницу аэропорта, поэтому заполнитель не создан. Требуется другой доступный официальный источник/повтор обычным браузером позже. При повторной обычной навигации xxia.com браузер явно сообщил net::ERR_CERT_DATE_INVALID; предупреждение сертификата не обходили. Резервный собственный RegalHotel URL из выдачи отдал Sorry Page Not Found (визуально подтверждено, XIY-regal404.txt), сведения агрегаторов/AI не переносились.
```json
{
  "iata": "XIY",
  "checked": "2026-10-26",
  "blocks": []
}
```

## IAH
4 блока. Текущий bannerпроTerminalBремонт не превращён впостоянный блок. УслугиMinuteSuitesбезнеподтверждённойцены. ОбработкуусловийWiFiописали,нонекликаливживойавторизации. ПолныеDOMIAH-services/transport.txt.
```json
{
  "iata": "IAH",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "Downtown Direct — 4,50 USD",
      "text": "Автобус METRO 500 IAH Downtown Direct без остановок связывает аэропорт с George R. Brown Convention Center. Посадка — в терминале E на уровне 2 у двери E201 рядом с зоной посадки Ride App Pick-Up. Поездка в одну сторону стоит 4,50 USD; автобус ходит ежедневно с 05:30 до 20:00 каждые 30 минут. Предусмотрены места для багажа, доступность для маломобильных пассажиров и бесплатный Wi‑Fi.",
      "source": "fly2houston.com",
      "url": "https://www.fly2houston.com/iah/ground-transportation/metro-downtown-direct/"
    },
    {
      "id": "sleep",
      "title": "Где поспать",
      "hint": "Minute Suites после досмотра",
      "text": "Minute Suites находится в терминале C у выхода на посадку C14 после досмотра. Пассажирам предлагают отдельное пространство для сна, отдыха и работы, а также душ.",
      "source": "fly2houston.com",
      "url": "https://www.fly2houston.com/iah/visitor-information/services/"
    },
    {
      "id": "kids",
      "title": "С ребёнком",
      "hint": "Mother’s Rooms и Mamava",
      "text": "В IAH предусмотрены комнаты и капсулы Mamava для кормления и сцеживания, детские комнаты и пеленальные столики. Mother’s Rooms находятся в терминале A у выходов на посадку A1 и A17 и в терминале C у C5. Капсулы Mamava есть в терминале B у B21, в терминале C у C34 и в терминале E у E12; детская комната в терминале D — у D15.",
      "source": "fly2houston.com",
      "url": "https://www.fly2houston.com/iah/visitor-information/services/"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Free Airport WIFI",
      "text": "Бесплатный Wi‑Fi доступен во всех терминалах IAH, включая парковочные здания. Нужно выбрать сеть Free Airport WIFI, дождаться страницы входа, принять условия и нажать Submit. Телефон поддержки — 1-844-831-0999.",
      "source": "fly2houston.com",
      "url": "https://www.fly2houston.com/iah/visitor-information/services/"
    }
  ]
}
```

## YYZ
4 блока. UPExpressнаактуальнойстранице28мин(небралстарое25изпамяти),цены12.35/9.25с$каквисточнике(неподменяливалютусимволомдругойстраны). ИзрасписаниянепереносилсяопечатанныйLasttraintoUnionвблокеUniontoPearson. УfamilyT3B1A/B1противоречиеисключено,взятыоднозначныеMamava. ПолныеDOMYYZ-*.txt.
```json
{
  "iata": "YYZ",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "UP Express: 28 минут",
      "text": "Поезд UP Express связывает Pearson с Union Station в центре Торонто за 28 минут, отправления — каждые 15 минут ежедневно. Взрослый билет в одну сторону стоит 12,35 $, с PRESTO — 9,25 $; дети до 12 лет едут бесплатно. Станция находится в терминале 1 рядом с Terminal Link: из терминала 3 нужно сначала доехать бесплатным Terminal Link до терминала 1 и следовать указателям Train to City. В поезде и на станции есть бесплатный Wi‑Fi, а в поезде — розетки и багажные полки.",
      "source": "torontopearson.com",
      "url": "https://www.torontopearson.com/en/transportation-and-parking/up-express"
    },
    {
      "id": "terminals",
      "title": "Терминалы",
      "hint": "Бесплатный Terminal Link",
      "text": "Бесплатный Terminal Link работает круглосуточно между терминалами 1 и 3 и станцией Viscount. Он также обеспечивает доступ к Sheraton Gateway Hotel, ALT Hotel и парковкам Value Park Garage и Value Park Lot. Время поездки между станциями составляет от 2 до 8 минут. Поезд доступен для пассажиров с нескладными средствами мобильности.",
      "source": "torontopearson.com",
      "url": "https://www.torontopearson.com/en/transportation-and-parking/terminal-link-train"
    },
    {
      "id": "kids",
      "title": "С ребёнком",
      "hint": "Комнаты и капсулы после досмотра",
      "text": "Комнаты и капсулы для кормления расположены после досмотра. В капсулах Mamava есть откидной столик, 2 скамьи, зеркало, поручни и розетка с USB; для открытия нужен код из приложения Mamava либо службы поддержки аэропорта. В терминале 1 капсулы находятся у выходов на посадку D22, E80/E81 и F59, в терминале 3 — у C30/C31, B22 и A12/A13. Детская игровая зона есть в зале вылета терминала 1 у выхода D24.",
      "source": "torontopearson.com",
      "url": "https://www.torontopearson.com/en/while-you-are-here/family-travel"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Toronto Pearson Public Wi-Fi",
      "text": "В аэропорту доступен бесплатный Wi‑Fi, предоставляемый Pearson и CIBC. Нужно выбрать Toronto Pearson Public Wi-Fi, открыть приветственную страницу, принять условия и нажать Connect. При необходимости помощь доступна по телефону 1-866-207-1690 или на информационной стойке.",
      "source": "torontopearson.com",
      "url": "https://www.torontopearson.com/en/while-you-are-here/free-wifi"
    }
  ]
}
```

## GRU
3 блока. НаWiFiстраницевнутреннеепротиворечие:firstfourhours vs freeonehour,лимитнеперенесён. Обещаниеназемногобесплатноготрансфераизstationнепереносилбезсверкисовременнойсхемы, вблокетольколиния/пересадка/вход. ПослепервогоDOMEMPTYстраницаоказаласьнормальнойнаscreenshot,повторноеDOM/полныйAXсохранены. Название Aeroporto–Guarulhos подтверждено собственной PT-версией страницы по DOM, источник транспортного блока переключён на PT. Снимок GRU-transport-pt.txt.
```json
{
  "iata": "GRU",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "Линия 13-Jade",
      "text": "Станция Aeroporto-Guarulhos входит в линию 13-Jade CPTM, которая связывает аэропорт со станцией Engenheiro Goulart. На Engenheiro Goulart можно пересесть на линию 12-Safira. Вход со стороны аэропорта расположен рядом с парковкой терминала 1.",
      "source": "gru.com.br",
      "url": "https://www.gru.com.br/pt/passageiro/como-chegar-sair/trem/"
    },
    {
      "id": "storage",
      "title": "Камера хранения",
      "hint": "Malex в терминалах 2 и 3",
      "text": "Хранение багажа Malex доступно в терминалах 2 и 3 снаружи зоны прилёта, на тротуаре. Пункт Arrival West терминала 2 работает круглосуточно. Пункты Arrival East терминала 2 и Arrival терминала 3 открыты с 07:00 до 19:00.",
      "source": "gru.com.br",
      "url": "https://www.gru.com.br/en/passenger/discover-gru/services-and-facilities/luggage-storage"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Сеть .GRU WIFI",
      "text": "Аэропорт предоставляет бесплатный Wi‑Fi через BOINGO. Для подключения нужно выбрать сеть .GRU WIFI, нажать Connect и следовать инструкциям. Поддержка BOINGO работает круглосуточно по телефону 0800-095-9026.",
      "source": "gru.com.br",
      "url": "https://www.gru.com.br/en/passenger/discover-gru/services-and-facilities/wifi"
    }
  ]
}
```

## EWR
4 блока. AirTrain8.75USDпредставленсусловиемотсутствиябилетаNJT/Amtrakкакнастранице;новыелимиты/пересчётценневыдуманы. Taxifaresполнысборов,поэтому базовыепрайсыманхэттенабезвсехдоплатнеиспользованы. Динамическоеожиданиеинформациянеперенесена. ПолныеDOMEWR-services/terminals/taxi.txt.
```json
{
  "iata": "EWR",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "AirTrain до NJ Transit и Amtrak",
      "text": "AirTrain связывает терминалы с железнодорожной станцией Newark Liberty International Airport Train Station, где останавливаются NJ Transit и Amtrak. Если билета NJ Transit или Amtrak ещё нет, поездка AirTrain с проходом через железнодорожную станцию стоит 8,75 USD в одну сторону. При пересадке на PATH его проезд оплачивается отдельно.",
      "source": "newarkairport.com",
      "url": "https://www.newarkairport.com/transportation/airtrain"
    },
    {
      "id": "taxi",
      "title": "Такси",
      "hint": "Официальные стоянки всех терминалов",
      "text": "Такси есть у всех терминалов, бронирование не требуется: диспетчер в форме направляет пассажиров к свободной машине. В терминале A стоянка находится на уровне 1 у двери 5, в терминале B — на уровне 2 у двери 8 и на уровне 1 у двери 2, в терминале C — на уровне 1 у двери 6. В обычном такси допускается до 4 пассажиров, в минивэне — до 5; тариф один для всех пассажиров, едущих в одно место. За каждое место багажа, включая ручную кладь, взимается 1 USD.",
      "source": "newarkairport.com",
      "url": "https://www.newarkairport.com/transportation/taxi-service"
    },
    {
      "id": "terminals",
      "title": "Терминалы",
      "hint": "AirTrain, связь с терминалом A",
      "text": "Поездки AirTrain между терминалами, парковками, прокатом автомобилей и остановками гостиничных шаттлов бесплатны. AirTrain не подходит непосредственно к терминалу A: до него нужно пройти около 15 минут по крытому переходу либо проехать на шаттле около 5 минут. С 23:00 до 05:00 по восточному времени США AirTrain приходит в терминалы B и C каждые 15 минут; для дополнительной пересадки к терминалу A предусмотрен шаттл. Во время строительства возможны временные перерывы AirTrain, при которых предоставляются автобусы.",
      "source": "newarkairport.com",
      "url": "https://www.newarkairport.com/transportation/airtrain"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Сеть _Free EWR WiFi",
      "text": "В аэропорту есть бесплатный Wi‑Fi: нужно выбрать сеть _Free EWR WiFi. Техническая поддержка доступна круглосуточно по телефону +1 (800) 880-4117.",
      "source": "newarkairport.com",
      "url": "https://www.newarkairport.com/explore-ewr/services"
    }
  ]
}
```

## BOG
4 блока. TransMilenioответпрочитанвраскрытомFAQ,тарифнедодуман. Gate1парковкиоставленкакподписьбезутвержденияDoor/Gateпосадки. WiFiPremiumсуточныйтарифнепересказанкак24часа(наанглийском1Day),стоимостьвообщеисключена,чтобынепродаватьуслугулишним. Динамическаязанятостьпарковкинесохраняласьвтексте. ПолныеDOMBOG-*.txt.
```json
{
  "iata": "BOG",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "TransMilenio через Portal El Dorado",
      "text": "При поездке системой TransMilenio нужно выйти на Portal El Dorado и пересесть на подвозящий автобус 16-14 Airport либо автобус K86. Оба маршрута, по информации аэропорта, идут непосредственно к терминалам.",
      "source": "eldorado.aero",
      "url": "https://eldorado.aero/en/transporte/como-llegar-al-aeropuerto"
    },
    {
      "id": "terminals",
      "title": "Терминалы",
      "hint": "Бесплатный трансфер Т1–Т2",
      "text": "Между терминалами 1 и 2 El Dorado действует бесплатный трансфер. Он работает ежедневно с 04:00 до полуночи и оборудован пандусом для маломобильных пассажиров.",
      "source": "eldorado.aero",
      "url": "https://eldorado.aero/en/transporte/como-llegar-al-aeropuerto"
    },
    {
      "id": "parking",
      "title": "Парковка",
      "hint": "Короткая и длительная стоянка Т1",
      "text": "Парковка Short Stay Parking — Center находится в центральной части терминала 1 с доступом к зонам внутренних и международных рейсов. Для стоянки на несколько дней предусмотрена Long Stay Parking — North возле Gate 1 терминала 1, часть её мест находится под крышей. На парковках есть места для автомобилей и велосипедов, а также выделенные места для маломобильных пассажиров.",
      "source": "eldorado.aero",
      "url": "https://eldorado.aero/en/servicios/parqueaderos/terminal-1"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Airport_El_Dorado бесплатно",
      "text": "В аэропорту пассажирам и посетителям доступен бесплатный Wi‑Fi Airport_El_Dorado. Для подключения нужно выбрать сеть, указать данные на портале доступа и открыть браузер. Если соединение прервалось, можно бесплатно подключаться снова столько раз, сколько нужно. Дополнительно продаётся Premium WiFi с непрерывным подключением для 1 устройства.",
      "source": "eldorado.aero",
      "url": "https://eldorado.aero/en/servicios/internet-wifi"
    }
  ]
}
```

## TPE
3 блока. РаннийEMPTYбылпреждевременнойDOMоценкой,НЕнедоступностьюсайта:повторсscreenshotпоказалнормальнуюстраницу. Фактыпрочитаныпосленормальнойотрисовки. ПолныеDOMTPE-wifi/storage/transport.txt; Точные URL подтверждены сохранённым DOM location; Pelican /services_facilities/B68BD5D9-EE87-EC11-80F5-000C29A1B907. ДатаWiFiстраницы2024,нонепомеченакакутратившаясилу. Никакихформ/логина/обхода.
```json
{
  "iata": "TPE",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "transport",
      "title": "Как доехать",
      "hint": "MRT у обоих терминалов",
      "text": "Станции A12 Terminal 1 и A13 Terminal 2 обслуживают экспрессные и обычные поезда Taoyuan Airport MRT. Экспрессные и обычные поезда прибывают поочерёдно, примерно каждые 7,5 минуты. Автобусы отправляются из зоны B1 зала прилёта терминала 1 и с наружной галереи у восточной стороны зала прилёта на уровне 1 терминала 2.",
      "source": "taoyuan-airport.com",
      "url": "https://www.taoyuan-airport.com/transportation?lang=en"
    },
    {
      "id": "storage",
      "title": "Камера хранения",
      "hint": "Pelican в общедоступной зоне",
      "text": "Taiwan Pelican Express предоставляет хранение и доставку багажа в общедоступных зонах терминалов. Круглосуточные пункты есть на уровне 1 терминалов 1 и 2. В терминале 2 пункт на уровне 3 работает с 06:00 до 23:30; ещё один пункт на уровне 1 терминала 1 — с 09:00 до 17:00.",
      "source": "taoyuan-airport.com",
      "url": "https://www.taoyuan-airport.com/services_facilities/B68BD5D9-EE87-EC11-80F5-000C29A1B907"
    },
    {
      "id": "wifi",
      "title": "Wi‑Fi",
      "hint": "Сеть Airport Free WiFi",
      "text": "В общедоступных зонах терминалов аэропорт предоставляет бесплатный Wi‑Fi. Для подключения нужно выбрать сеть Airport Free WiFi в настройках устройства и открыть браузер.",
      "source": "taoyuan-airport.com",
      "url": "https://www.taoyuan-airport.com/wifi?lang=en"
    }
  ]
}
```

## SAW
Ограниченная справочная1блок,полныйDOMSAW-sleep-services.txt. СтарыйWiFiWispotterотклонёнкакнеактуальныйвидинформации; MetroIstanbulприповторнойобычнойнавигацииPage.navigateTimeout,визуальнооставалсяпредыдущийTPE(URLподтверждёнполнымAX),поэтомуметронеобъявлялинедоступнымпофиктивномупустомуDOM. ISGоператорhotelдоступенсвизуальнымподтверждением. Парковочноепредложение740₺после2днейнепереносилииз-занеясностиусловийпервых2дней;трансферневыдуман.
```json
{
  "iata": "SAW",
  "checked": "2026-10-26",
  "blocks": [
    {
      "id": "sleep",
      "title": "Где поспать",
      "hint": "ISG Airport Hotel",
      "text": "ISG Airport Hotel указан по адресу аэропорта Sabiha Gökçen в районе Pendik. В отеле есть фитнес-центр, 2 сауны и отдельные мужская и женская раздевалки. Гости могут пользоваться компьютером в лобби; доступны услуги прачечной и химчистки, утюг и гладильную доску можно запросить на стойке регистрации.",
      "source": "isgairporthotel.com",
      "url": "https://isgairporthotel.com/en/services/"
    }
  ]
}
```
