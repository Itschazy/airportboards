# Независимая сверка переводов: medium-01, 2026-11-09

## Покрытие

HEAD при сохранении отчёта: `3fe9f0ea24a30dc2e20b4b4d5d28acbb24d20356`. Проверены именно первые 40 IATA по заданному фильтру inventory, не все 188 аэропортов.

Полностью прочитаны RU и en/de/fr/es/it/tr: **40 аэропортов, 240 файлов переводов, 1056 блоков переводов, 78 полей about, 3246 текстовых полей** (title, hint, text и имеющийся about). RU содержит 176 блоков. Ниже перечислены все 280 прочитанных файлов; SHA-256 зафиксированы в `medium-01-european-hashes.json`.

Проверка сопоставляла смысл, отрицания, and/or, условия доступа, возрастные границы, тарифы, периоды, числа, валюты, названия, номера уровней и терминалов, exit/gate, грамматику. Материал прочитан последовательными порциями. Обрезанный фрагмент AER DE/FR перечитан отдельно.

## Подтверждённые проблемы

1. **AER, ARH, BQS, BTK, CEE, CSY — все шесть локалей:** RU «сутки» передано как day/Tag/jour/día/giorno/gün; BTK FR отель — как nuit. По BRIEF период должен быть явно 24 часа. Поля: AER parking.text; ARH storage.text и parking.text; BQS storage.text; BTK sleep.text и parking.text; CEE parking.text; CSY storage.hint, storage.text и parking.text. В CSY сохранён порог «от 3 суток» как три периода по 24 часа. Уточнение BTK отражает RU; отдельная фактическая проверка расчётного времени гостиницы не выполнялась.
2. **AER, ASF, BAX, BTK, CEE, CEK — EN parking.text:** «station forecourt» обозначает привокзальную площадь железнодорожной станции. В RU площадь аэропорта; предложено «airport terminal forecourt».
3. **ASF — FR/IT kids.text:** условное расширение допуска «до 8 лет при наличии мест» передано `jusqu'à 8` / `fino a 8`, что допускает включение восьмилетних. Предложено строго «младше 8»; условие наличия мест сохранено.
4. **BQS — TR transport.text:** русское `м-н «Благовещенск»` (магазин) стало `mkr. Blagoveshchensk` (микрорайон). Предложено название остановки `Magazin Blagoveshchensk`.
5. **CEK — FR kids.text:** `rez-de-chaussée` вместо RU «1 этаж». Согласно правилам проекта предложено `niveau 1`, без домысливания системы нумерации этажей.
6. **DME — FR kids.text:** `lits d'enfant jusqu'à 3 ans` не сохраняет строго «до 3 лет». Предложено `lits pour les enfants de moins de 3 ans`.
7. **DME — IT kids.text:** `lettini sotto i 3 anni` грамматически относит возраст к кроватям. Предложено `lettini per bambini sotto i 3 anni`.

Всего **69 предлагаемых правок полей в 44 файлах**. Полные before/after, причина и исходный SHA файла находятся в `proposed-medium-01-european.json`. Несколько замечаний одного поля объединены в одну правку. Данные не изменены.

## Что не объявлено ошибкой

- BAX хранение: RU явно календарный день 00:00–23:59, поэтому перевод «день» оставлен.
- AUH после 72 часов: в RU «день», не «сутки»; автоматической замены нет.
- DFW право доступа в любой терминал не потеряно; DOH отдельные мужские/женские/семейные комнаты сохранены.
- DEL тарифные ступени, DEN тарифы зон и исключение аэропортового сбора, DME отсутствие бесплатного времени/стерилизаторов, DMK доплата и дорожные сборы, DUB отсутствие регистрации сохранены.
- Не обнаружены подтверждённые смысловые проблемы в остальных прочитанных полях. Это не утверждение об абсолютном отсутствии ошибок.

## Структурные результаты и ограничения

Проверка длины hint: 2 превышений 35 символов: [('BRS', 'it', 'sleep', 36), ('BRS', 'tr', 'sleep', 36)]. Предлагаемые короткие CSY hints также укладываются в лимит.

Это независимая агентская сверка, **не вычитка носителями шести языков**. Актуальность каждого русского факта по внешним источникам в данной партии не перепроверялась. Перевод не исправляет потенциальные ошибки RU. Полная проверка рендера, сборки и production относится к применяющему изменения агенту. Никаких платных API, изменения data, commit/push или обращения к production в этой партии не было.

Для автоматизации полезны адресные проверки: сутки→явная единица 24 часов (с исключением календарного дня BAX), возрастные ограничения→строгое under/moins de/unter, запрет station forecourt в переводе аэропортовой площади, и numbered floor→Level/niveau. Простое множество чисел эти ошибки не ловит; добавление 24 требует разрешения эквивалентной единицы, а не ослабления проверки всех чисел.

## Каждый прочитанный файл

### ABA — 4 блоков
- `data/airport-guide/ABA.json`
- `data/airport-guide/en/ABA.json`
- `data/airport-guide/de/ABA.json`
- `data/airport-guide/fr/ABA.json`
- `data/airport-guide/es/ABA.json`
- `data/airport-guide/it/ABA.json`
- `data/airport-guide/tr/ABA.json`

### AER — 8 блоков
- `data/airport-guide/AER.json`
- `data/airport-guide/en/AER.json`
- `data/airport-guide/de/AER.json`
- `data/airport-guide/fr/AER.json`
- `data/airport-guide/es/AER.json`
- `data/airport-guide/it/AER.json`
- `data/airport-guide/tr/AER.json`

### ALA — 3 блоков
- `data/airport-guide/ALA.json`
- `data/airport-guide/en/ALA.json`
- `data/airport-guide/de/ALA.json`
- `data/airport-guide/fr/ALA.json`
- `data/airport-guide/es/ALA.json`
- `data/airport-guide/it/ALA.json`
- `data/airport-guide/tr/ALA.json`

### AMS — 5 блоков
- `data/airport-guide/AMS.json`
- `data/airport-guide/en/AMS.json`
- `data/airport-guide/de/AMS.json`
- `data/airport-guide/fr/AMS.json`
- `data/airport-guide/es/AMS.json`
- `data/airport-guide/it/AMS.json`
- `data/airport-guide/tr/AMS.json`

### ARH — 4 блоков
- `data/airport-guide/ARH.json`
- `data/airport-guide/en/ARH.json`
- `data/airport-guide/de/ARH.json`
- `data/airport-guide/fr/ARH.json`
- `data/airport-guide/es/ARH.json`
- `data/airport-guide/it/ARH.json`
- `data/airport-guide/tr/ARH.json`

### ASF — 5 блоков
- `data/airport-guide/ASF.json`
- `data/airport-guide/en/ASF.json`
- `data/airport-guide/de/ASF.json`
- `data/airport-guide/fr/ASF.json`
- `data/airport-guide/es/ASF.json`
- `data/airport-guide/it/ASF.json`
- `data/airport-guide/tr/ASF.json`

### ATL — 4 блоков
- `data/airport-guide/ATL.json`
- `data/airport-guide/en/ATL.json`
- `data/airport-guide/de/ATL.json`
- `data/airport-guide/fr/ATL.json`
- `data/airport-guide/es/ATL.json`
- `data/airport-guide/it/ATL.json`
- `data/airport-guide/tr/ATL.json`

### AUH — 4 блоков
- `data/airport-guide/AUH.json`
- `data/airport-guide/en/AUH.json`
- `data/airport-guide/de/AUH.json`
- `data/airport-guide/fr/AUH.json`
- `data/airport-guide/es/AUH.json`
- `data/airport-guide/it/AUH.json`
- `data/airport-guide/tr/AUH.json`

### BAX — 7 блоков
- `data/airport-guide/BAX.json`
- `data/airport-guide/en/BAX.json`
- `data/airport-guide/de/BAX.json`
- `data/airport-guide/fr/BAX.json`
- `data/airport-guide/es/BAX.json`
- `data/airport-guide/it/BAX.json`
- `data/airport-guide/tr/BAX.json`

### BCN — 3 блоков
- `data/airport-guide/BCN.json`
- `data/airport-guide/en/BCN.json`
- `data/airport-guide/de/BCN.json`
- `data/airport-guide/fr/BCN.json`
- `data/airport-guide/es/BCN.json`
- `data/airport-guide/it/BCN.json`
- `data/airport-guide/tr/BCN.json`

### BJV — 5 блоков
- `data/airport-guide/BJV.json`
- `data/airport-guide/en/BJV.json`
- `data/airport-guide/de/BJV.json`
- `data/airport-guide/fr/BJV.json`
- `data/airport-guide/es/BJV.json`
- `data/airport-guide/it/BJV.json`
- `data/airport-guide/tr/BJV.json`

### BKK — 4 блоков
- `data/airport-guide/BKK.json`
- `data/airport-guide/en/BKK.json`
- `data/airport-guide/de/BKK.json`
- `data/airport-guide/fr/BKK.json`
- `data/airport-guide/es/BKK.json`
- `data/airport-guide/it/BKK.json`
- `data/airport-guide/tr/BKK.json`

### BLR — 4 блоков
- `data/airport-guide/BLR.json`
- `data/airport-guide/en/BLR.json`
- `data/airport-guide/de/BLR.json`
- `data/airport-guide/fr/BLR.json`
- `data/airport-guide/es/BLR.json`
- `data/airport-guide/it/BLR.json`
- `data/airport-guide/tr/BLR.json`

### BOG — 4 блоков
- `data/airport-guide/BOG.json`
- `data/airport-guide/en/BOG.json`
- `data/airport-guide/de/BOG.json`
- `data/airport-guide/fr/BOG.json`
- `data/airport-guide/es/BOG.json`
- `data/airport-guide/it/BOG.json`
- `data/airport-guide/tr/BOG.json`

### BOS — 4 блоков
- `data/airport-guide/BOS.json`
- `data/airport-guide/en/BOS.json`
- `data/airport-guide/de/BOS.json`
- `data/airport-guide/fr/BOS.json`
- `data/airport-guide/es/BOS.json`
- `data/airport-guide/it/BOS.json`
- `data/airport-guide/tr/BOS.json`

### BQS — 6 блоков
- `data/airport-guide/BQS.json`
- `data/airport-guide/en/BQS.json`
- `data/airport-guide/de/BQS.json`
- `data/airport-guide/fr/BQS.json`
- `data/airport-guide/es/BQS.json`
- `data/airport-guide/it/BQS.json`
- `data/airport-guide/tr/BQS.json`

### BRS — 4 блоков
- `data/airport-guide/BRS.json`
- `data/airport-guide/en/BRS.json`
- `data/airport-guide/de/BRS.json`
- `data/airport-guide/fr/BRS.json`
- `data/airport-guide/es/BRS.json`
- `data/airport-guide/it/BRS.json`
- `data/airport-guide/tr/BRS.json`

### BRU — 3 блоков
- `data/airport-guide/BRU.json`
- `data/airport-guide/en/BRU.json`
- `data/airport-guide/de/BRU.json`
- `data/airport-guide/fr/BRU.json`
- `data/airport-guide/es/BRU.json`
- `data/airport-guide/it/BRU.json`
- `data/airport-guide/tr/BRU.json`

### BTK — 4 блоков
- `data/airport-guide/BTK.json`
- `data/airport-guide/en/BTK.json`
- `data/airport-guide/de/BTK.json`
- `data/airport-guide/fr/BTK.json`
- `data/airport-guide/es/BTK.json`
- `data/airport-guide/it/BTK.json`
- `data/airport-guide/tr/BTK.json`

### CAI — 4 блоков
- `data/airport-guide/CAI.json`
- `data/airport-guide/en/CAI.json`
- `data/airport-guide/de/CAI.json`
- `data/airport-guide/fr/CAI.json`
- `data/airport-guide/es/CAI.json`
- `data/airport-guide/it/CAI.json`
- `data/airport-guide/tr/CAI.json`

### CAN — 6 блоков
- `data/airport-guide/CAN.json`
- `data/airport-guide/en/CAN.json`
- `data/airport-guide/de/CAN.json`
- `data/airport-guide/fr/CAN.json`
- `data/airport-guide/es/CAN.json`
- `data/airport-guide/it/CAN.json`
- `data/airport-guide/tr/CAN.json`

### CDG — 5 блоков
- `data/airport-guide/CDG.json`
- `data/airport-guide/en/CDG.json`
- `data/airport-guide/de/CDG.json`
- `data/airport-guide/fr/CDG.json`
- `data/airport-guide/es/CDG.json`
- `data/airport-guide/it/CDG.json`
- `data/airport-guide/tr/CDG.json`

### CEE — 4 блоков
- `data/airport-guide/CEE.json`
- `data/airport-guide/en/CEE.json`
- `data/airport-guide/de/CEE.json`
- `data/airport-guide/fr/CEE.json`
- `data/airport-guide/es/CEE.json`
- `data/airport-guide/it/CEE.json`
- `data/airport-guide/tr/CEE.json`

### CEK — 5 блоков
- `data/airport-guide/CEK.json`
- `data/airport-guide/en/CEK.json`
- `data/airport-guide/de/CEK.json`
- `data/airport-guide/fr/CEK.json`
- `data/airport-guide/es/CEK.json`
- `data/airport-guide/it/CEK.json`
- `data/airport-guide/tr/CEK.json`

### CJU — 4 блоков
- `data/airport-guide/CJU.json`
- `data/airport-guide/en/CJU.json`
- `data/airport-guide/de/CJU.json`
- `data/airport-guide/fr/CJU.json`
- `data/airport-guide/es/CJU.json`
- `data/airport-guide/it/CJU.json`
- `data/airport-guide/tr/CJU.json`

### CLT — 4 блоков
- `data/airport-guide/CLT.json`
- `data/airport-guide/en/CLT.json`
- `data/airport-guide/de/CLT.json`
- `data/airport-guide/fr/CLT.json`
- `data/airport-guide/es/CLT.json`
- `data/airport-guide/it/CLT.json`
- `data/airport-guide/tr/CLT.json`

### CPH — 4 блоков
- `data/airport-guide/CPH.json`
- `data/airport-guide/en/CPH.json`
- `data/airport-guide/de/CPH.json`
- `data/airport-guide/fr/CPH.json`
- `data/airport-guide/es/CPH.json`
- `data/airport-guide/it/CPH.json`
- `data/airport-guide/tr/CPH.json`

### CSX — 3 блоков
- `data/airport-guide/CSX.json`
- `data/airport-guide/en/CSX.json`
- `data/airport-guide/de/CSX.json`
- `data/airport-guide/fr/CSX.json`
- `data/airport-guide/es/CSX.json`
- `data/airport-guide/it/CSX.json`
- `data/airport-guide/tr/CSX.json`

### CSY — 4 блоков
- `data/airport-guide/CSY.json`
- `data/airport-guide/en/CSY.json`
- `data/airport-guide/de/CSY.json`
- `data/airport-guide/fr/CSY.json`
- `data/airport-guide/es/CSY.json`
- `data/airport-guide/it/CSY.json`
- `data/airport-guide/tr/CSY.json`

### CTU — 4 блоков
- `data/airport-guide/CTU.json`
- `data/airport-guide/en/CTU.json`
- `data/airport-guide/de/CTU.json`
- `data/airport-guide/fr/CTU.json`
- `data/airport-guide/es/CTU.json`
- `data/airport-guide/it/CTU.json`
- `data/airport-guide/tr/CTU.json`

### CXR — 3 блоков
- `data/airport-guide/CXR.json`
- `data/airport-guide/en/CXR.json`
- `data/airport-guide/de/CXR.json`
- `data/airport-guide/fr/CXR.json`
- `data/airport-guide/es/CXR.json`
- `data/airport-guide/it/CXR.json`
- `data/airport-guide/tr/CXR.json`

### DEL — 3 блоков
- `data/airport-guide/DEL.json`
- `data/airport-guide/en/DEL.json`
- `data/airport-guide/de/DEL.json`
- `data/airport-guide/fr/DEL.json`
- `data/airport-guide/es/DEL.json`
- `data/airport-guide/it/DEL.json`
- `data/airport-guide/tr/DEL.json`

### DEN — 6 блоков
- `data/airport-guide/DEN.json`
- `data/airport-guide/en/DEN.json`
- `data/airport-guide/de/DEN.json`
- `data/airport-guide/fr/DEN.json`
- `data/airport-guide/es/DEN.json`
- `data/airport-guide/it/DEN.json`
- `data/airport-guide/tr/DEN.json`

### DFW — 6 блоков
- `data/airport-guide/DFW.json`
- `data/airport-guide/en/DFW.json`
- `data/airport-guide/de/DFW.json`
- `data/airport-guide/fr/DFW.json`
- `data/airport-guide/es/DFW.json`
- `data/airport-guide/it/DFW.json`
- `data/airport-guide/tr/DFW.json`

### DLM — 4 блоков
- `data/airport-guide/DLM.json`
- `data/airport-guide/en/DLM.json`
- `data/airport-guide/de/DLM.json`
- `data/airport-guide/fr/DLM.json`
- `data/airport-guide/es/DLM.json`
- `data/airport-guide/it/DLM.json`
- `data/airport-guide/tr/DLM.json`

### DME — 7 блоков
- `data/airport-guide/DME.json`
- `data/airport-guide/en/DME.json`
- `data/airport-guide/de/DME.json`
- `data/airport-guide/fr/DME.json`
- `data/airport-guide/es/DME.json`
- `data/airport-guide/it/DME.json`
- `data/airport-guide/tr/DME.json`

### DMK — 3 блоков
- `data/airport-guide/DMK.json`
- `data/airport-guide/en/DMK.json`
- `data/airport-guide/de/DMK.json`
- `data/airport-guide/fr/DMK.json`
- `data/airport-guide/es/DMK.json`
- `data/airport-guide/it/DMK.json`
- `data/airport-guide/tr/DMK.json`

### DMM — 4 блоков
- `data/airport-guide/DMM.json`
- `data/airport-guide/en/DMM.json`
- `data/airport-guide/de/DMM.json`
- `data/airport-guide/fr/DMM.json`
- `data/airport-guide/es/DMM.json`
- `data/airport-guide/it/DMM.json`
- `data/airport-guide/tr/DMM.json`

### DOH — 4 блоков
- `data/airport-guide/DOH.json`
- `data/airport-guide/en/DOH.json`
- `data/airport-guide/de/DOH.json`
- `data/airport-guide/fr/DOH.json`
- `data/airport-guide/es/DOH.json`
- `data/airport-guide/it/DOH.json`
- `data/airport-guide/tr/DOH.json`

### DUB — 4 блоков
- `data/airport-guide/DUB.json`
- `data/airport-guide/en/DUB.json`
- `data/airport-guide/de/DUB.json`
- `data/airport-guide/fr/DUB.json`
- `data/airport-guide/es/DUB.json`
- `data/airport-guide/it/DUB.json`
- `data/airport-guide/tr/DUB.json`
