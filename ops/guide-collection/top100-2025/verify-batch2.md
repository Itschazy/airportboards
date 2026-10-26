# Партия 2 — независимая сверка официальных снимков

26.10.2026. Codex, подзадача verify_sfo_primary. Вход: fenced JSON HGH/SHA/CKG/KMG в `research-batch2.md`. Метод: офлайн-чтение полных DOM-снимков `/tmp/airports-top100-batch2/`; это не повторный живой обход источников. Сеть/браузер/git не использованы, JSON не правились. Файлы имеют text/url и содержательную основную часть, accessibility diff вместо текста не обнаружены.

## HGH — sleep, подтверждено

URL https://www.ihg.com/holidayinnexpress/hotels/ru/ru/hangzhou/hghap/hoteldetail ; `/tmp/airports-top100-batch2/HGH-sleep.txt`.

- Holiday Inn Express Hangzhou Airport, Dexin Airport City — имена прямо в описании и адресе.
- Рядом со станцией Xingang линии метро7, одна остановка от аэропорта — прямо русский официальный текст. Отель не объявлен внутри терминала, бесплатный трансфер не обещан.
- 132 номера — точное число.
- Бесплатный завтрак и Wi-Fi — две отдельные услуги, бесплатность черновик относит только к завтраку. Не выведены цена Wi-Fi или тариф метро.
- Заезд2:00PM =14:00, выезд12:00PM =12:00. Не перепутаны полдень и полночь. В поле минимального возраста значение пустое; возраст черновик не выдумывает.
- Hint «у станции Xingang» совпадает.

Рекламные оценки и расстояние2,5км не выбраны. Машинный перевод страницы местами неровный, но выбранные факты внятны и не противоречат адресной карточке. Обязательных правок нет.

## SHA — storage, факты подтверждены, активный терминал требует доказательства

URL https://www.shanghaiairport.com/ensh/hqjc/index.html ; `/tmp/airports-top100-batch2/SHA-storage.txt`.

Совпадает:

- Paid baggage storage/retrieval up to one month; hint до1месяца не означает30дней ровно.
- Opposite Gate6 in Departures Hall. Черновик сохраняет подпись Gate6 и не угадывает Door/boarding gate. Страна/наличие вылета сами по себе не доказывают тип этого Gate.
-07:00–20:30 с оговоркой subject to actual operation on site. Оговорка сохранена.
- Complimentary72-hour storage for one piece for passengers holding a passport eligible for240-hour visa-free transit. Черновик сохраняет **оба разных периода**, одно место и паспортное право на льготу. Не240часов бесплатного хранения и не72часа безвизового транзита.
- Valid ID для storage и retrieval; X-ray stored items. Документ нужен для обоих действий, не только при сдаче.

**Пробел доказательства Terminal1:** снимок содержит заголовки Terminal1 и Terminal2 одновременно, но не указывает, какой активен. По тексту можно подтвердить содержание открытой карточки, но нельзя независимо установить, что оно относится именно к T1. Журнал коллектора сообщает выбор T1, однако это свидетельство исполнителя, а не сохранённый первичный признак состояния UI. Нужен PNG с активным T1 либо сохранённые DOM-классы/aria-selected. До этого фраза «в терминале1» остаётся неподтверждённой независимой сверкой, а не признанной ошибочной. Не удалять её по догадке и не считать доказанной автоматически.

## SHA — kids, факты подтверждены, тот же пробел Terminal1

URL тот же; `/tmp/airports-top100-batch2/SHA-kids.txt`.

- Departures Floor, International/Hong Kong/Macao/Taiwan waiting area near T10 **Boarding Gate**.
- Domestic waiting area near T26 **Boarding Gate**.
- Open according to departure flight operation time, без самостоятельных фиксированных часов.
- Черновик правильно не смешивает международную и внутреннюю точки. Gate здесь прямо Boarding Gate, значит «выход на посадку» подтверждён. Для T26 можно повторить «на посадку» ради однозначности, это необязательное языковое уточнение.

Принадлежность к T1 и hint «терминал1» нуждаются в том же свидетельстве выбранной вкладки: plain DOM выводит обе кнопки, состояние не сохраняет. Остальные факты совпадают.

## CKG — lounges, подтверждено с осторожной формулировкой массажа

URL https://www.csair.com/cn/tourguide/airport_service/priority_pass/domestic/18h9nnvi3sef0.shtml ; `/tmp/airports-top100-batch2/CKG-lounges.txt`.

- Оператор China Southern: официальный домен и шапка 中国南方航空, страница 重庆江北国际机场.
- 江北机场T3A航站楼内G指廊入口处 — вход в конкорс/залG внутри T3A. Это вход в конкорс, не отдельный номер входной двери или GateG.
- 会员休息区、两舱区 — членская зона и зона 两舱. В авиационном контексте 两舱 означает первый и бизнес-классы, в черновике осторожно «два премиальных класса». Это описание разделения, **не правило допуска**. Источник не называет нужный статус, авиабилет, членство или банковскую карту; черновик не объявляет их достаточными для входа.
- Всего187мест: source также раскладывает60+127=187; черновик не выдаёт187за местимость каждой зоны.
- 行李存放处, 商务区, 母婴室, 淋浴间 — хранение, деловая зона, комната матери/ребёнка, душевые.
- 按摩休息区 — буквально массажная зона отдыха. Это подтверждает характер зоны, но не персональную услугу массажиста, не бесплатность, не длительность и даже не конкретное наличие массажных кресел.

**Рекомендованная точность:** «зона отдыха с массажем» → «массажная зона отдыха». Исходная русская фраза может читаться как обещание услуги массажа; буквальное наименование зоны не усиливает источник. **Не** менять на «массажные кресла», если их нет в дополнительном сохранённом свидетельстве: это тоже догадка.

HintT3Aподтверждён. Часы, цены и условия доступа отсутствуют и не придуманы.

## CKG — sleep, подтверждено

URL https://www.ihg.com/holidayinnexpress/hotels/ru/ru/chongqing/ckgap/hoteldetail ; `/tmp/airports-top100-batch2/CKG-sleep.txt`.

- Имя Holiday Inn Express Chongqing Airport Zone точно совпадает.
- Footer address: NO.199 Lianggang Avenue Yubei District. Черновик берёт адрес именно отсюда, а не испорченное «№199400Ave» из машинного абзаца.
- Complimentary breakfast, Wi-Fi, parking, restaurant — отдельные подтверждённые услуги. Бесплатность не распространена на парковку/ресторан/Wi-Fi без source.
- Minimum independent check-in age18; checkout12:00PM = полдень. Неясное «Регистрация в12 отеле::00 утра» не использовано для времени заезда — правильно.
- Hint не придумывает трансфер или близость пешком.

Обязательных правок нет. Искажённые топонимы/«Центральная свинина» не перешли в текст.

## KMG — transport, подтверждено

URL https://km.ynairport.com/zhjt/5749.jhtml ; `/tmp/airports-top100-batch2/KMG-transport.txt`.

- 昆明地铁6号线起于塘子巷，机场中心站为终点站 — линия6 Tangzixiang→Airport Center. Латинские формы передают китайские имена, не выданы за отдельно подтверждённые английские надписи.
- Пересадки с линии6 на2,3,4; черновик не привязывает все пересадки именно к Airport Center.
- 机场中心站位于机场航站楼B2层 — Airport Center на уровне B2 терминала.
- Hint совпадает, стоимость/часы не выдуманы.

Обязательных правок нет.

## KMG — taxi, подтверждено

URL https://km.ynairport.com/zhjt/5752.jhtml ; `/tmp/airports-top100-batch2/KMG-taxi.txt`.

- B1层3号门正对面 — напротив двери3 на уровне B1. 门 без 登机口, в точке посадки наземного такси: «дверь» уместно, посадочный gate не придуман.
- 若目的地为昆明市行政区域内，均打表计费，无返空费 — **если пункт назначения внутри административной территории Куньмина**, по счётчику без платы за обратный пустой пробег. Черновик сохраняет географическое условие, не заявляет такую льготу для любого дальнего направления.
- Hint повторяет точную дверь/уровень.

Обещания «safe/reliable/easy» не перенесены как гарантия. Обязательных правок нет. Старая парковочная тарифная страница на основании акта2014 не вошла вJSON и не используется для подтверждения актуальной цены.

## Промежуточный итог

На этом этапе:4аэропорта,7блоков. Все фактические ядра подтверждены; **две привязки SHA к T1 ещё требуют сохранённого признака активного терминала**. До его получения нельзя без оговорок объявить все7блоков полностью независимо проверенными. У CKG рекомендуется буквальное обозначение массажной зоны без обещания процедуры. Это не допуск к публикации/переводу всего набора и не техническая проверка. Новые аэропорты можно добавить ниже после получения снимков.


## Добавление: XIY / SAW — фактических блоков нет

В `research-batch2.md` появились XIY и SAW с пустыми blocks. Это не покрытие справочной и не проверенный пользовательский текст.

- XIY: коллектор сообщает timeout на https://www.xxia.com/ и неудачный поиск другого первичного источника. Соответствующего полного содержательного снимка пока нет; проверяющий не воспроизводил живую ошибку. Никакой факт для публикации не подтверждается и не выдумывается.
- SAW: `/tmp/airports-top100-batch2/SAW-wifi.txt` для https://www.sabihagokcen.aero/isgguidemenu.aspx?lang=2&id=1824 содержит лишь короткое меню (Connect ti WiFi, Visa Process и т. п.). Он не подтверждает пользовательские условия Wi-Fi и не даёт оснований опубликовать тариф/бесплатность/число киосков. Коллектор исключил прежнее описание как устаревшее; независимо по этому короткому снимку его точные старые условия проверить нельзя. Пустой JSON не создаёт неподтверждённых утверждений.

Актуальный промежуточный охват: 6 аэропортов в партии, 7 непустых блоков; XIY и SAW не готовы. Прежнее ожидание первичного подтверждения активного T1 у SHA сохраняется.


## IAH — ещё 4 блока, подтверждены

В `research-batch2.md` добавлен IAH. Полные text/url-снимки `/tmp/airports-top100-batch2/IAH-transport.txt` и `IAH-services.txt` прочитаны целиком.

### transport

URL https://www.fly2houston.com/iah/ground-transportation/metro-downtown-direct/ .

- METRO500 IAH Downtown Direct: nonstop между IAH и George R. Brown Convention Center, не общий маршрут ко всем районам центра.
- TerminalE, Level2, exit **doorE201**, near Ride App Pick-Up. «Дверь» подтверждена прямо door, не boarding gate; уровень2 не превращён в европейский второй этаж.
- $4.50 one way, seven days,05:30–20:00,every30min. Все числа, направление тарифа «в одну сторону» и часы совпадают.
- Luggage accommodating, accessible, free Wi-Fi. Черновик передаёт доступность маломобильным, не только наличие автобуса. Бесплатность относится Wi-Fi, не проезду.
- Hint4,50USD совпадает. Локальная американская валюта не пересчитывается в рубли.

Обязательных правок нет. Упоминание продолжающего работать102изTerminalC не подмешано в описание500.

### sleep

URL https://www.fly2houston.com/iah/visitor-information/services/ .

- Minute Suites, TerminalC, GateC14, post-security.
- Private retreat to nap, relax, shower, work. Черновик не обещает полноценный гостиничный номер, кровать определённого размера, бесплатный душ, тариф или круглосуточность.
- Hint post-security подтверждён.

Обязательных правок нет. Условия AmEx у Centurion Lounge из соседнего подраздела не приписаны Minute Suites.

### kids

Тот же URL, раздел Lactation Rooms/Mother's Room.

- Mamava для breastfeeding/pumping, nurseries и baby changing tables прямо перечислены.
- Mother's Rooms: TerminalA A1/A17, TerminalC C5.
- Mamava: TerminalB B21, TerminalC C34, TerminalE E12.
- Nursery TerminalD nearD15. Числа и типы объектов не переставлены; nursery в женском туалете уC4 не добавлена ошибочно как Mother’s RoomC5.
- Hint соответствует двум выбранным типам.

Необязательное языковое уточнение: nursery лучше назвать «комната для ухода за малышами», чем общее «детская комната», чтобы не создавать ожидание игровой зоны. Текущий текст не обещает игры, няни или присмотра и фактически тип услуги не переворачивает. Сторона досмотра не добавлена без прямой подписи.

### Wi-Fi

Тот же URL, раздел Wi-Fi.

- Each terminal including parking garages, freeWi-Fi.
- SSID точно **Free Airport WIFI**, не другой регистр Wi-Fi из заголовка раздела.
- Автоматически открывается splash page; согласиться с условиями и нажать submit. Порядок и два действия сохранены; не выдуманы email/SMS/паспорт.
- Help desk1-844-831-0999 точно совпадает.

Обязательных правок нет. Терминальный ремонт из временного баннера не перенесён в постоянную справочную.

Актуальный промежуточный охват:7 аэропортов,11 непустых блоков; XIY/SAW без блоков, SHA T1 по-прежнему ждёт сохранённого состояния активной вкладки.


## TPE — не готов, 0 блоков

В `research-batch2.md` добавлен пустой TPE. Снимки `TPE-wifi.txt`, `TPE-transport.txt`, `TPE-hotel.txt` прочитаны: каждый имеет соответствующий официальный URL и text=EMPTY. Это не доказывает отсутствие услуг, а только отсутствие доступного содержимого в посещении коллектора. Факты из сниппетов или прежнее имя Novotel не подставлены. Независимого допуска справочной TPE нет.

## YYZ — 4 блока, подтверждены

### transport

URL https://www.torontopearson.com/en/transportation-and-parking/up-express ; `/tmp/airports-top100-batch2/YYZ-transport.txt`.

-28 минут Pearson→Union Station, каждые15мин семь дней в неделю. Не старое25мин и не круглосуточность.
- Adult one-way$12.35, PRESTO$9.25. Символ$ сохранён как в источнике, не заменён USD; суммы не цены группы/туда-обратно.
- Children under12 free: «до12лет» верно, не «12включительно».
- Terminal1 рядом с TerminalLink; изT3 бесплатныйTerminalLinkдоT1, затем Train to City. Не прямая платформа UP Express вT3.
- FreeWi-Fi на поездах/станции, розетки и luggage racks на борту. Все свойства совпадают.
- Hint28мин подтверждён. Спорная строка last train to Union в разделе Union→Pearson не включена.

Правок нет.

### terminals

URL https://www.torontopearson.com/en/transportation-and-parking/terminal-link-train ; `/tmp/airports-top100-batch2/YYZ-terminals.txt`.

- Бесплатный TerminalLink,24часа; T1,T3,Viscount.
- Доступ Sheraton Gateway Hotel, ALT Hotel, Value Park Garage/Lot — прямо перечислен.
- Travel time between stations2–8minutes: именно основной текст называет временем поездки, так же черновик. Не подменять его собственной догадкой по отдельной таблице maximumwaitingtime.
- Non-folding/non-collapsible mobility aid: черновик сохраняет доступность с нескладным средством мобильности, не требует обязательного складывания.
- Hint free подтверждён.

Правок нет.

### kids

URL https://www.torontopearson.com/en/while-you-are-here/family-travel ; `/tmp/airports-top100-batch2/YYZ-kids.txt`.

- Nursing rooms/pods после досмотра, не общедоступный доступ всем встречающим.
- Mamava: folding table,2benches,mirror,dualgrab bars,outletwithUSB. Число2 относится кскамьям, не числукапсул.
- Код из Mamava app **либо** customer care. Черновик не требует одновременно приложения и звонка.
- T1D22/E80–81/F59,T3C30–31/B22/A12–13 — все номера совпадают. «У» не обещает отдельный вход прямо через gate.
- Play areaT1Departure Lounge nearD24 подтверждена.
- Противоречивые B1A/B1у T3nursingroom исключены, MamavaB22неподмененаими.

Правок нет.

### Wi-Fi

URL https://www.torontopearson.com/en/while-you-are-here/free-wifi ; `/tmp/airports-top100-batch2/YYZ-wifi.txt`.

- FreeWi-Fi courtesyCIBCandPearson,SSIDточноToronto Pearson Public Wi-Fi.
- Выбратьсеть→landingpage→acceptterms→Connect. Основнойпорядоксохранён,случайручногооткрытияbrowserневведёнкакограничениедлявсех.
- Поддержка1-866-207-1690либоPassengerInformationBoothсовпадает.
- Не придуманы лимит, скорость, телефоннаяверификацияилирегистрация.

Правок нет. Актуальный охват партии:9аэропортов,15непустыхблоков. SHA T1 ждёт активного состояния; XIY/SAW/TPEне готовы.


## GRU — 3 блока, подтверждены с оговоркой об имени станции

### transport

URL https://www.gru.com.br/en/passenger/to-from-gru-airport/train/ ; `/tmp/airports-top100-batch2/GRU-transport.txt`.

- Станция аэропорта относится к линии13-Jade CPTM, линия связывает аэропорт с Engenheiro Goulart; там доступ к12-Safira. Черновик не обещает прямой поезд13-Jadeбезпересадки на любую станцию12.
- Airport Access около Terminal1 parking lot. Это вход со стороны аэропорта, а не все три входа станции; условие сохранено.
- Hint13-Jade совпадает.
- Источник по-английски называет станцию **Airport-Guarulhos**, черновик — **Aeroporto-Guarulhos**. Это португальская форма того же прозрачного названия, смысл маршрута не меняет; однако именно такое написание station name данным английским снимком прямо не удостоверяется. Для предельно строгого сохранения опубликованного имени можно оставить Airport-Guarulhos как в выбранной странице либо подтвердить португальскую подпись. Это вопрос официального написания, не установленная ошибка географического объекта.

Часы и бесплатный shuttle из source не добавлены без актуальной схемы. Правок чисел/условий нет.

### storage

URL https://www.gru.com.br/en/passenger/discover-gru/services-and-facilities/luggage-storage ; `/tmp/airports-top100-batch2/GRU-storage.txt`.

- Malex, terminals2/3, Sidewalk у Arrival. Русское «снаружи зоны прилёта, на тротуаре» соответствует наружной curbside-точке и не обещает доступ из транзитной зоны.
- T2ArrivalWest24/7;T2ArrivalEast07:00–19:00;T3Arrival07:00–19:00. Три точки и два режима не перепутаны.
- Часы servicechannels Monday–Friday09:00–18:00 не присвоены самой камере хранения.
- Hint2/3подтверждён, тариф/бесплатность не придуманы.

Правок нет.

### Wi-Fi

URL https://www.gru.com.br/en/passenger/discover-gru/services-and-facilities/wifi ; `/tmp/airports-top100-batch2/GRU-wifi.txt`, полный AX, узлы54–63.

- FreeWi-Fi через BOINGO подтверждён обоими противоречивыми абзацами.
- В первом сказано firstfourhours, во втором freeinternetforonehour. Черновик не публикует ни один спорный лимит и не заявляет unlimited, это правильное исключение противоречия.
- SSID точно **.GRU WIFI** с начальной точкой; clickConnect→followsteps.
- BOINGOcustomer support24/7,0800-095-9026. Круглосуточность относится поддержке, не выдуманному тарифному периоду.
- Hint сохраняет начальную точку SSID.

Правок нет. Актуально10аэропортов,18непустыхблоков; помимо ожидания SHA T1 отдельная оговорка только о точном написании station nameGRU, не о маршруте.


## EWR — 4 блока, подтверждены

Прочитаны `EWR-terminals.txt`, `EWR-taxi.txt`, `EWR-services.txt`, полные text/url-снимки официального newarkairport.com.

### transport

URL https://www.newarkairport.com/transportation/airtrain ; `EWR-terminals.txt`.

- AirTrain связывает терминальные станции с Newark Liberty International Airport Train Station, где NJTransit/Amtrak. Прямое примыкание к зданию TerminalA в черновике не обещано; отдельный terminals-блок прямо уточняет отсутствие прямого подхода.
- **Если NJTransit/Amtrak ticket ещё нет**, charged when entering/exiting trainstation; one-way$8.75. Условие наличия билета сохранено, цена не распространена на бесплатные межтерминальные поездки.
- PATH separatefare — отдельная оплата сохранена, не включена в8,75USD.
- Hint связывает AirTrain с NJTransit/Amtrak, не обещает прямой поезд AirTrain в Manhattan.

Правок нет. Нельзя исправлять8,75по памяти или объявлять source-условие о билетах безусловной бесплатностью всей поездки NJTransit.

### taxi

URL https://www.newarkairport.com/transportation/taxi-service ; `EWR-taxi.txt`.

- Allterminals,uniformeddispatcher,nextavailablecab,noreservationneeded. Обязательное бронирование не добавлено.
- TerminalA Level1 Door5; TerminalB Level2 Door8 **и** Level1 Door2; TerminalC Level1 Door6. Все четыре точки совпадают; source прямо Door, не boardinggate.
- Cabcapacity4, minivan5. «До» правильно ограничивает максимум, не минимальное число пассажиров.
- Onefareallpassengersgoingtosameplace. Условие общего пункта назначения сохранено, не произвольные несколько адресов.
- $1eachbag includingcarry-ons. Черновик сохраняет **каждое место** и **ручную кладь**, не только регистрируемый чемодан и не1USDза весь багаж группы.
- Hintофициальныестоянкиподтверждён source.

Правок нет. Не добавлены расчётные общие цены по Manhattan, исключающие tolls/tips/различные доплаты. Факт о платном багаже не обещает отсутствие остальных сборов.

### terminals

URL https://www.newarkairport.com/transportation/airtrain ; `EWR-terminals.txt`.

- Freebetween terminals,hotelshuttles,rentalcars,parkingareas — все категории в source, не только terminals.
- TerminalA notdirectlyconnected;15mincoveredpathway **OR** 5minshuttleride. Время поездки5мин прямо дано, не выведено из отдельной частотыarrival5мин; альтернативность двух способов сохранена.
-23:00–05:00 **ET**,B/Cevery15minutes; shuttleforpassengerswhomayrequireextratransfertoA. Временной пояс сохранён, не круглосуточный интервал и не только восточное стандартное времяESTвместо общегоET.
- Constructionmaytemporarydisrupt,shuttlebusesavailablewheneverunavailable. Возможность/временность не превращены в постоянное закрытиеAirTrain.
- HintоTerminalAсоответствует выбранному ограничению.

Правок нет.

### Wi-Fi

URL https://www.newarkairport.com/explore-ewr/services ; `EWR-services.txt`.

- FreeairportWiFi,SSID **_Free EWR WiFi** с ведущим подчёркиванием и точным регистром.
- Support+1(800)880-4117,24hours7days. Круглосуточность относится поддержке; тариф/период регистрации не додуман.
- Hint сохраняет подчёркивание.

Правок нет. Актуально11аэропортов,22непустыхблока; прежние ожиданияSHAактивногоT1иоговоркаGRUимени пока отдельно сохраняются.


## BOG — 4 блока, подтверждены

Полные DOM `BOG-transport.txt`, `BOG-parking.txt`, `BOG-wifi.txt` прочитаны; transport содержит дополнительное состояние раскрытого FAQ, не потерянное при сохранении.

### transport

URL https://eldorado.aero/en/transporte/como-llegar-al-aeropuerto .

FAQ прямо предписывает Portal El Dorado → feeder bus16-14Airport **или** K86, оба directly to terminals. Черновик точно сохраняет пункт пересадки, два маршрута и OR. «По информации аэропорта» не выдумывает иной источник. Не добавлены тариф, часы и частота. Hint соответствует Portal El Dorado.

### terminals

Тот же URL. Free service T1↔T2, каждый день04:00–00:00, ramp for reduced mobility. Черновик сохраняет полночь, не12:00дня, и физический пандус, не обещание персонального сопровождения. Бесплатность подтверждена. Hint совпадает. Правок нет.

### parking

URL https://eldorado.aero/en/servicios/parqueaderos/terminal-1 .

- Short Stay Parking—Center, центральная частьT1, доступ к domestic/international areas.
- Long Stay Parking—North для нескольких дней, nearGate1T1, somecoveredareas. Не вся парковка крытая; черновик правильно говорит часть мест.
- У обеих парковок vehicles/bicycles/PRMspaces. Черновик не распространяет их свойства на неподтверждённую точку другого терминала.
- Gate1сохранено исходной подписью, тип двери/boardinggate не угадан.
- Hintshort/longT1подтверждён. Цены и динамическая занятость не выдуманы.

Правок нет.

### Wi-Fi

URL https://eldorado.aero/en/servicios/internet-wifi .

- Freeinternetallpassengersandvisitors,SSID **Airport_El_Dorado**.
- Source-порядок: network→detailsaccessportal→browser. Черновик сохраняет его, не переставляя по собственному представлению о работе портала.
- Reconnectasmanytimesneededatnocost. Это бесплатные переподключения, не обещание непрерывного бесплатного соединения; черновик различает это и Premium.
- Paid Premium for continuous connection on1device. ЦеныCOPи1Dayнеперенесены; не требуется трактовать календарныйденькак24часа.
- Hintfreeсоответствует базовому режиму, не Premium.

Правок нет.

## Сводка всей партии 2 на текущий момент

| Аэропорт | Блоков | Статус по сохранённым первичным снимкам |
|---|---:|---|
| HGH |1|Подтверждён.|
| SHA |2|Все факты карточек совпадают, но привязка кTerminal1 ещё требует доказательства активной вкладки.|
| CKG |2|Подтверждены; буквальная «массажная зона отдыха» есть в текущем RUdraft, не услуга массажиста.|
| KMG |2|Подтверждены.|
| XIY |0|Не готов, доступного содержательного первичного источника нет.|
| SAW |0|Не готов, сохранённый Wi-Fi снимок не даёт пригодного пользовательского текста.|
| IAH |4|Подтверждены.|
| TPE |0|Не готов, три официальных снимка EMPTY.|
| YYZ |4|Подтверждены; именно sourceunder12и28minutes, не поправки по памяти.|
| GRU |3|Все факты подтверждены; официальное написание станции Airport-Guarulhos вENDOM отличается от RU Aeroporto-Guarulhos, нужно сохранить source или отдельно подтвердитьPTформу.|
| EWR |4|Подтверждены.|
| BOG |4|Подтверждены.|

Итого12аэропортов,26непустыхблоков у9аэропортов. Полный независимый допуск **не объявляется** до подтверждения выбранногоT1SHA. Отдельно устранить формальное расхождение station nameGRU; это не меняет маршрут, но требования проекта к официальным именам строгие. XIY/SAW/TPEнельзя считать покрытыми справочной. JSON/сеть/браузер/gitпроверяющийне менял.


## Повторное подтверждение: SHA и GRU

Проверяющий открыл оба локальных PNG через view_image:

- `/tmp/airports-top100-batch2/SHA-storage-T1.png`: Terminal1 выделен синим, Terminal2серым; одновременно видны Gate6,07:00–20:30,up to1month,240-hour passport entitlement/1piece/72hours. **Привязка SHA storage кT1 теперь подтверждена** исходным состоянием UI.
- `/tmp/airports-top100-batch2/SHA-kids-T1.png`: сама карточка Children's Park и места T10/T26 видны, но подписи Terminal1/Terminal2/активная вкладка в кадр не попали. Имя файла не является доказательством состояния страницы. **Привязка kids кT1 всё ещё требует отдельного первичного признака**, хотя её остальные факты совпадают. Это не установленная ошибка T1 и не причина молча заменить терминал.

Полный `/tmp/airports-top100-batch2/GRU-transport-pt.txt`, URL https://www.gru.com.br/pt/passageiro/como-chegar-sair/trem/ , прочитан: первая фраза «A Estação Aeroporto–Guarulhos faz parte da linha13-Jade…». **Португальское имя Aeroporto–Guarulhos подтверждено**, замечание о написании снимается. Разница дефис/тире — типографика, объект и имя те же. Все прочие выбранные факты EN/PTсовпадают.

## TPE — повторная сверка после полного рендеринга, 3 блока

Ранее EMPTYоказался преждевременным чтением DOM, не недоступностью услуг/защитой. Новые полные text/url-снимки прочитаны заново. Прежний статус «0/не готов» ниже заменяется на3проверенныхблока.

### transport

URL https://www.taoyuan-airport.com/transportation?lang=en ; `TPE-transport.txt`.

A12Terminal1/A13Terminal2,expressandcommutertrains,approximately7.5minintervalswithalternatingarrival. Черновик правильно говорит о чередующихся типах поездов каждые7,5мин, не обещает каждый отдельный тип каждые7,5мин. BusT1B1ArrivalsHall;T2outdoorgalleryEastside1FArrivalsHall. Уровни, терминалы и восточная сторона совпадают. HintMRTуобоихтерминаловподтверждён. Тарифы/часы не добавлены. Правок нет.

### storage

URL https://www.taoyuan-airport.com/services_facilities/B68BD5D9-EE87-EC11-80F5-000C29A1B907 ; `TPE-storage.txt`.

Оператор Taiwan Pelican Express,PackageStorage&DeliveryService. Все точки Non-ControlledArea, то есть общедоступнаязона. T2-1F00–24;T2-3F06:00–23:30;T1-1F09:00–17:00 **и** отдельнаяT1-1F00–24. Черновик сохраняет два отдельных пункта T1наодномуровне сразнымичасами, не объединяет их как внутреннее противоречие. Хранение/доставка подтверждены, бесплатность/тариф не заявлены. Hint общедоступность совпадает. Правок нет.

### Wi-Fi

URL https://www.taoyuan-airport.com/wifi?lang=en ; `TPE-wifi.txt`.

FreeWi-Fi inpublicareasofterminals,SSID **Airport Free WiFi**,выбратьвdevice settings→launchbrowser. Все три условия и порядок сохранены. Freeне распространено на неизвестный hotel/платный premium. Date2024/01/04сама по себе не говорит об отмене услуги; нет явного истекшего срока действия. Текущий просмотр источника допустим, тариф или limitнепридуман. Правок нет.

## SAW — повторная сверка нового hotel-источника, 1 блок

URL https://isgairporthotel.com/en/services/ ; `SAW-sleep-services.txt`.

Имя ISGAirportHotel прямо в тексте, footeraddressSabihaGökçenInternationalAirport,34906Pendikİstanbul. Черновик передаёт адресную привязку, не транзитную зону/доступ без паспорта. Fitnesscenter,2saunas,separateman/womanlockerroom прямо HealthClubраздел. ComputerusageatLobby, laundry/drycleaning,iron/ironingboardrequestfromreception — все выбранные услуги совпадают. Утюг не объявлен постоянно в номере, услуги не объявлены бесплатными. Неясная parking740₺after2daysне перенесена; трансфер не выдуман. Hint совпадает. Правок нет.

## Обновлённая сводка партии 2

12аэропортов,30непустыхблоков у11аэропортов. XIYостаётся0безпригодногоисточника. Все30фактическихядерпрочитаны,29блоковимеютполное первичноеподтверждение. Единственный сохраняющийся пробел — **Terminal1уSHAkids**: активныйT1не виденвпредоставленномPNG. SHAstorageT1иGRUимяполностьюподтвержденыдобавочнымисвидетельствами. До снятияпоследнегопробела «все30целикомпроверены» не заявляется.


## Финальное снятие SHA pending по новому снимку v2

Проверяющий открыл **новый** `/tmp/airports-top100-batch2/SHA-kids-T1-selected-v2.png` через view_image и прочитал соседний `.json`. На PNG теперь одновременно видны Children's Park, **Terminal1 синим / Terminal2 серым**, международная точкаT10 и внутренняяT26. JSON дополнительно фиксирует `<li class="on"><b>Terminal 1</b></li>` и то же содержимое карточки. Это достаточное первичное подтверждение состояния UI; старый неполный кадр больше не используется как доказательство активного терминала.

**SHA kids полностью подтверждён, pending снят.** Текущий `drafts/GRU.json` также проверен: URL transport теперь https://www.gru.com.br/pt/passageiro/como-chegar-sair/trem/ ; ранее прочитанный PTснимок содержит и имя, и13-Jade/12-Safira, и AirportAccessуT1. Все утверждения блока теперь на одном выбранном источнике.

**Актуальный итог партии2:** все30непустыхблоков у11аэропортов независимо сверены с сохранёнными первичными доказательствами;12-йаэропортXIYимеет0блоков и не готов. Пробелов первичных доказательств у этих30блоков не осталось. Это допуск фактического содержания к следующим редакторским/переводным этапам, не технические проверки или публикация.
