# Независимая смысловая рецензия medium04: zh, ja, ko, ar, hi

Проверены все поля about (где есть), title, hint и text всех блоков 33 справочников исходного inventory slice120:160: PHX–ZRH. 163 русских блока, 815 переводных блоков, 198 файлов. Это оставшиеся 33, а не 40. Прочитаны полные строки, не только числовые совпадения. Обрезанные выводы SVO/SVX, SIN ja transport, VKO ar/hi дочитаны отдельными запросами. Идентификаторы, источники и URL русского оригинала просмотрены как контекст; свежесть фактов по этим URL не проверялась.

## Подтверждённые проблемы и предложения

Предложения: `proposed-medium-04-asian.json`, 120 полей. Каждая запись содержит путь, полный before, полный after и причину. Полные after перечитаны после генерации; даты не заменялись. Данные не изменены этим рецензентом.

- **SGC storage zh:** «首24小时» против окончания первого оплачиваемого дня в 00:00. Исправлено на первый календарный день. Hints SGC/VOG всех пяти языков обещали одну цену ежедневно, хотя она только за первый день; новые hints явно называют первый календарный день. Русские hints требуют такой же правки.
- **SKX parking hints всех пяти:** 15 минут бесплатно против строгого меньше 15 минут в тексте. Предложен строгий предел. Ровно 15 минут в RU не определены: не выдумывал тариф.
- **PVG storage zh:** 28英寸以上 включает 28, RU говорит больше 28. **SIN storage zh:** 10公斤以上 включает 10, RU говорит свыше 10. Обе границы исправлены без изменения цены.
- **RGK/SVX/UFA kids ja/ar:** конструкции «出発前12時間まで» / «حتى 12 ساعة قبل الإقلاع» можно прочесть как дедлайн за 12 часов. Добавлена явная максимальная длительность пребывания. Не менялись документы, сопровождение и медосмотр.
- **ZIA parking ar/hi:** «со 2 по 4 час» уточнено как второй–четвёртый часы; не 02:00–04:00 и не начало после двух часов.
- **TBW parking ja:** 放置された車 обозначает брошенные машины. RU о любых оставленных на парковке: 駐車された車.
- **Корейская грамматика:** SGC lounges 이코노미 클래스는; UFA lounges 비즈니스 클래스 승객과; ULV/UUS about 여객터미널은; UUS transport 여객터미널이.
- **Корейские строгие количества:** REN площади и пассажиры, SGC направления, SVX направления/компании, UUS площадь, VVO направления/компании: больше N вместо N или больше.
- **Единицы суточных тарифов:** PKC/REN/RGK storage; RGK/SGC/SKX/UFA/ULV/VKO parking все пять; SVX parking двое суток; UUD/ZIA parking явно определён день = 24 часа без уродливых порядковых «24-часов»; UUS parking zh/ja; SVO/SVX/UUS/VVO/ZIA storage zh, VVO округление ja; SIN storage hint zh. Номера терминалов, суммы и условия сохранены.
- **VOG kids zh:** максимальное пребывание сутки обозначено 24 часами, не календарным днём.
- **UFA/UUD wifi hints zh/ja/ko:** исходные SSID 23/19 символов превышают лимит18. Предложено местное «бесплатный Wi-Fi», точные SSID в полном тексте сохранены.

## Не исправлялось автоматически

- PKC/UUA гостиничные сутки при фиксированном checkout не преобразованы в 24 часа. SGC/VOG/UUD/VKO календарные дни хранения сохранены. VKO ежедневный лимит бесплатных въездов не переинтерпретирован как скользящие 24 часа.
- REN parking перекрытие на 15 мин, RGK P1 первый час против «от1до5», ULV на15мин, PVG размер20дюймов — неоднозначности присутствуют в RU. Новые тарифы не придуманы.
- VVO storage hint 400 ₽ против текста500 ₽ был передан родителю; родитель сообщил об удалении цены из hint RU+11. Финальная проверка отдельно.
- VVO about «залы вылета» местами названы lounges. В полном контексте не менял на новые факты, родителю отмечается как стилистическая неоднозначность.
- STN исключения Ryanair/easyJet, запрет обратного пути; SIN багаж до конечной точки/паспортный контроль; SYD запрет пешего перехода; SVO паспорт/билет-or; XMN дверь-vs-гейт; ZRH платная длительность, предоплата, отсутствие присмотра — прочитаны и смысл сохранён.

## Покрытие: фактически прочитанные файлы и блоки

В каждой строке ниже перечислены шесть реально прочитанных файлов. Для каждого — все указанные блоки целиком (title/hint/text) и about при наличии. SHA256 снимка чтения: `medium-04-asian-file-hashes.json`. Это снимок до принятия предложений; конкурентные root-правки после чтения должны пройти rereview.

### PHX

Блоки: terminals, kids, wifi.

- `data/airport-guide/PHX.json`
- `data/airport-guide/zh/PHX.json`
- `data/airport-guide/ja/PHX.json`
- `data/airport-guide/ko/PHX.json`
- `data/airport-guide/ar/PHX.json`
- `data/airport-guide/hi/PHX.json`

### PKC

Блоки: transport, terminals, lounges, storage, sleep, kids, wifi.

- `data/airport-guide/PKC.json`
- `data/airport-guide/zh/PKC.json`
- `data/airport-guide/ja/PKC.json`
- `data/airport-guide/ko/PKC.json`
- `data/airport-guide/ar/PKC.json`
- `data/airport-guide/hi/PKC.json`

### PKX

Блоки: transport, storage, kids, wifi.

- `data/airport-guide/PKX.json`
- `data/airport-guide/zh/PKX.json`
- `data/airport-guide/ja/PKX.json`
- `data/airport-guide/ko/PKX.json`
- `data/airport-guide/ar/PKX.json`
- `data/airport-guide/hi/PKX.json`

### PMI

Блоки: transport, taxi, lounges, wifi.

- `data/airport-guide/PMI.json`
- `data/airport-guide/zh/PMI.json`
- `data/airport-guide/ja/PMI.json`
- `data/airport-guide/ko/PMI.json`
- `data/airport-guide/ar/PMI.json`
- `data/airport-guide/hi/PMI.json`

### PVG

Блоки: transport, taxi, storage, sleep, wifi.

- `data/airport-guide/PVG.json`
- `data/airport-guide/zh/PVG.json`
- `data/airport-guide/ja/PVG.json`
- `data/airport-guide/ko/PVG.json`
- `data/airport-guide/ar/PVG.json`
- `data/airport-guide/hi/PVG.json`

### REN

Блоки: transport, lounges, storage, kids, parking, wifi.

- `data/airport-guide/REN.json`
- `data/airport-guide/zh/REN.json`
- `data/airport-guide/ja/REN.json`
- `data/airport-guide/ko/REN.json`
- `data/airport-guide/ar/REN.json`
- `data/airport-guide/hi/REN.json`

### RGK

Блоки: transport, terminals, lounges, storage, kids, parking, wifi.

- `data/airport-guide/RGK.json`
- `data/airport-guide/zh/RGK.json`
- `data/airport-guide/ja/RGK.json`
- `data/airport-guide/ko/RGK.json`
- `data/airport-guide/ar/RGK.json`
- `data/airport-guide/hi/RGK.json`

### SFO

Блоки: transport, taxi, storage, sleep, kids, parking, wifi.

- `data/airport-guide/SFO.json`
- `data/airport-guide/zh/SFO.json`
- `data/airport-guide/ja/SFO.json`
- `data/airport-guide/ko/SFO.json`
- `data/airport-guide/ar/SFO.json`
- `data/airport-guide/hi/SFO.json`

### SGC

Блоки: transport, lounges, storage, parking.

- `data/airport-guide/SGC.json`
- `data/airport-guide/zh/SGC.json`
- `data/airport-guide/ja/SGC.json`
- `data/airport-guide/ko/SGC.json`
- `data/airport-guide/ar/SGC.json`
- `data/airport-guide/hi/SGC.json`

### SGN

Блоки: lounges, sleep, wifi.

- `data/airport-guide/SGN.json`
- `data/airport-guide/zh/SGN.json`
- `data/airport-guide/ja/SGN.json`
- `data/airport-guide/ko/SGN.json`
- `data/airport-guide/ar/SGN.json`
- `data/airport-guide/hi/SGN.json`

### SIN

Блоки: transport, taxi, terminals, lounges, storage, sleep, kids.

- `data/airport-guide/SIN.json`
- `data/airport-guide/zh/SIN.json`
- `data/airport-guide/ja/SIN.json`
- `data/airport-guide/ko/SIN.json`
- `data/airport-guide/ar/SIN.json`
- `data/airport-guide/hi/SIN.json`

### SKX

Блоки: transport, storage, kids, parking, wifi.

- `data/airport-guide/SKX.json`
- `data/airport-guide/zh/SKX.json`
- `data/airport-guide/ja/SKX.json`
- `data/airport-guide/ko/SKX.json`
- `data/airport-guide/ar/SKX.json`
- `data/airport-guide/hi/SKX.json`

### STN

Блоки: transport, kids, lounges, wifi.

- `data/airport-guide/STN.json`
- `data/airport-guide/zh/STN.json`
- `data/airport-guide/ja/STN.json`
- `data/airport-guide/ko/STN.json`
- `data/airport-guide/ar/STN.json`
- `data/airport-guide/hi/STN.json`

### SVO

Блоки: lounges, storage, sleep, kids, transport, parking, wifi, terminals.

- `data/airport-guide/SVO.json`
- `data/airport-guide/zh/SVO.json`
- `data/airport-guide/ja/SVO.json`
- `data/airport-guide/ko/SVO.json`
- `data/airport-guide/ar/SVO.json`
- `data/airport-guide/hi/SVO.json`

### SVX

Блоки: transport, terminals, lounges, storage, sleep, kids, parking, wifi.

- `data/airport-guide/SVX.json`
- `data/airport-guide/zh/SVX.json`
- `data/airport-guide/ja/SVX.json`
- `data/airport-guide/ko/SVX.json`
- `data/airport-guide/ar/SVX.json`
- `data/airport-guide/hi/SVX.json`

### SYD

Блоки: terminals, kids, wifi.

- `data/airport-guide/SYD.json`
- `data/airport-guide/zh/SYD.json`
- `data/airport-guide/ja/SYD.json`
- `data/airport-guide/ko/SYD.json`
- `data/airport-guide/ar/SYD.json`
- `data/airport-guide/hi/SYD.json`

### TBS

Блоки: transport, taxi, wifi.

- `data/airport-guide/TBS.json`
- `data/airport-guide/zh/TBS.json`
- `data/airport-guide/ja/TBS.json`
- `data/airport-guide/ko/TBS.json`
- `data/airport-guide/ar/TBS.json`
- `data/airport-guide/hi/TBS.json`

### TBW

Блоки: terminals, kids, parking.

- `data/airport-guide/TBW.json`
- `data/airport-guide/zh/TBW.json`
- `data/airport-guide/ja/TBW.json`
- `data/airport-guide/ko/TBW.json`
- `data/airport-guide/ar/TBW.json`
- `data/airport-guide/hi/TBW.json`

### TPE

Блоки: transport, storage, wifi.

- `data/airport-guide/TPE.json`
- `data/airport-guide/zh/TPE.json`
- `data/airport-guide/ja/TPE.json`
- `data/airport-guide/ko/TPE.json`
- `data/airport-guide/ar/TPE.json`
- `data/airport-guide/hi/TPE.json`

### UFA

Блоки: transport, terminals, lounges, storage, kids, parking, wifi.

- `data/airport-guide/UFA.json`
- `data/airport-guide/zh/UFA.json`
- `data/airport-guide/ja/UFA.json`
- `data/airport-guide/ko/UFA.json`
- `data/airport-guide/ar/UFA.json`
- `data/airport-guide/hi/UFA.json`

### UKX

Блоки: transport, terminals, storage, kids.

- `data/airport-guide/UKX.json`
- `data/airport-guide/zh/UKX.json`
- `data/airport-guide/ja/UKX.json`
- `data/airport-guide/ko/UKX.json`
- `data/airport-guide/ar/UKX.json`
- `data/airport-guide/hi/UKX.json`

### ULV

Блоки: terminals, lounges, sleep, parking, wifi.

- `data/airport-guide/ULV.json`
- `data/airport-guide/zh/ULV.json`
- `data/airport-guide/ja/ULV.json`
- `data/airport-guide/ko/ULV.json`
- `data/airport-guide/ar/ULV.json`
- `data/airport-guide/hi/ULV.json`

### UUA

Блоки: lounges, sleep, kids, parking.

- `data/airport-guide/UUA.json`
- `data/airport-guide/zh/UUA.json`
- `data/airport-guide/ja/UUA.json`
- `data/airport-guide/ko/UUA.json`
- `data/airport-guide/ar/UUA.json`
- `data/airport-guide/hi/UUA.json`

### UUD

Блоки: transport, storage, kids, parking, wifi.

- `data/airport-guide/UUD.json`
- `data/airport-guide/zh/UUD.json`
- `data/airport-guide/ja/UUD.json`
- `data/airport-guide/ko/UUD.json`
- `data/airport-guide/ar/UUD.json`
- `data/airport-guide/hi/UUD.json`

### UUS

Блоки: transport, parking, lounges, storage, kids.

- `data/airport-guide/UUS.json`
- `data/airport-guide/zh/UUS.json`
- `data/airport-guide/ja/UUS.json`
- `data/airport-guide/ko/UUS.json`
- `data/airport-guide/ar/UUS.json`
- `data/airport-guide/hi/UUS.json`

### VIE

Блоки: transport, lounges, sleep, kids.

- `data/airport-guide/VIE.json`
- `data/airport-guide/zh/VIE.json`
- `data/airport-guide/ja/VIE.json`
- `data/airport-guide/ko/VIE.json`
- `data/airport-guide/ar/VIE.json`
- `data/airport-guide/hi/VIE.json`

### VKO

Блоки: lounges, storage, sleep, kids, transport, parking, wifi, terminals.

- `data/airport-guide/VKO.json`
- `data/airport-guide/zh/VKO.json`
- `data/airport-guide/ja/VKO.json`
- `data/airport-guide/ko/VKO.json`
- `data/airport-guide/ar/VKO.json`
- `data/airport-guide/hi/VKO.json`

### VOG

Блоки: transport, lounges, storage, kids, wifi.

- `data/airport-guide/VOG.json`
- `data/airport-guide/zh/VOG.json`
- `data/airport-guide/ja/VOG.json`
- `data/airport-guide/ko/VOG.json`
- `data/airport-guide/ar/VOG.json`
- `data/airport-guide/hi/VOG.json`

### VVO

Блоки: transport, lounges, storage, sleep, kids, parking.

- `data/airport-guide/VVO.json`
- `data/airport-guide/zh/VVO.json`
- `data/airport-guide/ja/VVO.json`
- `data/airport-guide/ko/VVO.json`
- `data/airport-guide/ar/VVO.json`
- `data/airport-guide/hi/VVO.json`

### XMN

Блоки: taxi, storage, wifi, lounges.

- `data/airport-guide/XMN.json`
- `data/airport-guide/zh/XMN.json`
- `data/airport-guide/ja/XMN.json`
- `data/airport-guide/ko/XMN.json`
- `data/airport-guide/ar/XMN.json`
- `data/airport-guide/hi/XMN.json`

### YYZ

Блоки: transport, terminals, kids, wifi.

- `data/airport-guide/YYZ.json`
- `data/airport-guide/zh/YYZ.json`
- `data/airport-guide/ja/YYZ.json`
- `data/airport-guide/ko/YYZ.json`
- `data/airport-guide/ar/YYZ.json`
- `data/airport-guide/hi/YYZ.json`

### ZIA

Блоки: transport, parking, storage, kids.

- `data/airport-guide/ZIA.json`
- `data/airport-guide/zh/ZIA.json`
- `data/airport-guide/ja/ZIA.json`
- `data/airport-guide/ko/ZIA.json`
- `data/airport-guide/ar/ZIA.json`
- `data/airport-guide/hi/ZIA.json`

### ZRH

Блоки: transport, storage, kids, wifi.

- `data/airport-guide/ZRH.json`
- `data/airport-guide/zh/ZRH.json`
- `data/airport-guide/ja/ZRH.json`
- `data/airport-guide/ko/ZRH.json`
- `data/airport-guide/ar/ZRH.json`
- `data/airport-guide/hi/ZRH.json`

## Ограничения

Это независимое сравнение переводов с RU средствами модели, без носителей пяти языков. Не сертификат естественности всех формулировок и не подтверждение актуальности аэропортовых тарифов. Не проверялись production, визуальный RTL, переносы на экране или реальные пользовательские маршруты. Полные source quotations/факты повторно не исследовались. Данные, commit/push и публикацию рецензент не менял. Принятие предложений выполняет родитель после независимого чтения; финальный rereview отдельно.
