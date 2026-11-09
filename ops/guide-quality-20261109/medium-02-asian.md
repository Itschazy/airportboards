# medium-02: независимая проверка zh / ja / ko / ar / hi

## Покрытие

Полностью прочитаны 40 аэропортов из исходного inventory slice40:80, 185 RU блоков / 925 переведённых блоков, 200 файлов локалей +40 RU. Все title/hint/text и имеющиеся about. Это не аудит всего корпуса188. SHA256 всех240файлов в medium-02-asian-file-hashes.json. Данные не менялись. Предложения в proposed-medium-02-asian.json: 149 полей, 81 файлов. Каждое before проверено с actual data; повторяющихся file/path нет. Это предложения после независимого первичного чтения, их авторская самопроверка не заменяет независимую рецензию parent.

## Результаты

1. GOJ/KUF/IKT kids ja/ar, IAR kids ar: длительность пребывания перед вылетом написана как неоднозначное «до момента за N часов до вылета». Предлагается явно максимальная длительность; числа и разделение до/после сохранены.
2. KRR storage.hint все5: общий тариф400/день не отражает400 только первые сутки, затем200. Предлагается «первые24часа400»; часы работы24/7 остаются вtext. zh storage.text следующие сутки уточняются24h.
3. KVX parking zh/ja/ko: ближе30м (<30) стало30мвключительно (≤30). Точечное восстановление строгой границы. KVX kids zh сутки уточнены24h.
4. JER taxi ar/hi: «в дальней части парковки» передано «за парковкой»; предложено вернуть часть внутри парковки.
5. LAX taxi ko: грамматика 스티커이→스티커가. DXB taxi hi потерял «от» перед25AED (hint уже корректен).
6. Тарифные сутки: EYK storage text/hint все5; GDX storage zh/ko/ar/hi и parking все5; GDZ storage/parking все5; GOJ storage/parking все5; GYD parking только первый период zh/ja; HMA parking все5; IAR parking text/hint zh/ko/ar/hi; IJK parking все5; IKT storage text/hint/parking все5; KEJ storage text/hint zh/ko/ar/hi и parking все5; KGD/KHV/KRR/KUF parking все5; KUF storage все5; LAXparking.hintko. Уточнение24h не меняет суммы. Многоступенчатый KHV сохраняет4/5день с определением сутки24h. HMA ar дополнительно явно пятый час стоянки вместо возможного «в5часов».
7. Низкий приоритет: >N передано как ≥N в FRA wifi ja/ko, GYDparkingko, KHVaboutko, KUFaboutko, KULparkingja/ko, LAS/LAXparkingja/ko. Предложения сохраняют болееN. Это описательные количества, не риск тарифа.
8. Все 925 hint измерены. Только4превышения: GYDwifi zh/ja/ko (22символаSSID) иGYDtransportko22. Предложено короткое «бесплатныйWiFi» с полным неизменённымSSID вtext; транспорт сохраняет цену1.30AZN и вид транспорта. Новыеhint≤18/35.

## Не включено в JSON / требует источника

- IARkids возраст: RU «с детьми или детьми-инвалидами до14» допускает неясную область определения. zh/ja/ko/hi можно прочитать как <14 только для первой группы. Перед уточнением обеих групп нужен однозначный RU/источник; не утверждаю автоматически новый возрастной запрет.
- HMAhotel: сутки переведены day; без правил check-in/check-out не обещать свободные24hс момента заселения. Только вопрос авторуRU.
- GYD следующие «дни» оставлены поRU, HND T1цена/день иT3цена/24h сохранены раздельно. KHV30суток хранения как30дней не менялись: это срок, не механизм посуточной оплаты.

## Проверенные чувствительные условия без найденных расхождений

Проверены: DXB — максимум 12 часов хранения и две единицы багажа в метро; EDI — отсутствие шаттла; EWR — отдельный тариф PATH и непрямой доступ к A; FLL — закрытие хранения T4; FRA — LPG запрещён только в T1, минимумы napcabs 2/3 часа; GCI — отсутствие наличных в автобусах при наличии их в парковке; GDX — спуск с 3 на 2 этаж, оплата хранения только картой; GDZ — наличие мест и медицинский осмотр; GLA — ограниченная скорость Wi-Fi; GRU — разные часы East/West; GYD — ночной интервал и групповая карта; HAN — незавершённая установка Wi-Fi T2; HKG — включённые дорожные сборы, отдельные доплаты и условие не-HTTPS; HMA — отсутствие бесплатного прохода по банковским картам; HND — Priority Pass только 01–05, пересадочные билеты по паспорту и посадочному; HYD — паспорт как альтернатива SMS; IAD — одна карта на входе/выходе, возможность пропуска ZIP; IAH — E201 дверь, C14 посадочный выход; IAR — нет комнаты прилёта и нет бронирования парковки; ICN — подъёмник по будням, платный AREX, перерыв lounge; IGT — предварительная заявка VIP; IJK — отказ Priority Pass/Lounge Key; IKT — международное хранение только при задержках; JER — исключения для оставления машины без присмотра; JFK — группа максимум пять человек; KIX — женская только зона кормления, приём багажа до 22:30, отсутствие шифрования; KRR — только российская SIM; KUF — маршрут 78 по будням; KUL — ночная надбавка 50% и последовательность шаттла; KVX — один взрослый и максимум суток; LAS — двери 52/55 и скидка только суббота–среда; LAX — три точки такси, сессии 45 минут, платная подписка и включённый налог.

## Реально прочитанные файлы и блоки

Для каждой строки: `data/airport-guide/CODE.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/CODE.json`.

| IATA | Блоки | Поля |
|---|---|---|
| DXB | transport, taxi, storage | все title/hint/text |
| EDI | transport, storage, kids, parking | все title/hint/text + about |
| EVN | transport, taxi, parking | все title/hint/text |
| EWR | transport, taxi, terminals, wifi | все title/hint/text |
| EYK | lounges, storage, kids | все title/hint/text |
| FCO | transport, storage, kids, wifi | все title/hint/text |
| FLL | transport, terminals, storage, wifi | все title/hint/text |
| FRA | transport, taxi, terminals, lounges, sleep, parking, wifi | все title/hint/text |
| FUK | transport, terminals, kids, wifi | все title/hint/text |
| GCI | transport, taxi, storage, parking | все title/hint/text + about |
| GDX | transport, lounges, storage, kids, parking, wifi | все title/hint/text |
| GDZ | transport, lounges, storage, kids, parking | все title/hint/text + about |
| GLA | transport, taxi, parking, wifi | все title/hint/text + about |
| GOJ | transport, lounges, storage, kids, parking, wifi | все title/hint/text + about |
| GRU | transport, storage, wifi | все title/hint/text |
| GYD | transport, lounges, kids, parking, wifi | все title/hint/text |
| HAN | terminals, kids, wifi | все title/hint/text |
| HKG | transport, taxi, lounges, storage, sleep, wifi | все title/hint/text |
| HMA | transport, lounges, sleep, kids, parking | все title/hint/text + about |
| HND | transport, taxi, terminals, lounges, storage, sleep, kids, wifi | все title/hint/text |
| HYD | transport, taxi, kids, wifi | все title/hint/text |
| IAD | transport, terminals, kids, wifi | все title/hint/text |
| IAH | transport, sleep, kids, wifi | все title/hint/text |
| IAR | transport, lounges, kids, parking, wifi | все title/hint/text + about |
| ICN | taxi, terminals, lounges, sleep, kids | все title/hint/text |
| IGT | terminals, lounges, wifi | все title/hint/text + about |
| IJK | transport, terminals, lounges, storage, kids, parking | все title/hint/text + about |
| IKT | transport, terminals, lounges, storage, sleep, kids, parking | все title/hint/text + about |
| JER | transport, taxi, kids, parking | все title/hint/text + about |
| JFK | transport, taxi, sleep, wifi | все title/hint/text |
| KEJ | lounges, storage, kids, parking | все title/hint/text + about |
| KGD | transport, lounges, sleep, kids, parking | все title/hint/text + about |
| KHV | transport, terminals, lounges, storage, sleep, kids, parking | все title/hint/text + about |
| KIX | terminals, storage, kids, wifi | все title/hint/text |
| KRR | transport, terminals, lounges, storage, kids, parking, wifi | все title/hint/text + about |
| KUF | transport, lounges, storage, kids, parking, wifi | все title/hint/text + about |
| KUL | transport, taxi, terminals, parking | все title/hint/text |
| KVX | lounges, kids, parking | все title/hint/text |
| LAS | transport, taxi, terminals, parking | все title/hint/text |
| LAX | transport, taxi, parking, wifi | все title/hint/text |

## Ограничения

Без носителей языков; без browser/production/UI; без независимой проверки актуальности тарифов/сайтов. Сверка с локальнымRU. Общая правильность фактов оригинала не удостоверяется переводческой рецензией. Предложения не опубликованы этим агентом.
