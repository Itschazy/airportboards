# Независимая рецензия первых переводов топ-100: en, de, fr, es, it, tr

Дата: 26.10.2026. Метод: независимая модельная рецензия, **не проверка носителем и не выборка в ChatGPT**. Все тексты прочитаны и сопоставлены с русским оригиналом по каждому утверждению. Сеть и браузер не использовались; это проверка верности перевода, а не повторное подтверждение фактов на живых официальных сайтах. JSON не изменялись. Ни коммитов, ни команд git не выполнялось.

## Объём

Прочитаны русские оригиналы `ops/guide-collection/top100-2025/drafts/SFO.json`, `MUC.json`, `DOH.json` и все 18 файлов перевода:

- `ops/guide-translation/top100-2025/drafts/en/SFO.json`
- `ops/guide-translation/top100-2025/drafts/en/MUC.json`
- `ops/guide-translation/top100-2025/drafts/en/DOH.json`
- `ops/guide-translation/top100-2025/drafts/de/SFO.json`
- `ops/guide-translation/top100-2025/drafts/de/MUC.json`
- `ops/guide-translation/top100-2025/drafts/de/DOH.json`
- `ops/guide-translation/top100-2025/drafts/fr/SFO.json`
- `ops/guide-translation/top100-2025/drafts/fr/MUC.json`
- `ops/guide-translation/top100-2025/drafts/fr/DOH.json`
- `ops/guide-translation/top100-2025/drafts/es/SFO.json`
- `ops/guide-translation/top100-2025/drafts/es/MUC.json`
- `ops/guide-translation/top100-2025/drafts/es/DOH.json`
- `ops/guide-translation/top100-2025/drafts/it/SFO.json`
- `ops/guide-translation/top100-2025/drafts/it/MUC.json`
- `ops/guide-translation/top100-2025/drafts/it/DOH.json`
- `ops/guide-translation/top100-2025/drafts/tr/SFO.json`
- `ops/guide-translation/top100-2025/drafts/tr/MUC.json`
- `ops/guide-translation/top100-2025/drafts/tr/DOH.json`

У каждого языка 16 блоков: SFO — 7, MUC — 5, DOH — 4. Всего 96 переведённых блоков; у каждого прочитаны title/hint/text. About нет в оригиналах и переводах. JSON читаются; наборы блоков полные; все 96 hint не длиннее 35 символов. Заголовки соответствуют содержанию, ошибочного наследования темы MIA не обнаружено.

## Обязательные точечные правки

Пути ниже относительно `ops/guide-translation/top100-2025/drafts/`. Под «обязательными» понимается устранение расхождения с **нынешним русским оригиналом**, а не утверждение об ошибке официального сайта. Это небольшие смысловые сдвиги; критических переворотов условий не найдено.

### Положение Taxi Pavilion: DOH, taxi.text — все 6 языков

Русский оригинал говорит «в левой части зала прилёта», но перевод добавляет более точное положение «у левого конца/на крайнем левом краю». Если при дальнейшей проверке коллектора источник обосновывает именно край, можно синхронно уточнить русский оригинал и все 11 переводов. Без такого уточнения перевод должен сохранить исходную точность.

- `en/DOH.json`: `at the left end of the arrivals hall` → `on the left side of the arrivals hall`. Причина: часть зала не обязательно его конец.
- `de/DOH.json`: `am linken Ende der Ankunftshalle` → `im linken Teil der Ankunftshalle`. Та же причина.
- `fr/DOH.json`: `à l’extrémité gauche du hall des arrivées` → `dans la partie gauche du hall des arrivées`. Та же причина.
- `es/DOH.json`: `en el extremo izquierdo del vestíbulo de llegadas` → `en la parte izquierda del vestíbulo de llegadas`. Та же причина.
- `it/DOH.json`: `all’estremità sinistra della sala arrivi` → `nella parte sinistra della sala arrivi`. Та же причина.
- `tr/DOH.json`: `gelen yolcu salonunun sol ucundadır` → `gelen yolcu salonunun sol tarafındadır`. Та же причина.

### Тип машины: DOH, taxi.text — fr, tr

- `fr/DOH.json`: `Des berlines et minibus sont disponibles` → `Des berlines et monospaces sont disponibles`. В оригинале «минивэны», а minibus — микроавтобусы; monospaces передаёт тип легкового минивэна, не вводя класс обслуживания.
- `tr/DOH.json`: `Sedan ve minibüsler` → `Sedan ve minivan araçlar`. В оригинале минивэны, а не маршрутные/малые автобусы. Не добавлять VIP, luxury или иной класс.

Эти две замены относятся к тому же полю taxi.text, что и исправления положения павильона выше. В статистике полей отдельно не удваиваются.

### К чему относится приблизительность: MUC, transport.text — en, fr

- `en/MUC.json`: `S8 runs round the clock: about every 40 minutes from 01:00 to 04:00 and every 20 minutes at other times.` → `S8 runs round the clock: every 40 minutes from approximately 01:00 to 04:00 and every 20 minutes at other times.` В русском примерно относится к временному диапазону 01:00–04:00, а перевод относит его к интервалу 40 минут. Значения не меняются.
- `fr/MUC.json`: `La S8 circule 24 heures sur 24 : toutes les 40 minutes environ de 01:00 à 04:00, et toutes les 20 minutes le reste du temps.` → `La S8 circule 24 heures sur 24 : toutes les 40 minutes, approximativement de 01:00 à 04:00, et toutes les 20 minutes le reste du temps.` Та же причина. Уточнение можно передать и естественной равнозначной формой, сохранив область действия приблизительности.

## Факультативная редактура — не исправления фактов

- `en/SFO.json`, storage.title: `Left luggage` → `Baggage storage`. Американская терминология у SFO; нынешнее выражение понятно и не меняет услугу. У MUC британское Left luggage допустимо.
- `tr/SFO.json`, storage.text: `Dianne Feinstein International Terminal G’nin Kat 3 bölümündeki` → `Dianne Feinstein International Terminal G’de Kat 3’teki`. Более естественное обозначение этажа без придуманного «отделения этажа». Номер остаётся 3, не «3. kat».
- `tr/SFO.json`, parking.text: `otopark binasının Kat 5 bölümündedir` → `otopark binasında Kat 5’tedir`. То же правило, номер 5 сохраняется.
- `tr/MUC.json`, storage.text: `Munich Airport Center’ın Kat 03 bölümündeki halka açık alandadır` → `Munich Airport Center’da Kat 03’te, halka açık alandadır`. Сохранить именно 03.
- `tr/MUC.json`, kids.text: `Munich Airport Center’ın Kat 03 bölümündeki oyun alanı` → `Munich Airport Center’da Kat 03’teki oyun alanı`. То же правило.
- `fr/DOH.json`, transport.text: `La station de métro de l’aéroport Hamad International Airport` → `La station de métro située à Hamad International Airport`. Убрать повтор airport/аэропорт, сохранить официальное имя и не выдать его за собственное название станции.
- `es/DOH.json`, transport.text: `La estación de metro del aeropuerto Hamad International Airport` → `La estación de metro de Hamad International Airport`. Та же причина.
- `it/DOH.json`, transport.text: `La stazione della metropolitana nell’aeroporto Hamad International Airport` → `La stazione della metropolitana di Hamad International Airport`. Та же причина.

## Полная проверка важных условий

- SFO/transport: BART именно в международном терминале; AirTrain соединяет внутренние и международные терминалы; центр проката доступен по синей линии. Во всех 6 языках совпадает.
- SFO/taxi: стоянки у центральных островков, уровень прилёта/багажа, все терминалы; координаторы 07:00–02:00. $6 именно **включён в сумму**, ограничение именно на San Francisco taxis from SFO; поездки в аэропорт исключены. В 6 языках нет превращения сбора в дополнительные $6 сверх уже указанной суммы. Wheelchair taxis и номер *1107 с аэропортового бесплатного телефона сохранены.
- SFO/storage: только Airport Travel Agency, Dianne Feinstein International Terminal G, уровень 3; багаж/собаки/лыжи/велосипеды/каноэ; цена по размеру. Совпадает.
- SFO/sleep: у въезда, доступность от всех терминалов через AirTrain/дорогу. Совпадает.
- SFO/kids: 7 зон после досмотра; T1 B2/B18; T2 D15/D7; T3 F17/E7 и food court у F11–F22. Во всех языках совпадает; французское porte и турецкое numaralı kapı в этом контексте — посадочные выходы.
- SFO/parking: $4/30 минут, максимум $27/24 часа, налоги и сборы включены; крытые/открытые места; Blue Line круглосуточно; **4 минуты возможный интервал**, не безусловное расписание; уровень 5; возможность изменения тарифа. Совпадает. Английское can be as frequent as every 4 minutes передаёт оговорку, а не обещает постоянные 4 минуты.
- SFO/wifi: сеть #SFO FREE WIFI, все терминалы, бесплатно, открыть браузер, использование означает принятие условий. Совпадает.
- MUC/transport: 40 минут до главного вокзала; S8 круглосуточно, 40 минут ночью/20 в остальное время; S1 03:00–полночь/20 минут, круглосуточно лишь выходные и праздники; автобус через Munich North (Schwabing), каждые 20 минут, поездка 45 минут. Всё сохранено; 2 небольших замечания об области приблизительности выше.
- MUC/storage: общедоступная зона Munich Airport Center, уровень 03, ежедневно 05:00–23:30, +49 89 975 214 75. Совпадает.
- MUC/sleep: napcabs в T2 после досмотра и в публичной зоне; отдельное рабочее место, бесплатный интернет; XL у G06, queen-size для двоих, стол и кресло. Обычные 17/12 EUR в час для 06:00–22:00/22:00–06:00, минимум 34 EUR; XL **соответственно в эти же диапазоны** 24,50/18 EUR в час, минимум 49 EUR. Во всех языках привязка сохранена, суммы/валюта/час не перевёрнуты.
- MUC/kids: публичные и ограниченные зоны; MAC 03 публичный и круглосуточный; наблюдение взрослых и сопровождение при выходе. Совпадает.
- MUC/wifi: бесплатный Free Wifi – Munich Airport, email и принятие условий; не добавлены последовательность регистрации, пароль или лимит. Совпадает.
- DOH/transport: станция **в** Hamad International Airport, а не станция с выдуманным собственным именем; районы Дохи, 7 дней, кондиционеры, доступность маломобильным, часы и последние отправления на экранах. Совпадает.
- DOH/taxi: Mowasalat все аэропортовые такси; MasterCard/VISA/Apple Pay/Google Pay/NAPS; Karwa заранее по +974 800 8294/приложение/karwa.qa; доступная машина предварительно через Mowasalat +974 4458 8888. Нет добавленного тарифа, класса или запрета на наличные: наличие cashless payment не означает «только безналично». Замечания о положении павильона и типе машины выше.
- DOH/sleep: раздельные комнаты мужчины/женщины/семьи, кресла для отдыха/чтения/короткого сна, карта/указатели. **Не добавлено обещание бесплатности**, кроватей или отдельного личного номера.
- DOH/wifi: бесплатно весь пассажирский терминал #HIAQatar, вход; киоски экраны/клавиатуры, бесплатно web browsing, в том числе gate areas. Нет неподтверждённого четырёхчасового ограничения.

## Статистика предложенных обязательных исправлений

Единица — изменяемое поле; две причины внутри DOH/taxi.text у fr/tr считаются одним полем. Смысловое уточнение приблизительности не меняет числовое значение, поэтому отнесено к смыслу.

| Язык | Смысл | Числа/валюта | Имена | Обязательный стиль | Всего полей | Факультативный стиль |
|---|---:|---:|---:|---:|---:|---:|
| en | 2 | 0 | 0 | 0 | 2 | 1 |
| de | 1 | 0 | 0 | 0 | 1 | 0 |
| fr | 2 | 0 | 0 | 0 | 2 | 1 |
| es | 1 | 0 | 0 | 0 | 1 | 1 |
| it | 1 | 0 | 0 | 0 | 1 | 1 |
| tr | 1 | 0 | 0 | 0 | 1 | 4 |
| **Всего** | **8** | **0** | **0** | **0** | **8** | **8** |

Итого 10 обязательных замен в 8 полях; ни одна здесь не внесена. Обязательные мелкие расхождения не должны представляться как 10 критических ошибок. Повторную проверку после внесения правок и выборку ChatGPT ещё предстоит выполнить.
