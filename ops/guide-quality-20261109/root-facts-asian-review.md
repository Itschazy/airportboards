# Независимая рецензия root fact fixes: zh/ja/ko/ar/hi

Полностью прочитаны title/hint/text перечисленных ниже блоков против актуального RU; NBC about и VVO storage.hint отдельно. Результат: смысловых блокирующих ошибок не найдено. Найденные AMS ko два пропущенных пробела и DFW ja/ko hints >=20 вместо >20 переданы root, исправлены им, перечитаны actual: пробелы есть, 全ターミナルに20超 / 20곳 초과, 전 터미널 корректны. Открытых предложений нет.

## Проверенные условия

- SHA: public departures, дверь6,07:00–20:30 с оговоркой, платно до1месяца, бесплатное1место72ч только при паспорте с правом240ч транзита, документ на сдаче и получении, рентген — сохранены.
- TFU: Wanhui/JianyangSouth, трансфер в обе стороны06:00–22:00, T1exit12/T2exit21 на этаже вылета, check-in/check-out14:00, самостоятельный check-in18+ — сохранены. Выходы не перепутаны с gates.
- AMS: tap-in и tap-out для карты/телефона; Lounge3/Mercure и Lounge2/YOTELAIR; отсутствие требования визы только YOTELAIR, рейс в день выезда и только ручная кладь только Mercure — сохранены.
- DFW: >20, airside Skylink5терминалов, право доступа, список операторов, отдельно PS в частном терминале — сохранены.
- BKK: этаж1, двери4–7,50бат водителю и платные дороги пассажиру, не более20км — сохранены.
- ABA:50мсправа,77мест,24/7,касса терминала cash-or-card,24ч округление с даты/времени въезда — сохранены, закрытие не утверждается.
- NBC about:25км удалены во всех5; города и >700000 сохранены. Японское 各都市の航空交通を担っている передаёт обслуживание городов, не расстояние.
- VVO storage hints:400руб удалены из всех5, осталось1этаж24/7.

## Реально прочитанные файлы

### SHA: storage

- `data/airport-guide/SHA.json`
- `data/airport-guide/zh/SHA.json`
- `data/airport-guide/ja/SHA.json`
- `data/airport-guide/ko/SHA.json`
- `data/airport-guide/ar/SHA.json`
- `data/airport-guide/hi/SHA.json`

### TFU: sleep

- `data/airport-guide/TFU.json`
- `data/airport-guide/zh/TFU.json`
- `data/airport-guide/ja/TFU.json`
- `data/airport-guide/ko/TFU.json`
- `data/airport-guide/ar/TFU.json`
- `data/airport-guide/hi/TFU.json`

### AMS: transport, sleep

- `data/airport-guide/AMS.json`
- `data/airport-guide/zh/AMS.json`
- `data/airport-guide/ja/AMS.json`
- `data/airport-guide/ko/AMS.json`
- `data/airport-guide/ar/AMS.json`
- `data/airport-guide/hi/AMS.json`

### DFW: lounges

- `data/airport-guide/DFW.json`
- `data/airport-guide/zh/DFW.json`
- `data/airport-guide/ja/DFW.json`
- `data/airport-guide/ko/DFW.json`
- `data/airport-guide/ar/DFW.json`
- `data/airport-guide/hi/DFW.json`

### BKK: taxi

- `data/airport-guide/BKK.json`
- `data/airport-guide/zh/BKK.json`
- `data/airport-guide/ja/BKK.json`
- `data/airport-guide/ko/BKK.json`
- `data/airport-guide/ar/BKK.json`
- `data/airport-guide/hi/BKK.json`

### ABA: parking

- `data/airport-guide/ABA.json`
- `data/airport-guide/zh/ABA.json`
- `data/airport-guide/ja/ABA.json`
- `data/airport-guide/ko/ABA.json`
- `data/airport-guide/ar/ABA.json`
- `data/airport-guide/hi/ABA.json`

### NBC: about

- `data/airport-guide/NBC.json`
- `data/airport-guide/zh/NBC.json`
- `data/airport-guide/ja/NBC.json`
- `data/airport-guide/ko/NBC.json`
- `data/airport-guide/ar/NBC.json`
- `data/airport-guide/hi/NBC.json`

### VVO: storage.hint

- `data/airport-guide/VVO.json`
- `data/airport-guide/zh/VVO.json`
- `data/airport-guide/ja/VVO.json`
- `data/airport-guide/ko/VVO.json`
- `data/airport-guide/ar/VVO.json`
- `data/airport-guide/hi/VVO.json`

## Ограничения

Без носителей языков. Проверена эквивалентность актуальному RU, не свежесть источников, визовое право, работа сервиса или визуальный RTL. Фактическую проверку источников выполнял root. SHA256 фиксирует файл снимка, не означает чтение остальных блоков вне указанного scope. Data, commit/push не менялись рецензентом.
