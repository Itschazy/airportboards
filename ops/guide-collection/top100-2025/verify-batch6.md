# Партия 6 — независимая офлайн-сверка фактов

26.10.2026. Все выбранные утверждения RU drafts сопоставляются с полными первичными DOM `/tmp/airports-top100-batch6/`. Браузер и сеть не используются, JSON не меняются. Это проверка сохранённых текстов, не работа услуг на месте.

## CUN

### transport

Первичный оператор ADO подтверждает Cancunairport↔терминалыCancúnCentro/PlayaDelCarmen/Tulum, отправлениякаждые15минdependingroute. RU«частотазависит...можетсоставлять15мин»необещаетвсемаршрутыпостояннокаждые15. Дата/время/destchangesuntil30minbeforedeparture,termsapply. Про физические кассы — уточнение ниже.

Источник: https://blog.ado.com.mx/aeropuerto-cancun-ado; снимок `CUN-transport.txt`.

### sleep

HiltonGardenInnCancunAirport insideairport/infrontT2, complimentaryshuttletoterminalsminutes,rooftopoutdoorpool/fitness/restaurant/freeWi-Fi. Checkin3pm→15:00,checkout11am→11:00;localphone+529983729860. Оценки15vs20mincityиздвухразделовневыбраны.

Источник: https://www.hilton.com/en/hotels/cunrogi-hilton-garden-inn-cancun-airport/; снимок `CUN-sleep.txt`.

## XMN

### taxi

T3arrivalautoDoor7/T4arrivalautoDoor3. LongdistancetoQuanzhou/Shishi/Zhangzhou taxiswestparking120mwestofT3domesticarrivalexit. 24hcomplaint05925615610international+865925615610. DoorнеboardingGate.

Источник: https://www.xiamenairport.com.cn/jcjt/jcjt-czc.aspx; снимок `XMN-taxi.txt`.

### storage

StorageT3/T4arrivalcounter,05:30untilARRIVALflightsend,24hperdayroundup. Не departurespackinghours/notpostal08:00. Phones5706036/5706016correct.

Источник: https://www.xiamenairport.com.cn/lkzn/lkxz-xlfw.aspx; снимок `XMN-storage.txt`.

### wifi

CMCC-XMAirport-free/ChinaUnicom/Chinanet точны. Mobile/Unicomfree,Telecompaid,operatorloginshowsbilling;terminalpassengerwaitingareas,flightstart→end. Не бесплатнывсе3инебесконечный24hдоступ.

Источник: https://www.xiamenairport.com.cn/lkzn/fwss-wlsw.aspx; снимок `XMN-wifi.txt`.

### lounges

T4domesticaftersecurityleft,freefirstANDbusinessclassofairporthandledflights;rest/food/net;06:00untilLASTFIRSTCLASSBOARDINGends. Не lastarrival/terminalclosing. T3internationalairportloungeGate17sameclass/handledeligibility. Не соседнийXiamenAirGate11сдругимиMF/CZусловиями. «Тежеуслуги»относитсякrest/food/net,времяinternationalsourceнеуказывает.

Источник: https://www.xiamenairport.com.cn/lkzn/fwss-xxs.aspx; снимок `XMN-lounges.txt`.

## Точность CUN transport

RU «Билеты продаются онлайн и в физических кассах» лучше заменить «Билеты продаются онлайн и в обычных пунктах продаж» или «онлайн и в наземных пунктах продаж». Source `opciones de compra online y puntos de venta físicos` подтверждает именно офлайн-пункты продаж; они не обязательно отдельные кассы с сотрудником. «Физические кассы» также неестественный буквальный русский оборот. Это консервативная точность способа покупки, не утверждение об отсутствии касс. Остальные факты подтверждены.

Промежуточный охват: **CUN2 + XMN4 =6выбранныхблоков**. XMN полностью подтверждён без замечаний; CUN требует указанного языкового уточнения перед переводами. Недоступные/невыбранные страницы не считаются проверенным содержимым.

## CGO — 1 транспортный блок

Прочитан fencedJSON и полные CGO-metro.txt / CGO-metro-entrances.txt. Станционная страница 新郑机场站 содержит обе таблицы линий: Chengjiao в сторону贾河/刘庄06:00–22:15 одинаково工作日/节假日; Zhengxu в сторону许昌东06:14–21:14. Обратные направления06:16–23:43 и06:07–22:00 не приписаны выбранным направлениям. Раскрытый раздел出入口 показывает G→T2 и E→T1. Правильный метроphone037155166166→+8637155166166. Boardinggates не придуманы.

Источник: https://www.zzmetro.com/lines/query/station/zid/11733; оба снимка указаны выше. Все выбранные утверждения подтверждены, правок не найдено. PlazaPremium прямо third-partyowned/operated, поэтому его CGO loungeindex не принят за первичного оператора. Недочитанный официальный аэропорт и рекламныйдоменнеподтверждены.

Актуальный охватпартии6: CUN2/XMN4/CGO1 =7блоков. CUN уточнениеofflinepoints ожидает контроля текущегоRU; остальные без замечаний.

## CUN — контроль правки

Актуальный RU transport перечитан целиком: теперь «онлайн и в обычных пунктах продаж». Способ продажи соответствует puntos de venta físicos; замечание закрыто. Городские русские формы hint не изменяют названия станций в тексте и подтверждённые факты. Все7 выбранных блоков текущей выборки партии6 без открытых замечаний.

## URC

FencedJSON и все полные первичные DOM прочитаны.

### sleep

HiltonHamptonUrumqiInternationalAirport:freeHOTbreakfast/freeWi-Fi/freeparking,fitness/restaurant,checkin14/checkout12,phone+869913535555. НеиспользованDiwopuadjacencyили800mметроописаниедлядоступакновомуURCterminal. Вадресепропущенleading5—см.ниже.

Источник: https://www.hilton.com/en/hotels/urcurhx-hampton-urumqi-international-airport/; снимок `URC-sleep.txt`.

## IAD

FencedJSON и все полные первичные DOM прочитаны.

### transport

Indoorpedestriantunnel/movingwalkwaysmainterminalticketingANDbaggageclaimlevels,SilverLine→downtownWashington+region. Contactlesscredit/debitphysicalORmobilewallet;SAMEcard/deviceentryANDexit. Не придуманатарификация/интервал/часы.

Источник: https://www.flydulles.com/metro; снимок `IAD-transport.txt`.

### terminals

AutomatedAeroTrain terminal↔midfield gates fordomestic/internationaldeparturesANDdomesticarrivals. Mostinternationalarrivalsnotrideduetocustomsfirst;mostнеall. TerminalstationjustbeyondTSA. Lessthan2minutesbetweenstations,не весьаэропортзаточнодвеминуты.

Источник: https://www.flydulles.com/travel-information/2024-holiday-travel-guide/aerotrain-washington-dulles-international-airport; снимок `IAD-terminals.txt`.

### kids

Presecurityarrivalrestroomsacrossbaggage2/6/11/14;postsecurityA20/B70/C11/D1. PrivateRestroomB70/sinkC11notreversed. Securedrooms/accessInfoDeskORcall7035722730,свободныйвходнеобещан.

Источник: https://www.flydulles.com/travel-information/2024-holiday-travel-guide/nursing-rooms; снимок `IAD-kids.txt`.

### wifi

Exact#IADFreeWiFi terminal+concourse;emailANDpostalcode,internationalYesbypassZIP;reviewacceptTermsbyConnect. RUнепридумываетcheckbox/OTPилиобязательныйиндексдляиностранцев.

Источник: https://www.flydulles.com/travel-information/services-amenities/free-wifi-internet-service; снимок `IAD-wifi.txt`.

### URC — точность адреса

Source header: `5 Silk Road Global Harbor Phase II, 2888 Beijing N Rd, Xinshi District`. RU сохраняет2888,PhaseII,Xinshi,но теряет начальное5. Рекомендовано сохранить адрес целиком как метку источника с цифрой5, не угадывая, означает ли она корпус/здание/секцию. Например, «по адресу 5 Silk Road Global Harbor Phase II, 2888 Beijing North Road, Xinshi District». Это возврат пропущенного элемента, не новый факт. ОстальныефактыURCподтверждены.

С IAD4 и URC1 охватпартии6: **12блоков /5аэропортов**. IAD принят без замечаний; URC требует контроля адреса.

## URC — контроль адреса

Актуальный RU sleep перечитан: «5 Silk Road Global Harbor Phase II, 2888 Beijing N Rd, Xinshi District». Leading5 возвращено, значениецифрынеугадано, точнаяподписьисточникасохранена. Замечание закрыто.

## OKA — 4 блока

FencedJSON и полные источники прочитаны.

### transport

Полный раскрытыйYuiRailfareDOM подтверждает NahaAirport→PrefecturalOffice13/Makishi16/Shuri27min. QRoneway vendingmachine/singleuse/dayofpurchase. Childfare UNDER12, upto2childrenUNDER6freewithONEadult,thirdchildfare. Не≤12/≤6. AirportmonorailpageтакжеподтверждаетShuri27min. Пустаячасоваятаблицанеиспользованадляпридуманныхfirst/last.

Источник: https://www.yui-rail.co.jp/en/routemap/nahakuko/; снимок `OKA-transport-fare.txt (раскрытие Fare table)`.

### storage

OkinawaYamato domesticarrival1F07:30–20:00 /nearSecurityC2F09–19. Inprincipleupto1month;size=sum3dimensions;S600/M800/L1000JPYperitemPERDAYincltax,не24h. НепоследовательныеENграницы119/120и149/150непереписаны. Не смешаныдругиеоператорыBeforeUGo/SagawaихценысYamato.

Источник: https://www.naha-airport.co.jp/en/service/shipping/baggage/; снимок `OKA-storage.txt`.

### kids

Nearrestrooms1/2/3F,internationalfoodcourt4F. Eachchangingtable/sink/hotwaterdispenser;menANDwomenusecommonroom,mennotprivateNURSINGrooms. Не запретмужчинамвсейкомнаты.

Источник: https://www.naha-airport.co.jp/en/service/family/nursing/; снимок `OKA-kids.txt`.

### wifi

ExactFree_Wi-Fi_NAHA_Airport,free/publicareaswithstore/facilityexceptions;1–4arrival/departure/gatewaiting/checkin/restaurants. TermsreviewANDagreement. Необъявленнесплатнымтрафиквсехстороннихплатныхсервисов.

Источник: https://www.naha-airport.co.jp/en/service/wifi/wifi-spot/; снимок `OKA-wifi.txt`.

Все4выбранныхблока подтверждены, обязательныхправокнет. Актуальныйохватпартии6: **16блоков /6аэропортов** (CUN2,XMN4,CGO1,URC1,IAD4,OKA4). Всеоткрытыезамечаниятекущейвыборкизакрыты. НевыбранныйRYURINнеобъявленполнымописаниемзала.

## FUK — 4 блока

FencedJSON и все полные официальные DOM прочитаны.

### transport

DirectdomesticterminalSOUTH↔Fukuoka-kuko;AccessHallB2ticketgate,southlift/escalatorsfromarrivals. Hakata→JRKyushu и Tenjin→NishitetsuFukuoka(Tenjin) directly shownrouteconnections. Международныйтерминалнеобъявленнапрямуюсметро.

Источник: https://www.fukuoka-airport.jp/en/access/subway.html; снимок `FUK-transport.txt`.

### terminals

Freedomestic↔internationalshuttleforairportusers;daytimedomesticscheduleevery5–6min,не24hinterval. Timesestimatesmayvary;allbuseswheelchairramps,front/backboardandalight. RU«пандусамидляколясок»понятно,ноточнеепоисточнику«дляинвалидныхколясок». Этоязыковоеуточнениевидатранспорта,неноваяуслуга.

Источник: https://www.fukuoka-airport.jp/en/access/bus2.html; снимок `FUK-terminals.txt`.

### kids

Curtainedbreastfeedingbooths/waterheaters/babyseats. JapaneseENpagelabels domestic1/2/3/4F,international1/3F. Flooricons,невыдуманыцены/ограничениядоступа/изменённыйномерэтажа.

Источник: https://www.fukuoka-airport.jp/en/service/m-nursing-room.html; снимок `FUK-kids.txt`.

### wifi

ExactAirportFreeWiFi-2.4G/5.0G,somedevicesonly2.4G;free→selectnetwork→browser→acceptterms→link. Exceptionssomeshops/restaurants/outofrange/busynetwork preserved. Sourceunencryptednotselected;необещанаencryptedsecurity.

Источник: https://www.fukuoka-airport.jp/en/service/wifi01.html; снимок `FUK-wifi.txt`.

Все4выбранныхблока подтверждены; обязательныхфактическихправокнет. Рекомендована точность слова wheelchair в shuttle. Актуальныйохватпартии6: **20блоков /7аэропортов**. Все ранееоткрытыезамечаниязакрыты.

## SLC — 1 транспортный блок

FencedJSON и полные SLC-transport.txt / SLC-transport-alerts.txt прочитаны. UTA прямо подтверждает TRAXGreenLine directairport/AirportStationjustoutsideterminal, daily05:21–23:21. CityCenter и FrontRunnertransferNorthTempletoOgden/Provo, **FrontRunner noSundays** сохранены; запрет не перенесён наGreenLine. Правильный телефон8017433882, круглосуточнаяподдержканеобещана. Старыйalertmaintenance17–18Octoberнеиспользованкакдействующий26October;отсутствиедругихограниченийнеобъявлено. БелаяHyattстраницанеисточникподтверждённогоотеля/шаттла,аэропортовыйWiFiнесертифицированпосниппету.

Источник: https://www.rideuta.com/Rider-Tools/Plan-Your-Trip-With-UTA/Airport-Travel; снимки указаны выше. Все выбранные факты подтверждены, правок нет. Общийохватпартии6: **21блок /8аэропортов**.

## LIM — 4 блока

FencedJSON и полные текущие официальные страницы прочитаны.

### taxi

ServicecountersDomesticANDInternationalarrivals,staffguidepassengerANDdriverdedicatedairportparking,onepublishedphone+5114844001. Необъявленединственнымоператором/ценой/предоплатой,RemisseVIPномеранеперепутаны.

Источник: https://www.lima-airport.com/en/pasajeros/transporte/taxi; снимок `LIM-taxi.txt`.

### lounges

TheClubLIMInternacionalLevel2InternationalDepartures,restseating/bar/showers/meetingspaces,daily00:00–23:59=roundclock. НеуказанынеподтверждённыедоступPriorityPass/банковскиекарты/цена/класс.

Источник: https://www.lima-airport.com/en/pasajeros/establecimientos/ver/354; снимок `LIM-lounges.txt`.

### sleep

SleepoverLevel2PerúPlazanextStarbucks/DunkinDonuts,24/7;showers/nappods/bunkcabins/coworking/complimentarydrinks. НеперепутансCostaDelSolописаниемстароготерминалас2007.

Источник: https://www.lima-airport.com/en/pasajeros/establecimientos/ver/355; снимок `LIM-rest.txt`.

### wifi

SourceSSIDточносleadingdot **.FreeWifiJorgeChavez**,phone/laptop,freeANDacceptTerms. Нелимитвремени/OTPнепридуманы;точканеисправленапопамяти.

Источник: https://www.lima-airport.com/en/pasajeros/servicios/wifi; снимок `LIM-wifi.txt`.

Все4выбранныхблока подтверждены, правокнет. SafeBag—wrapping/lostluggageconcierge,неstorage;parking404неиспользован;oldhotelsourceнеподтверждаетновыйтерминал. Общийохватпартии6: **25блоков /9аэропортов**,безоткрытыхфактическихзамечанийвыбраннойвыборки.

## SZX — 1 гостиничный блок

FencedJSON и полный `SZX-sleep.txt` прочитаны. HiltonGardenInnShenzhenAirportsource явно Fuyong,10kmfromairport,No9CuigangWestRoad;freeWi-Fi/freeparking,fitness/topfloorrestaurant. Checkin15:00/checkout12:00,phone+8675529993999. RUнеобъявляетотельвтерминале/пешейдоступности/сбесплатнымтрансфером. Fuyong расположенвBaoanDistrict;неполноеадминистративноеописаниеRUнеподменяетместоилиномер9. AI-organizedFAQнеиспользовалсядляфактов,всеутвержденияестьвосновномописании/amenities/header.

Источник: https://www.hilton.com/en/hotels/szxhdgi-hilton-garden-inn-shenzhen-airport/; снимок указанвыше. Все выбранные факты подтверждены, правокнет. Hyattblank/незавершённыйairportbusнеобъявленыуспешнымподтверждением. Общийохватпартии6: **26блоков /10аэропортов**, XIY/RUH ещё не включены.

## XIY — 1 гостиничный блок

FencedJSON и полный первичный DOM прочитаны. Accor основной текст/header: MercureXi’anInternationalAirport No15YingbinRoad/Weicheng/Xianyang;104rooms,fitness/laundryroom/restaurant/freeparking. Checkin12PM→12:00,checkout12PM→12:00;phone+862938195566. Необъявленыотельвтерминале,трансферилирасстояниедоаэропорта,которыхвыбранныйsourceнедаёт. Неиспользованыпустойметроtimetable/Regal404/общийIHGтекст.

Источник: https://all.accor.com/hotel/C0E4/index.en.shtml; снимок `XIY-sleep-mercure.txt`.

## RUH — 1 гостиничный блок

FencedJSON и полный первичный DOM прочитаны. Marriott header/amenities/location: AirportRoad,KingKhalidInternationalAirport;restaurants/outdoorpool/fitness/onsitelaundry/freeonsiteparking. Checkin15:00,minimumcheckin18,checkout12:00,phone+966118356300. РаскрытыйFAQявно **No airport shuttle**,нетлогическоговыводапоотсутствиюзначка. Минимальныйвозрастотноситсякоформлениюзаезда,некаждомуребёнкувотеле. ЗакрытыйPlazaPremiumнеобъявлендействующим.

Источник: https://www.marriott.com/en-us/hotels/ruhap-riyadh-airport-marriott-hotel/overview/; снимок `RUH-sleep.txt и RUH-sleep-shuttle.txt (раскрытый FAQ)`.

## Итог партии 6 по фактам

**28 выбранных блоков /12аэропортов:** CUN2, XMN4, CGO1, URC1, IAD4, OKA4, FUK4, SLC1, LIM4, SZX1, XIY1, RUH1. Все выбранные утверждения сверены с сохранёнными полными первичными DOM. CUNofflineoutlets и URCleading5 уточнения закрыты текущимиRU. Обязательных открытых замечаний выбранной выборки нет.

Это не подтверждение полноты услуг аэропорта: ограниченные гостиничные блоки SZX/XIY/RUH не доказывают текущий доступ к терминалу, шаттл или другие аэропортовые сервисы. Недоступность xxia.com/Hyatt/airportpages и старые/противоречивые transport/lounges не заменялись памятью. Живой повторный обход и проверки на месте проверяющий не выполнял.
