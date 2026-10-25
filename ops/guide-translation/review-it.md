# Проверка перевода справочной — итальянский (it)

Рецензент: независимый редактор (носитель итальянского уровня), 25.10.2026.
Проверены все 76 файлов `data/airport-guide/it/` против русских оригиналов, блок за блоком, включая `about`: смысл, числа и единицы, имена, естественность, отсутствие лишнего.

## Итог

Правок: 104 — смысл 25, числа 0, имена 12, стиль 67.
Числа и единицы во всех блоках совпадают с оригиналом (ни одной числовой правки не потребовалось). `node scripts/check-guide-fresh.mjs`: по it провалов нет, it 76/76.

## Решения, принятые для всего языка (без правки)

- **Транслитерация.** Принята одна схема: итальянские экзонимы там, где они есть (Mosca, San Pietroburgo, Arcangelo, Erevan, Tiflis в историческом контексте, piazza del Palazzo), в остальном — практическая латиница, как в итальянской прессе и на табличках (Sochi, Khabarovsk, Chelyabinsk, Yuzhno-Sakhalinsk, Sheremetyevo, Ekaterinburg). Переводчик уже держался её почти везде; выбивались научная «Kamčatka», «Bajkal» рядом с «Baikal», «Jugra» рядом с «Yugraavia» и непоследовательные «ploshchad X» / «piazza X» — исправлены (см. ниже). Формы из `data/airport-names.json` (Chabarovsk, Čeljabinsk, Sceremet’evo) смешивают обе схемы и в текст не переносились.
- **Этажи.** Русский «1 этаж» — это итальянский piano terra, но бриф требует тех же номеров этажей, что на табличках, и проверка сравнивает числа. Оставлено «1° piano», «2° piano» и т. д. без пересчёта.
- **Коды с кириллицей** (105с, 8А, 111Э, 244-Э, Т1, Т2, С2, Р1, А2, С5, 1А) оставлены как в оригинале, по брифу. Одиночная буква терминала без цифры (VOG, «С») переведена в латинскую C. В REN «№101 (к)» переводчик написал «(k)»: буква не прилегает к цифре, кириллица там провалила бы проверку — оставлено «(k)».
- **Кавычки** «» оставлены: в итальянской типографике они приняты.
- «Sala comfort» для «зал повышенной комфортности», «zona sterile» для «чистая/стерильная зона», «presidio medico/sanitario» для «медпункт/здравпункт», «marshrutka» с пояснением «taxi collettivo» — сочтены естественными, не менялись.

## Правки

| Файл | Блок | Было | Стало | Тип | Почему |
|---|---|---|---|---|---|
| AER | kids.text | Fasciatoi sono presenti presso i servizi igienici in tutti i settori | Locali fasciatoio presso i servizi igienici di tutti i settori | смысл | в оригинале «комнаты для пеленания», а не столики |
| ASF | kids.text | (se ci sono posti liberi fino a 8) | (fino a 8 se ci sono posti liberi) | стиль | двусмысленный порядок слов |
| CEE | kids.text | Chiamare un addetto del servizio trasporti | Chiamare un addetto del servizio passeggeri | стиль | «служба перевозок» — служба обслуживания пассажиров; «servizio trasporti» по-итальянски значит иное |
| CEK | lounges.text | non prima di 3 ore dalla partenza | al massimo 3 ore prima della partenza | смысл | «non prima di 3 ore dalla partenza» читается как «не раньше чем через 3 часа после вылета» |
| CEK | parking.text | sul lato sud dell’insediamento Aeroport | sul lato sud della località Aeroport | стиль | «посёлок» → località, единообразно |
| CSY | lounges.text | Ingresso in sala non prima di 2 ore dalla partenza | Ingresso in sala al massimo 2 ore prima della partenza | смысл | то же: «не ранее чем за 2 часа до вылета» |
| DXB | storage.text | nel terminal 3 35 e 40 AED | nel terminal 3: 35 e 40 AED | стиль | два числа подряд без разделителя |
| EVN | parking.text | Edificio di parcheggio coperto da 642 auto | Autosilo coperto da 642 posti | стиль | калька «парковочное здание» → autosilo |
| EYK | lounges.text | con check-in personale 3500 ₽ | con check-in dedicato 3500 ₽ | стиль | естественный термин |
| GDX | lounges.text | 4000 ₽ dai 2 anni, più piccoli gratis | 4000 ₽ dai 2 anni, i più piccoli gratis | стиль | без артикля звучит телеграфно |
| GDX | parking.text | giornata 2000 ₽ | giornata intera 2000 ₽ | стиль | «сутки» как тариф |
| GOJ | lounges.text | Nella sala bancaria si accede | Nella sala per i titolari di carte bancarie si accede | стиль | «sala bancaria» — не по-итальянски |
| GYD | transport.text | la metro «Koroglu» | la metro «Koroğlu» | имена | официальная латинская (азербайджанская) форма станции |
| HMA | lounges.text | Sala per persone molto importanti in partenza 10 000 ₽ | Sala VIP in partenza 10 000 ₽ | стиль | калька «особо важных персон» |
| HMA | kids.text | donne in gravidanza dalla seconda metà | donne nella seconda metà della gravidanza | стиль | калька |
| HMA | kids.text | Si accede 6 ore prima della partenza | Si accede da 6 ore prima della partenza | смысл | «за 6 часов» — с момента за 6 часов, а не ровно за 6 |
| HMA | parking.text | il giorno successivo 1200 ₽ | ogni giorno successivo 1200 ₽ | смысл | «следующие сутки» — каждые, а не одни |
| HRG | lounges.text | Chi viene ammesso, le fonti lo indicano in modo diverso: verificare le condizioni d’accesso con la sala. | Le fonti riportano in modo diverso chi viene ammesso: verificare le condizioni d’accesso con la sala. | стиль | калька порядка слов |
| HRG | storage.text | Dove si trovi esattamente e quanto costi, le fonti non lo indicano. | Le fonti non indicano dove si trovi esattamente né quanto costi. | стиль | калька порядка слов |
| IAR | lounges.text | tavolo del tè | angolo tè | стиль | калька «чайный стол» |
| IAR | kids.text | Nella sala arrivi non c’è una sala. | Nella sala arrivi questa sala non c’è. | стиль | «нет зала в зале» — неясно, о чём речь |
| IGT | terminals.text | doganali, veterinari e sanitario-quarantenari | doganali, veterinari, sanitari e di quarantena | стиль | несуществующее прилагательное |
| IJK | storage.text | Custodia degli oggetti smarriti 400 ₽ | Custodia degli oggetti ritrovati 400 ₽ | смысл | «найденных вещей» — найденные, а не потерянные |
| IJK | kids.text | Cibo e prodotti per l’igiene li portano i genitori. | Cibo e prodotti per l’igiene vanno portati dai genitori. | стиль | разговорная дислокация |
| IKT | lounges.text | La sala business e la sala comfort aprono 2 ore prima della partenza se ci sono posti | La sala business e la sala comfort sono accessibili da 2 ore prima della partenza se ci sono posti | смысл | «открыты за 2 часа до вылета» — про доступ пассажира, а не часы работы зала |
| IKT | lounges.text | Nel terminal 1 sala comfort 3 ore prima della partenza | Nel terminal 1 sala comfort accessibile da 3 ore prima della partenza | смысл | то же |
| IKT | kids.text | Con il bambino un solo adulto. | Il bambino può essere accompagnato da un solo adulto. | стиль | телеграфная калька |
| IKT | parking.text | oltre penale di 2000 ₽ all’ora | oltre si paga una penale di 2000 ₽ all’ora | стиль | нет глагола, читается как «свыше штрафа» |
| IST | sleep.text | Prenotazione da 4 ore. | Prenotazione minima di 4 ore. | смысл | «бронирование от 4 часов» — минимальный срок, а не «через 4 часа» |
| IST | kids.text | aree gioco di cinque temi | aree gioco a cinque temi | стиль | предлог |
| IST | kids.text | corse gratuite in buggy | passaggi gratuiti in buggy | стиль | corse — про гонки/рейсы |
| IST | parking.text | Il parcheggiatore è all’ingresso del terminal CIP. | Il servizio di parcheggio con valet è all’ingresso del terminal CIP. | смысл | «парковщик» — услуга valet; parcheggiatore двусмысленно (в т. ч. нелегальный) |
| IWA | transport.text | ploshchad Revolyutsii | piazza Revolyutsii | имена | единообразно с «piazza Komsomolskaya» (CEK, KHV) |
| KEJ | about | ed è usato insieme al Ministero della Difesa e alla Rosgvardiya | ed è in uso condiviso con il Ministero della Difesa e la Rosgvardiya | стиль | калька |
| KGD | lounges.text | i veterani della Grande guerra patriottica con un accompagnatore gratis | gratis i veterani della Grande guerra patriottica con un accompagnatore | стиль | «gratis» в конце читается как про сопровождающего |
| KGD | parking.text | per ogni ora, anche iniziata | per ogni ora, anche se non completa | стиль | обрывочная конструкция |
| KHV | transport.text | n. 1 da Komsomolskaya ploshchad | n. 1 da piazza Komsomolskaya | имена | единообразно с CEK |
| KHV | transport.text | n. 180 Rechnoy vokzal – s. Matveevka | n. 180 Stazione fluviale – villaggio di Matveevka | имена | «с.» итальянцу непонятно; «Речной вокзал» переведён как в ARH (Stazione marittima e fluviale) |
| KUF | about | Lo gestisce la società di gestione «Aeroporty Regionov». | È gestito dalla società di gestione «Aeroporty Regionov». | стиль | тавтологичная калька |
| KUF | parking.hint | Discesa 15 min gratis | Carico e scarico 15 min gratis | смысл | «высадка» — зона посадки/высадки, как в тексте блока; «discesa» неясно |
| KVX | kids.text | a sinistra della sala arrivi. giorno e notte e gratuita | a sinistra della sala arrivi. Aperta giorno e notte e gratuita | стиль | предложение со строчной буквы, без глагола |
| KVX | kids.text | Accede un adulto con bambini fino a 7 anni, con bambini con disabilità fino a 14 anni e donne nella seconda metà della gravidanza. | Accedono un solo adulto con bambini fino a 7 anni o con bambini con disabilità fino a 14 anni e le donne nella seconda metà della gravidanza. | смысл | «одного взрослого» — один взрослый; беременные — отдельная категория, а не спутники взрослого |
| KZN | sleep.text | Amministratore: +7 | Reception: +7 | стиль | «администратор гостиницы» по-итальянски — reception |
| LED | lounges.text | Tre saloni business. | Tre sale business. | стиль | единообразно с заголовком и другими аэропортами |
| LED | lounges.text | delle compagnie aeree, 4 ore prima della partenza; | delle compagnie aeree, da 4 ore prima della partenza; | смысл | «за 4 часа» — с момента за 4 часа |
| LED | lounges.text | DreamFolks, 2 ore prima. | DreamFolks, da 2 ore prima. | смысл | то же |
| LED | parking.hint | 15 min all’ingresso gratis | 15 min gratis all’ingresso | стиль | порядок слов |
| LED | taxi.text | subito all’uscita del ritiro bagagli internazionale | subito all’uscita del ritiro bagagli dei voli internazionali | стиль | согласование |
| MCX | terminals.text | La carta d’imbarco serve su carta, si può stampare al banco del self check-in. | Serve la carta d’imbarco stampata, che si può ottenere al chiosco self check-in. | стиль | «carta d’imbarco … su carta» — тавтология; стойка самостоятельной регистрации — киоск |
| MCX | lounges.text | Le persone giuridiche presentano la richiesta | Le aziende presentano la richiesta | стиль | канцелярит |
| MMK | about | a 4 km dall’insediamento di Murmashi | a 4 km dalla località di Murmashi | стиль | «посёлок» → località |
| NBC | sleep.text | colazioni presto | colazioni anticipate | стиль | неграмотное сочетание |
| NBC | kids.text | fino a 14 anni, 4 ore prima della partenza. | fino a 14 anni, da 4 ore prima della partenza. | смысл | «за 4 часа» — с момента |
| NBC | kids.text | o al 8-800-200-18-19 | o al numero 8-800-200-18-19 | стиль | «al 8-800» — грамматически неверно |
| NER | about | Aeroporto presso l’insediamento di Chulman | Aeroporto presso la località di Chulman | стиль | «посёлок» → località |
| NER | about | Pista artificiale 3600×45 m | Pista pavimentata 3600×45 m | смысл | «искусственная полоса» — с твёрдым покрытием; pista artificiale по-итальянски непонятно |
| NER | terminals.text | apre 2 ore prima del volo in orario | apre 2 ore prima dell’orario previsto del volo | смысл | «до рейса по расписанию» — отсчёт от расписания, а не «рейс вовремя» |
| NER | lounges.text | Si accede 3 ore prima del volo, qualsiasi passeggero a pagamento. | Si accede da 3 ore prima del volo; è aperta a qualsiasi passeggero a pagamento. | смысл | «за 3 часа» — с момента; обрывочная конструкция |
| NER | kids.text | con un adulto, donne nella seconda metà della gravidanza | con un adulto e le donne nella seconda metà della gravidanza | стиль | перечисление без союза |
| NJC | about | Circondario autonomo degli Khanty-Mansi – Jugra | Circondario autonomo dei Khanty-Mansi – Yugra | имена | единообразная транслитерация (Yugraavia в HMA); «degli Kh-» неграмотно |
| NNM | lounges.text | ingresso 2 ore prima della partenza | ingresso da 2 ore prima della partenza | смысл | «вход за 2 часа» — с момента |
| NOZ | about | porta aerea della località di Sheregesh | porta d’accesso aerea alla località turistica di Sheregesh | стиль | калька «воздушные ворота»; «курорт» — località turistica |
| NOZ | transport.text | Taxi circa 40 minuti, circa 800 ₽. | Taxi: circa 40 minuti, intorno agli 800 ₽. | стиль | повтор «circa … circa» |
| NOZ | sleep.text | Amministratore giorno e notte | Reception giorno e notte | стиль | «администратор» гостиницы — reception |
| NOZ | kids.text | del terminal. giorno e notte, gratuita. | del terminal. Aperta giorno e notte, gratuita. | стиль | предложение со строчной буквы, без глагола |
| NSK | sleep.hint | Profilattorio, 24/7 | Foresteria, 24/7 | стиль | «профилакторий» итальянцу непонятен; по сути — гостевое жильё аэропорта |
| NSK | sleep.text | Il profilattorio dell’aeroporto | La foresteria (profilaktorij) dell’aeroporto | стиль | то же; русское название сохранено в скобках |
| NSK | kids.text | fino a 5 anni e in gravidanza dalla seconda metà | fino a 5 anni e per le donne nella seconda metà della gravidanza | стиль | калька |
| NYM | kids.text | stanza n. 1 per cambio e allattamento | stanza n. 1 per il cambio e l’allattamento | стиль | артикли |
| OSW | lounges.text | Si accede non prima di 2 ore dalla partenza | Si accede al massimo 2 ore prima della partenza | смысл | «не раньше чем за 2 часа до вылета» |
| OSW | kids.text | segue il regolamento dell’aeroporto | gli orari seguono il regolamento dell’aeroporto | стиль | «работает по регламенту» — про часы работы |
| OSW | parking.text | da un giorno 500 ₽ | oltre un giorno 500 ₽ | стиль | «от суток» в ряду тарифов |
| OVB | parking.text | fino a 6 giorni 500 ₽, oltre 300 ₽ | fino a 6 giorni 500 ₽, oltre, 300 ₽ | стиль | «oltre 300 ₽» читается как «свыше 300 ₽» |
| PEE | transport.text | le ultime corse sono prima | le ultime corse partono prima | стиль | калька |
| PKC | transport.text | Territorio della Kamčatka | Territorio della Kamchatka | имена | единственная научная транслитерация в файлах; везде Petropavlovsk-Kamchatsky |
| REN | kids.text | Si accede 3 ore prima della partenza | Si accede da 3 ore prima della partenza | смысл | «за 3 часа» — с момента |
| SGC | parking.text | ai distributori presso l’ingresso centrale | alle casse automatiche presso l’ingresso centrale | смысл | «автоматы» для оплаты, не торговые автоматы |
| SVO | lounges.text | «Shagal» | «Chagall» | имена | зал назван в честь Марка Шагала; принятая латинская форма — Chagall |
| SVO | lounges.text | In «Rublyov» e «Malevich» accedono gratis | Nelle sale «Rublyov» e «Malevich» accedono gratis | стиль | предлог перед названием |
| SVO | storage.text | Depositi bagagli a pagamento si trovano nel Terminal B | Ci sono depositi bagagli a pagamento nel Terminal B | стиль | подлежащее без артикля в начале фразы |
| SVO | sleep.text | pagamento a ore da 4 ore | pagamento a ore, minimo 4 ore | смысл | «от 4 часов» — минимум |
| SVO | kids.text | Sale madre e bambino si trovano nel Terminal B | Ci sono sale madre e bambino nel Terminal B | стиль | то же |
| SVO | parking.text | Oltre il limite penale di 4000 ₽ all’ora. | Oltre il limite si paga una penale di 4000 ₽ all’ora. | стиль | нет глагола |
| SVO | parking.text | Gratuitamente si può entrare non più di due volte in due ore. | L’ingresso gratuito è consentito al massimo due volte ogni due ore. | стиль | калька |
| SVO | terminals.text | Si può anche usare gli autobus n. 817 e n. 851 secondo orario o l’auto. | Si possono anche usare gli autobus n. 817 e n. 851, secondo orario, oppure l’auto. | стиль | согласование глагола |
| SVX | lounges.text | «Opal» e «Agat» accolgono con i programmi | «Opal» e «Agat» sono accessibili con i programmi | стиль | калька |
| SVX | kids.text | un certificato medico del presidio medico | un certificato del presidio medico | стиль | повтор |
| TBS | transport.text | Corsa 1 GEL con 90 minuti di trasbordi pagando | Corsa 1 GEL, cambi compresi per 90 minuti, pagando | стиль | калька |
| UFA | terminals.text | 2 minuti ai terminal | a 2 minuti dai terminal | стиль | предлог |
| ULV | sleep.text | accanto all’aerostazione, giorno e notte | accanto all’aerostazione, aperto giorno e notte | стиль | без глагола |
| UUA | lounges.text | Amministratore: +7 | Reception: +7 | стиль | «администратор» — reception |
| UUD | about | vicino al lago Bajkal | vicino al lago Baikal | имена | в том же предложении аэропорт Baikal — одно имя в двух написаниях |
| UUS | parking.text | gratis con il contrassegno «Invalido» | gratis con il contrassegno disabili | имена | итальянское название знака |
| VKO | lounges.text | per le partenze internazionali uscire 1 ora prima | per le partenze internazionali lasciare la sala 1 ora prima | смысл | «выходить за 1 час» — покидать зал; «uscire» неясно откуда |
| VKO | kids.text | non prima di 6 ore dalla partenza | al massimo 6 ore prima della partenza | смысл | «не раньше чем за 6 часов до вылета» |
| VOG | kids.hint | Terminal С e С2, gratis | Terminal C e С2, gratis | имена | одиночная буква терминала — латинская C (с цифрой — как на табличке) |
| VOG | kids.text | Sale madre e bambino si trovano nei terminal dei voli nazionali (С2) e internazionali (С) | Ci sono sale madre e bambino nei terminal dei voli nazionali (С2) e internazionali (C) | имена | кириллическая «С» без цифры → латинская C; порядок слов |
| ZIA | kids.text | verso i paesi dell’UEEA | verso i paesi dell’UEE | имена | итальянская аббревиатура ЕАЭС — UEE (Unione economica eurasiatica) |
| ZIA | kids.text | c’è una stanza per il cambio | c’è un locale fasciatoio | стиль | естественный термин |
| AER | kids.text | Si accede con bambini fino a 7 anni, con bambini con disabilità fino a 14 anni e in gravidanza dalla seconda metà. | Accedono i passeggeri con bambini fino a 7 anni, con bambini con disabilità fino a 14 anni e le donne nella seconda metà della gravidanza. | стиль | «in gravidanza dalla seconda metà» — калька без подлежащего; перечисление без союза |
| GDZ | kids.text | Si accede con un bambino fino a 7 anni, un bambino con disabilità fino a 14 anni, in gravidanza dalla seconda metà. | Accedono i passeggeri con bambini fino a 7 anni, con bambini con disabilità fino a 14 anni e le donne nella seconda metà della gravidanza. | стиль | «in gravidanza dalla seconda metà» — калька без подлежащего; перечисление без союза |
| IJK | kids.text | Si accede con bambini fino a 7 anni, bambini con disabilità fino a 18 anni, in gravidanza dalla seconda metà. | Accedono i passeggeri con bambini fino a 7 anni, con bambini con disabilità fino a 18 anni e le donne nella seconda metà della gravidanza. | стиль | «in gravidanza dalla seconda metà» — калька без подлежащего; перечисление без союза |
| KZN | kids.text | Si accede con bambini fino a 7 anni, con bambini con disabilità fino a 14 anni e in gravidanza dalla seconda metà. | Accedono i passeggeri con bambini fino a 7 anni, con bambini con disabilità fino a 14 anni e le donne nella seconda metà della gravidanza. | стиль | «in gravidanza dalla seconda metà» — калька без подлежащего; перечисление без союза |
| RGK | kids.text | Si accede con bambini fino a 7 anni, bambini con disabilità fino a 14 anni, in gravidanza dalla seconda metà. | Accedono i passeggeri con bambini fino a 7 anni, con bambini con disabilità fino a 14 anni e le donne nella seconda metà della gravidanza. | стиль | «in gravidanza dalla seconda metà» — калька без подлежащего; перечисление без союза |

## Этажи как на указателях

В российских аэропортах «1 этаж» — уровень земли, и цифра совпадает с табличкой. Итальянец читает
«1° piano» как этаж над землёй, поэтому все ссылки на этажи переведены в форму надписи на указателе
(как во французском «niveau 1»): 260 упоминаний в 217 полях, 56 файлов. Номера не менялись — каждый
блок сверен с русским оригиналом.

- `1° piano, gratis` → `Livello 1, gratis` (подсказки начинаются с заглавной);
- `al 2° piano del terminal` → `al livello 2 del terminal`; `1° livello dell’atrio` → `livello 1 dell’atrio`;
- словесные этажи: `al secondo piano` («на втором этаже») → `al livello 2`, `primo piano` → `livello 1`;
- эллипсис: DME «паспортный контроль на 2-м» `al 2°` → `al livello 2` (так же VKO);
- диапазоны: NOZ `al 1°–2° piano` → `ai livelli 1–2`, GYD `ai livelli 3 e 4`, NOJ/REN `Livelli 1 e 2`, `Livelli 3 e 4`;
- `piano −1` (SVX, SVO) → `livello −1`. «Piano seminterrato» (цокольный этаж) оставлен.


## Возраст «до N лет» = младше N (25.10, сверка между языками)

Оригинал «до 7 лет» во всех правилах аэропортов значит «не достигшим 7 лет»; ko, fr, de, en, zh, ja уже передают это как «младше N». Здесь «fino a / तक / حتى / hasta» заменены на «sotto i / से कम / دون / menores de» (it/hi/ar — по 80 полей, es — 2). Исключение — LED, где в оригинале «до 7 лет включительно»: там оставлена включающая форма.

## Сутки = 24 часа

«Сутки» в тарифах — 24 часа от сдачи/въезда, а не календарный день: «первые сутки — 700 ₽, дальше
300 ₽ в сутки» значит первые 24 часа и каждые следующие 24 часа. Перевод «first day / per day»
читается как календарный день и даёт другой счёт. Исправлено 31 фрагментов в 23 блоках:
14 блоков с «первые сутки» (AER/DME/KRR/NOZ/SVO/SVX/UUS/VVO/ZIA storage, ASF/CEK/LED/NJC/UUS
parking) и 9 блоков со сроком в сутках (KVX/VOG kids «не дольше/до одних суток», NJC kids
«не позднее чем через сутки», UUD parking «не дольше суток», BQS/GYD/NNM/OSW/PEE parking «до суток»).
В том же предложении «в сутки / каждые следующие» переведено как «за 24 часа», чтобы единица
не менялась посреди тарифа. «Двое/трое суток» (ASF) и «с 1 по 5 сутки» (UUS) переданы через
число периодов по 24 часа: сторож чисел не пускает 48/72 и требует 5.

Не тронуто: календарные сутки с привязкой к часам (MRV «до 24:00», NBC, SGC, BAX «календарные»,
KZN «до полуночи текущих суток»); цены «в сутки» вне предложений с «первыми сутками» и «до суток»
(гостиницы, ARH, AER parking и т. п.); сроки хранения «до 30 суток» → «30 days»; GYD «каждый
следующий день» (в оригинале «день»); «меньше суток оплачивается как сутки» в GDX, KEJ, OVB, NOZ
parking — не входило в задачу, оставлено как «day».

| IATA | поле | было | стало |
|---|---|---|---|
| AER | storage.text | Il primo giorno costa da 600 ₽ a collo, ogni giorno successivo da 300 ₽. | Le prime 24 ore costano da 600 ₽ a collo, ogni successivo periodo di 24 ore da 300 ₽. |
| ASF | parking.text | oltre 4 ore 900 ₽ al giorno. | oltre 4 ore 900 ₽ ogni 24 ore. |
| ASF | parking.text | per il primo giorno 600 ₽, per due giorni 1100 ₽, per tre 1500 ₽, poi 300 ₽ al giorno. | per le prime 24 ore 600 ₽, per due periodi di 24 ore 1100 ₽, per tre 1500 ₽, poi 300 ₽ ogni 24 ore. |
| CEK | parking.text | il primo giorno in totale 1300 ₽, oltre un giorno 700 ₽ al giorno. | le prime 24 ore in totale 1300 ₽, oltre le 24 ore 700 ₽ ogni 24 ore. |
| DME | storage.text | 1300 ₽ per il primo giorno per periodi | 1300 ₽ per le prime 24 ore per periodi |
| KRR | storage.text | 400 ₽ a collo il primo giorno, 200 ₽ per ogni giorno successivo. | 400 ₽ a collo per le prime 24 ore, 200 ₽ per ogni successivo periodo di 24 ore. |
| LED | parking.text | 1100 ₽ per il primo giorno, da 14 giorni 700 ₽ al giorno. | 1100 ₽ per le prime 24 ore, da 14 giorni 700 ₽ ogni 24 ore. |
| NJC | parking.text | Il primo giorno 1000 ₽, ogni giorno successivo 800 ₽. | Le prime 24 ore 1000 ₽, ogni successivo periodo di 24 ore 800 ₽. |
| NOZ | storage.text | 400 ₽ il primo giorno | 400 ₽ le prime 24 ore |
| NOZ | storage.text | 750 ₽ il primo giorno | 750 ₽ le prime 24 ore |
| SVO | storage.text | Il primo giorno costa 700 ₽ a collo, poi 300 ₽ al giorno. | Le prime 24 ore costano 700 ₽ a collo, poi 300 ₽ ogni 24 ore. |
| SVX | storage.text | 500 ₽ per il primo giorno, 300 ₽ per ogni giorno successivo. | 500 ₽ per le prime 24 ore, 300 ₽ per ogni successivo periodo di 24 ore. |
| SVX | storage.text | 800 ₽ per il primo giorno, 500 ₽ per i successivi. | 800 ₽ per le prime 24 ore, 500 ₽ per ogni successivo periodo di 24 ore. |
| UUS | parking.text | 1200 ₽ per il primo giorno e 600 ₽ per i successivi. | 1200 ₽ per le prime 24 ore e 600 ₽ per ogni successivo periodo di 24 ore. |
| UUS | parking.text | 500 ₽/giorno dal 1° al 5° giorno, poi 400 ₽. | 500 ₽ ogni 24 ore per i primi 5 periodi di 24 ore, poi 400 ₽. |
| UUS | storage.text | 500 ₽ per il primo giorno, 200 ₽ per i successivi. | 500 ₽ per le prime 24 ore, 200 ₽ per ogni successivo periodo di 24 ore. |
| VVO | storage.text | 500 ₽ per il primo giorno, 200 ₽ per ogni giorno successivo, | 500 ₽ per le prime 24 ore, 200 ₽ per ogni successivo periodo di 24 ore, |
| VVO | storage.text | Il giorno iniziato conta come intero. | Il periodo di 24 ore iniziato conta come intero. |
| ZIA | storage.text | 700 ₽ per il primo giorno, 300 ₽ per ogni giorno successivo. | 700 ₽ per le prime 24 ore, 300 ₽ per ogni successivo periodo di 24 ore. |
| KVX | kids.text | per non più di un giorno. | per non più di 24 ore. |
| VOG | kids.text | fino a un giorno. | fino a 24 ore. |
| UUD | parking.text | non oltre un giorno. | non oltre 24 ore. |
| NJC | kids.text | per una partenza entro un giorno. | per una partenza entro le 24 ore successive. |
| BQS | parking.text | fino a un giorno 400 ₽, ogni giorno successivo 400 ₽. | fino a 24 ore 400 ₽, ogni successivo periodo di 24 ore 400 ₽. |
| GYD | parking.text | fino a un giorno 15 AZN | fino a 24 ore 15 AZN |
| NNM | parking.text | Oltre un’ora e fino a un giorno: | Oltre un’ora e fino a 24 ore: |
| NNM | parking.text | Oltre un giorno, fino a 30 giorni: 600 ₽ al giorno. | Oltre 24 ore, fino a 30 giorni: 600 ₽ ogni 24 ore. |
| OSW | parking.text | fino a un giorno 500 ₽, oltre un giorno 500 ₽. | fino a 24 ore 500 ₽, oltre 24 ore 500 ₽. |
| PEE | parking.text | fino a un giorno 500 ₽, poi 500 ₽ al giorno. | fino a 24 ore 500 ₽, poi 500 ₽ ogni 24 ore. |
| PEE | parking.text | fino a un giorno 400 ₽, poi 400 ₽ al giorno. | fino a 24 ore 400 ₽, poi 400 ₽ ogni 24 ore. |
| PEE | parking.text | L’ora iniziata e il giorno iniziato si pagano interi. | L’ora iniziata e il periodo di 24 ore iniziato si pagano interi. |


## Перекрёстная проверка ChatGPT (выборка 6 пар, 25.10)

Принято: «zona di carico e scarico» → «zona di salita e discesa passeggeri» (без «passeggeri» читается как погрузка грузов), «Visita a pagamento» → «Ingresso a pagamento», «(a 10 minuti dai terminal)». Отклонено: Komfort/Premyer → Comfort/Premier (официальное латинское написание не подтверждено — транслитерация по правилам), Т1 (кириллица по правилам), «zona sterile» (термин ENAC).


## Раунд 2 (26.10.2026)

| Файл | Блок | Было | Стало | Тип | Почему |
|---|---|---|---|---|---|
| CAN | transport.text | dall’uscita | dalla porta | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | taxi.text | dall’uscita | dalla porta | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | storage.text | l’uscita | la porta | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | sleep.text | l’uscita | la porta | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PEK | taxi.text | le uscite | le porte | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PEK | storage.text | le uscite | le porte | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PEK | storage.text | l’uscita | la porta | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | taxi.text | le uscite | le porte | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | taxi.text | dall’uscita | dalla porta | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| BKK | taxi.hint | uscite 4–7 | porte 4–7 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| BKK | taxi.text | le uscite | le porte | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| BKK | storage.text | l’uscita | la porta | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | storage.text | le uscite 4 e 5 | le porte 4 e 5 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | storage.text | all’uscita 7 | alla porta 7 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | sleep.text | l’uscita 2 della | la porta 2 della | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | sleep.text | l’uscita 29 | la porta 29 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | taxi.hint | uscite 50 | porte 50 | смысл | Двери терминала по таблице шага2 |
| LAS | parking.text | Economy e area remota (servita da una navetta gratuita) | Economy e area remota (quest’ultima servita da una navetta gratuita) | смысл | Снять двусмысленное распространение шаттла на Economy |
| ICN | terminals.text | solo nei giorni feriali | solo dal lunedì al venerdì | смысл | Giorni feriali может включать субботу; оригинал по будням |
| LHR | transport.hint | Heathrow Express, Elizabeth line, Piccadilly | Express, Elizabeth, Piccadilly | стиль | Лимит35, полный текст сохранён |
| MIA | transport.hint | Metrorail, Metrobus, Tri-Rail, MIA Mover | Metrorail, Tri-Rail, MIA Mover | стиль | Лимит35, полный текст сохранён |
| BKK | terminals.hint | Terminal principale e satellite SAT-1 | Terminal principale e SAT-1 | стиль | Лимит35 |

Все24файла, каждый блок title/hint/text и about проверены с оригиналом заново. Цены, интервалы, возрастunder5, 24ore, условия доступа, досмотр и имена сохранены; livelli без порядковых этажей. Ручная рецензия завершена; ChatGPT-выборка ещё впереди.
| JFK | transport.hint | AirTrain, Jamaica/Howard Beach, 8,75 $ | AirTrain, 8,75 $ a tratta | стиль | Подпись ≤35 символов; полный перечень сохранён в text |
| ORD | lounges.hint | United Club, Admirals Club, Sky Club | United, Admirals Club, Sky Club | стиль | Подпись ≤35 символов; полный перечень сохранён в text |
| MIA | lounges.text | il pass giornaliero | il pass per un singolo accesso | смысл | «Разовый пропуск» не задаёт срок действия целый день; сохраняем один вход |
| MIA | lounges.text | Nelle sale American si entra per status e con biglietto in business o prima classe American o oneworld | L’accesso alle lounge American è consentito in base allo status e al possesso di un biglietto di classe business o prima classe di American o di una compagnia oneworld | стиль | Принято из ChatGPT: грамматика и естественность без изменения условий |
| HND | lounges.text | nell’area gate al livello 4 | nell’area dei gate d’imbarco al livello 4 | стиль | Принято из ChatGPT: грамматика и естественность без изменения условий |
| HND | lounges.text | con una carta idonea intestata al passeggero e carta d’imbarco dello stesso giorno | con una carta idonea intestata al passeggero e una carta d’imbarco per lo stesso giorno | стиль | Принято из ChatGPT: грамматика и естественность без изменения условий |

### ChatGPT, выборка раунда 2
https://chatgpt.com/c/6ade6cad-eab8-832c-adda-76f0e9a42d50 — 6 пар MIA/lounges, LAS/parking, HND/lounges, PVG/storage, ICN/terminals, SIN/terminals, без поиска. Приняты №1–3. №4 è registrato→è stato registrato **отклонено как необходимая правка**: исходная форма корректно передаёт состояние «багаж оформлен», ошибки условия нет, изменение только предпочтение времени глагола. Числа, тарифы и временные интервалы замечаний не получили.
| PEK | taxi.text | Sulle corse oltre 15 km si aggiunge il 50% dell’importo come supplemento per il viaggio di ritorno | Sul tratto oltre i 15 km si applica un supplemento del 50% alla tariffa chilometrica per il viaggio di ritorno | смысл | Официальная китайская версия bcia.com.cn/wljc.html: 单程载客15公里以上部分，每公里租价加收50%费用. Подтверждённая правка оригинала согласована владельцем 26.10 |
| ICN | sleep.text | al livello B1 | al livello 1 | смысл | Официальный корейский каталог airport.kr/ap_ko/1008/subview.do: 캡슐호텔 다락휴(T1), 교통센터 1층 중앙. Исправление оригинала и 11 переводов согласовано владельцем 26.10 |
| MIA | parking.text | la commissione di prenotazione di 2,99 | la commissione di prenotazione | числа | Официальный источник miami-airport.com/airport-parking.asp даёт 2.99 без валюты; в условиях booking.mia-parking.com/terms-and-conditions суммы нет. Не придумываем валюту: неполную сумму убрали, невозвратность сбора сохранили. Правка подтверждённых проблем оригинала во всех языках разрешена владельцем 26.10 |
| ICN | sleep.text | nella parte centrale del centro di trasporto al livello 1 | nella parte centrale del centro di trasporto | смысл | Повторная проверка: английский официальный каталог даёт Center of Transportation Center 1BF, корейский 교통센터 1층 중앙. По CLAUDE.md при противоречии факт не публикуется: убран только спорный этаж Darakhyu, центр транспортного центра сохранён |
