# Топ-100, batch1 part3 — MNL / PHX / FCO

26.10.2026, независимый проверяющий Codex verify_sfo_primary. Проверены исходные fenced JSON аэропортов MNL/PHX/FCO из `ops/guide-collection/top100-2025/research-batch1.md` (отдельные drafts на момент поручения не являлись входом этой сверки). Все соответствующие снимки `/tmp/airports-top100-batch1/{MNL,PHX,FCO}-*.txt` прочитаны офлайн. JSON не менялись, сеть/браузер/git не использованы.

## MNL taxi — подтверждено

URL https://newnaia.com.ph/transport ; снимок `/tmp/airports-top100-batch1/MNL-transport.txt`.

- На странице перечислены Coupon Taxi, Yellow Metered Taxi, Regular Metered Taxi; написание сохранено.
- NAIA personnel выдаёт dispatch slip для этих taxi services.
- Keep and not hand over to driver — хранить у себя, не отдавать водителю; отрицание не потеряно.
- При concerns/complaints используются номера на dispatch slip, а не непроверенный единый телефон.
- Hint сохраняет ключевое действие без добавленного нового совета.

NNIC shuttle в том же снимке предоставлен exclusively connecting flights to other terminals, с билетами, бесплатно24/7everyhour. В черновик он не включён и не превращён в бесплатный трансфер в город; это правильно. Правок нет.

## MNL parking — подтверждено

URL https://newnaia.com.ph/transport/parking ; `/tmp/airports-top100-batch1/MNL-parking.txt`, полные состояния раскрытых FAQ.

- All terminals first-come first-served **only**, на вопрос о предварительной брони ответ No. «Без предварительного бронирования» и hint верны, не обещана гарантия свободного места.
- Overnight and multi-day allowed; charged per24hours. «На ночь или на несколько дней» и период24часа совпадают.
- Cash, GCash, PayMaya, credit cards перечислены; конкретный банк, комиссия или бесплатность не добавлены.
- Динамические числа занятости/состояниеFULL не перенесены как долговечные факты. Тариф не выдуман.

Необязательная точность слова: «кредитные карты» буквальнее source credit cards, чем общее «банковские карты». Текущая фраза не обещает приём всех возможных видов карт и не признана установленной фактической ошибкой. Правок фактов нет.

## MNL Wi-Fi — подтверждено

URL https://newnaia.com.ph/discover/other-services-amenities ; `/tmp/airports-top100-batch1/MNL-wifi.txt`.

- All NAIA Terminals, complimentaryWi-Fi.
- NAIA Free Go Wi-Fi (GLOBE)3hours/day, Smart1hr/day, Converge2hours/day. Не переставлены операторы, не потеряна периодичность perday, не объявлен безлимит.
- Location Check-in Counter, Pre-boarding Gates, Arrival Lobby, Departure Lobby. «Зоны регистрации, выходов на посадку, залов прилёта и вылета» совпадают.
- T1/T2 laptopcharging departureairside; cellphonecharging bothdepartureandpublic. Черновик корректно относит aftersecurity к ноутбукам и дополнительную общедоступную зону к телефонам; не переносит public на все ноутбуки.
- LastUpdatedAug25,2026 не в прошлом завершившемся сроке действия; источник относительно свежий, дата не выдаётся за время измерения интернета.
- Hint бесплатные сети не обещает одну общую сеть с одинаковым лимитом.

Правок нет.

## PHX terminals — подтверждено

URL https://www.skyharbor.com/ground-transportation/phx-sky-train/ ; `/tmp/airports-top100-batch1/PHX-terminals.txt`.

- Automated PHX Sky Train, free to the public,24/7.
- Соединяет Valley Metro Rail у44th/Washington, East Economy Parking, airportterminals,24th Street Economy Parking,Rental Car Center. Все выбранные узлы присутствуют, не добавлен центр города как прямая станцияSkyTrain.
- 05:00–22:00 приблизительное среднее ожидание3½–7мин, ночьюmaintenanceежедневно, wait15minor more, possibledelays/transfers. Все приблизительности и возможность более15мин сохранены.
- T3 boardingplatformLevel 5, доступ черезLevel 4 изTicketing; T4Level 3. Черновик не меняет их местами и не называетgroundfloor/первыйэтаж.
- Hint free совпадает.

30-dayWestLobbytrial и противоречивое описание night buses для всех/дляemployees не выбраны, что соответствует правилу спорныефактынепубликовать. Правок нет.

## PHX kids — подтверждено

URL https://www.skyharbor.com/at-the-airport/services/nursing-rooms-nursing-pods/ ; `/tmp/airports-top100-batch1/PHX-kids.txt`.

- Nursingstationeach terminal,both pre/post security — общее размещение комнат совпадает.
- Each room sink,countertop,soap,hand sanitizer,papertowels,babychanging,comfortable seating,outlet. Все выбранные свойства именноroom, не присвоены автоматически каждойpod.
- T3 acrossGateF5 и nearGateE5, обеpostsecurity. «Напротив» и «рядом» сохранены.
- T4Mamavapods postsecurity,bench,fold-downtable,outlet.
- A22 и nearTSACheckpointD — ADA-accessible. Черновик правильно говорит приспособленыдляпассажировсинвалидностью; D — пунктдосмотра, невыходнапосадку.
- Hint подтверждён, числоpod4висточнике не превращено в числоroom.

Правок нет.

## PHX Wi-Fi — подтверждено

URL https://www.skyharbor.com/at-the-airport/services/wifi/ ; `/tmp/airports-top100-batch1/PHX-wifi.txt`.

- Free Wi-Fi ProvidedbyBoingo Wireless,SSIDFree PHX Boingo WiFi (пробелы/регистр совпадают).
- Сначала выбрать сеть наdevice, затемbrowser, затемcomplimentary **OR** existingaccountlogin. Источник предлагает ещёsignup, но выбранные две альтернативы действительно имеются; черновик не требует обязательно оба действия.
- Support1-800-880-4117 точно совпадает.
- Не добавлены лимиты времени, регистрация поSMS, цена.

Правок нет.

## FCO transport — подтверждено

URL https://www.trenitalia.com/en/connections/leonardo-express.html ; `/tmp/airports-top100-batch1/FCO-transport.txt`.

- Leonardo express non-stop Roma Termini↔Rome Fiumicino,32min,departuresscheduledevery15min. «Безостановок» здесь описание маршрута, а не круглосуточность, в отличие от S1operatinghours вMUC.
- Train station inside the airport.
- €14,Mini-groups, 4 tickets in single transaction,€40insteadof€56. Количество, валюта, единая покупка и общая сумма сохранены; не €40заодного.
- Hint32мин совпадает, непроверенныеchildbenefits/hoursне добавлены.

Правок нет.

## FCO storage — подтверждено

URL https://www.adr.it/web/aeroporti-di-roma-en/pax-fco-baggage-services ; `/tmp/airports-top100-batch1/FCO-storage.txt`.

- Terminal 3, International Arrivals, close to bus station.
-07:00–23:00.
-10,00€VAT included, per luggage, 24 h — закаждоеместоза24часа,сНДС.
-Payment upon collection,No reservation needed —оплатаприполучении,броньнетребуется, не запрещена.
-Hint10€за24часа совпадает.

Тарифыporter9/12€вотдельномразделе не смешаны сstorage. Правок нет.

## FCO kids — один пропущенный контекст выдачи колясок

URL https://www.adr.it/web/aeroporti-di-roma-en/services-for-families ; `/tmp/airports-top100-batch1/FCO-kids.txt`.

Подтверждено:

- Более700courtesy strollers, бесплатно; уboarding areas A/E,nearA31/A61,escalatorstoE1–E4.
- Family Laneдляtravelling with children **OR** pregnant, не исключительно беременные с детьми.
- Four nurseries, cots, changing tables:заcheck-indesks312–327T3;A shopping lane beforeA61–A83;nearE11/E44. Все4места и номера совпадают.
- Просьбапомочьнагревfeedingbottle/babyfood/sterilisedummy вrestaurantpoints. Черновик описывает возможность попросить, не автоматическую отдельную бесплатную службу стерилизации.
- Hintдетскиезоны подтверждается отдельнымPlayareasна тойже странице, хотяпереченьихGateномероввtextневключён.

**Нужная смысловая правка по исходному условию:** в разделе Departing Passengers перед предложением воспользоватьсябесплатнойколяской сказано «In case you decide to check it in at the check-in counter». Черновик «вылетающие пассажиры могут взять их» опускает это условие и выглядит как общийдопускдлявсехвылетающих. По строгому правилу точного пересказа лучше вернуть:

«…вылетающие пассажиры, сдавшие свою коляску на стойке регистрации, могут взять их в зонах посадки A и E…».

Это не утверждение проверяющего, что остальным запрещено: источник такого запрета не даёт. Это сохранение контекста именно выбранного предложения, без самостоятельного расширения права. Альтернатива безспорногообщегоправа: «Аэропортпредлагаетболее700бесплатныхколясок. Вразделедлявылетающихуказаныточки…» — лишьместоположение, безновогоусловиядоступа. Основнойисполнительвыбираетнаиболееестественныйвариант.

Медицинские советы страницы не включены — правильно, переноситьихне требуется.

## FCO Wi-Fi — подтверждено

URL https://www.adr.it/web/aeroporti-di-roma-en/internet-wi-fi1 ; `/tmp/airports-top100-batch1/FCO-wifi.txt`.

- Free and unlimited Wi-Fi,SSID AIRPORT FREE WIFI,с пробеламиAIRPORT FREE WIFI.
- Check-in,boardinggates,arrivals;невыдуманопокрытиекаждогопарковочногоместа.
- Выбратьсеть→открытьbrowser→авторедиректwelcome page. Шаги совпадают.
- Hint «безлимита» подтверждён source free and unlimited; невыдумана скоростьилигарантиявидеозвонков.

Правок нет.

## Итог

Проверены 10 блоков трёх аэропортов. Одна нужная правка контекста — FCO strollersдлявылетающихсохранитьсвязьсосдачейсвоейколяскилибоизбежатьобобщённогообещаниядоступавсем. Необязательные стилистические варианты (credit→кредитные, concourse→конкорс) не считаютсяфактическимиошибками. Числа, валюты, OR/AND,sideofsecurity,Gate/Checkpointсовпадают. JSON, сеть, браузер и git не тронуты.
