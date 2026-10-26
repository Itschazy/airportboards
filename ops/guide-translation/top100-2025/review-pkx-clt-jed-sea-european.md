# Независимая рецензия PKX / CLT / JED / SEA: en, de, fr, es, it, tr

26.10.2026. Офлайн независимая **модельная** рецензия, не носителем и не ChatGPT. Сверены именно русские черновики с переводами. Проверка сайтов и доказательство инструкции PKX Wi-Fi выполняются отдельно: данный отчёт **не подтверждает** эти внешние факты. JSON не изменялись, браузер/сеть/git не использовались.

## Объём

Оригиналы: все четыре `ops/guide-collection/top100-2025/drafts/{PKX,CLT,JED,SEA}.json`. Переводы: все 24 файла относительно `ops/guide-translation/top100-2025/drafts/`:

| Язык | Полностью прочитанные файлы |
|---|---|
| en | en/PKX.json, en/CLT.json, en/JED.json, en/SEA.json |
| de | de/PKX.json, de/CLT.json, de/JED.json, de/SEA.json |
| fr | fr/PKX.json, fr/CLT.json, fr/JED.json, fr/SEA.json |
| es | es/PKX.json, es/CLT.json, es/JED.json, es/SEA.json |
| it | it/PKX.json, it/CLT.json, it/JED.json, it/SEA.json |
| tr | tr/PKX.json, tr/CLT.json, tr/JED.json, tr/SEA.json |

Прочитаны title/hint/text каждого блока: PKX 4, CLT 4, JED 1, SEA 1 = 10 на язык, **60 блоков**. About нет. Все JSON валидны. Единственное превышение hint на момент чтения — en/JED/sleep: 36 символов `Aerotel, international departures T1`. Родитель уже запланировал `Aerotel, international flights T1` (31), повторно не считаем новой находкой. Остальные 59 hints ≤35.

## Прямые точечные предложения по переводам

Пути относительно каталога переводов; ничего из предложенного здесь не внесено.

1. **de/CLT.json, parking.text — утрачен порядок очереди.** `Stellplätze gibt es mit Reservierung oder nach Verfügbarkeit bei der Einfahrt` → `Stellplätze gibt es mit Reservierung oder bei der Einfahrt in der Reihenfolge der Ankunft`. В оригинале не просто наличие мест, а first-come, first-served при въезде.
2. **tr/SEA.json, transport.text — последовательность движения.** `Skybridge Six’i geçtikten sonra otoparktan sola dönerek SeaTac/Airport istasyonuna gidilir` → `Skybridge Six’i geçtikten sonra sola dönüp otoparkın içinden geçerek SeaTac/Airport istasyonuna gidilir`. Русский текст: перейти мост, **повернуть налево и пройти через парковку**; otoparktan sola dönerek может читаться как «повернуть налево из парковки».
3. **fr/JED.json, sleep.text — рекомендация не должна становиться запретом.** `Les passagers en transit ne doivent pas franchir le contrôle des passeports à l’arrivée` → `Il est déconseillé aux passagers en transit de franchir le contrôle des passeports à l’arrivée`. В оригинале «не следует», а ne doivent pas обычно выражает запрет. Последующее реальное ограничение на возврат без boarding pass оставить без ослабления.
4. **es/JED.json, sleep.text — та же область модальности.** `Los pasajeros en tránsito no deben pasar el control de pasaportes de entrada` → `Se recomienda a los pasajeros en tránsito no pasar el control de pasaportes de entrada`. No deben допускает чтение «нельзя»; рекомендация явно сохраняет исходную силу.
5. **it/JED.json, sleep.text — та же область модальности.** `I passeggeri in transito non devono superare il controllo passaporti in arrivo` → `Si raccomanda ai passeggeri in transito di non superare il controllo passaporti in arrivo`. Не менять следующую фразу о невозможности вернуться без действительного посадочного талона.

Пункты 3–5 — небольшая точность модальности, не утверждение, будто переводчики перевернули всё правило доступа.

## Места для согласования с отдельным проверяющим фактов

### SEA: слово «крытая/здание» добавлено в 5 переводах

В текущем русском тексте только «через парковку». Английский parking garage / немецкий Parkhaus / французский parking couvert / испанский aparcamiento cubierto / итальянский parcheggio coperto утверждают более конкретный тип сооружения. Сам по себе офлайн рецензент **не знает**, какая версия точнее источнику.

Если официальный источник подтверждает parking garage, лучше уточнить русский оригинал и проверить синхронизацию всех языков. Если не подтверждает, точные ослабления:

- `en/SEA.json`, transport.text: `through the parking garage` → `through the parking area`.
- `de/SEA.json`, transport.text: `durch das Parkhaus` → `durch den Parkplatzbereich`.
- `fr/SEA.json`, transport.text: `à travers le parking couvert` → `à travers le parking`.
- `es/SEA.json`, transport.text: `por el aparcamiento cubierto` → `por el aparcamiento`.
- `it/SEA.json`, transport.text: `nel parcheggio coperto` → `attraverso il parcheggio`.

Не объявлять «гараж неверен» без проверки сайта: установлено только отсутствие уточнения в RU.

### CLT: банковские карты vs credit cards

RU говорит «основные банковские карты». EN `Major credit cards`, DE `Gängige Kreditkarten` уже по типу карты; турецкое `Başlıca banka kartları` может читаться именно как дебетовые. Это не запрет других карт, но перечисляемый тип отличается. Отдельный проверяющий должен установить точную формулировку источника. Если источник говорит major credit cards, уточнить русский и синхронно все переводы. Если исходный русский остаётся без уточнения типа:

- `en/CLT.json`, taxi.text: `Major credit cards are accepted` → `Major bank cards are accepted`.
- `de/CLT.json`, taxi.text: `Gängige Kreditkarten werden akzeptiert` → `Gängige Bankkarten werden akzeptiert`.
- `tr/CLT.json`, taxi.text: `Başlıca banka kartları kabul edilir` → `Başlıca ödeme kartları kabul edilir`.

Эти условные предложения в статистику прямых исправлений не включены: фактическое решение зависит от источника.

## Факультативная естественность

- `tr/JED.json`, sleep.text: `Transit yolcular ülkeye giriş pasaport kontrolünden geçmemelidir` → `Transit yolcuların ülkeye giriş pasaport kontrolünden geçmemeleri önerilir`. -meli может выражать should и само по себе допустимо; новая форма явно подчёркивает рекомендацию и согласуется с предложениями FR/ES/IT.
- `tr/PKX.json`, transport.text: `terminalin Kat B1 bölümünden` → `terminalde Kat B1’den`. Убрать искусственное «отделение этажа», обозначение B1 не меняется.
- `es/PKX.json`, kids.text: `toboganes y otros juegos` → `toboganes y otros equipos de juego`. Точнее передаёт «игровое оборудование», не просто сами игры.
- `fr/PKX.json`, storage.text: `ouvre 24 heures sur 24` → `est ouvert 24 heures sur 24`. Естественнее для непрерывной работы учреждения; это также относится к формам «ouvre de …» в справочной, но они допустимы и не меняют часы.

## Полная проверка условий и чисел — все шесть языков

### PKX transport

- Caoqiao / Daxing Xincheng / Daxing Airport, пересадки Caoqiao на **10 и 19**, посадка **B1** — сохранены.
- **Caoqiao → аэропорт 05:30–22:30**, не обратное направление.
- **Аэропорт → Caoqiao 06:00–23:00 понедельник–суббота**, воскресенье до **23:30** — сохранены, продление не приписано всей неделе.
- **Рост ≤1,3 м включительно**, бесплатно только ребёнку при сопровождении **оплачивающего проезд взрослого**. Во всех 6 переводах сохранены включённая граница, рост (не возраст) и оплата взрослого.

### PKX storage

- Хранение **1–90 дней**, не свободный безлимитный срок.
- Пункт **Level 2**, **30 м восточнее восточного выхода из domestic arrivals**, круглосуточно.
- Пункт **Level 4**, восточная часть departures, конец острова **H**, **07:00–22:00**. Exit из здания и boarding gate не перепутаны.
- Оплата **за место за день**, зависит от размера, не за всё бронирование и не в час.
- **240-hour visa-free transit eligibility** и бесплатно **1 место багажа** сохранены. Не обещано всем бесплатно, 240 часов бесплатного хранения или любое количество вещей.
- Этажи Level/Ebene/niveau/nivel/livello/Kat, без first floor / Etage / piso / primo piano / порядковых kat.

### PKX kids

- Авиационная тема, модели самолётов/горки/оборудование, hall/concourse **A у boarding gate A10**, **08:00–21:00** сохранены.
- Нет выдуманного ограничения возраста/бесплатности/стороны досмотра. Во французском text porte d’embarquement, не дверь здания.

### PKX wifi

- Точное имя **BDIA-FREE-WiFi**, бесплатно.
- Сохранена ссылка на **иллюстрированную инструкцию**, а не собственное обещание агента о всех способах входа.
- Последовательность: **ID Login → тип документа → сфотографировать документ**. Не добавлены телефон, SMS, сканирование лица, лимит сессии.
- Это только сверка перевода. До доказательства исходного факта по PNG нельзя считать блок независимо проверенным внешне.

### CLT taxi

- **Outer curb arrivals/baggage claim Zone 1**, основное **05:00–полночь ежедневно**, вне интервала машины **могут** быть, не гарантированно.
- **32 USD до Uptown внутри I 277**, **16 USD для радиуса 3 мили** — не перепутаны.
- **2,50 USD сверх тарифа к каждой поездке**, не только Uptown, не уже включены. Валюта/дробная часть сохранены.
- Карточная терминология отмечена отдельно, запрета наличных не добавлено.

### CLT kids

- Mother’s Rooms **всем кормящим матерям**, шторы, мягкие сиденья/розетки, каждая имеет changing table/sink.
- Все 4 локации: соединение A между **A1–A13 и A21–A29**; у **A31**; security checkpoint **3**, стык **D/E**; между **E32/E36**. Диапазоны не спутаны с двумя одиночными выходами.
- Пеленальные столики также **все мужские/женские/семейные туалеты**, не только Mother’s Rooms.

### CLT parking

- **Круглосуточно круглый год**, booking или first-come при въезде (DE уточнить очередь).
- **Booked / Reservation Only** не пускают без брони, **действующая бронь сохраняет доступ**, не отменяется статусом.
- Во **всех** парковках места для пассажиров с инвалидностью и непрерывно курсирующие приспособленные шаттлы. Нет обещания конкретного специального оборудования или отдельного тарифа.
- **Valet бронировать минимум за 3 часа** — не длительность парковки, не максимальное окно и не любой общий parking.

### CLT wifi

- **CLT Free WiFi бесплатно во всём терминале**; зарядные станции во всех concourses.
- Розетки/USB-сиденья именно **A1–A39, B1–B16, C2–C19**, не C1–C19.
- Дополнительные розетки **Atrium и все concourses**. Нет выдуманной бесплатности зарядки отдельно от сети.

### JED sleep

- Aerotel Jeddah, **Terminal 1 international departures restricted area, Level 2, возле Duty Free, после transit security** — сохранены. Не перепутано с public arrivals или другим terminal.
- **Только domestic нельзя**; **domestic + international — уточнить у авиакомпании/customer service**, а не безусловное разрешение.
- Совет **не проходить arrivals immigration**; фактическое ограничение возврата без **действительного boarding pass следующего рейса** сохранено.
- **120 rooms**, почасовое бронирование; **номера для маломобильных гостей по запросу**, не обязательное наличие любой выбранной даты, не все номера accessible.
- Слово accessible относится к гостевым номерам, не ошибочно к всему отелю или бесплатности.

### SEA transport

- **38 минут — время поездки до Seattle downtown**, а **8–10 минут — интервал большую часть дня**, сохранены.
- От **carousel 16** подняться на skybridge level, пересечь **Skybridge Six**, налево **через парковку** к **SeaTac/Airport**. Турецкую последовательность уточнить; тип парковки согласовать отдельно.
- Бесплатные **электрокары**, не shuttle bus/train, **всем пассажирам**, между station/bridge, **ежедневно 05:00–полночь**. Нет ограничения только маломобильным.
- **Night Bus Sound Transit: примерно каждые 30 минут**, не поездка 30 минут. Старт **примерно спустя 15 минут после последнего поезда**, не окончание перед ним.
- Seattle во всех этих европейских языках общепринятая форма; официальные имена объектов не заменены переводом «по памяти».

## Статистика прямых предложений

| Язык | Смысл/модальность | Числа/валюта | Имена | Обязательный стиль | Полей всего |
|---|---:|---:|---:|---:|---:|
| en | 0 | 0 | 0 | 0 | 0 |
| de | 1 | 0 | 0 | 0 | 1 |
| fr | 1 | 0 | 0 | 0 | 1 |
| es | 1 | 0 | 0 | 0 | 1 |
| it | 1 | 0 | 0 | 0 | 1 |
| tr | 1 | 0 | 0 | 0 | 1 |
| **Всего** | **5** | **0** | **0** | **0** | **5** |

Отдельно 4 факультативных поля, 5 SEA-полей с условным уточнением типа парковки и 3 CLT-поля с условной карточной терминологией. En/JED hint был известен и запланирован к исправлению родителем до этой рецензии, в новые находки не включён. Не обнаружены критические перевороты тарифов, бесплатности хранения, роста/возраста или правил доступа. Все предложения требуют принятия родителем и повторных штатных проверок; эта модельная рецензия не заменяет отдельную выборку ChatGPT.
