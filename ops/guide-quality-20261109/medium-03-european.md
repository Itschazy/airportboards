# Независимая сверка medium-03 — 2026-11-09

## Покрытие

Исходный inventory, guide=true, blocks>=3, без пилота KZN/OVB/AYT/HRG/SSH/IST, сортировка IATA, slice 80:120. Полностью прочитаны 40 аэропортов, 240 переводных файлов en/de/fr/es/it/tr, 1080 блоков, 102 about, **3342 полей title/hint/text/about** против RU. Всего 280 файлов с RU. Это только данная партия. ORD EN lounges/sleep перечитаны после усечения вывода. SHA-256 каждого файла в medium-03-european-hashes.json; HEAD 3fe9f0ea24a30dc2e20b4b4d5d28acbb24d20356.

## Подтверждённые замечания

- MCX/MRV/NBC/NOZ parking, NJC/NUX storage во всех шести локалях: тарифные сутки переданы словом day/Tag/jour/día/giorno/gün. Предложены явные 24 часа, NOZ также округление неполного периода и предел 6 суток.
- MIA storage: RU оплата посуточная, предложены периоды 24 часа. Внешний тариф не проверялся; это соответствие текущему RU.
- EN NJC transport/parking, NSK sleep, NYM parking: station forecourt ошибочно читается как площадь станции; airport terminal forecourt.
- FR NJC/PEE storage: rez-de-chaussée заменён на niveau 1, сохранена нумерация RU.
- ES MRV parking: dentro de la misma hora → en el plazo de una hora, именно в течение часа.
- IT LED lounges: sale требует una delle quali / e una; IT NSK about незакрытая вложенная кавычка, sleep foresteria требует aperta.
- NBC wifi все шесть: сохранена русская надпись кнопки «Получить доступ» с переводом рядом, чтобы пользователь мог найти её в интерфейсе. SSID не меняются.
- NYM FR/IT/TR kids: кормление в комнате без справки было сужено до грудного вскармливания. Предложено общее кормление ребёнка.

**59 полей в 50 файлах** предложены в proposed-medium-03-european.json, data не менялись. Все after повторно полностью прочитаны: поймана и исправлена новая ES MCX опечатка от подстрочной замены día внутри días. Финальная фраза: «Aparcamiento por periodos de 24 horas a la derecha de la entrada: 600 ₽ por cada 24 horas». Перед отчётом SHA и before guards совпали с actual.

## Осознанные исключения и хорошие случаи

- Гостиницы NOZ/NSK и койко-место NJC не переводились в rolling 24h без источника о расчётном времени. Это отдельно от парковки/хранения.
- LED/NBC/MRV storage: календарный день до 23:59/24:00 сохранён. NRT разделение календарного тарифа с полуночи и последующих 24-часовых периодов сохранено. OKA/LHR день в тарифе соответствует RU день.
- LED P4 14 дней и NNM 30 дней оставлены общими сроками; тарифная единица уже 24 часа.
- MMK railway station square — настоящая площадь ж/д вокзала, не ошибка. MEL/MEX наземный уровень указан в RU; ground-floor переводы допустимы.
- MSP 4 часа на сеанс с бесплатным неограниченным повтором; MAN 2 часа за каждые24; OKA under12/under6 и третий ребёнок; PHL строго старше12 и отсутствие дополнительного сбора; NYM платёж за15 часов и открытие за90/30мин; все сохранены.
- NBC география about является RU фактом, а не ошибкой перевода; внешняя актуальность здесь не заявляется.

## Ограничения

Агентская независимая сверка без носителей языка. Проверены смысл, отрицания/условия/and-or, числа, возраст, цена/время, этажи, gate/exit, имена, SSID, грамматика. Актуальность всех RU фактов по внешним источникам не перепроверялась; browser/build/production проверки не выполнялись. Data не редактировались, commit/push не было. После применения нужна отдельная проверка actual vs accepted.

## Все просмотренные файлы

### LBA
- `data/airport-guide/LBA.json`
- `data/airport-guide/en/LBA.json`
- `data/airport-guide/de/LBA.json`
- `data/airport-guide/fr/LBA.json`
- `data/airport-guide/es/LBA.json`
- `data/airport-guide/it/LBA.json`
- `data/airport-guide/tr/LBA.json`

### LCY
- `data/airport-guide/LCY.json`
- `data/airport-guide/en/LCY.json`
- `data/airport-guide/de/LCY.json`
- `data/airport-guide/fr/LCY.json`
- `data/airport-guide/es/LCY.json`
- `data/airport-guide/it/LCY.json`
- `data/airport-guide/tr/LCY.json`

### LED
- `data/airport-guide/LED.json`
- `data/airport-guide/en/LED.json`
- `data/airport-guide/de/LED.json`
- `data/airport-guide/fr/LED.json`
- `data/airport-guide/es/LED.json`
- `data/airport-guide/it/LED.json`
- `data/airport-guide/tr/LED.json`

### LGA
- `data/airport-guide/LGA.json`
- `data/airport-guide/en/LGA.json`
- `data/airport-guide/de/LGA.json`
- `data/airport-guide/fr/LGA.json`
- `data/airport-guide/es/LGA.json`
- `data/airport-guide/it/LGA.json`
- `data/airport-guide/tr/LGA.json`

### LGW
- `data/airport-guide/LGW.json`
- `data/airport-guide/en/LGW.json`
- `data/airport-guide/de/LGW.json`
- `data/airport-guide/fr/LGW.json`
- `data/airport-guide/es/LGW.json`
- `data/airport-guide/it/LGW.json`
- `data/airport-guide/tr/LGW.json`

### LHR
- `data/airport-guide/LHR.json`
- `data/airport-guide/en/LHR.json`
- `data/airport-guide/de/LHR.json`
- `data/airport-guide/fr/LHR.json`
- `data/airport-guide/es/LHR.json`
- `data/airport-guide/it/LHR.json`
- `data/airport-guide/tr/LHR.json`

### LIM
- `data/airport-guide/LIM.json`
- `data/airport-guide/en/LIM.json`
- `data/airport-guide/de/LIM.json`
- `data/airport-guide/fr/LIM.json`
- `data/airport-guide/es/LIM.json`
- `data/airport-guide/it/LIM.json`
- `data/airport-guide/tr/LIM.json`

### LIS
- `data/airport-guide/LIS.json`
- `data/airport-guide/en/LIS.json`
- `data/airport-guide/de/LIS.json`
- `data/airport-guide/fr/LIS.json`
- `data/airport-guide/es/LIS.json`
- `data/airport-guide/it/LIS.json`
- `data/airport-guide/tr/LIS.json`

### MAD
- `data/airport-guide/MAD.json`
- `data/airport-guide/en/MAD.json`
- `data/airport-guide/de/MAD.json`
- `data/airport-guide/fr/MAD.json`
- `data/airport-guide/es/MAD.json`
- `data/airport-guide/it/MAD.json`
- `data/airport-guide/tr/MAD.json`

### MAN
- `data/airport-guide/MAN.json`
- `data/airport-guide/en/MAN.json`
- `data/airport-guide/de/MAN.json`
- `data/airport-guide/fr/MAN.json`
- `data/airport-guide/es/MAN.json`
- `data/airport-guide/it/MAN.json`
- `data/airport-guide/tr/MAN.json`

### MCO
- `data/airport-guide/MCO.json`
- `data/airport-guide/en/MCO.json`
- `data/airport-guide/de/MCO.json`
- `data/airport-guide/fr/MCO.json`
- `data/airport-guide/es/MCO.json`
- `data/airport-guide/it/MCO.json`
- `data/airport-guide/tr/MCO.json`

### MCX
- `data/airport-guide/MCX.json`
- `data/airport-guide/en/MCX.json`
- `data/airport-guide/de/MCX.json`
- `data/airport-guide/fr/MCX.json`
- `data/airport-guide/es/MCX.json`
- `data/airport-guide/it/MCX.json`
- `data/airport-guide/tr/MCX.json`

### MEL
- `data/airport-guide/MEL.json`
- `data/airport-guide/en/MEL.json`
- `data/airport-guide/de/MEL.json`
- `data/airport-guide/fr/MEL.json`
- `data/airport-guide/es/MEL.json`
- `data/airport-guide/it/MEL.json`
- `data/airport-guide/tr/MEL.json`

### MEX
- `data/airport-guide/MEX.json`
- `data/airport-guide/en/MEX.json`
- `data/airport-guide/de/MEX.json`
- `data/airport-guide/fr/MEX.json`
- `data/airport-guide/es/MEX.json`
- `data/airport-guide/it/MEX.json`
- `data/airport-guide/tr/MEX.json`

### MIA
- `data/airport-guide/MIA.json`
- `data/airport-guide/en/MIA.json`
- `data/airport-guide/de/MIA.json`
- `data/airport-guide/fr/MIA.json`
- `data/airport-guide/es/MIA.json`
- `data/airport-guide/it/MIA.json`
- `data/airport-guide/tr/MIA.json`

### MMK
- `data/airport-guide/MMK.json`
- `data/airport-guide/en/MMK.json`
- `data/airport-guide/de/MMK.json`
- `data/airport-guide/fr/MMK.json`
- `data/airport-guide/es/MMK.json`
- `data/airport-guide/it/MMK.json`
- `data/airport-guide/tr/MMK.json`

### MNL
- `data/airport-guide/MNL.json`
- `data/airport-guide/en/MNL.json`
- `data/airport-guide/de/MNL.json`
- `data/airport-guide/fr/MNL.json`
- `data/airport-guide/es/MNL.json`
- `data/airport-guide/it/MNL.json`
- `data/airport-guide/tr/MNL.json`

### MRV
- `data/airport-guide/MRV.json`
- `data/airport-guide/en/MRV.json`
- `data/airport-guide/de/MRV.json`
- `data/airport-guide/fr/MRV.json`
- `data/airport-guide/es/MRV.json`
- `data/airport-guide/it/MRV.json`
- `data/airport-guide/tr/MRV.json`

### MSP
- `data/airport-guide/MSP.json`
- `data/airport-guide/en/MSP.json`
- `data/airport-guide/de/MSP.json`
- `data/airport-guide/fr/MSP.json`
- `data/airport-guide/es/MSP.json`
- `data/airport-guide/it/MSP.json`
- `data/airport-guide/tr/MSP.json`

### MUC
- `data/airport-guide/MUC.json`
- `data/airport-guide/en/MUC.json`
- `data/airport-guide/de/MUC.json`
- `data/airport-guide/fr/MUC.json`
- `data/airport-guide/es/MUC.json`
- `data/airport-guide/it/MUC.json`
- `data/airport-guide/tr/MUC.json`

### NAL
- `data/airport-guide/NAL.json`
- `data/airport-guide/en/NAL.json`
- `data/airport-guide/de/NAL.json`
- `data/airport-guide/fr/NAL.json`
- `data/airport-guide/es/NAL.json`
- `data/airport-guide/it/NAL.json`
- `data/airport-guide/tr/NAL.json`

### NBC
- `data/airport-guide/NBC.json`
- `data/airport-guide/en/NBC.json`
- `data/airport-guide/de/NBC.json`
- `data/airport-guide/fr/NBC.json`
- `data/airport-guide/es/NBC.json`
- `data/airport-guide/it/NBC.json`
- `data/airport-guide/tr/NBC.json`

### NCL
- `data/airport-guide/NCL.json`
- `data/airport-guide/en/NCL.json`
- `data/airport-guide/de/NCL.json`
- `data/airport-guide/fr/NCL.json`
- `data/airport-guide/es/NCL.json`
- `data/airport-guide/it/NCL.json`
- `data/airport-guide/tr/NCL.json`

### NER
- `data/airport-guide/NER.json`
- `data/airport-guide/en/NER.json`
- `data/airport-guide/de/NER.json`
- `data/airport-guide/fr/NER.json`
- `data/airport-guide/es/NER.json`
- `data/airport-guide/it/NER.json`
- `data/airport-guide/tr/NER.json`

### NJC
- `data/airport-guide/NJC.json`
- `data/airport-guide/en/NJC.json`
- `data/airport-guide/de/NJC.json`
- `data/airport-guide/fr/NJC.json`
- `data/airport-guide/es/NJC.json`
- `data/airport-guide/it/NJC.json`
- `data/airport-guide/tr/NJC.json`

### NNM
- `data/airport-guide/NNM.json`
- `data/airport-guide/en/NNM.json`
- `data/airport-guide/de/NNM.json`
- `data/airport-guide/fr/NNM.json`
- `data/airport-guide/es/NNM.json`
- `data/airport-guide/it/NNM.json`
- `data/airport-guide/tr/NNM.json`

### NOJ
- `data/airport-guide/NOJ.json`
- `data/airport-guide/en/NOJ.json`
- `data/airport-guide/de/NOJ.json`
- `data/airport-guide/fr/NOJ.json`
- `data/airport-guide/es/NOJ.json`
- `data/airport-guide/it/NOJ.json`
- `data/airport-guide/tr/NOJ.json`

### NOZ
- `data/airport-guide/NOZ.json`
- `data/airport-guide/en/NOZ.json`
- `data/airport-guide/de/NOZ.json`
- `data/airport-guide/fr/NOZ.json`
- `data/airport-guide/es/NOZ.json`
- `data/airport-guide/it/NOZ.json`
- `data/airport-guide/tr/NOZ.json`

### NRT
- `data/airport-guide/NRT.json`
- `data/airport-guide/en/NRT.json`
- `data/airport-guide/de/NRT.json`
- `data/airport-guide/fr/NRT.json`
- `data/airport-guide/es/NRT.json`
- `data/airport-guide/it/NRT.json`
- `data/airport-guide/tr/NRT.json`

### NSK
- `data/airport-guide/NSK.json`
- `data/airport-guide/en/NSK.json`
- `data/airport-guide/de/NSK.json`
- `data/airport-guide/fr/NSK.json`
- `data/airport-guide/es/NSK.json`
- `data/airport-guide/it/NSK.json`
- `data/airport-guide/tr/NSK.json`

### NUX
- `data/airport-guide/NUX.json`
- `data/airport-guide/en/NUX.json`
- `data/airport-guide/de/NUX.json`
- `data/airport-guide/fr/NUX.json`
- `data/airport-guide/es/NUX.json`
- `data/airport-guide/it/NUX.json`
- `data/airport-guide/tr/NUX.json`

### NYM
- `data/airport-guide/NYM.json`
- `data/airport-guide/en/NYM.json`
- `data/airport-guide/de/NYM.json`
- `data/airport-guide/fr/NYM.json`
- `data/airport-guide/es/NYM.json`
- `data/airport-guide/it/NYM.json`
- `data/airport-guide/tr/NYM.json`

### OKA
- `data/airport-guide/OKA.json`
- `data/airport-guide/en/OKA.json`
- `data/airport-guide/de/OKA.json`
- `data/airport-guide/fr/OKA.json`
- `data/airport-guide/es/OKA.json`
- `data/airport-guide/it/OKA.json`
- `data/airport-guide/tr/OKA.json`

### ORD
- `data/airport-guide/ORD.json`
- `data/airport-guide/en/ORD.json`
- `data/airport-guide/de/ORD.json`
- `data/airport-guide/fr/ORD.json`
- `data/airport-guide/es/ORD.json`
- `data/airport-guide/it/ORD.json`
- `data/airport-guide/tr/ORD.json`

### ORK
- `data/airport-guide/ORK.json`
- `data/airport-guide/en/ORK.json`
- `data/airport-guide/de/ORK.json`
- `data/airport-guide/fr/ORK.json`
- `data/airport-guide/es/ORK.json`
- `data/airport-guide/it/ORK.json`
- `data/airport-guide/tr/ORK.json`

### ORY
- `data/airport-guide/ORY.json`
- `data/airport-guide/en/ORY.json`
- `data/airport-guide/de/ORY.json`
- `data/airport-guide/fr/ORY.json`
- `data/airport-guide/es/ORY.json`
- `data/airport-guide/it/ORY.json`
- `data/airport-guide/tr/ORY.json`

### OSW
- `data/airport-guide/OSW.json`
- `data/airport-guide/en/OSW.json`
- `data/airport-guide/de/OSW.json`
- `data/airport-guide/fr/OSW.json`
- `data/airport-guide/es/OSW.json`
- `data/airport-guide/it/OSW.json`
- `data/airport-guide/tr/OSW.json`

### PEE
- `data/airport-guide/PEE.json`
- `data/airport-guide/en/PEE.json`
- `data/airport-guide/de/PEE.json`
- `data/airport-guide/fr/PEE.json`
- `data/airport-guide/es/PEE.json`
- `data/airport-guide/it/PEE.json`
- `data/airport-guide/tr/PEE.json`

### PEK
- `data/airport-guide/PEK.json`
- `data/airport-guide/en/PEK.json`
- `data/airport-guide/de/PEK.json`
- `data/airport-guide/fr/PEK.json`
- `data/airport-guide/es/PEK.json`
- `data/airport-guide/it/PEK.json`
- `data/airport-guide/tr/PEK.json`

### PHL
- `data/airport-guide/PHL.json`
- `data/airport-guide/en/PHL.json`
- `data/airport-guide/de/PHL.json`
- `data/airport-guide/fr/PHL.json`
- `data/airport-guide/es/PHL.json`
- `data/airport-guide/it/PHL.json`
- `data/airport-guide/tr/PHL.json`
