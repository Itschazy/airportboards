# Независимая сверка medium-02 — 2026-11-09

## Фактическое покрытие

HEAD `3fe9f0ea24a30dc2e20b4b4d5d28acbb24d20356`. Выборка: исходный ops/guide-quality-20261109/inventory.json, guide=true, blocks>=3, исключены KZN/OVB/AYT/HRG/SSH/IST, сортировка IATA, slice 40:80. Новые блоки коротких аэропортов выборку не меняют.

Полностью прочитаны **40 аэропортов, 240 файлов переводов en/de/fr/es/it/tr, 1110 блоков, 96 about, 3426 полей title/hint/text/about** против RU. Всего 280 файлов с RU. Это покрытие этой партии, не всех 188. Обрезанные части FLL/FRA, HKG RU и HND RU/EN/DE перечитаны отдельно. Все файлы перечислены ниже, SHA-256 в medium-02-european-hashes.json.

## Подтверждённые исправления

- EYK storage.hint/text; GDX storage/parking.text; GDZ storage/parking.text; GOJ storage/parking.text; HMA parking.text; IAR parking.hint/text; IJK parking.text; IKT storage.hint/text и parking.text; KEJ storage.hint/text и parking.text; KGD parking.text; KHV parking.text; KRR storage.hint и parking.text; KUF storage/parking.text: русские тарифные «сутки» переданы календарным day/Tag/jour/día/giorno/gün. Предложены явные 24 часа, в том числе округление неполного периода GDX/KEJ и пороги нескольких суток. Все шесть локалей.
- EN GDX/HMA/KEJ/KVX parking.text, IJK transport.text, KRR transport/storage/parking.text: station forecourt → airport terminal forecourt.
- GYD FR lounges.text и KGD FR kids.text: rez-de-chaussée → niveau 1 по номеру уровня RU.
- HND TR terminals.text: İç hatlardan dış hatlara означает из внутренних рейсов в международные, исключая обратное направление. RU «между» не ограничивает направление. Предложено İç ve dış hat uçuşları arasında.
- GOJ FR transport.text: gare de Moscou может направить читателя в Москву вместо Московского вокзала Нижнего Новгорода; предложено собственное название gare Moskovsky.
- GDX/GDZ ES parking.text: dentro de la misma hora заменено на en el plazo de una hora, чтобы не ограничивать период тем же часовым интервалом на часах.
- KGD/GDZ DE parking.text: Halten заменено на Parken, чтобы не подменять стоянку остановкой.

**152 предлагаемых полей в 81 файлах.** Полные before/after и guards: proposed-medium-02-european.json. Повторно прочитаны все итоговые after тремя порциями; исправлены немецкое склонение GOJ, длина FR KRR hint и сохранена исходная неоднозначность порога KHV (не добавлен порядок ретроактивного пересчёта). Перед отчётом все before и SHA guards совпали с actual data.

## Осознанные исключения

- HMA hotel sleep: day/night не заменён на rolling 24h без проверки расчётного времени отеля; такой вывод не следует автоматически из гостиничных «суток».
- GYD «каждый следующий день», HND T1 хранение «за день», FRA 7 дней/Weekend Special не менялись: в RU именно день, а не тарифные сутки.
- KHV storage до 30 дней — общий срок хранения, не тарифный период; не вводилось громоздкое «30 периодов по 24 часа».
- HKG FR/ES/TR abandoned/ownerless для невостребованных вещей отмечено как возможная терминологическая неоднозначность; без уточнения источника не заявляется как доказанная правовая ошибка и не включено в JSON.
- LAS/LAX 24-часовые тарифы уже переданы явно. KIX women-only для кормления, не всей семейной комнаты, сохранено; отсутствие шифрования сохранено. EWR исключение прямого доступа AirTrain к A, IAD исключение большинства международных прилётов, FLL временное закрытие T4 и только RCC-шаттлы, JFK возраст строго младше 5 сохранены.

## Проверки и ограничения

Смысл, отрицания, and/or, возраст, доступ, числа/цены/условия, этажи, gate/exit, имена, SSID и грамматика сверены. Исходные hints длиннее 35: []. Все предлагаемые hints <=35. Числовой валидатор не заменяет такую сверку: он не ловит station/airport, направление пересадки, календарный день и номер уровня, ошибку отрицания или границы возраста.

Проверка агентская, **не вычитка носителями языка**. Не перепроверялась актуальность всех RU фактов по внешним источникам, не проводились browser/build/production проверки этой партии. Data не изменял, commit/push не делал. Финальная проверка после применения — отдельный этап и должна опираться на actual data и accepted JSON.

## Все прочитанные файлы

### DXB: 3 блоков
- `data/airport-guide/DXB.json`
- `data/airport-guide/en/DXB.json`
- `data/airport-guide/de/DXB.json`
- `data/airport-guide/fr/DXB.json`
- `data/airport-guide/es/DXB.json`
- `data/airport-guide/it/DXB.json`
- `data/airport-guide/tr/DXB.json`

### EDI: 4 блоков
- `data/airport-guide/EDI.json`
- `data/airport-guide/en/EDI.json`
- `data/airport-guide/de/EDI.json`
- `data/airport-guide/fr/EDI.json`
- `data/airport-guide/es/EDI.json`
- `data/airport-guide/it/EDI.json`
- `data/airport-guide/tr/EDI.json`

### EVN: 3 блоков
- `data/airport-guide/EVN.json`
- `data/airport-guide/en/EVN.json`
- `data/airport-guide/de/EVN.json`
- `data/airport-guide/fr/EVN.json`
- `data/airport-guide/es/EVN.json`
- `data/airport-guide/it/EVN.json`
- `data/airport-guide/tr/EVN.json`

### EWR: 4 блоков
- `data/airport-guide/EWR.json`
- `data/airport-guide/en/EWR.json`
- `data/airport-guide/de/EWR.json`
- `data/airport-guide/fr/EWR.json`
- `data/airport-guide/es/EWR.json`
- `data/airport-guide/it/EWR.json`
- `data/airport-guide/tr/EWR.json`

### EYK: 3 блоков
- `data/airport-guide/EYK.json`
- `data/airport-guide/en/EYK.json`
- `data/airport-guide/de/EYK.json`
- `data/airport-guide/fr/EYK.json`
- `data/airport-guide/es/EYK.json`
- `data/airport-guide/it/EYK.json`
- `data/airport-guide/tr/EYK.json`

### FCO: 4 блоков
- `data/airport-guide/FCO.json`
- `data/airport-guide/en/FCO.json`
- `data/airport-guide/de/FCO.json`
- `data/airport-guide/fr/FCO.json`
- `data/airport-guide/es/FCO.json`
- `data/airport-guide/it/FCO.json`
- `data/airport-guide/tr/FCO.json`

### FLL: 4 блоков
- `data/airport-guide/FLL.json`
- `data/airport-guide/en/FLL.json`
- `data/airport-guide/de/FLL.json`
- `data/airport-guide/fr/FLL.json`
- `data/airport-guide/es/FLL.json`
- `data/airport-guide/it/FLL.json`
- `data/airport-guide/tr/FLL.json`

### FRA: 7 блоков
- `data/airport-guide/FRA.json`
- `data/airport-guide/en/FRA.json`
- `data/airport-guide/de/FRA.json`
- `data/airport-guide/fr/FRA.json`
- `data/airport-guide/es/FRA.json`
- `data/airport-guide/it/FRA.json`
- `data/airport-guide/tr/FRA.json`

### FUK: 4 блоков
- `data/airport-guide/FUK.json`
- `data/airport-guide/en/FUK.json`
- `data/airport-guide/de/FUK.json`
- `data/airport-guide/fr/FUK.json`
- `data/airport-guide/es/FUK.json`
- `data/airport-guide/it/FUK.json`
- `data/airport-guide/tr/FUK.json`

### GCI: 4 блоков
- `data/airport-guide/GCI.json`
- `data/airport-guide/en/GCI.json`
- `data/airport-guide/de/GCI.json`
- `data/airport-guide/fr/GCI.json`
- `data/airport-guide/es/GCI.json`
- `data/airport-guide/it/GCI.json`
- `data/airport-guide/tr/GCI.json`

### GDX: 6 блоков
- `data/airport-guide/GDX.json`
- `data/airport-guide/en/GDX.json`
- `data/airport-guide/de/GDX.json`
- `data/airport-guide/fr/GDX.json`
- `data/airport-guide/es/GDX.json`
- `data/airport-guide/it/GDX.json`
- `data/airport-guide/tr/GDX.json`

### GDZ: 5 блоков
- `data/airport-guide/GDZ.json`
- `data/airport-guide/en/GDZ.json`
- `data/airport-guide/de/GDZ.json`
- `data/airport-guide/fr/GDZ.json`
- `data/airport-guide/es/GDZ.json`
- `data/airport-guide/it/GDZ.json`
- `data/airport-guide/tr/GDZ.json`

### GLA: 4 блоков
- `data/airport-guide/GLA.json`
- `data/airport-guide/en/GLA.json`
- `data/airport-guide/de/GLA.json`
- `data/airport-guide/fr/GLA.json`
- `data/airport-guide/es/GLA.json`
- `data/airport-guide/it/GLA.json`
- `data/airport-guide/tr/GLA.json`

### GOJ: 6 блоков
- `data/airport-guide/GOJ.json`
- `data/airport-guide/en/GOJ.json`
- `data/airport-guide/de/GOJ.json`
- `data/airport-guide/fr/GOJ.json`
- `data/airport-guide/es/GOJ.json`
- `data/airport-guide/it/GOJ.json`
- `data/airport-guide/tr/GOJ.json`

### GRU: 3 блоков
- `data/airport-guide/GRU.json`
- `data/airport-guide/en/GRU.json`
- `data/airport-guide/de/GRU.json`
- `data/airport-guide/fr/GRU.json`
- `data/airport-guide/es/GRU.json`
- `data/airport-guide/it/GRU.json`
- `data/airport-guide/tr/GRU.json`

### GYD: 5 блоков
- `data/airport-guide/GYD.json`
- `data/airport-guide/en/GYD.json`
- `data/airport-guide/de/GYD.json`
- `data/airport-guide/fr/GYD.json`
- `data/airport-guide/es/GYD.json`
- `data/airport-guide/it/GYD.json`
- `data/airport-guide/tr/GYD.json`

### HAN: 3 блоков
- `data/airport-guide/HAN.json`
- `data/airport-guide/en/HAN.json`
- `data/airport-guide/de/HAN.json`
- `data/airport-guide/fr/HAN.json`
- `data/airport-guide/es/HAN.json`
- `data/airport-guide/it/HAN.json`
- `data/airport-guide/tr/HAN.json`

### HKG: 6 блоков
- `data/airport-guide/HKG.json`
- `data/airport-guide/en/HKG.json`
- `data/airport-guide/de/HKG.json`
- `data/airport-guide/fr/HKG.json`
- `data/airport-guide/es/HKG.json`
- `data/airport-guide/it/HKG.json`
- `data/airport-guide/tr/HKG.json`

### HMA: 5 блоков
- `data/airport-guide/HMA.json`
- `data/airport-guide/en/HMA.json`
- `data/airport-guide/de/HMA.json`
- `data/airport-guide/fr/HMA.json`
- `data/airport-guide/es/HMA.json`
- `data/airport-guide/it/HMA.json`
- `data/airport-guide/tr/HMA.json`

### HND: 8 блоков
- `data/airport-guide/HND.json`
- `data/airport-guide/en/HND.json`
- `data/airport-guide/de/HND.json`
- `data/airport-guide/fr/HND.json`
- `data/airport-guide/es/HND.json`
- `data/airport-guide/it/HND.json`
- `data/airport-guide/tr/HND.json`

### HYD: 4 блоков
- `data/airport-guide/HYD.json`
- `data/airport-guide/en/HYD.json`
- `data/airport-guide/de/HYD.json`
- `data/airport-guide/fr/HYD.json`
- `data/airport-guide/es/HYD.json`
- `data/airport-guide/it/HYD.json`
- `data/airport-guide/tr/HYD.json`

### IAD: 4 блоков
- `data/airport-guide/IAD.json`
- `data/airport-guide/en/IAD.json`
- `data/airport-guide/de/IAD.json`
- `data/airport-guide/fr/IAD.json`
- `data/airport-guide/es/IAD.json`
- `data/airport-guide/it/IAD.json`
- `data/airport-guide/tr/IAD.json`

### IAH: 4 блоков
- `data/airport-guide/IAH.json`
- `data/airport-guide/en/IAH.json`
- `data/airport-guide/de/IAH.json`
- `data/airport-guide/fr/IAH.json`
- `data/airport-guide/es/IAH.json`
- `data/airport-guide/it/IAH.json`
- `data/airport-guide/tr/IAH.json`

### IAR: 5 блоков
- `data/airport-guide/IAR.json`
- `data/airport-guide/en/IAR.json`
- `data/airport-guide/de/IAR.json`
- `data/airport-guide/fr/IAR.json`
- `data/airport-guide/es/IAR.json`
- `data/airport-guide/it/IAR.json`
- `data/airport-guide/tr/IAR.json`

### ICN: 5 блоков
- `data/airport-guide/ICN.json`
- `data/airport-guide/en/ICN.json`
- `data/airport-guide/de/ICN.json`
- `data/airport-guide/fr/ICN.json`
- `data/airport-guide/es/ICN.json`
- `data/airport-guide/it/ICN.json`
- `data/airport-guide/tr/ICN.json`

### IGT: 3 блоков
- `data/airport-guide/IGT.json`
- `data/airport-guide/en/IGT.json`
- `data/airport-guide/de/IGT.json`
- `data/airport-guide/fr/IGT.json`
- `data/airport-guide/es/IGT.json`
- `data/airport-guide/it/IGT.json`
- `data/airport-guide/tr/IGT.json`

### IJK: 6 блоков
- `data/airport-guide/IJK.json`
- `data/airport-guide/en/IJK.json`
- `data/airport-guide/de/IJK.json`
- `data/airport-guide/fr/IJK.json`
- `data/airport-guide/es/IJK.json`
- `data/airport-guide/it/IJK.json`
- `data/airport-guide/tr/IJK.json`

### IKT: 7 блоков
- `data/airport-guide/IKT.json`
- `data/airport-guide/en/IKT.json`
- `data/airport-guide/de/IKT.json`
- `data/airport-guide/fr/IKT.json`
- `data/airport-guide/es/IKT.json`
- `data/airport-guide/it/IKT.json`
- `data/airport-guide/tr/IKT.json`

### JER: 4 блоков
- `data/airport-guide/JER.json`
- `data/airport-guide/en/JER.json`
- `data/airport-guide/de/JER.json`
- `data/airport-guide/fr/JER.json`
- `data/airport-guide/es/JER.json`
- `data/airport-guide/it/JER.json`
- `data/airport-guide/tr/JER.json`

### JFK: 4 блоков
- `data/airport-guide/JFK.json`
- `data/airport-guide/en/JFK.json`
- `data/airport-guide/de/JFK.json`
- `data/airport-guide/fr/JFK.json`
- `data/airport-guide/es/JFK.json`
- `data/airport-guide/it/JFK.json`
- `data/airport-guide/tr/JFK.json`

### KEJ: 4 блоков
- `data/airport-guide/KEJ.json`
- `data/airport-guide/en/KEJ.json`
- `data/airport-guide/de/KEJ.json`
- `data/airport-guide/fr/KEJ.json`
- `data/airport-guide/es/KEJ.json`
- `data/airport-guide/it/KEJ.json`
- `data/airport-guide/tr/KEJ.json`

### KGD: 5 блоков
- `data/airport-guide/KGD.json`
- `data/airport-guide/en/KGD.json`
- `data/airport-guide/de/KGD.json`
- `data/airport-guide/fr/KGD.json`
- `data/airport-guide/es/KGD.json`
- `data/airport-guide/it/KGD.json`
- `data/airport-guide/tr/KGD.json`

### KHV: 7 блоков
- `data/airport-guide/KHV.json`
- `data/airport-guide/en/KHV.json`
- `data/airport-guide/de/KHV.json`
- `data/airport-guide/fr/KHV.json`
- `data/airport-guide/es/KHV.json`
- `data/airport-guide/it/KHV.json`
- `data/airport-guide/tr/KHV.json`

### KIX: 4 блоков
- `data/airport-guide/KIX.json`
- `data/airport-guide/en/KIX.json`
- `data/airport-guide/de/KIX.json`
- `data/airport-guide/fr/KIX.json`
- `data/airport-guide/es/KIX.json`
- `data/airport-guide/it/KIX.json`
- `data/airport-guide/tr/KIX.json`

### KRR: 7 блоков
- `data/airport-guide/KRR.json`
- `data/airport-guide/en/KRR.json`
- `data/airport-guide/de/KRR.json`
- `data/airport-guide/fr/KRR.json`
- `data/airport-guide/es/KRR.json`
- `data/airport-guide/it/KRR.json`
- `data/airport-guide/tr/KRR.json`

### KUF: 6 блоков
- `data/airport-guide/KUF.json`
- `data/airport-guide/en/KUF.json`
- `data/airport-guide/de/KUF.json`
- `data/airport-guide/fr/KUF.json`
- `data/airport-guide/es/KUF.json`
- `data/airport-guide/it/KUF.json`
- `data/airport-guide/tr/KUF.json`

### KUL: 4 блоков
- `data/airport-guide/KUL.json`
- `data/airport-guide/en/KUL.json`
- `data/airport-guide/de/KUL.json`
- `data/airport-guide/fr/KUL.json`
- `data/airport-guide/es/KUL.json`
- `data/airport-guide/it/KUL.json`
- `data/airport-guide/tr/KUL.json`

### KVX: 3 блоков
- `data/airport-guide/KVX.json`
- `data/airport-guide/en/KVX.json`
- `data/airport-guide/de/KVX.json`
- `data/airport-guide/fr/KVX.json`
- `data/airport-guide/es/KVX.json`
- `data/airport-guide/it/KVX.json`
- `data/airport-guide/tr/KVX.json`

### LAS: 4 блоков
- `data/airport-guide/LAS.json`
- `data/airport-guide/en/LAS.json`
- `data/airport-guide/de/LAS.json`
- `data/airport-guide/fr/LAS.json`
- `data/airport-guide/es/LAS.json`
- `data/airport-guide/it/LAS.json`
- `data/airport-guide/tr/LAS.json`

### LAX: 4 блоков
- `data/airport-guide/LAX.json`
- `data/airport-guide/en/LAX.json`
- `data/airport-guide/de/LAX.json`
- `data/airport-guide/fr/LAX.json`
- `data/airport-guide/es/LAX.json`
- `data/airport-guide/it/LAX.json`
- `data/airport-guide/tr/LAX.json`
