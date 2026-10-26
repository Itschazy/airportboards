# Партия 4 — независимая рецензия европейских переводов

26.10.2026. Проверяющий не автор предложений. Источник предложений — `research-batch4-translations.md`; оригиналы — актуальные RU drafts. JSON не изменялись, браузер/сеть не использовались. Журнал дополняется по аэропортам. Только отдельно прочитанные файлы объявляются проверенными.

## ORY — 6 языков, 24 блока

Полностью прочитаны en/de/fr/es/it/tr: все title/hint/text сопоставлены с RU. Смысловых, числовых и именных ошибок не обнаружено.

- Transport: линия 14 и четыре станции без пересадки, 25–35 минут, 14 EUR в одну сторону. Название билета и носители Navigo Easy / приложение сохранены. RER B → Antony → Orlyval, 35–45 минут и 14 EUR не смешаны с первой поездкой.
- Storage: Bagages du Monde, Orly 3 / Level 0 / до досмотра / рядом с прилётом / ежедневно 07–21. Размер и срок определяют тариф, нет неподтверждённой цены или круглосуточности. X-ray, видеонаблюдение, cloakroom, аренда коляски/автокресла сохранены.
- Kids: круглосуточные пеленальные комнаты в туалетах отдельно от бесплатных baby rooms Orly 3/4 Level 1 после досмотра. Сохранены все элементы alcoves/cribs/seats/high chairs/bottle warmers/microwaves; нет новой услуги присмотра или кроватей для взрослых.
- Wi-Fi: точный WIFI-AIRPORT, все терминалы/boarding/baggage reclaim, выбор сети → браузер → страница. USB и C/E/F, бесплатные запираемые ChargeBox круглосуточно сохранены.

### Редакторские предложения ORY

1. **en/kids:** `Changing rooms in toilet facilities` → `Baby-changing rooms in toilet facilities`. Непосредственный контекст changing tables устраняет основную неоднозначность, однако без baby первое выражение обычно означает раздевалки. Уточнение делает назначение сразу понятным.
2. **fr/storage:** `et ouvre tous les jours de 07:00 à 21:00` → `et est ouvert tous les jours de 07:00 à 21:00` (подразумевается service). Явно описывает рабочий интервал, а не момент открытия. Это редакторское уточнение, не расхождение часов.
3. **it/transport:** `si può acquistare a una macchina` → `si può acquistare presso un distributore automatico`. Естественное обозначение автомата продажи билетов, без добавления новой услуги.

Локально разобраны все 6 fenced JSON, 24 блока; id совпадают с RU, hint≤35, кириллицы в переводном содержимом нет. Эти проверки не заменяют общий сторож после импорта. KIX и следующие аэропорты пока не входят в охват этого журнала.

## ORY — контроль уточнения покупки билета и редакторских правок

Повторно прочитаны актуальные transport всех en/de/fr/es/it/tr. Теперь везде два способа покупки: автомат для Navigo Easy **либо** покупка через Île-de-France Mobilités. Обещания перенести купленный в автомате билет в приложение больше нет. Это соответствует первичному source «purchased from ticket machines, using a Navigo Easy pass, or via … app». Цена, направление, станции и времена не изменены.

В текущих файлах подтверждены Baby-changing rooms EN, est ouvert FR и presso un distributore automatico IT. Все три предыдущие редакторские рекомендации закрыты повторным чтением.

## KIX — 6 языков, 24 блока

Полностью независимо прочитаны все en/de/fr/es/it/tr предложения, включая title/hint/text.

- Межтерминальный путь: около 4 км, бесплатный автобус **Aeroplaza—T2**, именно поездка 7–9 минут. Ни один перевод не обещает отправление каждые 7–9 минут или автобус непосредственно от произвольной двери T1.
- Хранение: Level 4 T1, до досмотра, Yamato на севере / JAL ABC на юге. Yamato 06:30–22:30, JAL ABC 06:30–23:00, последняя сдача 22:30. Не смешаны время закрытия и последнего приёма; снятого 1F пункта нигде нет.
- Baby rooms доступны всей семье; women-only ограничение относится только к breastfeeding/expressing area. Подгузники, специальные контейнеры, горячая вода и оговорка «в большинстве» у микроволновок сохранены. Нет нового условия, запрещающего мужчинам всю комнату.
- Wi-Fi: T1 с исключением части международных arrival routes; автобусная и железнодорожная станции, Aeroplaza, T2. Оба SSID точны относительно RU, отсутствие предварительной заявки отдельно от необходимости принять условия. Отсутствие шифрования относится к пути device—access point, не переиначено как доказательство отсутствия HTTPS на всех сайтах.

Смысловых, числовых и именных ошибок не обнаружено. Необязательное уточнение IT kids: `latte in polvere` → `latte artificiale`; так не уточняется физическая форма смеси, которой RU не задаёт. Текущее выражение распространено для приготовления детской смеси, поэтому это рекомендация буквальной точности, не доказанная существенная фактическая ошибка.

Технически все 6 fenced JSON разобраны; 24 блока, совпадение id с RU, hint≤35, кириллицы нет. Общий охват журнала после KIX: **12 файлов / 48 переводных блоков**, ORY и KIX. Только эта выборка рецензирована; остальные аэропорты партии ещё не включены. JSON проверяющий не правил.

## Внесение KIX родителем
ITlatteinpolvere→latteartificialeпринято,безуточненияагрегатнойформысмеси. Все6EUимпортированы в DRAFT после полной рецензии.

## ATH / HAN / PMI — ещё 18 файлов, 48 блоков

Полностью прочитаны все title/hint/text предложений en/de/fr/es/it/tr и сопоставлены с актуальными RU. Это независимое чтение, а не принятие самопроверки автора.

**ATH: 6 блоков.** Sofitel Athens Airport, 2 минуты пешком от аэропорта, indoor pool/fitness/restaurant/bar/Wi-Fi, check-in с 13:00 / checkout до 11:00 сохранены. Бесплатность услуг не придумана. Время начала заезда не превратилось в необходимость приехать ровно в 13:00.

**HAN: 18 блоков.** NIA Shuttle Bus бесплатно, domestic T1—international T2, Wing A / Level 1. Исключённые конфликтующие часы и позиции T2 не вернулись. Бесплатные коляски только после досмотра: T1/Hall E Level 2, T2 Level 2/3; baby care rooms ровно 2, T2 Level 3 после досмотра. Changing tables только в некоторых туалетах. Точный SSID, автоматическая страница и Connect to the Internet сохранены. Продолжающаяся установка оборудования в expanded T2 не потеряна, нет обещания повсеместного покрытия.

Небольшое необязательное уточнение **it/HAN kids**: `nel settore E` можно заменить `nel padiglione E` или сохранить обозначение `Hall E`, чтобы отдельный зал не читался произвольным сектором T1. Смысл обслуживания зала E и этаж не изменены, доказанной существенной ошибки доступа нет. Согласование множественного domestic и единичного international в ES/IT Wi-Fi допустимо эллиптически; при редактуре можно развернуть `dei terminal nazionali e del terminal internazionale` / `de los terminales nacionales y del terminal internacional`, не меняя числа объектов.

**PMI: 24 блока.** A1 Palma centre, A2 S’Arenal, 34 Hospital Son Espases; A1 arrivals Level 0 / departures Level 2. Телефон PRM +34 971 703 529 точен и не выдан за общую службу. Valldemossa Level 4 commercial boarding area passenger-only, Schengen/non-Schengen, 05:00–полночь и максимум 3 часа непосредственно перед scheduled departure. Нет выдуманного тарифа или доступа встречающему. Питание/workspace/printer/flight info сохранены. Wi-Fi Airport Free Wifi Aena: email guest **или** Aena Club, 15 минут бесплатного доступа на подтверждение, затем без временного лимита. Не обещано отсутствие подтверждения почты.

Обязательных смысловых, числовых, именных или грамматических правок в этих 48 блоках не обнаружено. Все 18 JSON разобраны локально; id соответствуют RU, hint≤35, кириллицы нет. Совокупный охват журнала: **30 файлов / 96 переводных блоков** (ORY, KIX, ATH, HAN, PMI). Остальные аэропорты партии ещё не рецензированы здесь.

## CTU / DTW / LGA — 18 файлов, 60 блоков

Полностью прочитаны все en/de/fr/es/it/tr title/hint/text и сопоставлены с актуальными RU.

**CTU: 24 блока.** Line 10 оба терминала, T2 B2 L2/L3/L4; Lines 19/30 station East, L3 B2; Line 19 Tianfu 1&2/North сохранены. Door 6 / 50 м к югу, taxi arrivals pedestrian crossing, supervision12328; shuttle door3 south / door9 north и пешком8–10 минут не превратились в boarding gates или длительность автобуса. Storage opening **за 2 часа до первого вылета своего терминала**, не02:00. North security B / behind check-in P; small locker8/13/18CNY до6/12/24h и затем+2CNY/6h, rounding<6h; ID при сдаче AND проверка, receipt AND sameID при получении; запрет powerbanks/lithium batteries сохранён.

**DTW: 12 блоков.** FAST Michigan261, оба именованных терминала и города, ежедневно/поздний вечер/выходные, peak15–20min, designated stops and Wi-Fi. Westin именно INSIDE McNamara; pool/fitness/restaurants;15:00check-in/12:00checkout. Minimum21 во всех6 относится к check-in, не ко всем гостям/детям в сопровождении.

**LGA: 24 блока.** Q70 бесплатно, B/C, точные interchange names, MTA wheelchair ramps. Taxi queue/dispatcher/no reservation, meter initial3USD **плюс** pickup-only2USD PANYNJ; не итоговый фиксированный тариф. Accessible taxi same fare, call6465999999, не SMSномер. Shuttle free24h, все терминалы, prepaid Economy Lot7/Hangar7South/94thStreet, peak15/offpeak20minutes. Wi-Fi SSID точный, support phone8008804117/24h; круглосуточность поддержки не выдана за длительность сеанса.

Смысловых, числовых и именных ошибок не обнаружено. Одно грамматическое уточнение **it/LGA terminals**: `collega tutti i terminal, fermando anche presso Economy Lot` → `collega tutti i terminal, fermandosi anche presso Economy Lot`. Для остановки самого автобуса нужен возвратный fermarsi; текущая форма выглядит как остановка другого объекта. Можно проще `e si ferma anche presso Economy Lot`. Факты/названия/цена не меняются.

Все18 JSON разобраны, наборыid совпадают сRU, hint≤35, кириллицы нет. Общий охват журнала теперь **48 файлов /156 переводных блоков**. Замечание IT LGA требует контроля после внесения. JSON проверяющий не изменял.

## ZRH / VIE — 12 файлов, 48 блоков

Полностью прочитаны все6 EU предложения для обоих аэропортов и сверены с текущими RU. Смысловых, числовых и именных ошибок нет.

**ZRH.** SBB интервал10мин/поездка15мин различены. Staffed Arrivals2/T2/Level0/information06–22 отдельно от SBB lockers Check-in3/AirportShopping24h. За1место до25kg/90×60×35cm:15/18/22CHF до4/8/24h, предоплата, максимум3месяца; не максимум3дня. FamilyServices PassengerAreaA бесплатно всем авиакомпаниям; тихая комната с babybeds, crawling/food/microwave, olderkids games/tablefootball; nochildcare/adultrequired. ZurichAirportSSID и8 непрерывных часов сfirstlogin, SMS phone+code OR boardingpassANDID, получениеcode устанции/стойки сохранены. Неподтверждённого обновления8часов каждыйчас не добавлено.

**VIE.** S7 25/30мин, Railjet15/30мин, ÖBBticket locations, weatherprotected/barrierfree route. Lounge T1Level2 aftersecurity BEFOREpassport;04:30–22;departureday boardingpass, вход от3.5hvsstay3h;59EUR/4–14:31EUR/0–3:free. Все shower towels/familybathroom сохранились. NH/Moxy AirportCity walkingdistance, NHsoundproof/WiFi; Moxy бесплатность computers+fitness+Wi-Fi отделена отroundclocksnacks. F03freeplay2levels/toddler/tablefootball,C42,D31–36; stroller ifowncheckedin, security→gate, handoveratboarding. Accessible toilets во всех6 — принятый технический термин для адаптированных туалетов; DEbarrierefrei прямо однозначно, не возвращается ошибочное русское «просто доступные».

Редакторские предложения, не ошибки часов: **en/ZRHstorage** `and opens daily06:00–22:00` → `and is open daily from06:00 to22:00`; **en/VIE lounge** `it opens daily04:30–22:00` → `it is open daily from04:30 to22:00`; **fr/VIE lounge** `il ouvre tous les jours de04:30à22:00` → `il est ouvert tous les jours de04:30à22:00`. Пробелы в цитатах здесь сокращены для перечня, в JSON сохранить естественное написание. У DE ZRH `Fütterungsraum` лучше естественное `ruhigen Raum zum Füttern von Babys`; это не новая услуга.

Все12 JSON разобраны, hint≤35, кириллицы нет. Общий охват журнала теперь **60 файлов /204 переводных блока**. AUH/CPH ещё не включены.

## AUH / CPH — последние 12 файлов, 48 блоков

Все en/de/fr/es/it/tr title/hint/text полностью прочитаны и сопоставлены с актуальными RU.

**AUH.** A-series24h, четыре маршрута/места назначения, arrivalsoutside, Hafilatmandatory/buytopupmachines/nocashaboard. Storage **per bag**,35/55/75/105/140AED до3/12/24/48/72h; затем каждый дополнительный день25AED **сверх уже140**, partialperiodfull, круглосуточно, conditionscounter. Не превратилось в total25 или25perperson. Kidsfree strollercheck-in→boarding/arrivalsexit, changing+feeding/private/seating, SensorySpaceGateD43. Wi-Fi exactSSID/unlimited/Connect/landing/fullaccess сохранены.

**CPH.** Nørreport15min,stationT3,day/evening4–6/night15–20;ticketstation/DSB,coins/cardsnotnotes. Terminalbusfree,P1/CarRental,T2/T3,trainmetroT3,P15/P17/P19Kystvejen;07–18:10min,04–07+18–midnight:15min,midnight–04:20min. Seatingallgates/beforeafter, quiettopescalatornear7-ElevenLevel2forCdeparture,mostfoodcourttablesoutlets. Wi-Fi beforeafter/allgatesfree/nopassword; **charging stations**, не loan chargers. Терминологическое уточнение RU про станции сохранено во всех6.

Две языковые правки хранения AUH: **en** `The facility opens around the clock` → `The facility is open around the clock`; **fr** `La consigne ouvre24heures sur24` → `La consigne est ouverte24heures sur24`. Это исправляет неестественное употребление open/ouvrir для постоянного состояния, не меняя подтверждённые часы.

Необязательная ясность FR AUHkids: `Des salles pour changer et nourrir les bébés` → `Des salles pour changer les couches des bébés et les nourrir`; changer un bébé часто и означает сменить подгузник, поэтому это не доказанная ошибка факта, а явное соответствие RU. DE AUHhint `Kinderwagen und Fütterungsräume` тяжёлое; естественнее `Kinderwagen und Babyräume`, сохраняя подробность о кормлении в text (hint остаётся≤35).

Смысловых, числовых и именных ошибок не найдено. Все12 fencedJSON разобраны;idRUсовпадают,hint≤35,кириллицынет. Полная независимая рецензия EU партии4 завершена: **12аэропортов ×6языков =72файла,42исходныхблока ×6 =252переводныхблока**. Все были прочитаны полностью, а не приняты по машинной сверке. Редакторские замечания выше требуют обычного контроля внесения; это не ChatGPT/носитель/живой обход. Проверяющий JSON не правил.
