# Топ-100, batch1 part1 — ATL / BOM / CGK

Независимый проверяющий Codex, 26.10.2026. Проверены текущие `drafts/{ATL,BOM,CGK}.json` по предоставленным официальным снимкам `/tmp/airports-top100-batch1/`. Только офлайн-чтение; JSON, браузер, сеть, git не менялись. Перечисленные ниже статусы относятся к содержимому снимков, а не к знанию проверяющего об аэропортах.

## Ограничение доказательств

Пять основных/вспомогательных снимков сохранились как **приращения accessibility tree**, а не полные тексты. В них нет утверждений черновика, поэтому эти блоки нельзя помечать проверенными. Отсутствие в diff не доказывает отсутствия на странице; это дефект сохранения доказательства, а не установленная фактическая ошибка. Основному исполнителю передана просьба предоставить полные исходные деревья/тексты.

| Аэропорт / блок | URL | Снимок | Состояние |
|---|---|---|---|
| ATL transport и terminals | https://itsmarta.com/getting-to-airport.aspx | `/tmp/airports-top100-batch1/ATL-transport.txt`, 5 строк | Только diff картинки thumbnail и ссылки выбора языка. Нет текста о MARTA/шаттле. |
| ATL sleep | https://minutesuites.com/locations/atlanta-airport/ | `/tmp/airports-top100-batch1/ATL-sleep.txt`, 65 строк | Только diff рекламного giveaway popup. Нет описания номеров/мест/душа. |
| BOM lounges | https://www.aviserv.co/lounge-west-pier/ | `/tmp/airports-top100-batch1/BOM-lounges.txt`, 2 строки | There has been no change in the accessibility tree. Нет текста страницы. |
| BOM контакты, вспомогательный снимок | https://www.aviserv.co/contacts/ | `/tmp/airports-top100-batch1/BOM-contacts.txt`, 2 строки | Та же проблема no change. К тому же это другой URL, он не заменяет источник блока. |
| CGK sleep | https://www.jakartaairporthotel.com/ | `/tmp/airports-top100-batch1/CGK-sleep.txt`, 6 строк | Только diff popup с картинкой и Close, нет описания отеля. |

## ATL lounges — подтверждено

URL: https://theclubairportlounges.com/lounges/atl-the-club-concourse-f . Полный снимок `/tmp/airports-top100-batch1/ATL-lounges.txt`, 552 строки.

- The Club ATL, Concourse F: заголовок/описание и How to get here, строки 163–209. Уровень Mezzanine точно совпадает; при переводе это подпись уровня, не выведенный из неё номер этажа.
- После досмотра: FAQ Who can use the lounge, строки 393–399, прямо after security in the departure area.
- Ежедневно 06:00–22:00: Opening hours, строка 177. Hint совпадает.
- Club Pass за 50 USD: BOOK FOR $50 и селектор валюты USD, строки 11–13, 164–167. Валюта не угадана по знаку $ — она задана интерфейсом.
- Доступ через eligible third-party programs, включая Priority Pass и LoungeKey: строки 397–399. Черновик сохраняет условность «подходящие программы», не обещает доступ любому держателю любой банковской карты. OR между Club Pass и программами не заменён на AND.
- Club Pass: вход up to 3 hours before scheduled departure; PP/Lounge Key: 2.5 hours prior: строка 214. В черновике это окна входа, а не ошибочно объявленный лимит пребывания 3/2,5 часа. Время отсчитывается от вылета по расписанию, а не от фактического вылета.
- Дети младше 2 лет бесплатно; возраст 2 и старше — собственный pass: строки 215 и 412. «До 2 лет» не включает день двухлетия; черновик верен.
- Все дети 17 лет включительно — со взрослым 18 лет или старше: те же строки. Возрастные границы переданы верно.

**Общий FAQ о 3 часах:** строка 417 отвечает на «How early can I access the lounge on the day of my booking?». В конкретных Notes выше программы разделены явно, а booking/Club Pass контекст объясняет общий ответ FAQ о трёх часах. Это не даёт оснований заменить PP/LoungeKey 2,5 часа на 3. Если редактор считает общий FAQ противоречием, безопасный альтернативный вариант — убрать конкретные окна входа, а не самостоятельно уравнять программы. В текущем черновике использовано более конкретное правило; фактической ошибки не установлено.

Неподтверждённых утверждений в ATL lounges не найдено. Обязательных исправлений по полному снимку нет. Стилистическое предпочтение «конкорс» вместо «зал» не является фактической ошибкой и не требует правки.

## ATL transport / terminals — подтверждены дополнительным полным снимком

URL: https://itsmarta.com/getting-to-airport.aspx . Первоначальный diff `/tmp/airports-top100-batch1/ATL-transport.txt` непригоден для содержательной сверки; основной исполнитель указал полный ранее сохранённый текст `/tmp/airports-top100-sources/ATL-marta.txt`. Проверяющий открыл и прочитал полный файл.

Подтверждено для transport:

- MARTA Airport Station внутри Domestic Terminal между North и South baggage claims.
- Red и Gold идут непосредственно к/от Airport Station.
- После 8:30 pm (20:30) для поездок из аэропорта к Buckhead, Medical Center, Dunwoody, Sandy Springs, North Springs **может** потребоваться пересадка на Red Line на Lindbergh Center. Черновик сохраняет модальность may need и все пять названий, а не заявляет обязательную пересадку для любого направления.
- Hint «Линии Red и Gold» подтверждён.

Подтверждено для terminals:

- На arrivals level International Terminal есть бесплатный шаттл до Domestic Terminal baggage claim.
- Domestic остановка снаружи Baggage Claim.
- International Terminal shuttles operate 24/7, поездка между терминалами 15 минут. Это длительность поездки, не частота отправлений; черновик не путает эти величины.
- Hint сохраняет бесплатность и круглосуточность.

В другом абзаце условие о check-in относится к выбору способа поездки Domestic → International. Черновик описывает International → Domestic по отдельному прямому ответу источника и не переносит эту условную развилку на обратное направление. Неподтверждённых условий нет, правки не нужны.

## Повторная сверка восстановленных полных снимков

Коллектор пересохранил страницы полным видимым DOM-текстом. Прежние ограничения выше оставлены как история обнаруженного дефекта сохранения; актуальные статусы ниже заменяют прежние статусы ожидания. Проверяющий прочитал восстановленные файлы целиком.

### ATL sleep — подтверждено

URL https://minutesuites.com/locations/atlanta-airport/ ; полный `/tmp/airports-top100-batch1/ATL-sleep.txt`.

- Все точки past TSA: прямо основной текст и FAQ.
- Concourse B near Gate B24; E Atrium/Escalators; F near Gate F6 — все три места совпадают. Gate означает выход на посадку.
- Each private suite includes daybed sofa with pull-out trundle bed, Smart TV, complimentary Wi-Fi, workspace surface, charging ports. Черновик не подменяет это двуспальной кроватью; выдвижное дополнительное спальное место сохранено.
- Pillows and blankets upon request — условие сохранено.
- Reservations starting at one hour — минимальная бронь 1 час, не цена 1 час и не максимум пребывания.
- Showers exclusively at Concourse E — E-only, не все точки. Черновик не обещает бесплатный душ или его включённость в оплату комнаты.
- Hint о размещении после досмотра подтверждён.

Все утверждения подтверждены, фактических исправлений нет.

### BOM lounges — подтверждено с оговоркой по слову Gate

URL https://www.aviserv.co/lounge-west-pier/ ; полный `/tmp/airports-top100-batch1/BOM-lounges.txt`.

- Страница называется Lounge (West Pier), бренд Aviserv в шапке/подвале. Имя черновика Aviserv West — краткое обозначение этой точки, не другое отделение.
- Точно указано T2 arrivals towards Gate A.
- Перечислены Food and Beverages, Shower Facilities, Sleeping Pods, Private Seating Area. Черновик не объявляет ни одну услугу бесплатной, не выдумывает часы/цены.
- Hint arrivals T2 совпадает.

Gate A дан в **прилёте**, а не как boarding gate. Перевод «выход на посадку A» был бы неподтверждённым. Текущая «дверь A» передаёт ориентир в зоне прилёта, однако слово Door в самом источнике отсутствует; если нужно строго сохранить знак без интерпретации его конструкции, безопасно «в направлении Gate A». Это оговорка точности терминологии, не установленная ошибка места. Номер A подтверждён, не C.

Вспомогательный https://www.aviserv.co/contacts/ , полный `/tmp/airports-top100-batch1/BOM-contacts.txt`, описывает **Aviserv Lounge (East)** у Exit Gate C, P-6, L-2, Arrival Hall T2. Он подтверждает работу бренда в BOM, но его Gate C, уровни и телефоны нельзя переносить в West. Основной черновик этого не делает. Sleeping-pods общий также не используется для добавления места/цены.

`/tmp/airports-top100-batch1/BOM-waf.txt`: официальный аэропорт https://csmia-mumbai.adaniairports.com/en/airport-facilities/wifi-service дал F5 403. Это реальное ограничение посещения, не преодолённое проверяющим. Wi-Fi блок отсутствует правильно.

Обязательных фактических исправлений нет; термин Gate A оставить однозначно вне boarding-контекста.

### CGK sleep — подтверждено

URL https://www.jakartaairporthotel.com/ ; полный `/tmp/airports-top100-batch1/CGK-sleep.txt`.

- Jakarta Airport Hotel, Soekarno-Hatta International Airport Terminal2, above departure hall — место/имя совпадают.
- Free shuttle service to all airport terminals; free WiFi — бесплатность относится к обоим выбранным сервисам.
- Air conditioning; TV; personal safe; tea/coffee facilities; en-suite bathroom with shower. Всё прямо есть, черновик не превращает общую ванную в отдельную или наоборот.
- 24-hour front desk **и** 24-hour room service. В черновике оба круглосуточны — верно; не переносить 24 часа на все прочие услуги.
- Luggage storage входит в список услуг, но free перед ним отсутствует. Черновик не обещает бесплатного хранения — верно.
- Hint «над залом вылета Т2» подтверждён.

Не заявлены доступ после досмотра, бесплатный номер, расписание трансфера, тариф или безвизовый доступ. Обязательных исправлений нет.

## Актуальный итог повторной проверки

Все 6 блоков ATL/BOM/CGK содержательно подтверждены полными официальными снимками. Необязательное терминологическое уточнение у BOM — исходный знак Gate A в arrivals можно сохранить как Gate A, не превращая его в boarding gate; буквальное Door не дано. Других фактических правок не требуется. Проблема snapshot-diff устранена пересохранением полного DOM, а не домысливанием отсутствующих доказательств. JSON, git, сеть и браузер проверяющий не менял/не использовал.
