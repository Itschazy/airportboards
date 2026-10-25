# Рецензия перевода справочной — de

Проверены все 76 файлов `data/airport-guide/de/` против `data/airport-guide/<IATA>.json`: каждый блок
и `about`, по смыслу, числам, именам и стилю. Перевод в целом точный: числа, цены, время и коды
маршрутов (111Э, 244-Э, 106н, 110С, Т1, 39Э, 652Т, 8А, А50, А-105, М-52, 3Б) совпадают с оригиналом.
Посторонних языков нет: каждый файл целиком немецкий, следов испанского или другого языка нет.
`node scripts/check-guide-fresh.mjs` по de чистый (76/76, без провалов).

## Сводка правок

| Тип | Правок | Что |
|---|---|---|
| Смысл | 6 + системная правка этажей (≈265 мест в 58 файлах) | этажи, BQS «м-н», ARH, NOJ, KZN, VKO |
| Числа и единицы | 4 | «в сутки» → не «pro Nacht» |
| Имена | 6 | Tiflis, Scharm asch-Scheich, Rosa Chutor, Polutschit, Severstal, BTK title |
| Стиль | 13 | вложенные кавычки (5 файлов), грамматика, калька |

## Системная правка: этажи (смысл)

«1 этаж» был переведён как «1. Etage». В немецком «1. Etage» — это первый этаж НАД первым, то есть
русский второй; читатель пошёл бы не на тот этаж. Номер должен остаться тем же, что на табличке
аэропорта, поэтому везде использовано нейтральное «Ebene N», как пишут в немецких аэропортах:
- `in der N. Etage` / `in der ersten|zweiten|dritten Etage` → `auf Ebene N`;
- `N. Etage` в перечнях и `hint` → `Ebene N`; `Etage −1` → `Ebene −1`; `1.–2. Etage` → `Ebene 1–2`;
- DME terminals: `Passkontrolle in der 2.` → `Passkontrolle auf Ebene 2`;
- IKT kids: `(1. Etage VIP)` → `(Ebene 1, VIP)`;
- NSK terminals: `In der 1./2. Etage` → `Auf Ebene 1/2`;
- AYT parking: `im Erdgeschoss (P1)` → `auf Ebene 1 (P1)` — единообразие с остальными файлами.
Файлы: AER ARH ASF AYT BAX BQS BTK CEE CEK CSY DME EVN EYK GDX GDZ GOJ GYD HRG IJK IKT KEJ KGD KHV
KRR KUF KVX KZN LED MMK MRV NBC NER NJC NNM NOJ NOZ NSK NUX OVB PEE PKC REN RGK SCW SGC SVO SVX TBW
UFA ULV UUD UUS VKO VOG VVO ZIA. Число этажей здания («7 Etagen», «2 Etagen», «eine Etage höher»,
«Etagenpläne») не тронуто — там это количество, а не номер. «Untergeschoss» для «цокольный» оставлен.

## Поштучные правки

- **BQS transport** — «Haltestelle „Mikrorajon Blagoweschtschensk“» → «„M-n ‚Blagoweschtschensk‘“».
  Смысл: «м-н» в оригинале — обычное сокращение «магазин» (название в кавычках), микрорайон в этих
  файлах пишется «мкр»; переводчик раскрыл сокращение в другое слово. Оставлено как на табличке.
- **ARH about** — «wurde … abgefertigt» → «wurde … empfangen». Смысл: «принят первый рейс» — принят, а не обслужен.
- **NOJ lounges** — «mit eigenem Fahrzeug» → «mit separatem Fahrzeug». Смысл: «отдельным транспортом»; «eigenem» читается как «на своей машине».
- **KZN kids** — «Flaschenwärmer» → «Wärmegerät». Смысл: в оригинале просто «подогреватель», «для бутылочек» добавлено.
- **VKO lounges** — «1 Stunde vorher hinausgehen» → «die Lounge 1 Stunde vorher verlassen». Смысл/стиль: «выходить за 1 час» — покинуть зал, фраза была неясной.
- **AER storage** — «gelten als nicht abgeholt» → «gelten als herrenlos». Стиль: тавтология («не забранные считаются не забранными»), «невостребованные».
- **BTK sleep, HMA sleep, NOZ sleep, UUA sleep** — «pro Nacht» → «pro Tag». Единицы: в оригинале «в сутки»; сутки ≠ ночь (у HMA рядом отдельный «вечерний тариф 20:00–6:00»).
- **TBS transport** — «Zentrum Tbilisi» → «Zentrum Tiflis». Имена: немецкий экзоним, так и в `data/city-names.json` и в MCX.
- **SSH transport** — «Scharm El-Scheich» → «Scharm asch-Scheich». Имена: форма из `data/city-names.json`.
- **AER transport** — «Rosa Khutor» → «Rosa Chutor». Имена: единственная английская транслитерация среди дуденовских; латинской формы в тексте оригинала нет.
- **NBC wifi** — «„Poluchit dostup“» → «„Polutschit dostup“ (Zugang erhalten)». Имена: транслитерация по Дудену, как во всех файлах. Сама надпись оставлена: оригинал называет кнопку «Получить доступ»; пояснение в скобках — перевод надписи, не новый факт.
- **CEE about** — «dem Luftfahrtunternehmen von Severstal» → «dem Luftfahrtunternehmen „Severstal“». Имена: «Северсталь» — название авиапредприятия, а не владелец.
- **BTK lounges title** — «Lounge» → «Wartesaal». Имена/заголовок: в оригинале заголовок «Зал ожидания», а не «Бизнес-залы».
- **KZN about** — «Flughafen „Kasan“ „Gabdulla Tukai“» → «Flughafen „Kasan“, benannt nach Gabdulla Tukai». Стиль: две кавычки подряд.
- **BAX about, BAX sleep, IGT about, NSK about, TBW about, UFA about** — вложенные «„…„…““» → «„…‚…‘“». Стиль: немецкая типографика вложенных кавычек.
- **DME about** — «Linienflüge für Passagiere und Fracht führen …» → «Regelmäßige Passagier- und Frachtflüge führen …». Стиль: калька.
- **IKT kids** — «Mit dem Kind ein Erwachsener.» → «Das Kind begleitet ein Erwachsener.» Стиль: неполное предложение.
- **IST sleep** — «letzteres» → «letztere». Стиль: согласование (die Kabinen/Zone).
- **MMK storage** — «begleitet ein Mitarbeiter … zur Gepäckaufbewahrung» → «wird man von einem Mitarbeiter … begleitet». Стиль: не было дополнения.
- **MRV kids, PEE kids** — «rund um die Uhr und kostenlos geöffnet» → «rund um die Uhr geöffnet und kostenlos». Стиль: «бесплатно открыта».
- **NBC sleep** — «Hotel Hailey Airport Hotel Begishevo in Gehweite» → «Das Hailey Airport Hotel Begishevo liegt in Gehweite». Стиль: «Hotel … Hotel».
- **NJC kids hint** — «Mutter-Kind-Raum bis 7 Jahre» → «Mutter-Kind-Raum, Kinder unter 7». Стиль: единообразие с текстом и остальными файлами («до 7 лет» = «unter 7 Jahren»).

## Проверено и оставлено как есть

- **SGC transport** — «„Kak dobratsja“ (Anreise)»: оригинал называет страницу «Как добраться», транслитерация по Дудену верна, пояснение — перевод названия.
- **Раскрытые сокращения** смысла не добавляют: МКАД → «Autobahnring MKAD», ХМАО-Югра → «Autonomer Kreis der Chanten und Mansen – Jugra» (официальное название), АТР → «Asien-Pazifik-Region», ЕАЭС → «EAWU» (принятая немецкая аббревиатура), НАО → «Autonomer Kreis der Nenzen».
- **REN transport** «Nr. 101 (k)»: в оригинале «(к)»; кириллица здесь валит проверку (так провалились es/zh/ar REN), латинская k того же начертания — оставлено.
- **VOG** «Terminals C und С2»: одиночная «С» — латиница, «С2» — кириллица, как в оригинале; вид совпадает, проверка проходит.
- Транслитерация последовательно дуденовская (Scheremetjewo, Blagoweschtschensk, Uliza, Ploschtschad, -ski/-skaja). Латиница брендов и сетей, данная в оригинале или официальная, оставлена (Izhavia, Yamal, Rossiya, KAMAZ, Nordwind, Yandex Go, Vezet, Shostakovich Premier Lounge, Prokofiev Lounge, Begishevo, _Sheremetyevo Wi-Fi).
- Русские города оставлены в немецкой (дуденовской) форме даже там, где `data/city-names.json` даёт английскую (Archangelsk, Iwanowo, Mineralnyje Wody, Narjan-Mar, Nowy Urengoi): данные там для de неединообразны.
- «Reisepass» для «паспорт» оставлен (иностранному читателю нужен именно он).
- Все `hint` ≤ 35 символов; все 24-часовые времена, цены, валюты, телефоны, размеры совпадают.

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
| AER | storage.text | Der erste Tag kostet ab 600 ₽ pro Gepäckstück, jeder weitere ab 300 ₽. | Die ersten 24 Stunden kosten ab 600 ₽ pro Gepäckstück, je weitere 24 Stunden ab 300 ₽. |
| ASF | parking.text | über 4 Stunden 900 ₽ pro Tag. | über 4 Stunden 900 ₽ pro 24 Stunden. |
| ASF | parking.text | ab der 181. Minute für den ersten Tag 600 ₽, für zwei Tage 1100 ₽, für drei 1500 ₽, danach 300 ₽ pro Tag. | ab der 181. Minute für die ersten 24 Stunden 600 ₽, für zweimal 24 Stunden 1100 ₽, für dreimal 24 Stunden 1500 ₽, danach 300 ₽ pro 24 Stunden. |
| CEK | parking.text | der erste Tag insgesamt 1300 ₽, über einen Tag 700 ₽ pro Tag. | die ersten 24 Stunden insgesamt 1300 ₽, über 24 Stunden hinaus 700 ₽ pro 24 Stunden. |
| DME | storage.text | 1300 ₽ für den ersten Tag bei mehr als 3 Stunden | 1300 ₽ für die ersten 24 Stunden bei mehr als 3 Stunden |
| KRR | storage.text | 400 ₽ pro Gepäckstück für den ersten Tag, 200 ₽ für jeden weiteren. | 400 ₽ pro Gepäckstück für die ersten 24 Stunden, 200 ₽ für je weitere 24 Stunden. |
| LED | parking.text | 1100 ₽ für den ersten Tag, ab 14 Tagen 700 ₽ pro Tag. | 1100 ₽ für die ersten 24 Stunden, ab 14 Tagen 700 ₽ pro 24 Stunden. |
| NJC | parking.text | Der erste Tag 1000 ₽, jeder weitere 800 ₽. | Die ersten 24 Stunden 1000 ₽, je weitere 24 Stunden 800 ₽. |
| NOZ | storage.text | 400 ₽ für den ersten Tag | 400 ₽ für die ersten 24 Stunden |
| NOZ | storage.text | 750 ₽ für den ersten Tag | 750 ₽ für die ersten 24 Stunden |
| SVO | storage.text | Der erste Tag kostet 700 ₽ pro Gepäckstück, danach 300 ₽ pro Tag. | Die ersten 24 Stunden kosten 700 ₽ pro Gepäckstück, danach 300 ₽ pro 24 Stunden. |
| SVX | storage.text | 500 ₽ für den ersten Tag, 300 ₽ für jeden weiteren. | 500 ₽ für die ersten 24 Stunden, 300 ₽ für je weitere 24 Stunden. |
| SVX | storage.text | 800 ₽ für den ersten Tag, 500 ₽ für jeden weiteren. | 800 ₽ für die ersten 24 Stunden, 500 ₽ für je weitere 24 Stunden. |
| UUS | parking.text | 1200 ₽ für den ersten Tag und 600 ₽ für jeden weiteren. | 1200 ₽ für die ersten 24 Stunden und 600 ₽ für je weitere 24 Stunden. |
| UUS | parking.text | 500 ₽/Tag vom 1. bis zum 5. Tag, danach 400 ₽. | 500 ₽ pro 24 Stunden für die ersten 5 Zeiträume von je 24 Stunden, danach 400 ₽. |
| UUS | storage.text | 500 ₽ für den ersten Tag, 200 ₽ für jeden weiteren. | 500 ₽ für die ersten 24 Stunden, 200 ₽ für je weitere 24 Stunden. |
| VVO | storage.text | 500 ₽ für den ersten Tag, 200 ₽ für jeden weiteren, | 500 ₽ für die ersten 24 Stunden, 200 ₽ für je weitere 24 Stunden, |
| VVO | storage.text | Angefangene Tage zählen als volle. | Angefangene 24-Stunden-Zeiträume zählen als volle. |
| ZIA | storage.text | 700 ₽ für den ersten Tag, 300 ₽ für jeden weiteren. | 700 ₽ für die ersten 24 Stunden, 300 ₽ für je weitere 24 Stunden. |
| KVX | kids.text | höchstens einen Tag lang | höchstens 24 Stunden lang |
| VOG | kids.text | bis zu einem Tag. | bis zu 24 Stunden. |
| UUD | parking.text | höchstens einen Tag. | höchstens 24 Stunden. |
| NJC | kids.text | für einen Abflug spätestens innerhalb eines Tages | für einen Abflug innerhalb der nächsten 24 Stunden |
| BQS | parking.text | bis zu einem Tag 400 ₽, jeder weitere Tag 400 ₽. | bis 24 Stunden 400 ₽, je weitere 24 Stunden 400 ₽. |
| GYD | parking.text | bis zu einem Tag 15 AZN | bis 24 Stunden 15 AZN |
| NNM | parking.text | Über eine Stunde bis zu einem Tag: | Über eine Stunde bis 24 Stunden: |
| NNM | parking.text | Über einen Tag bis 30 Tage: 600 ₽ pro Tag. | Über 24 Stunden bis 30 Tage: 600 ₽ pro 24 Stunden. |
| OSW | parking.text | bis zu einem Tag 500 ₽, ab einem Tag 500 ₽. | bis 24 Stunden 500 ₽, ab 24 Stunden 500 ₽. |
| PEE | parking.text | bis zu einem Tag 500 ₽, danach 500 ₽ pro Tag. | bis 24 Stunden 500 ₽, danach 500 ₽ pro 24 Stunden. |
| PEE | parking.text | bis zu einem Tag 400 ₽, danach 400 ₽ pro Tag. | bis 24 Stunden 400 ₽, danach 400 ₽ pro 24 Stunden. |
| PEE | parking.text | Angefangene Stunden und Tage werden als volle berechnet. | Angefangene Stunden und 24-Stunden-Zeiträume werden voll berechnet. |


## Перекрёстная проверка ChatGPT (выборка 5 пар, 25.10)

Принято: «Reisepass» → «Pass» в справочных российских аэропортов (оригинал — паспорт, у внутренних рейсов не заграничный); у зарубежных (AYT, IST, DLM…) оставлен Reisepass. Отклонено: Gate → Flugsteig (Gate — обычное слово в немецких аэропортах), Т1 (кириллица по правилам), «Gepäckverpackung» (так пишут на указателях).
