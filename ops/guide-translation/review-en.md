# Рецензия перевода справочной — en

Рецензент: независимый редактор (Claude), 2026-10-25. Проверены все 76 файлов `data/airport-guide/en/`
против оригиналов `data/airport-guide/<IATA>.json`: каждый блок (title / hint / text) и `about`,
по смыслу, числам, именам и естественности.

Итог: 69 правок — смысл 3, числа 0, имена 2, стиль 64. Расхождений в числах, ценах, времени и
условиях доступа (кому можно, бесплатно/платно, до/после досмотра, направления маршрутов) не найдено.
Перевод в целом точный; основная масса правок — единообразие этажей и разделителей тысяч и кальки.

`node scripts/check-guide-fresh.mjs` — по en провалов нет.

## Спорные места переводчика — решения

- **«Инфинит» / «Инфинит Про» (SVO, «Аэрофлот Бонус»)** — переводчик написал «Infinite / Infinite Pro».
  Официальной латинской формы этих уровней я достоверно не знаю, поэтому по правилу брифа —
  транслитерация: **Infinit / Infinit Pro**. Если на aeroflot.ru есть английское название — заменить.
- **«Чайковский» (VKO)** — оставлено **Tchaikovsky**: общепринятое английское написание фамилии
  композитора; соседние залы в том же ряду названы так же (Prokofiev Lounge, Chagall, Kandinsky, Malevich).
- **Юридические названия** («АО «МАШ»» → JSC MASH, «ТОГБУ «Аэропорт «Тамбов»» → TOGBU Tambov Airport,
  «ФКП «Аэропорты Севера»» → FKP Aeroporty Severa и т. п.) — оставлены: транслитерация организационной
  формы + имя, единообразно по всем файлам; придуманные английские переводы названий не вводились.
- **REN, «№101 (к)»** — в en записано «101 (k)»: кириллическая «к» в скобках не проходит
  проверку кириллицы (так сейчас падают es/tr/zh/ar/hi REN), латинская k — та же буква на табличке.
- **VOG, «С» и «С2»** — «С2» оставлен с кириллической С (как «Т1» по брифу), одиночная «C» —
  латиница, иначе проверка кириллицы падает. Оставлено как у переводчика.

## Не правилось сознательно

- Этажи: «1 этаж» → «floor 1» (как в подписях hint). Где в оригинале этаж словом («на втором
  этаже»), а цифры в блоке нет, написано «floor two» — проверка чисел запрещает добавлять цифру.
- CSY storage «300 ₽ per 1 item per day» — «1» есть в оригинале, проверка чисел требует её сохранить.
- Транслитерированные названия остановок/станций (Morskoy-Rechnoy Vokzal, Univermag, DK Avtozavoda) —
  по брифу, не переводились.

## Журнал правок

| Файл | Блок | Было | Стало | Тип | Почему |
|---|---|---|---|---|---|
| AYT | wifi.text | In the CIP terminal and lounge areas access | In the CIP terminal and rest areas access | смысл | «зоны отдыха» — не бизнес-залы (lounges) |
| CSY | lounges.text | Special service with check-in on floor 2 5,500 ₽. | Special service with check-in on floor 2: 5,500 ₽. | стиль | два числа подряд без разделителя |
| EVN | parking.text | entry for drop-off and pick-up up to 10 minutes is free | drop-off and pick-up stops of up to 10 minutes are free | стиль | калька «заезд … бесплатный» |
| GDZ | lounges.text | AURA lounge premium comfort lounge: up to 3 hours | AURA lounge (premium comfort lounge): up to 3 hours | стиль | «lounge lounge» подряд |
| GYD | transport.text | Koroglu metro station | Koroğlu metro station | имена | официальное написание станции бакинского метро |
| GYD | parking.text | and 1166 at terminal 2 | and 1,166 at terminal 2 | стиль | разделитель тысяч как во всём тексте |
| IST | transport.text | and from 20 June 2026 the line has been extended to Halkalı | and since 20 June 2026 it has been extended to Halkalı | стиль | время/согласование |
| IST | sleep.hint | YOTEL before and after control | YOTEL landside and airside | стиль | «before and after control» неидиоматично |
| IST | sleep.text | one floor up, only without advance booking. | one floor up, walk-in only (no advance booking). | стиль | неидиоматичное «only without advance booking» |
| KGP | lounges.text | Arrival: 10 223.60 ₽ and 5 111.80 ₽. Meeting passengers: 5 111.80 ₽ | Arrival: 10,223.60 ₽ and 5,111.80 ₽. Meeting passengers: 5,111.80 ₽ | стиль | русский пробел-разделитель тысяч в английском тексте |
| NLI | lounges.text | 3 773.25 ₽ | 3,773.25 ₽ | стиль | русский пробел-разделитель тысяч в английском тексте |
| KHV | sleep.text | rooms from 1200 to 6,000 ₽ | rooms from 1,200 to 6,000 ₽ | стиль | разделитель тысяч |
| KHV | terminals.hint | Domestic and international apart | Separate domestic and international | стиль | калька «ВВЛ и МВЛ отдельно» |
| KHV | lounges.text | in the sterile zone | airside | стиль | «стерильная зона» → принятое airside, как в других файлах |
| IAR | kids.text | in the sterile zone | airside | стиль | «стерильная зона» → airside |
| SGC | lounges.text | floor 2 of the sterile zone | floor 2 airside | стиль | «стерильная зона» → airside |
| ULV | terminals.text | are via the sterile zone on floor 2 | are in the airside area on floor 2 | стиль | «стерильная зона» → airside |
| KRR | lounges.text | Terminal 1, floor 2, after control. International business lounge: Terminal 2, floor 1, after control. | Terminal 1, floor 2, after security checks. International business lounge: Terminal 2, floor 1, after security checks. | стиль | «after control» неидиоматично |
| KUF | wifi.text | Free Free_KUF network in the passenger areas | The free Free_KUF network covers the passenger areas | стиль | «Free Free_KUF» подряд |
| KVX | lounges.text | Up to 3 hours costs 2,500 ₽. | A stay of up to 3 hours costs 2,500 ₽. | стиль | нет подлежащего |
| KZN | lounges.text | In international departures in Terminal 1А: | In the international departure area of Terminal 1А: | стиль | неточная конструкция |
| KZN | parking.text | Paid parking is paid at parking machines | Parking is paid at pay stations | стиль | тавтология «paid … is paid» |
| LED | transport.text | from Moskovskaya metro station stops at all stops: | from Moskovskaya metro station makes all stops: | стиль | тавтология «stops at all stops» |
| LED | wifi.text | Free network OBIT — Free Internet Access from OBIT. | The free OBIT — Free Internet Access network, run by OBIT. | стиль | порядок слов |
| MRV | kids.text | free for passengers with a ticket departing from Mineralnye Vody: with children under 7, disabled children under 16, and for women in the second half of pregnancy. | free for holders of a ticket for a departure from Mineralnye Vody: passengers with children under 7 or disabled children under 16, and women in the second half of pregnancy. | стиль | сломанный параллелизм перечня |
| NAL | kids.text | free for passengers with a ticket departing from Nalchik: with children under 7, disabled children under 16, and for women in the second half of pregnancy. | free for holders of a ticket for a departure from Nalchik: passengers with children under 7 or disabled children under 16, and women in the second half of pregnancy. | стиль | сломанный параллелизм перечня |
| NBC | wifi.text | Network Begishevo free in terminal B, network HOTEL in the hotel. | The Begishevo free network covers terminal B; the hotel has the HOTEL network. | стиль | калька |
| NJC | about | The second airport of KhMAO-Yugra by traffic volume. | The second-largest airport of KhMAO-Yugra by traffic volume. | смысл | «второй по объёму перевозок» = second-largest |
| NJC | about | Runway 3200 by 60 m. | Runway 3,200 by 60 m. | стиль | разделитель тысяч |
| NJC | storage.text | up to 203 cm in total of three dimensions 600 ₽ per day | up to 203 cm (sum of three dimensions): 600 ₽ per day | стиль | калька «по сумме трёх измерений» |
| NJC | kids.text | Mother and child room only with a ticket for a departure within a day. | The mother and child room is available only with a ticket for a departure no more than a day ahead. | стиль | обрубленное предложение; «не позднее чем через сутки» |
| NUX | lounges.text | and those paying themselves. | and self-paying passengers. | стиль | калька «тех, кто платит сам» |
| REN | lounges.text | and anyone paying themselves. | and self-paying passengers. | стиль | калька «всех, кто платит сам» |
| OVB | about | Two runways, 3597 and 3,602 m long. | Two runways, 3,597 and 3,602 m long. | стиль | разделитель тысяч |
| OVB | about | domestic routes and 1300 on international. | domestic routes and 1,300 on international routes. | стиль | разделитель тысяч |
| PEE | storage.text | Baggage left luggage on the ground floor | Left luggage for baggage on floor 1 | стиль | «Baggage left luggage» — калька; этаж единообразно |
| SVO | lounges.text | Infinite and Infinite Pro cardholders | Infinit and Infinit Pro cardholders | имена | «Инфинит» — официальной латинской формы уровня не знаю, транслитерация вместо придуманного «Infinite» |
| SVO | kids.text | children under 7 (with children with disabilities under 14) | children under 7 (under 14 for children with disabilities) | стиль | «with children with» — сбой конструкции |
| UFA | storage.text | no more than 203 cm in total of three dimensions | no more than 203 cm (sum of three dimensions) | стиль | калька |
| UUD | storage.text | an item over 203 cm in total of three dimensions 550 ₽ | an item over 203 cm (sum of three dimensions) 550 ₽ | стиль | калька |
| VKO | lounges.text | serves all flights; for international departures leave 1 hour before. | serves all flights; passengers on international flights should leave it 1 hour before departure. | смысл | неясно, что «выходить за 1 час» — покинуть зал за час до вылета |
| VKO | sleep.text | Address: 2 2nd Reysovaya St, | Address: 2nd Reysovaya St, 2, | стиль | «2 2nd» нечитаемо |
| VVO | parking.text | In the drop-off/pick-up zone, then 1,000 ₽ for every 15 minutes. | After that, the drop-off/pick-up zone costs 1,000 ₽ for every 15 minutes. | стиль | сломанное предложение |
| ZIA | parking.text | A repeat free entry no sooner than 45 min later. | The next free entry is possible no sooner than 45 min later. | стиль | нет сказуемого |
| BAX | about | Runway 2850 × 50 m. | Runway 2,850 × 50 m. | стиль | разделитель тысяч |
| IAR | about | Runway 3010×44 m. | Runway 3,010 × 44 m. | стиль | разделитель тысяч |
| KGD | about | One runway 3350 × 45 m. | One runway 3,350 × 45 m. | стиль | разделитель тысяч |
| MMK | about | One runway 2500 × 42 m. | One runway 2,500 × 42 m. | стиль | разделитель тысяч |
| PEE | about | One runway 3204 × 49 m. | One runway 3,204 × 49 m. | стиль | разделитель тысяч |
| NER | about | Paved runway 3600×45 m | Paved runway 3,600 × 45 m | стиль | разделитель тысяч |
| TBW | about | one runway 2098 × 42 m. | one runway 2,098 × 42 m. | стиль | разделитель тысяч |
| ASF | lounges.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| AYT | parking.text | the ground floor | floor 1 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| BAX | storage.text | the first floor | floor 1 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| BAX | kids.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| CEK | lounges.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| CEK | kids.text | the ground floor | floor one | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| GDX | lounges.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| GDX | kids.text | the third floor | floor 3 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| GYD | lounges.text | the ground floor | floor 1 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| HRG | lounges.text | the second floor | floor two | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| KEJ | lounges.text | the third floor | floor 3 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| KGD | lounges.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| KGD | kids.text | the ground floor | floor one | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| MMK | kids.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| NJC | storage.text | 1, ground floor | 1, floor 1 | стиль | этажи единообразно |
| UUD | kids.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| VOG | lounges.text | the second floor | floor 2 | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |
| VOG | storage.text | the ground floor | floor one | стиль | этажи единообразно с подписями «floor N»; «first/ground floor» по-разному читаются в UK/US |

## Этажи как на указателях

Русское «1 этаж» — это уровень земли и цифра «1» на табличках аэропорта. Британский читатель
понимает «first floor» как этаж над землёй, поэтому «floor N» и словесные формы заменены
подписью с таблички **«Level N»**; номера не перенумерованы. Это заменяет решение «floor N» из
журнала правок выше.

- Затронуто 57 файлов из 76, 219 полей (title/hint/text/about), 271 упоминание уровня:
  265 «floor N / Floor N / floors N and M» → «Level N / Levels N and M», 4 словесных
  («floor one», «floor two»: CEK, HRG, KGD, VOG) → «Level 1/2», 6 строчных «level N»
  (VKO, DME) → «Level N» для единообразия.
- Минусовые уровни сохранены: «floor −1» → «Level −1» (SVO, SVX, VKO).
- Каждое изменённое поле сверено с русским оригиналом по множеству номеров этажей: в en
  5 расхождений разобраны вручную — все ложные (цена рядом с «этаже», «на 2-м» без слова «этаж»,
  «на 2-м/3-м» после «1-м уровне»); по смыслу поправлены руками IKT, IST, KHV (ниже).
- Не тронуто: количества («7 floors», «2 floors», «each with 3 floors», «four floors»,
  «Multi-storey»), «Floor plans», относительное «one floor up» (IST, «этажом выше»),
  ненумерованный «basement floor» (ASF, DME, KZN, MMK, MRV — «цокольный этаж» без номера).

| IATA | поле | было | стало |
|---|---|---|---|
| ASF | lounges.hint | Floor 2, round the clock | Level 2, round the clock |
| AER | lounges.text | in sector B, floor 2, by gate 21 | in sector B, Level 2, by gate 21 |
| NOJ | lounges.hint | Floors 1 and 2, daily | Levels 1 and 2, daily |
| GYD | kids.text | on floors 3 and 4 | on Levels 3 and 4 |
| CEK | kids.text | information desk on floor one | information desk on Level 1 |
| HRG | lounges.text | on floor two by gate 30 | on Level 2 by gate 30 |
| SVX | storage.hint | Terminal A, floor −1 | Terminal A, Level −1 |
| VKO | terminals.text | Arrivals are on level 1 of terminal A | Arrivals are on Level 1 of terminal A |
| IKT | kids.text | (VIP floor 1) | (Level 1, VIP area) — «1 этаж VIP» |
| IST | transport.text | leave from transport floor −2 | leave from the transport level, Level −2 |
| KHV | lounges.hint | Domestic floor 3, 4,000 ₽ | Domestic, Level 3, 4,000 ₽ |

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
| AER | storage.text | The first day costs from 600 ₽ per item, each following day from 300 ₽. | The first 24 hours cost from 600 ₽ per item, each further 24 hours from 300 ₽. |
| ASF | parking.text | over 4 hours 900 ₽ per day. | over 4 hours 900 ₽ per 24 hours. |
| ASF | parking.text | 600 ₽ for the first day, 1,100 ₽ for two days, 1,500 ₽ for three, then 300 ₽ per day. | 600 ₽ for the first 24 hours, 1,100 ₽ for two 24-hour periods, 1,500 ₽ for three, then 300 ₽ per 24 hours. |
| CEK | parking.text | first day 1,300 ₽ in total, over a day 700 ₽ per day. | first 24 hours 1,300 ₽ in total, beyond 24 hours 700 ₽ per 24 hours. |
| DME | storage.text | 1,300 ₽ for the first day for storage | 1,300 ₽ for the first 24 hours for storage |
| KRR | storage.text | 400 ₽ per item for the first day, 200 ₽ for each following day. | 400 ₽ per item for the first 24 hours, 200 ₽ for each further 24 hours. |
| LED | parking.text | 1,100 ₽ for the first day, from 14 days 700 ₽ per day. | 1,100 ₽ for the first 24 hours, from 14 days 700 ₽ per 24 hours. |
| NJC | parking.text | First day 1,000 ₽, each following day 800 ₽. | First 24 hours 1,000 ₽, each further 24 hours 800 ₽. |
| NOZ | storage.text | 400 ₽ for the first day | 400 ₽ for the first 24 hours |
| NOZ | storage.text | 750 ₽ for the first day | 750 ₽ for the first 24 hours |
| SVO | storage.text | The first day costs 700 ₽ per item, then 300 ₽ per day. | The first 24 hours cost 700 ₽ per item, then 300 ₽ per 24 hours. |
| SVX | storage.text | 500 ₽ for the first day, 300 ₽ for each following day. | 500 ₽ for the first 24 hours, 300 ₽ for each further 24 hours. |
| SVX | storage.text | 800 ₽ for the first day, 500 ₽ for following days. | 800 ₽ for the first 24 hours, 500 ₽ for each further 24 hours. |
| UUS | parking.text | 1,200 ₽ for the first day and 600 ₽ for following days. | 1,200 ₽ for the first 24 hours and 600 ₽ for each further 24 hours. |
| UUS | parking.text | 500 ₽/day from day 1 to day 5, then 400 ₽. | 500 ₽ per 24 hours for the first 5 periods of 24 hours, then 400 ₽. |
| UUS | storage.text | 500 ₽ for the first day, 200 ₽ for following days. | 500 ₽ for the first 24 hours, 200 ₽ for each further 24 hours. |
| VVO | storage.text | 500 ₽ for the first day, 200 ₽ for each following day, | 500 ₽ for the first 24 hours, 200 ₽ for each further 24 hours, |
| VVO | storage.text | A part day counts as a full day. | An incomplete 24-hour period counts as a full one. |
| ZIA | storage.text | 700 ₽ for the first day, 300 ₽ for each following day. | 700 ₽ for the first 24 hours, 300 ₽ for each further 24 hours. |
| KVX | kids.text | for no longer than a day | for no longer than 24 hours |
| VOG | kids.text | for up to one day | for up to 24 hours |
| UUD | parking.text | no longer than a day. | no longer than 24 hours. |
| NJC | kids.text | a departure no more than a day ahead | a departure within the next 24 hours |
| BQS | parking.text | up to a day 400 ₽, each following day 400 ₽. | up to 24 hours 400 ₽, each further 24 hours 400 ₽. |
| GYD | parking.text | up to a day 15 AZN | up to 24 hours 15 AZN |
| NNM | parking.text | Over an hour and up to a day: | Over an hour and up to 24 hours: |
| NNM | parking.text | Over a day, up to 30 days: 600 ₽ per day. | Over 24 hours, up to 30 days: 600 ₽ per 24 hours. |
| OSW | parking.text | up to a day 500 ₽, from a day 500 ₽. | up to 24 hours 500 ₽, from 24 hours 500 ₽. |
| PEE | parking.text | up to a day 500 ₽, then 500 ₽ per day. | up to 24 hours 500 ₽, then 500 ₽ per 24 hours. |
| PEE | parking.text | up to a day 400 ₽, then 400 ₽ per day. | up to 24 hours 400 ₽, then 400 ₽ per 24 hours. |
| PEE | parking.text | A part hour and a part day are charged in full. | An incomplete hour or 24-hour period is charged in full. |


## Перекрёстная проверка ChatGPT (выборка 6 пар, 25.10)

Принято: TBS «including transfers within 90 minutes» (было похоже на 90 минут пересадок), «food warmer» вместо «bottle warmer» (оригинал не уточняет), «after security screening», SVO/VKO порядок слов. Отклонено: Level → floor (этаж как на указателе, см. «Этажи как на указателях»).


## Раунд 2 (26.10.2026)

| Файл | Блок | Было | Стало | Тип | Почему |
|---|---|---|---|---|---|
| CAN | transport.text | exit | door | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | taxi.hint | exits | doors | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | taxi.text | exit | door | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | storage.text | exit | door | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| CAN | sleep.text | exit | door | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PEK | taxi.text | exits | doors | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PEK | storage.text | exit | door | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | taxi.text | exits | doors | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | taxi.text | exit | door | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| BKK | taxi.hint | exits | doors | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| BKK | taxi.text | exits | doors | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| BKK | storage.text | exit | door | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | storage.text | exit 7 | door 7 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | sleep.text | exit 2 of | door 2 of | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| PVG | sleep.text | exit 29 | door 29 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| HND | taxi.text | door 7 | exit 7 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| HND | taxi.text | door 2 | exit 2 | смысл | Уточнение gate/door/exit по официальному источнику, таблица door-vs-gate.md |
| DEN | transport.text | From here the A Line train runs to Denver Union Station, as do RTD buses AB, AT, 104L, 145X and 169L. | The A Line train to Denver Union Station and RTD buses AB, AT, 104L, 145X and 169L depart from here. | смысл | as do приписывало всем автобусам направление Denver Union Station; в оригинале только место отправления |
| LHR | transport.hint | Heathrow Express, Elizabeth, Piccadilly | Express, Elizabeth, Piccadilly | стиль | Сокращение подписи до 35 символов, полный текст сохранён |
| MIA | transport.hint | Metrorail, Metrobus, Tri-Rail, MIA Mover | Metrorail, Tri-Rail, MIA Mover | стиль | Сокращение подписи до 35 символов, Metrobus остаётся в тексте |
| MIA | taxi.text | App-based rides | Rideshare vehicles | стиль | Английский термин для машин по приложению в US; условия и уровни сохранены |
| LAS | parking.text | Economy and the remote lot (served by a free shuttle): | Economy and the remote lot (the latter served by a free shuttle): | смысл | Шаттл относится только к удалённой площадке, не Economy |

Проверены заново все 24 файла (AMS BCN BKK CAN CDG DEL DEN DFW FRA HKG HND ICN JFK KUL LAS LAX LHR MAD MCO MIA ORD PEK PVG SIN), все title/hint/text и отсутствие about как в оригинале. Числа/валюты, возраст JFK under5, тарифы по24часа, бесплатность, зоны досмотра и имена сверены. Оригинальные названия Ground Transport Concierge, DEN Transit Center, Cell Phone Lot, LAX Economy Parking сохранены. Статус: ручная рецензия завершена; ChatGPT-выборка ещё впереди.
| MIA | lounges.text | a day pass | a single-entry pass | смысл | «Разовый пропуск» не задаёт срок действия целый день; сохраняем один вход |
| MIA | lounges.text | American lounges admit by status and with a business- or first-class ticket on American or oneworld | Access to American lounges is based on status and a business- or first-class ticket on American or a oneworld airline | стиль | Принято из независимой выборки ChatGPT: естественная формулировка при сохранении условий русского исходника |
| MIA | lounges.text | a single-entry pass is sold if space is available | single-entry passes are available for purchase if space is available | стиль | Принято из независимой выборки ChatGPT: естественная формулировка при сохранении условий русского исходника |
| HND | lounges.text | Entry with airline coupons or with an eligible card in your name and a boarding pass for the same day, otherwise paid | Entry is available with airline coupons or an eligible card in your name together with a same-day boarding pass. Otherwise, admission is subject to a fee | стиль | Принято из независимой выборки ChatGPT: естественная формулировка при сохранении условий русского исходника |
| PVG | storage.text | All points are open from 06:00 to 24:00 and store items for up to 2 months | All storage locations are open from 06:00 to 24:00 and accept items for storage for up to 2 months | стиль | Принято из независимой выборки ChatGPT: естественная формулировка при сохранении условий русского исходника |
| PVG | storage.text | an ID document is required on drop-off | an identity document is required when depositing items | стиль | Принято из независимой выборки ChatGPT: естественная формулировка при сохранении условий русского исходника |
| ICN | terminals.text | about 6 minutes, ₩1,050, the fare is paid | about 6 minutes, with a fare of ₩1,050 | стиль | Принято из независимой выборки ChatGPT: естественная формулировка при сохранении условий русского исходника |
| SIN | terminals.text | you can also walk between them on travelators | you can also travel between them using moving walkways | стиль | Принято из независимой выборки ChatGPT: естественная формулировка при сохранении условий русского исходника |

### ChatGPT, выборка раунда 2
https://chatgpt.com/c/6ade6bc7-a3f4-832d-9ebb-8f862baf536d — 6 пар MIA/lounges, LAS/parking, HND/lounges, PVG/storage, ICN/terminals, SIN/terminals; поиск запрещён в запросе. Ответ сначала не загружался, после перезагрузки чата прочитан полностью.
Приняты замечания 2–7 о естественности, №1 — частично: access is based on и a oneworld airline. **Отклонена** замена and→or: это меняет условие исходника «по статусу и билету». Неоднозначность самого оригинала отмечена, перевод не исправляет факты от себя. LAS без ошибок по выборке.
| PEK | taxi.text | On trips longer than 15 km, 50% of the fare is added as a return-trip surcharge | For the portion of a trip beyond 15 km, a 50% return-trip surcharge is added to the per-km rate | смысл | Официальная китайская версия bcia.com.cn/wljc.html: 单程载客15公里以上部分，每公里租价加收50%费用. Подтверждённая правка оригинала согласована владельцем 26.10 |
| ICN | sleep.text | on Level B1 | on Level 1 | смысл | Официальный корейский каталог airport.kr/ap_ko/1008/subview.do: 캡슐호텔 다락휴(T1), 교통센터 1층 중앙. Исправление оригинала и 11 переводов согласовано владельцем 26.10 |
| MIA | parking.text | the 2.99 booking fee | the booking fee | числа | Официальный источник miami-airport.com/airport-parking.asp даёт 2.99 без валюты; в условиях booking.mia-parking.com/terms-and-conditions суммы нет. Не придумываем валюту: неполную сумму убрали, невозвратность сбора сохранили. Правка подтверждённых проблем оригинала во всех языках разрешена владельцем 26.10 |
| ICN | sleep.text | in the centre of the Transportation Center on Level 1 | in the centre of the Transportation Center | смысл | Повторная проверка: английский официальный каталог даёт Center of Transportation Center 1BF, корейский 교통센터 1층 중앙. По CLAUDE.md при противоречии факт не публикуется: убран только спорный этаж Darakhyu, центр транспортного центра сохранён |
