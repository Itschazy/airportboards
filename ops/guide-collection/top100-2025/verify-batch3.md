# Партия 3 — независимая фактическая сверка

26.10.2026. Codex verify_sfo_primary. Проверка по полным DOM-снимкам `/tmp/airports-top100-batch3/`, сохранённым коллектором через обычный Chrome. Это офлайн-сверка первичных текстов, а не отдельный живой обход. JSON, git, сеть и браузер проверяющий не менял/не использовал. После каждого готового аэропорта журнал дополняется.

## MEX — 3 блока, подтверждены

Вход: текущий `ops/guide-collection/top100-2025/drafts/MEX.json`. Прочитаны полностью `MEX-transport.txt`, `MEX-terminals.txt`, `MEX-storage.txt`; каждый имеет text/url и содержательный официальный текст, не accessibility diff. Дополнительно прочитан `MEX-taxi.txt`, но соответствующего блока в RU нет и факты из него не добавляются.

### transport

URL https://www.aicm.com.mx/pasajeros/servicios/prestadores-de-servicios/transportes/metrobus ; `MEX-transport.txt`.

- Metrobús связывает аэропорт с центром Ciudad de México. Русское Мехико корректно, это не штат Мехико и не только ближайшая станция метро.
- Terminal1 puerta7, Terminal2 puerta2. Это физические двери в наземном автобусном контексте, не boarding gates. Черновик «дверь» верен.
- Оплата tarjeta inteligente Metrobús, продажа/пополнение в автоматах в áreas de ascenso y/o descenso обеих terminales. Черновик не предлагает оплату водителю наличными, не заявляет бесплатный проезд или выдуманный тариф.
- Понедельник–суббота04:30–24:00; воскресенья **и праздники**05:00–24:00. Все группы дней и отличающееся начало сохранены, полночь не превращена в полдень. Отдельная фраза365daysисточника не используется для ложной круглосуточности.
- Hint «из обоих терминалов» подтверждён обеими точками.

Обязательных правок нет.

### terminals

URL https://www.aicm.com.mx/pasajeros/servicios/servicios-aicm/aerotren ; `MEX-terminals.txt`.

- Aerotrén междуT1иT2, ежедневно05:00–23:00, gratuito. Не круглосуточно и не платный городской поезд.
- **Необходимо предъявить посадочный талон**: pase de abordar прямо обязателен. Черновик не обещает проезд всем встречающим или только по паспорту.
- **Собаки только в клетках И в пустых вагонах**: source «solo en jaulas y en vagones vacíos». ANDсохранено, не ORи не только одно условие. Разрешение не расширено на любых животных без клеток.
- Prohíbe consumo alimentos,bebidas,fumar: запреты еды,напитков,курения сохранены.
- Hint free05–23совпадает.

Источник дополнительно запрещает viajar en estado inconveniente, но черновик не заявляет исчерпывающий полный перечень правил и не разрешает это действие. Пропуск отдельного невыбранного запрета не искажает опубликованные три запрета. Точки расположения станций под картинками не описаны и по памяти не добавлены. Обязательных правок нет.

### storage

URL https://www.aicm.com.mx/pasajeros/servicios/prestadores-de-servicios/locker ; `MEX-storage.txt`.

- MEXICANA DE LOCKERS,T1Planta baja,LocalE-41,Horario24:00HRS. Наземный уровень — корректно, не «первый этаж» со сдвинутой европейской нумерацией и не придуманное обозначение0.
- VIAJESKOKAI,T2Planta baja,два отдельных Local **ALL45** и **ALL46**. БуквыALLне замененыA11,ALL-45илиAL45; номера совпадают.
- ОбаT2пункта Lunesadomingo24hrs, значит ежедневно круглосуточно. HintкруглосуточноT1/T2подтверждён.
- Не добавлены цена, бесплатность, размерные ограничения или размещение после досмотра. Два разных оператора не смешаны.

Обязательных правок нет.

### Итог MEX

Все3блока имеют содержательное первичное подтверждение без пробелов. Числа, названия, Gate/Door,AND/OR,дни/праздники и условие boarding pass сохранены. Это допуск фактического содержания к переводу/рецензии, не сборка или публикация.


## BLR — 4 блока, подтверждены

Вход: fenced JSON BLRв`research-batch3.md`. Полностью прочитаны `BLR-transport.txt`, `BLR-taxi.txt`, `BLR-parking.txt`, `BLR-wifi.txt` и неиспользованный `BLR-kids.txt`. Все содержательные снимки полные, Wi-Fi включает два состояния инструкции для разных SIMусловий.

### transport

URL https://www.bengaluruairport.com/travellers/transport-parking/airport-VayuVajra ; `BLR-transport.txt`.

BMTCVayuVajraACbusesмеждуаэропортомигородом,кондиционер подтверждён. Cash **и** UPIuponboardingсовпадают, не требуются оба способа одновременно. Helpdesk+917760991250/+917760991269точные, это справочнаяBMTC, не линия экстреннойпомощи/такси. Тариф/конкретныемаршруты/круглосуточность не добавлены. Hintсовпадает. Правокфактовнет.

### taxi

URL https://www.bengaluruairport.com/travellers/transport-parking/airport-taxi ; `BLR-taxi.txt`.

- ACtaxis иNonACtaxis; NonAC **KSTDC ONLY**, не всеоператоры.
- WomenDrivenTaxi **KSTDC ONLY, AC Sedan**: женщины-водители,седаныскондиционером. Черновик не заявляет, чтоехатьмогуттолькоженщины.
- ВабзацеKSTDC «All the taxis»оснащеныGPS/GPRS/printingmachines,quicktransparentbilling. ЧерновикограничиваетоснащениеKSTDC,необобщаетнакаждуюмашинувсехоператоров.

Фактических ошибок нет. Hint37символов допустим: русский BRIEF требует2–6слов, лимит35символов относится к переводам. Первоначальное замечание о русском лимите снято после уточнения области правила основным исполнителем.

### parking

URL https://www.bengaluruairport.com/travellers/transport-parking/parking ; `BLR-parking.txt`.

- P3T1carparking00–15minFree,P4T1также15min,P2T2carparking00–10minFree. Черновикнепутает3/4с2,необъявляетпервые15минвезде.
- T1EVslowchargingchargeable,T2EVfastchargingchargeable. Типы/терминалы/платностьсовпадают; скидка20%неперенесенакакполнаябесплатность.
- T1/T2KerbsideArrivalPick-up4W00–08minFree: обеarrivalpickupзоны8мин. Тарифы150/300безвалютынеугаданыкакINR.

Контекстноеуточнениедлямаксимальнойточности: sourceпро8минназван **4W**,тоестьчетырёхколёсныелегковыеавтомобили. Основнойблок уже проавтомобильнуюпарковку; еслиисходнаяпоследняяфразачитаетсяоторванно,лучше «Взонахпосадкиприбывающихпассажировобоихтерминалов **дляавтомобилей** бесплатноепребываниеограничено8минутами». Нераспространятьавтоматическинаавтобусы/двухколёсныйтранспорт,которымsourceдаётотдельныекатегории.

Обязательнойчисловойправкиненайдено;этоуточнениеохватавыбраннойтаблицы.

### Wi-Fi

URL https://www.bengaluruairport.com/travellers/services/all-facilities/wifi-services ; `BLR-wifi.txt`.

- Local **OR** InternationalRoamingSIM:соединитьсясBLR_FREE_WIFI→SignIn→LocalPhoneNumber→requireddata+OTP. ЧерновиксохраняетусловиеSIM/roamingиодноразовыйкод,непредлагаетOTPпопаспорту.
- NoLocal/InternationalRoamingSIM: WiFiVoucherKioskInternationalArrivals;scanphoto pageofpassport **AND** boardingpass;приотсутствииboardingpass virtualinformationdeskдляWiFiPIN. Черновиксохраняетоба сканируемыхдокументаиправильноеисключение,непредлагаетсамостоятельнопридуманныйвходбез документов.
- Voucher codeвloginfield,неpassportnumberвместокода.
- SSID **BLR_FREE_WIFI** повторёнвдвухконкретныхпошаговыхинструкциях;естьтакжестрока «EnableWiFiandselectBLR_Free_WiFi» сдругимрегистром. Черновиквыбралповторённоеисходноенаписание,непишетнесуществующуюкомбинацию. Регистрвариантапомеченкакособенностьисточника;необъявлятьдругойвариантдоказаннонедействительным.
- БесплатностьневыводитсяизимениFREE,посколькусамвыбранныйтекстRUнеобъявляетцену,лимитилибезлимит.

Фактическихправокнет. Баннерnotificationsиaccessibilitywidgetнеиспользованыкакуссловиявхода. KidsPlayAreaвсохранённомтекстебезсодержательнойкарточки,соответствующийблокне созданправильно.

### Итог BLR

Все4фактическихблокаподтверждены. Русский hint не требует сокращения; можно уточнить автомобильный охват8минkerbside. НаэтомэтапеMEX3+BLR4=7проверенныхблоков. JSONнеправились.


## Повторная сверка уточнений MEX / BLR

Основной исполнитель изменил два участка RU; проверяющий перечитал текущие drafts и повторно сопоставил с уже сохранёнными источниками:

- MEX terminals: «в поезде нельзя **есть, пить и курить**» точно передаёт sourceconsumo de alimentos,bebidas,fumar. Это запрет действия, не запрет проноса еды/бутылки. Прежняя краткая фраза «запрещеныеда,напитки…» была менееоднозначной; текущее уточнениеподтверждено. Клетки **и** пустыевагоны,boardingpass,05–23freeне изменены.
- BLR parking: «**для автомобилей категории4W** …8мин» теперь прямо сохраняет заголовки обеих curbsideтаблиц4W,не обобщая на любые транспортные средства. Остальные15/10мин/slowT1/fastT2платноне изменены. Уточнениеподтверждено.

Русскийhinttaxi37символов остаётсядопустимымпоBRIEF2–6слов;35символов относится кпереводам. Снятоепрежнеезамечаниеневходитвсчётчикошибок.


## BOS — 4 блока, подтверждены

Вход: fencedJSONBOSв`research-batch3.md`. Прочитаны полные `BOS-transport.txt`, `BOS-terminals.txt`, `BOS-services.txt`. Повторяющийся список языков внизу не является пользовательскими условиями услуг и не включён в справочную.

### transport

URL https://www.massport.com/logan-airport/getting-to-logan/public-transportation .

- MBTASilverLine1(SL1)goesdirectlytoallterminals,connectstoSouthStation. Все терминалы и конечная совпадают.
- Free **fromairporttodowntown**,небесплатныйлюбойобратныйрейс. БесплатнаяпересадкаRedLineпрямоподтверждена.
- BlueLineчерезAirportStation;терминалыдоступныбесплатнымшаттлом. Номерневыбран:настран ицесодержатсяразныеномерам аршрутовдляразныхконтекстов,черновикихнеунифицируетнадогадке.
- HintSL1SouthStationсовпадает.

Правок нет.

### terminals

URL https://www.massport.com/logan-airport/getting-to-logan/on-airport-shuttle .

- FreeOnAirportShuttlesмеждутерминалами,RentalCarCenter,WaterTransportationDock,AirportStationBlueLine.
- AllMassportshuttlebuslowfloor,luggageracks,wheelchairlifts. Триподтверждённыхсвойствасохранены,необещанауслугаиндивидуальногосопровождения.
- Generallyevery5–6minдляшаттловterminals/MBTAstation/RentalCarCenter. Черновиксохраняет«обычно»иэтотосновнойохват,неприписываетинтервалкаждойсезоннойлодке.
- Route11всетерминалыA/B/C/E,09:00–22:00daily. НедобавленнесуществующийTerminalD.
- Синиеавтобусыcurbsidelowerlevelкаждоготерминала,signShuttleBus. Черновикнепереноситостановкунаверхнийуровеньвылета.
- Hintfreeподтверждён.

Правок нет. Условиядругихмаршрутов22/33/55/66/88неподставленывRoute11.

### kids

URL https://www.massport.com/logan-airport/at-the-airport/passenger-services .

- Kidportpostsecurity:SatellitebuildingTerminalA GateA18;TerminalB GateB16иretailcorridortowardB30–B36;TerminalCpriorGateC25. Все четыре точки и сторона досмотра совпадают.
- Nursing/nurseryroomsineachterminalподтверждены,необъявлендетскийсадилиуслуганяни.
- Assisted-care/familyrestroomspre **and** postsecurityallterminals,внутриtoilet/sink/foldingchangingtable. Все выбраныесвойствасовпадают.
- HintпоследосмотраотноситсяKidport,неккаждомусемейномутуалету,чейдвойнойдоступвtextотдельноуточнён.

Правок нет.

### Wi-Fi

ТотжеURL. РазделFreeWi-Fi,SSID **BOSWifi**,acceptTermsofService. Бесплатность,имяипорядоксохранены. Маркетинговое«6Gspeeds»неперенесенокакизмереннаяскоростьилистандартмобильнойсвязи. Правокнет.

ИтогBOS:4/4блокаподтвержденыбезнеобходимыхфактическихправок. ПартиясейчасMEX3+BLR4+BOS4=11блоков.


## LGW — 3 блока, подтверждены

Вход: fencedJSONLGWв`research-batch3.md`. Полные `LGW-transport.txt`, `LGW-kids.txt`, `LGW-wifi.txt` прочитаны целиком.

### transport

URL https://www.gatwickairport.com/transport-options/train.html .

- GatwickExpressnonstopLondonVictoria,twiceanhour,30minutes. Это2отправлениявчас,нетребование«ровнокаждые30мин»,не24/7.
- SouthernLondonVictoria,ClaphamJunction,BrightonиSouthEast;ThameslinkLondonBridge,LondonBlackfriars,CityThameslink,Farringdon,StPancrasInternational. Черновик«Blackfriars»—сокращениебезсменыстанции;вовсехостальныхименахобъектынеперепутаны.
- TrainstationSouthTerminal,about5minwalkdepartures/arrivals. СтанцияненазванасразуNorthTerminal,бесплатныйтерминальныйшаттлненуженвпересказеэтоговыбранногопредложения.
- Contactlesspaymentcards **or** OystercardforLondon,excluding60+Oysterphotocard. ИсключениеипоездкиименноЛондонсохранены;нерасширеноналюбуюстанциювАнглии.
- Hint30минподтверждён.

Цены/детскиельготы/летнийвременныйGWRсервисисключены,неявляютсяпробеламиопубликованныхфактов. Правокнет.

### kids

URL https://www.gatwickairport.com/passenger-guides/travelling-with-children.html .

- KidsZonesbothterminals/departurelounge/freeofchargeподтвержденызаголовкомисодержанием.
- AssistedTravelandfamilylanesдляdepartingfamiliesсyoungchildreninpushchairs. Черновиксохраняетмаленькихдетейвколясках,необещаетотдельнуюполосувсембезограничения.
- Speciallyequippedfeeding/changingrooms:checkin,transfer,afterpassportcontrolarrivals. Всевыбранныеобластисовпадают;послепаспортногоконтролянепереведено«доконтроля».
- **Allrestaurantsacrossbothterminals**warmbabybottlesbeforeflight. Черновикнечрезмернообобщил«некоторые»:sourceявноall.
- HintfreeKidsZonesподтверждён,небесплатностьвсехсопутствующихпокупок.

Правокнет. Рекламныесоветы/предварительныйзаказмолоканаBootsнеперенесеныкакусловиявхода.

### Wi-Fi

URL https://www.gatwickairport.com/passenger-guides/wifi-charging.html .

- SSID **Free Gatwick Wi-Fi Vinci Airports** → опция **Free Superfast Wi-Fi** → validemail. Дваразныхназвания(сетьиопция)необъединены,условиепочтынепотеряно.
- Free/unlimited,upto50mbps:«дo50Мбит/с»правильнонеобещаетгарантированнуюскорость50.
- Chargingpointsfreebothterminals,before **and** aftersecurity. Сторонадосмотраинеобходимостьоплатынеискажены.
- Premium100mbps/£5for24hoursилиmyGatwickfreeрегистрацияневыбраны. ЧерновикнеобъявляетплатныйPremiumобязательнымдлябесплатных50mbps.

Правокнет. ИтогLGW3/3подтверждены. Актуальныйохватпартии:MEX3,BLR4,BOS4,LGW3 —14блоков. JSONнеправились.


## SYD — 3 блока, подтверждены

Вход: fenced JSON SYD в `research-batch3.md`. Полные `SYD-terminals.txt`, `SYD-kids.txt`, `SYD-wifi.txt` прочитаны, дополнительно прочитан `SYD-sleep.txt` без добавления нового блока. Куски с вопросами FAQ без ответов не используются как доказательство ответа. Фрагменты URL #tbus-service / #arrivals-children-facilities-children относятся к разделам той же выбранной страницы, не другому источнику.

### terminals

URL https://www.sydneyairport.com.au/parking-and-transport/arriving/international/get-to-your-next-flight ; снимок `SYD-terminals.txt`.

- Прямо сказано not possible to walk between Domestic and International terminals. Черновик ограничивает невозможность пешего пути парой T1 International ↔ T2/T3 Domestic, не заявляет невозможность пешком между самими T2 и T3.
- Terminal Transfer Bus complimentary, every15min05:30–22:30, trip10min. Бесплатность, интервал, длительность поездки и часы не смешаны.
- T1 Arrivals level outside Arrival Hall B; T2/T3 outside each terminal Arrivals level. Остановка не перенесена на departures и не объявлена внутри Hall B.
- Hint free/every15min подтверждён, но не обещает круглосуточность.

Правок нет.

### kids

URL https://www.sydneyairport.com.au/info-sheet/travelling-with-children ; `SYD-kids.txt`.

- Dedicated play areas T1 International; Gate10 interactive/touchscreens, Gate50 McDonalds physicalplayground, Gate53 digitalactivation with Museum of Applied Arts and Science.
- Все номера и разница типов зон сохранены. Не добавлены цена, ограничение возраста или доступ до/после досмотра.
- Официальная страница использует именно написания McDonalds и Museum of Applied Arts and Science; черновик их не исправляет по памяти бренда/нынешнего имени музея.
- Bathrooms, parents' rooms and nursingfacilities near baggagecollectionareas. Черновик сохраняет близость к выдаче багажа, а не помещает все услуги в Gate53.
- HintT1 подтверждён.

Правок нет.

### Wi-Fi

URL https://www.sydneyairport.com.au/info-sheet/T1-facilities-and-services ; `SYD-wifi.txt`.

- Free throughout **T1 International**, не все терминалы SYD по одной странице.
- SSID **Sydney Airport Free WiFi**, answerquestions → readterms → Proceed. Не выдумано обязательное email/SMS или самостоятельный платёж.
- Sponsoredmessage, then directedtowebsite. Черновик честно сохраняет рекламное сообщение, не скрывает его за обещанием мгновенного подключения.
- HintT1 соответствует ограничению текста. Бесплатность не подразумевает гарантию шифрования/скорости.

Правок нет. Aerotel в соседнем раскрытом Hotels указан в T1 Arrivals Hall, но одного этого краткого места недостаточно для нового содержательного блока; проверяющий его не добавлял.

Итог SYD3/3 подтверждены, партия3 сейчас5аэропортов/17блоков. JSONнеправились.


## LGW kids — уточнение термина baby changing

Повторно сопоставлен текущий RU с `LGW-kids.txt`, URL https://www.gatwickairport.com/passenger-guides/travelling-with-children.html . Исходный заголовок **Baby changing facilities**, далее **feeding and changing babies**, и упоминание fold-down changing tables. В этом контексте речь о смене подгузников, не отдельной комнате переодевания одежды.

Текущая RUфраза «комнаты для кормления малышей и смены подгузников» подтверждена и точнее прежнего общего «переодевания». Это уточнение перевода исходного термина, **не новая придуманная услуга**. Расположение check-in/transfer/afterarrivals passportcontrol не изменено. Предыдущее более широкое слово не используется как основание обещать специально одежное переодевание.


## SGN — 3 блока, подтверждены

Вход: текущий `drafts/SGN.json`. Полностью прочитаны `SGN-lounges.txt`, `SGN-sleep.txt`, `SGN-wifi.txt` и вспомогательный `SGN-waf.txt`. Источники — официальный оператор SASCO; обращений к ACV/WAF проверяющий не делал. Снимок https://acv.vn/ документирует блокировку WAF; она не обходилась и не выдаётся за доступный источник.

### lounges

URL https://www.sasco.com.vn/en/products/phong-cho-apricot-2069 ; `SGN-lounges.txt`.

- Apricot Business Lounge, International2DeparturesAirside,24/7. Зона международных вылетовT2после досмотра и круглосуточность совпадают.
- Maximum04consecutivehours — не более4часов подряд, не четыре любых отдельных визита.
- Adult **Over12**,945.000VND; Children **From5–12**,472.500VND. Текущая RUграница «старше12» и «5–12включительно» верна: взрослые строго>12, ребёнок12лет попадает в диапазон5–12. Уточнение «включительно» не новый возрастной факт, а устранение прежней неоднозначной русской фразы. Бесплатность детяммладше5не заявлена, источник её не устанавливает.
- Значения945000/472500VNDсохранены; точка на странице — разделитель тысяч, не0.945VNDили945VND. Валюта у каждой цены есть.
- Buffet,drinks,massagechairs,showers,Wi-Fiпрямо перечислены. Здесь массажные **кресла** подтверждены, в отличие от недоказанного оборудования массажной зоныCKG.
- HintпоследосмотраT2соответствуетairside. Title«Бизнес-залы»согласуетсясBRIEF;брендсохранёнвtext,а неутерянпослеунификациизаголовка.

Первыйэтажизисточника1stFloorснеясноймеждународнойнумерациейвRUне включён,пересчитыватьегопопамятинельзя. Правокнет.

### sleep

URL https://www.sasco.com.vn/en/sleep-zone ; `SGN-sleep.txt`.

- SASCO Sleep Zone,AirsideDepartureHallInternationalTerminalT2,nearGate27,24/7. Gate27вэтомконтексте посадочный,недверькназемномутакси.
- Unitprice180.000VND **/hour/room**,minimum2hours. Черновикпередаётстоимостькомнатывчас,нечеловека;минимум2,немаксимум2. Не выведена самовольная итоговая цена или скидка.
- Singlebed,electricfan,electricaloutlet,coolingtowel,1bottleofmineralwater. Односпальнаянесталадвуспальной,вентиляторнесталкондиционером,бутылкаводынепревратиласьвнеограниченныймини-бар.
- Title«Гдепоспать»поBRIEF,брендSASCOвtextсохранён. HintGate27совпадает.

Правокнет.

### Wi-Fi

URL https://www.sasco.com.vn/en/airport-facilities/wifi-san-bay-646 ; `SGN-wifi.txt`.

- Бесплатно,unlimited,availability24/7.
- Coverage **allpublicareaswithinDomesticandInternationalterminals**,вRUобщедоступныезоны,неприватныезоны/всеблизлежащиеотели.
- SSID **FreeWifi TanSonNhat AirPort** сисходнымрегистромипробелами. Не исправляетсянанормализованноеAirPort/Airportсамовольно.
- Hint общественныезоныиgenericTitleWi-Fiсоответствуют. Лимитскорости,аккаунт,OTPипаспортневыдуманы.

Дата31.03.2025необъявляетистечениесрокауслуги. Рекламноесвойствоstable/highspeedнеперенесенокакгарантияиликонкретнаяскорость. Правокнет.

### Итог SGN

Все3блокаподтверждены,включаявозрастнуюграницу12включительновдетскомдиапазонеипереводAdultOver12какстрогостарше12. GenericRUtitleдопустимыиправильныпоBRIEF. Наэтомэтапепартия3имеет6аэропортов/20блоков(MEX3,BLR4,BOS4,LGW3,SYD3,SGN3),всефактическисверены. JSONнеправились.


## NRT — 4 блока, подтверждены

Вход: fenced JSON NRT в `research-batch3.md`. Прочитаны все четыре полных text/url-снимка `NRT-terminals.txt`, `NRT-storage.txt`, `NRT-kids.txt`, `NRT-wifi.txt`.

### terminals

URL https://www.narita-airport.jp/en/access/shuttlebus/ .

До досмотра free terminal shuttle buses; T2↔T3 возможен пеший access corridor. Кольцо именно T1→T3→T2: около14мин1→3,3мин3→2,10мин2→1. Есть два других маршрута1↔2и2↔3;черновикнеприписываетобратному2→3время3мин из3→2. Никакойчужойairsideboardingpassдопускнедобавлен. Все числа и порядок совпадают. Правок нет.

### storage

URL https://www.narita-airport.jp/en/service/delivery/locker/ .

- Два режима: dailyиhourly. **Daily:отначалаиспользованиядополуночи**,доплата послеполуночи. RU«новыйоплачиваемыйденьначинаетсявполночь»верно,ненепрерывные24часа.
- S/M/Ldaily400/600/800JPY,use/day,max8days. Все цены/размерные категории/предел совпадают.
- Hourly: T2MainBuildingB1FиT3MainBuilding2F. До6часов300/500/600JPY,S/M/L; **каждыеследующие24часа**400/600/800JPY. Порог6нестал24,следующийпериоднесталкалендарнымднём.
- ExtraLargeотдельно1200/12hиmax5daysневключён;черновикговориттолькопроS/M/Lи не заявляетценыextraLargeкакобычнойкамеры.
- ИсточниктакжедаётMULTIECUBEdailyratesснужнойрегистрациейдляreservation/delivery,ноRUнеобещаетэтотсервисбезаккаунта.

Hintзависимостиотместасовпадает. Обязательныхправокнет.

### kids

URL https://www.narita-airport.jp/en/service/child/baby/ .

Nurseriesthroughouteachterminal,breastfeedingbooth,diaperstation,washbasin,hotwater. Мужчины могут пользоваться **всем,кромекабиныкормления**,неполныйзапретвходавкомнатудляотцов. Черновиксохраняетточноеисключение. Небесплатнаяняня,нетусловия«толькодетиопределённоговозраста». Правокнет.

### Wi-Fi

URL https://www.narita-airport.jp/en/service/internet/power-outlet/ .

Бесплатно вallterminals **and** terminalshuttlebuses,SSID **FreeWiFi-NARITA**. Automaticallyconnectionpage,agreeTermsandConditions **and** SecurityCaution. RUсохраняетобаусловия. DoesnotrequireadvanceconfigurationofsecuritysettingssuchasWEP;VPNрекомендованжелающимsecureconnection. Это пересказ рекомендации источника, не новый самодельный совет;VPNнеобязателендляобычногодоступа. Poweroutletsintheterminalfreeofcharge. Всеусловиясовпадают.

ИтогNRT4/4подтверждены. ЗаголовкивисходномfencedJSONнестандартные(«Междутерминалами»,«Автоматическиекамеры…»ит.д.);дляконсистентностиBRIEFможнопривестиихкстандартнымtitle,сохранивконкретикувhint/text. Это редакционныйформат,неошибкафактов.


## RUH — 0 блоков, пока не готов

`RUH-waf.txt`, URL https://www.kkia.sa/en/services/wifi (по журналу посещения): Cloudflareblocked,непрочитаннаясправочнаянеподставляется.

`RUH-lounge-suspended.txt`,официальныйPlazaPremiumоператор:настраницеестьобычное24hoursdaily,ноотдельный **TRAVELADVISORY**явносообщаетsuspendedloungeoperationsatthislocationиз-завременнойситуацииаэропорта. Публиковатьобычный24/7какдействующийбезэтойоговоркибылобыневерно. Черновикне делаетэтогоиостаётсяпустым. Проверяющийнепроводилживуюпроверкустатусааэропортаинезаявляетглобальноезакрытиекакнезависимоустановленныйфакт;это содержаниестраницыоператора,котороедостаточнодлянедопускаегоповседневногорежимазала.

Марриотт/метробезпригодныхсохранённыхснимковнесчитаютсяподтверждёнными. RUHнепокрытсправочной,не«готовбезблоков».


## MEL — 5 блоков, четыре подтверждены полностью, sleep требует условия guests

Вход: fenced JSON MEL в `research-batch3.md`. Прочитаны полные `MEL-transport.txt`, `MEL-services.txt`, `MEL-wifi.txt`; длинные соседние FAQ не заменяли выбранные разделы.

### transport

URL https://www.melbourneairport.com.au/bus-services .

SkyBusMelbourneCityExpressdaily04:00–01:00↔SouthernCross,остановкиoutsideT1/T3/T4. Продажаонлайн/е-kiosksвkerbsidestops, **cash**atProsegur/SmartCarteT2Arrivals. Источникнеподтверждаетналичныевсамомавтобусе,черновикихтамнеобещает. PTVpublicservicesT4GroundTransportHub. Неоднозначныйpeak«7amand7pm»неперенесёнкакинтервал. Ниединый24/7поезд,нибесплатныйSkyBusнепридуман. Правокнет.

### storage

URL https://www.melbourneairport.com.au/facilities-services .

PubliclockersT4carparkgroundlevelunderescalators. BaggageStorageSmartecarteT2Arrivalsgroundfloor,06:00–midnight7days;printing/faxingтамже. Всёсовпадает. SourceиспользуетSmartcarte/Smartecarte/SmartCarteвразныхместах;RUсохраняетнаписаниевыбранныхподразделов,невыдумываеттрёхоператоров. Тариф/бесплатностьне добавлены. Правокнет.

### sleep

ТотжеURL,разделMelbourneAirportHotels.

PARKROYALсоединёнskybridgewalkwaysсdomestic/international;HolidayInn400mоттерминалов. Однакоsource: **guests can request the complimentary shuttle bus**. RU«по запросупредоставляетбесплатныйавтобус…»опускаетусловие **длягостей** и можетчитатьсякакпредложениебесплатноготрансферавсемжелающим.

**Нужнаяправкаусловия:** «…и **гостям** по запросу предоставляет бесплатный автобус до терминала и обратно» (либо «гости могут по запросу воспользоваться…»). Это возвращаетпервичноеподтверждённыйкругпользователей,неизобретаетновоеограничение. Бесплатность/запрос/обанаправлениянеизменны. Не добавлятьплатныйтарифилиусловиеконкретногопакетаparkingксамомушаттлу:parkpackageупомянутвдругомпредложении.

### kids

ТотжеURL,Babychangefacilitiesandparentsrooms.

Всеterminalsbabychange;T2beforesecurityLevel1check-inzonesM/F;T2aftersecurityLevel1afterDutyFree/oppositeGate3/Gate16;T2ArrivalsgroundflooroppositeSmartcarteluggagestorage. Все выбранные точки/зоны/уровнисовпадают. Gateпоследосмотраправильнопосадочный,неназемнаядверь. Подгузникиточноотbabychange,неодежноепереодевание. Не смешанысоседнимиспискамиводныхфонтанов. Правокнет.

### Wi-Fi

URL https://www.melbourneairport.com.au/wi-fi .

Free **Airport Free Wi-Fi**,T2/T3/T4includingpublicareasandaircraftlounges. SourceговоритnotcurrentlyaccessibleT1operatedbyQantas;черновикговоритименнообэтойсетивT1,неотрицаетвозможностьлюбыхиныхсетейQantas. Неencryptedпрямоподтверждено,непридуманбезопасныйVPNилискорость. Правокнет.

ИтогMEL:4/5полностьюподтверждены;1смысловоеуточнениедоступагостейвsleepнужно. Партия3сейчас9аэропортов,29непустыхблоков(RUH0),изних28безоткрытыхзамечанийи1ожидаетуточненияguests. JSONнеправились.


ПримечаниепоNRTtitles: основнойисполнительсознательносохраняетспецифичныеRUзаголовки(lockers/outlets/babyrooms),чтобыпереводитьихточно. Онинеявляютсяошибкойфактов;предыдущеепредложениеунифицироватьgenericBRIEFtitleнеявляетсяобязательнымусловиемдопускаиотклоненокакнеобходимаяправка.


## DUB — 4 блока, подтверждены

Вход: fenced JSON DUB в `research-batch3.md`. Все4полных `DUB-transport/taxi/storage/wifi.txt` прочитаны.

- **transport**, URL https://www.dublinairport.com/to-from-the-airport/by-bus/dublin-buses : DublinExpresszones1/21,центрTempleBar/TrinityCollege/O’ConnellStreet/Heuston;Aircoachzones2/20,Dublin/restofcounty/NorthernIreland;TFI11/13/15. Все операторы/зоны/географиясовпадают. Непридуманыцены/24h/конкретныйномерTFIвневыбранноготекста.
- **taxi**, URL https://www.dublinairport.com/to-from-the-airport/by-taxi : alltimesoutsidebothterminals,dispatchers;meterdependdistance/day/time;righttoreceipt. ОриентирDublinCity€30–45,нефиксированныйтариф. Нетсамовольногоконвертированияилиобещания,чтовлюбоевремяточнаяценаодна.
- **storage**, URL https://www.dublinairport.com/at-the-airport/facilities/luggage-facilities : SmarteCartebagstorage/wrapping/accessoriessales/forwarding;T1Arrivalsleftaftermainentrance,T2DeparturesbyAmericanAirlinescheckin;OfficeHoursMon–Sun05–21. Черновикпрямоназывает**офисныечасы**,неподменяетимиwrapT1до20:45/T2до16илост-property24/7. Trolleysfreeacrossbothterminalsподтверждены.
- **wifi**, URL https://www.dublinairport.com/at-the-airport/facilities/wifi-printing-services :free **Dublin Airport Wi-Fi**,no sign-up/registration,settings→Connectpopup. PrintingSmarteCarteT1Arrivals06–19,€10 **upto20pages**,не€10застраницуине20pagesминимум. Часыprintingнеподменяютstorageofficehours.

Всеhintсоответствуют. Обязательныхправокнет. DUB4/4подтверждены.


## LIS — 4 блока, после удаления спорного T2 подтверждены

Вход: fenced JSON LIS и текущий `drafts/LIS.json`; полные `LIS-transport.txt`, `LIS-terminals.txt`, `LIS-kids.txt`, `LIS-wifi.txt` прочитаны.

### transport

URL https://www.lisbonairport.pt/en/lis/access-parking/getting-to-and-from-the-airport/public-transportation .

AirportMetrostation,directAeroporto–Saldanha,about20minцентр. Naveganteelectroniccard€0.50,popолняется,дляMetroиCarrisbus. Цена относитсясамойкарте,неполнойстоимостипоездки;черновикэторазличает. Самостоятельнонепредлагаетсябесплатныйпроездилитарифпоездки0,50EUR. Правокнет.

### terminals

URL https://www.lisbonairport.pt/en/lis/access-parking/getting-to-and-from-the-airport/terminal-2 .

T2exclusivelydepartures,closed00:30–03:30. FreeT1↔T2shuttle03:30–00:30следующегодня,every12minfromdepartureareaseachterminal,tripabout3min. Все границы/каждые12/дорога3различены,неполденьвместополуночи. Списокairlinesисточникасокращёнбезложногообещанияобслуживаниявсехвылетовстраны. Hintfreeподтверждён. Правокнет.

### kids

URL https://www.lisbonairport.pt/en/lis/services-shopping/essential-services/family-services .

T1babychangingpublicandrestricted,sink/changingtable/worktop. T1breastfeedingpublicFamilyroomиrestrictednearGate15. Всетекущиеутверждениясовпадают.

**Найденоиисправленоосновнымисполнителем:**висточникеT2facilities«onlyNon-Schengenafterpassportcontrol»,нонепосредственныеметкиподтемжеблокомговорятBeforeSecurity—T1eT2иAfterSecurity—T1eT2. Это внутреннеепротиворечие доступаT2. Нельзяразрешитьегопростымвыбором«болееконкретного»;поBRIEFфактнепубликуется. ПоследнеепредложениеRUпроT2удалено **до перевода**,проверяющийперечиталтекущийdraftиподтвердилотсутствие. Остальные2предложенияT1осталисьсодержательнымблоком. Gate44playgroundclosedнеобещанпассажирам,неоднозначныевозраст/весколясокисключены.

### Wi-Fi

URL https://www.lisbonairport.pt/en/lis/services-shopping/essential-services/free-wifi .

Freeandunlimited,SSID **_VINCI Airports WiFi**,выбратьсеть→openbrowser→acceptTerms→Connect. Ведущееподчёркивание/пробелы/регистрсохранены. Нерегистрация/OTP/обязательнаяпочта. Hintбезлимитсовпадает. Правокнет.

ИтогLIS4/4послеснятияспорногоT2предложенияподтверждены. НеобоснованноеправодоступавT2непереноситсяв11языков.


## MSP — 4 блока, одно необходимое уточнение мебели/позиции sleep

Вход: fenced JSON MSP и текущийdraft;все4полных `MSP-transport.txt`, `MSP-taxi.txt`, `MSP-sleep.txt`, `MSP-wifi.txt` прочитаны.

### transport

URL https://www.mspairport.com/directions-and-transportation/ground-transportation/light-rail-transit ; снимокконечногоофициальногоURL https://www.mspairport.com/directions/ground-transportation/light-rail-transit .

Остановкиобоихтерминалов,MallofAmericaоколо12мин,WarehouseDistrictDowntownMinneapolisоколо25мин. **Полныймаршрут**примерно05–00с15–20мин; **междутерминалами**24часа,бесплатно,билетненужен. Черновикнеобобщилвнутриаэропортовуюльготуналюбуюпоездкувгород. Route54TransitCenterLevel1SilverRamp,noCityBuspickupT2. Все точкисовпадают,нестанцияBlueLineподдругойпарковкой. Правокнет.

### taxi

URL https://www.mspairport.com/directions-and-transportation/ground-transportation/taxi-service ; конечныйURLснимка https://www.mspairport.com/directions/ground-transportation/taxi-service .

T1черезTramLevel(LevelT),указателинауровеньвыше;RUговоритоуказателяхсэтогоуровня,неразмещаеттаксипрямонатрэмплатформе. T2GroundTransportCentergroundlevelPurpleRampacrossterminal. Staff06–01daily,outsidethattimeselfservicestillavailable. AverageMinneapolis$39–49/StPaul$31–38,нефиксированнаяцена. Meterinitial$6.50 **includes** flagdrop$2.50+airportaccess$4,не6.50плюсещёдвесуммы. Всеусловиясохранены. Правокнет.

### sleep

URL https://www.mspairport.com/index%2Ephp/airport/service-amenities .

Source: **two quiet seating areas**,secureT1,MezzanineLevel **overlooking** AirportMall,stairs/elevatorsentrancesEorF,uponelevel,reading/rest/meditation/prayer.

Число2/последосмотра/T1/Mezzanine/E-F/одинуровеньвверх/назначениесовпадают. Но«скреслами»вRUдобавляетконкретныйтипмебели,которыйquietseatingareasнеустанавливает:это могутбытьнеименноarmchairs. Нужноубрать«скреслами»илинаписатьобщо«сместамидлясидения».

Также«надAirportMall»лучшеисправитьна«свидомнаAirportMall»—именноoverlooking. Источникнедоказываетстрогоевертикальноерасположениепрямонадплощадью. Это точностьлокационнойфразы,непереноснаинойэтаж.

Рекомендуемо: «Втерминале1последосмотраестьдве тихиезоныотдыханауровнеMezzanineсвидомнаAirportMall». Остальнойтекстсохранить. Это единственнаясодержательнаяправкаMSPнаэтомэтапе.

### Wi-Fi

URL https://www.mspairport.com/airport/service-amenities/wi-fi .

**MSP Airport WiFi**,allpublicareasbothterminals,firstuseacceptterms. Complimentary4hours,thenanotherfree4hours,asmanysessionsasdesired. Черновикнепревратилсессиювбесконечнонепрерывное4hсоединение,сохраняетвозможностьбесплатногоповтора. Номинальнойскорости/OTP/паспорта нет. Правокнет.

ИтогMSP3/4беззамечаний,1sleepнуждаетсявуточнениимебели/overlooking. JSONпроверяющийнеменял.


## MEL — контроль принятого условия guests

Перечитан текущий `drafts/MEL.json`,sleep: теперь «…по запросу предоставляет **своим гостям** бесплатныйавтобус…». Условие совпадаетспервичнымguests can request complimentary shuttle. Замечаниеснято,все5MELблоковподтверждены.

## Промежуточнаясводкапартии3

12аэропортов,41непустойблок у11аэропортов;RUH0не готов. Из41подтверждены40безоткрытыхзамечаний,MSPsleepожидаетуточненияquietseating/overlooking. LISспорныйT2удалён,MELguestsвосстановлено,этипоправкиперечитанывdrafts. Сеть/браузер/JSON/gitпроверяющийне трогал.

## MSP sleep — контроль исправления и финальный охват партии 3

Повторно прочитан актуальный RU draft: теперь «две тихие зоны отдыха на уровне Mezzanine с видом на Airport Mall». Неподтверждённые кресла удалены, overlooking передано как вид на Mall, а не расположение строго над ним. Замечание закрыто по текущему файлу. Местоположение после досмотра в T1, доступ на один уровень вверх у входов E/F и перечисленные занятия соответствуют ранее прочитанному полному официальному снимку MSP-sleep; URL блока: https://www.mspairport.com/index%2Ephp/airport/service-amenities .

С учётом этого исправления фактологическая сверка партии 3 завершена для 41 выбранного блока в 11 аэропортах: MEX 3, BLR 4, BOS 4, LGW 3, SYD 3, SGN 3, NRT 4, MEL 5, DUB 4, LIS 4, MSP 4. RUH: 0 блоков, не объявляется проверенным наполнением. Метод — офлайн-сверка полных сохранённых официальных DOM, не самостоятельный живой обход. Избранные 41 блока подтверждены после описанных в журнале уточнений; невыбранные услуги, противоречивое предложение LIS/T2 и недоступные RUH не включены. JSON проверяющий не правил.
