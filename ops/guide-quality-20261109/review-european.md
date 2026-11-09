# Независимая рецензия европейских переводов пилота

Дата: 09.11.2026. Рецензент: отдельный агент review_european, не автор переводов.
Срез: HEAD 3fe9f0ea, продукт c08e6a09; сравнение с e3902bc9.
Проверено 36 файлов переводов, 126 изменённых текстовых полей: en/de/fr/es/it/tr × KZN/OVB/AYT/HRG/SSH/IST. Каждый изменённый текст прочитан целиком, включая унаследованные предложения. Русские оригиналы сопоставлены с переводами. Изменение checked и техническое форматирование не считаются переводом.
Данные не менял, commit/push не выполнял. Единственный созданный файл — эта рецензия. Инструкции AGENTS.md, CLAUDE.md, BRIEF.md, REVIEW.md и общая передача прочитаны; историческое указание REVIEW.md исправлять непосредственно в данных заменено текущим read-only поручением.

## Итог

Новых критических ошибок чисел, отрицаний, альтернатив «или», направлений времени и отнесения тарифа к залам не обнаружено. Безусловный PASS качества всей партии не даю: обнаружены унаследованные ошибки в отредактированном поле OVB, а исходник SSH опускает существенное ограничение источника.

## Замечания к исправлению

1. **P2, en/OVB.json, blocks.parking.text: неверный объект парковки.** `On the station forecourt` читается как площадь железнодорожного вокзала. Русский и источник описывают привокзальную площадь аэропорта. Заменить начало на `On the airport terminal forecourt`. Ошибка существовала до пилота; отредактированное поле сохранило её. Локальное доказательство: sources/ovb-parking.txt, строки56 и73 (площадь аэропорта,30метров оттерминала). Это особенно опасно рядом с новой информацией о станцииOb.
2. **P2, все6 переводов OVB.json, blocks.parking.text: сутки заменены календарным днём.** `per day`, `pro Tag`, `par jour`, `por día`, `al giorno`, `günlüğü`; продолжительности3/6суток также переданы days/Tage/jours/días/giorni/gün. Это унаследовано, однако прямо нарушает BRIEF («сутки=24часа»). Указать интервал24часа для тарифа и явно24-часовые периоды для3/6суток. Простая замена чисел3/6 на72/144 без согласованного валидатора не нужна: можно сохранить3/6 и написать «периодов по24часа» в грамматике локали. Не следует выдавать текущую смысловую проверку множества чисел за проверку единиц.
3. **P2, исходник SSH и все переводы: ограничение доступа отсутствует.** В sources/ssh-priority.txt:59 прямо `International flights from T1 only`. В опубликованном блоке сообщается лишьT1 после контроля и возможность входа по пропуску/программе; это не ошибка перевода, все6 точно воспроизводятRU. Нужно решить на уровне источников/RU и затем обновить11переводов. Источник2 ssh-sleep.txt:75 подтверждаетT1 airside,24ч и способы входа, но международное ограничение отдельно не подтверждает. При строгом two-source правиле нельзя считать молчание второго независимым подтверждением: найти второе подтверждение либо сузить общую формулировку доступа до проверки допустимости конкретного рейса.
4. **P3, fr/OVB.json, about: стилистика и элизия.** `nommé en l’honneur de A. I. Pokryshkin` лучше `nommé en l’honneur d’A. I. Pokryshkin`. Факт и идентичность человека сохранены; это не блокирующая смысловая ошибка.

## Не считать ошибками

- KZN: отрицание бесплатного периода при повторном въезде, различие20/5минут,20минут после оплаты и телефон во всех6локалях сохранены; Р1/Р2/1А — кириллица как вRU.
- OVB: автобус4 обслуживает станциюOb,111Э/112 — остановку2-ya Severnaya наStantsionnaya; интервалы05:00–00:30 и04:00–23:30 не перепутаны. Новая область тарифа4000/4ч ограниченаPremier/Premjer/Premyer и международным залом; номерауровней/выход6 и детские условия сохранены. UTC+7 и4часа впередиМосквы во всехabout верны относительноRU.
- AYT: альтернативы мобильный/паспорт/ID переданы черезor/oder/ou/o/veya; обязательного «телефон И документ» больше нет. T1↔внутренний терминал соединены, отдельные входы сохранены. T2≈2,5км/≈5мин автомобилем, не пешком. Вариантыавтобус/такси сохранены.
- HRG: сон вкапсулахPearl LoungeT1 не объявлен бесплатным; оба условия (допуск пассажиров рейса и включение спального места вуслугу) сохранены.
- SSH: врамкахRU afterpassport/security,24ч и paidpass OR programme переданы правильно. См. ограничение исходника выше.
- IST: arrivallevel, domesticpassengerexit и exit13, неboardinggate; цена210/270/550₺ за24часа привязана кправильному размеру багажа во всех6локалях. Крупнейшим вещам не приписана цена550₺.
- Небольшие стилистические кальки (en`Access uses`,fr`L’accès utilise`,it`un bagaglio delle dimensioni di un bagaglio a mano`) можно сделать естественнее, но смысл не изменён, это не отдельные блокеры.
- В новых hints AYT/HRG/SSH RU используеткириллическоеТ1, переводы —латинскоеT1. Строгое правило идентичности кода формально нарушено, но дляиностранных терминалов источниксамиспользуетлатинскоеT1. Лучше нормализоватьRU поисточнику, а не распространять кириллическуюопечатку. Для111Э/Р1/1А автоматическаялатинизация недопустима.

## Полный перечень просмотренных изменённых полей

### en

- `data/airport-guide/en/KZN.json`: `blocks.parking.hint`, `blocks.parking.text`.
- `data/airport-guide/en/OVB.json`: `about`, `blocks.transport.hint`, `blocks.transport.text`, `blocks.lounges.hint`, `blocks.lounges.text`, `blocks.parking.text`.
- `data/airport-guide/en/AYT.json`: `blocks.wifi.text`, `blocks.terminals.title`, `blocks.terminals.hint`, `blocks.terminals.text`.
- `data/airport-guide/en/HRG.json`: `blocks.sleep.title`, `blocks.sleep.hint`, `blocks.sleep.text`.
- `data/airport-guide/en/SSH.json`: `blocks.lounges.title`, `blocks.lounges.hint`, `blocks.lounges.text`.
- `data/airport-guide/en/IST.json`: `blocks.storage.title`, `blocks.storage.hint`, `blocks.storage.text`.
### de

- `data/airport-guide/de/KZN.json`: `blocks.parking.hint`, `blocks.parking.text`.
- `data/airport-guide/de/OVB.json`: `about`, `blocks.transport.hint`, `blocks.transport.text`, `blocks.lounges.hint`, `blocks.lounges.text`, `blocks.parking.text`.
- `data/airport-guide/de/AYT.json`: `blocks.wifi.text`, `blocks.terminals.title`, `blocks.terminals.hint`, `blocks.terminals.text`.
- `data/airport-guide/de/HRG.json`: `blocks.sleep.title`, `blocks.sleep.hint`, `blocks.sleep.text`.
- `data/airport-guide/de/SSH.json`: `blocks.lounges.title`, `blocks.lounges.hint`, `blocks.lounges.text`.
- `data/airport-guide/de/IST.json`: `blocks.storage.title`, `blocks.storage.hint`, `blocks.storage.text`.
### fr

- `data/airport-guide/fr/KZN.json`: `blocks.parking.hint`, `blocks.parking.text`.
- `data/airport-guide/fr/OVB.json`: `about`, `blocks.transport.hint`, `blocks.transport.text`, `blocks.lounges.hint`, `blocks.lounges.text`, `blocks.parking.text`.
- `data/airport-guide/fr/AYT.json`: `blocks.wifi.text`, `blocks.terminals.title`, `blocks.terminals.hint`, `blocks.terminals.text`.
- `data/airport-guide/fr/HRG.json`: `blocks.sleep.title`, `blocks.sleep.hint`, `blocks.sleep.text`.
- `data/airport-guide/fr/SSH.json`: `blocks.lounges.title`, `blocks.lounges.hint`, `blocks.lounges.text`.
- `data/airport-guide/fr/IST.json`: `blocks.storage.title`, `blocks.storage.hint`, `blocks.storage.text`.
### es

- `data/airport-guide/es/KZN.json`: `blocks.parking.hint`, `blocks.parking.text`.
- `data/airport-guide/es/OVB.json`: `about`, `blocks.transport.hint`, `blocks.transport.text`, `blocks.lounges.hint`, `blocks.lounges.text`, `blocks.parking.text`.
- `data/airport-guide/es/AYT.json`: `blocks.wifi.text`, `blocks.terminals.title`, `blocks.terminals.hint`, `blocks.terminals.text`.
- `data/airport-guide/es/HRG.json`: `blocks.sleep.title`, `blocks.sleep.hint`, `blocks.sleep.text`.
- `data/airport-guide/es/SSH.json`: `blocks.lounges.title`, `blocks.lounges.hint`, `blocks.lounges.text`.
- `data/airport-guide/es/IST.json`: `blocks.storage.title`, `blocks.storage.hint`, `blocks.storage.text`.
### it

- `data/airport-guide/it/KZN.json`: `blocks.parking.hint`, `blocks.parking.text`.
- `data/airport-guide/it/OVB.json`: `about`, `blocks.transport.hint`, `blocks.transport.text`, `blocks.lounges.hint`, `blocks.lounges.text`, `blocks.parking.text`.
- `data/airport-guide/it/AYT.json`: `blocks.wifi.text`, `blocks.terminals.title`, `blocks.terminals.hint`, `blocks.terminals.text`.
- `data/airport-guide/it/HRG.json`: `blocks.sleep.title`, `blocks.sleep.hint`, `blocks.sleep.text`.
- `data/airport-guide/it/SSH.json`: `blocks.lounges.title`, `blocks.lounges.hint`, `blocks.lounges.text`.
- `data/airport-guide/it/IST.json`: `blocks.storage.title`, `blocks.storage.hint`, `blocks.storage.text`.
### tr

- `data/airport-guide/tr/KZN.json`: `blocks.parking.hint`, `blocks.parking.text`.
- `data/airport-guide/tr/OVB.json`: `about`, `blocks.transport.hint`, `blocks.transport.text`, `blocks.lounges.hint`, `blocks.lounges.text`, `blocks.parking.text`.
- `data/airport-guide/tr/AYT.json`: `blocks.wifi.text`, `blocks.terminals.title`, `blocks.terminals.hint`, `blocks.terminals.text`.
- `data/airport-guide/tr/HRG.json`: `blocks.sleep.title`, `blocks.sleep.hint`, `blocks.sleep.text`.
- `data/airport-guide/tr/SSH.json`: `blocks.lounges.title`, `blocks.lounges.hint`, `blocks.lounges.text`.
- `data/airport-guide/tr/IST.json`: `blocks.storage.title`, `blocks.storage.hint`, `blocks.storage.text`.

## Какие проверки добавить к check-guide-fresh

Проверен исходник scripts/check-guide-fresh.mjs. Текущая проверка полезна, но не доказывает семантическую точность.

1. **Отсутствующая локаль — FAIL.** Сейчас `if (!fs.existsSync(dir)) continue` целиком пропускает отсутствующий языковой каталог. Требовать все11каталогов.
2. **about — полноценное проверяемое поле.** Сейчас отсутствиеabout толькоwarn, числа и кириллицаabout не проверяются. При наличииRUabout требовать непустой строковый перевод и сравнивать числовыефакты/UTC/знаксмещения.
3. **Строгая схема и trim.** Сейчас числоилиобъект вtitle/hint/text может пройтиtruthyпроверку. Проверятьstring,непустойtrim,допустимыеключи,полныйнаборблоков; неизвестныеполяперевода отклонять. Отдельнолимитhint≤35/18codepoints.
4. **Пары значение–единица–объект, а не множество.** Множество позволяет переставить210/550междусумкойичемоданом; потерятьповторноечисло; заменить₺на€; перепутать15минут/15часов. Нужен небольшойреестр фактов для изменённыхблоков (идентификатор,число,валюта/единица,областьдействия) плюсручнойreviewсопоставления. Однимregex полностьюсмысл не доказать.
5. **Точные инварианты кодов/телефонов/времени.** Проверять111Э,1А,Р1 какцелыетокены, а не толькоихцифры; сравниватьHH:MM,полныйтелефон,UTC+/-N. Нормализациюразрешатьявно поисточнику. Текущее числовоемножество пропускаетподмену111Э→111E.
6. **Хеш рецензируемого текста.** Manifestsha256RU+перевода длякаждогоблока,reviewer,status. Любаяправкапослерецензиисбрасываетacceptance. Прежнийотчёт не подтверждаетновыйHEAD.
7. **Mutationchecks длясамихсторожей.** Наизолированныхфикстурах: удалениеязыка/about,перестановкатарифов,подмена₺/€,1А/1A,после/до,or/and,получениеwrongunit. Первые структурныеошибкидолжныдаватьавтоматическийFAIL; отрицания/условия—обязательныйсемантическийreview,необещатьихпроверкучислами.
8. **Даты и домены.** Date.parseнормализуетнекоторыеневалидныекалендарныедаты; проверятьroundtripYYYY-MM-DD. СопоставлениесourceчерезstartsWith принимаетexample.com.evil; сравниватьURL.hostnameточно. Разныедомены сами по себе недоказываютнезависимостьисточников.

## Ограничения

Это независимая агентская рецензия, не проверка носителями шести языков. Автор предыдущего перевода и рецензент разные исполнители, но отсутствие носителей и возможные общие модельные слепые зоны остаются. Источники прочитаны из сохранённых в той же сессии материалов: это не новый сетевой обход и не полная независимая фактология каждого неизменённого блока. Нет UI/браузерной/productionпроверки в этой подзадаче; не вызывать её проведённой. Никакие опубликованные файлы не изменены.
