# Независимый аудит medium-01: zh / ja / ko / ar / hi

## Покрытие и ограничения

Прочитаны целиком RU и все пять переводов для 40 аэропортов исходного inventory: 176 русских блоков / 880 переведённых блоков, все title/hint/text и имеющиеся about. Это не утверждение о проверке всего корпуса 188 аэропортов. Данные не менялись. Предложения составлены после независимого первоначального чтения и требуют отдельной рецензии; собственная самопроверка не является второй независимой проверкой. Носители языков не участвовали. Проверялась верность локальному RU, не актуальность тарифов в интернете, не UI и не production. Источники не открывались, новые факты не добавлены. Снимки SHA256 каждого из 240 файлов рядом в medium-01-asian-file-hashes.json.

## Подтверждённые проблемы

- ASF lounges ja/ko: фраза выглядит как «до момента за 2 часа до вылета» вместо максимальной длительности 2 часа. zh тоже двусмысленен. В предложениях явно максимум 2 часа пребывания перед вылетом.
- BRS lounges ja: похожая неоднозначность максимума 3 часа; снять формулировкой 最大3時間.
- CPH terminals ja и DMK transport ja: RU полночь стало 深夜 («поздняя ночь»); предложено 真夜中.
- Тарифные единицы: AER parking все5; AER storage zh; AMS storage.hint zh; ARH storage/parking все5; ASF parking zh/ja; BKK storage.hint zh; BQS storage все5 и parking zh/ja; BTK sleep все5 и parking zh/ko/ar/hi; CEE parking zh/ko/ar/hi; CEK parking zh/ja; CSY storage.text/hint/parking все5. «День» может читаться как календарный: предложена явная единица 24 часа, суммы, пороги и условия сохранены. Это уточнение точности, не доказательство фактически неверного взимания платы. Для BTK hotel исходник не определяет check-in/out: нельзя обещать свободные 24 часа с момента въезда; уточнить у автора RU до принятия этой части.
- BQS about ko: «более 26 тыс.» стало ≥26 тыс.; DFW lounges ja/ko: «больше 20» стало ≥20. Низкий приоритет, не финансовый риск.
- Проверены длины всех 880 hint. Шесть превышений, все BRS: zh sleep22, ja sleep25/lounges19, ko sleep24/lounges20/parking20. В JSON короткие предложения ≤18; никаких универсальных цен из частного тарифа не делаем.

## Вопрос без автоматической правки

DEL parking ko «4시간 초과 24시간 이하» явно >4, RU «от 4 до 24» не исключает ровно4, но соседний RU диапазон3–4часа тоже включает4. Нужен источник/уточнение русского оригинала. Не объявляю доказанной фактической ошибкой тарифа. DFW hint ja/ko также округляют >20 как ≥20; короткое число в hint не менялось, поскольку содержательный text исправлен в предложении и важнее локализация ограничения.

## Проверенные чувствительные условия без найденного расхождения

BAX хранение явно календарное 00:00–23:59: не заменять rolling24h. AUH после72h русский говорит «день», не «сутки»: не добавлять период независимо. AER только российская SIM; ALA допускает иностранную; BLR SIM/роуминг/ваучер; BOS бесплатный SL1 только аэропорт→город; CAI48hрезервация/4hстыковка/третий ребёнок платно; CDG фиксированные тарифы по направлению не сумма туда-обратно; CAN двери≠гейты и метро не T3; CTU запрещены powerbank/литиевые батареи и неполные6hокругляются; DME отсутствие стерилизаторов/бесплатного времени и строгий порог>3h сохранены; DEN наземные двери505/507/511 и506/510/512 отличены от посадочных; DFW доступ в лаунжи только при наличии права; DLM30minWiFi затем платно; DMK дороги оплачивает пассажир; DMM такси предоплата; DOH спецтакси заранее, комнаты раздельные; DUB часы печати06–19 не подменены часами офиса05–21, до20страниц за10EUR.

## Реально прочитанные файлы/блоки

В каждой строке пути: `data/airport-guide/CODE.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/CODE.json`.

| IATA | Блоки | Поля/файлы |
|---|---|---|
| ABA | transport, lounges, kids, parking | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| AER | lounges, storage, sleep, kids, transport, parking, wifi, terminals | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| ALA | transport, storage, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| AMS | transport, taxi, storage, sleep, kids | ru + zh/ja/ko/ar/hi, все title/hint/text |
| ARH | transport, lounges, storage, parking | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| ASF | transport, lounges, storage, kids, parking | ru + zh/ja/ko/ar/hi, все title/hint/text |
| ATL | transport, terminals, lounges, sleep | ru + zh/ja/ko/ar/hi, все title/hint/text |
| AUH | transport, storage, kids, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| BAX | transport, lounges, storage, sleep, kids, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| BCN | transport, taxi, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| BJV | transport, lounges, kids, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| BKK | taxi, terminals, lounges, storage | ru + zh/ja/ko/ar/hi, все title/hint/text |
| BLR | transport, taxi, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| BOG | transport, terminals, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| BOS | transport, terminals, kids, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| BQS | transport, lounges, storage, kids, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| BRS | transport, lounges, sleep, parking | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| BRU | transport, storage, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| BTK | lounges, sleep, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CAI | transport, terminals, lounges, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CAN | transport, taxi, lounges, storage, sleep, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CDG | transport, taxi, storage, sleep, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CEE | parking, lounges, sleep, kids | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| CEK | transport, lounges, kids, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| CJU | transport, taxi, kids, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CLT | taxi, kids, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CPH | transport, terminals, sleep, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CSX | transport, taxi, parking | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CSY | transport, lounges, storage, parking | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| CTU | transport, taxi, terminals, storage | ru + zh/ja/ko/ar/hi, все title/hint/text |
| CXR | kids, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| DEL | transport, taxi, parking | ru + zh/ja/ko/ar/hi, все title/hint/text |
| DEN | transport, taxi, lounges, sleep, kids, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| DFW | transport, taxi, lounges, kids, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| DLM | transport, taxi, parking, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| DME | lounges, storage, sleep, kids, transport, parking, terminals | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| DMK | transport, taxi, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| DMM | transport, taxi, lounges, parking | ru + zh/ja/ko/ar/hi, все title/hint/text + about |
| DOH | transport, taxi, sleep, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |
| DUB | transport, taxi, storage, wifi | ru + zh/ja/ko/ar/hi, все title/hint/text |

Предложений: 67 полей в 42 файлах. JSON проверен парсером, before берётся буквально из текущих файлов; применение требует сверки before.
