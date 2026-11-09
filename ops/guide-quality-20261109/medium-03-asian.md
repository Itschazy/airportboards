# Независимая сверка medium03: zh / ja / ko / ar / hi

Проверены все title, hint, text и имеющиеся about у 40 аэропортов исходного inventory, slice 80:120. Каждый русский текст сопоставлен с пятью переводами. Данные не изменялись. Предложения автора проверки требуют независимого принятия root.

## Покрытие

180 русских блоков и 900 переводных блоков; 240 файлов. Перечень с SHA-256: medium-03-asian-file-hashes.json.

- `LBA`: transport, taxi, kids, parking. Прочитаны `data/airport-guide/LBA.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LBA.json`, включая about при наличии.
- `LCY`: transport, taxi, parking. Прочитаны `data/airport-guide/LCY.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LCY.json`, включая about при наличии.
- `LED`: lounges, storage, sleep, kids, transport, taxi, parking, wifi, terminals. Прочитаны `data/airport-guide/LED.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LED.json`, включая about при наличии.
- `LGA`: transport, taxi, terminals, wifi. Прочитаны `data/airport-guide/LGA.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LGA.json`, включая about при наличии.
- `LGW`: transport, kids, wifi. Прочитаны `data/airport-guide/LGW.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LGW.json`, включая about при наличии.
- `LHR`: transport, taxi, lounges, storage, wifi. Прочитаны `data/airport-guide/LHR.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LHR.json`, включая about при наличии.
- `LIM`: taxi, lounges, sleep, wifi. Прочитаны `data/airport-guide/LIM.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LIM.json`, включая about при наличии.
- `LIS`: transport, terminals, kids, wifi. Прочитаны `data/airport-guide/LIS.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/LIS.json`, включая about при наличии.
- `MAD`: transport, taxi, wifi. Прочитаны `data/airport-guide/MAD.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MAD.json`, включая about при наличии.
- `MAN`: transport, storage, kids, wifi. Прочитаны `data/airport-guide/MAN.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MAN.json`, включая about при наличии.
- `MCO`: transport, taxi, sleep, kids, parking, wifi. Прочитаны `data/airport-guide/MCO.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MCO.json`, включая about при наличии.
- `MCX`: terminals, lounges, parking. Прочитаны `data/airport-guide/MCX.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MCX.json`, включая about при наличии.
- `MEL`: transport, storage, sleep, kids, wifi. Прочитаны `data/airport-guide/MEL.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MEL.json`, включая about при наличии.
- `MEX`: transport, terminals, storage. Прочитаны `data/airport-guide/MEX.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MEX.json`, включая about при наличии.
- `MIA`: transport, taxi, lounges, storage, sleep, kids, parking, wifi. Прочитаны `data/airport-guide/MIA.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MIA.json`, включая about при наличии.
- `MMK`: transport, storage, kids. Прочитаны `data/airport-guide/MMK.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MMK.json`, включая about при наличии.
- `MNL`: taxi, parking, wifi. Прочитаны `data/airport-guide/MNL.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MNL.json`, включая about при наличии.
- `MRV`: transport, lounges, storage, kids, parking. Прочитаны `data/airport-guide/MRV.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MRV.json`, включая about при наличии.
- `MSP`: transport, taxi, sleep, wifi. Прочитаны `data/airport-guide/MSP.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MSP.json`, включая about при наличии.
- `MUC`: transport, storage, sleep, kids, wifi. Прочитаны `data/airport-guide/MUC.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/MUC.json`, включая about при наличии.
- `NAL`: transport, lounges, kids. Прочитаны `data/airport-guide/NAL.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NAL.json`, включая about при наличии.
- `NBC`: transport, terminals, lounges, storage, sleep, kids, parking, wifi. Прочитаны `data/airport-guide/NBC.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NBC.json`, включая about при наличии.
- `NCL`: transport, taxi, kids, wifi. Прочитаны `data/airport-guide/NCL.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NCL.json`, включая about при наличии.
- `NER`: terminals, lounges, kids. Прочитаны `data/airport-guide/NER.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NER.json`, включая about при наличии.
- `NJC`: transport, terminals, lounges, storage, kids, parking. Прочитаны `data/airport-guide/NJC.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NJC.json`, включая about при наличии.
- `NNM`: lounges, storage, parking. Прочитаны `data/airport-guide/NNM.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NNM.json`, включая about при наличии.
- `NOJ`: transport, terminals, lounges. Прочитаны `data/airport-guide/NOJ.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NOJ.json`, включая about при наличии.
- `NOZ`: transport, terminals, lounges, storage, sleep, kids, parking. Прочитаны `data/airport-guide/NOZ.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NOZ.json`, включая about при наличии.
- `NRT`: terminals, storage, kids, wifi. Прочитаны `data/airport-guide/NRT.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NRT.json`, включая about при наличии.
- `NSK`: transport, terminals, lounges, sleep, kids. Прочитаны `data/airport-guide/NSK.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NSK.json`, включая about при наличии.
- `NUX`: transport, parking, lounges, storage, wifi. Прочитаны `data/airport-guide/NUX.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NUX.json`, включая about при наличии.
- `NYM`: transport, lounges, kids, parking. Прочитаны `data/airport-guide/NYM.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/NYM.json`, включая about при наличии.
- `OKA`: transport, storage, kids, wifi. Прочитаны `data/airport-guide/OKA.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/OKA.json`, включая about при наличии.
- `ORD`: transport, taxi, lounges, sleep, kids, parking, wifi. Прочитаны `data/airport-guide/ORD.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/ORD.json`, включая about при наличии.
- `ORK`: transport, taxi, terminals, parking, wifi. Прочитаны `data/airport-guide/ORK.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/ORK.json`, включая about при наличии.
- `ORY`: transport, storage, kids, wifi. Прочитаны `data/airport-guide/ORY.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/ORY.json`, включая about при наличии.
- `OSW`: lounges, kids, parking. Прочитаны `data/airport-guide/OSW.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/OSW.json`, включая about при наличии.
- `PEE`: transport, storage, kids, parking, wifi. Прочитаны `data/airport-guide/PEE.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/PEE.json`, включая about при наличии.
- `PEK`: transport, taxi, storage, kids, parking. Прочитаны `data/airport-guide/PEK.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/PEK.json`, включая about при наличии.
- `PHL`: transport, taxi, kids, wifi. Прочитаны `data/airport-guide/PHL.json` и `data/airport-guide/{zh,ja,ko,ar,hi}/PHL.json`, включая about при наличии.

## Подтверждённые замечания

- NBC zh storage: первый календарный день до 23:59 стал первыми 24 часами. Предложено 首个自然日. Остальные четыре перевода этой границы соответствуют RU.
- PEK zh parking: строго меньше 10 минут превратилось в 10 минут включительно. Предложено 不足10分钟.
- MRV parking hints во всех пяти языках, как и RU hint, обещают бесплатные 15 минут; основной текст явно требует меньше 15 минут. Предложения делают границу строгой. Нужно синхронно исправить RU и остальные языки.
- PEK parking hints, включая RU, распространяют цену 100 юаней на оба гаража, хотя основной текст приводит её для долгосрочной зоны гаража 2. Предложены короткие hints с гаражом 2 и долгосрочной парковкой. Требуется синхронизация RU/остальных языков; полные ограничения 5.5 часа и B2–B4 остаются в text.
- OSW hi parking: «от суток» стало «больше 24 часов»; предложено включить ровно 24 часа. Общая неоднозначность самого RU тарифа после суток не устранена предположением о новой единице оплаты.
- MCX/NYM ar lounges: отрицательная конструкция срока подачи/оплаты может читаться неоднозначно. Предложено явно минимум за час до регистрации / минимум за 15 часов до вылета. Это улучшение ясности, не доказанная инверсия исходного перевода.
- NJC ja transport: エアバス обычно обозначает Airbus, заменено в предложении на 空港バス (автобус). MMK ja kids: «только ручная кладь», затем «багаж сдаётся» использовали одно общее слово; предложено «остальной багаж».
- LED ko taxi: лишнее 버스번은, исправление 버스는. NJC ko lounges: 어린이은 → 어린이는.
- NCL ja transport: 真夜中 заменено точным 00:00. MEL/MEX/MSP/MUC уже содержат точное 深夜0時 и не требуют такой правки.
- NBC/NUX ko about: больше 700 тысяч / миллиона превратилось в не менее; предложены строгие сравнения с естественной корейской грамматикой. Низкая важность.
- NOZ hi parking: «со второго по четвёртый час» уточнено порядковыми числительными; то же уточнение включено в арабское предложение.

## Единицы оплаты

Предложено явно 24 часа для RU «сутки» в LED parking zh/ja; MCO parking hints zh/ko; MCX, MRV, NBC parking всех пяти; MIA storage всех пяти; NJC storage всех пяти, kids zh/ko/ar/hi, parking zh; NNM parking zh/ja; NOZ parking всех пяти с округлением неполного периода; NUX storage всех пяти; OSW пороги zh/ja; PEE parking zh/ja. Ставки и условия сохранены. Это устранение неоднозначности единицы, а не новая проверка актуальности тарифов. В NJC zh условие вылета «в течение суток» также стало явными 24 часами.

## Осознанно сохранено / исходник требует внимания

- LED storage — календарный первый день. MRV storage — первый день до 24:00. NBC storage — до 23:59. NRT — отдельные календарный и почасовой тарифы; смена дня в полночь сохранена. OKA и LHR используют RU «день», без самостоятельного изменения на 24 часа.
- NOZ и NSK гостиничные тарифы не менялись: сутки проживания могут зависеть от расчётного часа. NSK ja уже говорит 24時間単位; требует проверки правил размещения, если понадобится уточнять этот текст.
- NBC RU about: Альметьевск заявлен в радиусе 25 км. Переводы повторяют исходник. Сообщено root для проверки географического факта; не предлагается новая дистанция.
- MCO размеры машин соединены «или» в RU; все пять переводов сохранили «или». Правка исходного условия возможна только по источнику.
- NOZ storage последующие ставки без явно повторённой единицы отражают такую же краткость RU. Не добавлялась новая схема списания.

## Проверки и ограничения

72 предложения в 55 файлах, каждое before совпадает с прочитанным значением, пути уникальны. Все итоговые after прочитаны целиком после генерации; исправлена корейская двойная частица в NJC и уточнён порядковый час NOZ ar. Даты OSW 01.01.2026 и NNM 1 августа 2026 сохранены буквально; глобальная замена 1日 не применяется к датам. Все hints исходной партии и предложений укладываются в 18 символов для CJK/ko и 35 для ar/hi.

Это проверка смысловой эквивалентности и явных языковых ошибок агентом, без носителей пяти языков. Не проверялись свежесть внешних фактов, юридические правила, фактические планы терминалов, production/UI/визуальное направление арабского текста. Наличие хорошего перевода не подтверждает истинность RU. Корпус за пределами перечисленных файлов этим отчётом не покрывается.
