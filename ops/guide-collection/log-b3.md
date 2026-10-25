# Партия b3 — журнал сбора (25.10.2026)

Сбор только через Claude in Chrome, своя вкладка, по одной странице. Русских версий ни у одного
сайта партии нет (у HND только ja/en/ko/zh, у ICN ko/en/ja/ch; у DEL переключатель языков
включает «Русский», но это переводной виджет на том же адресе — брался английский оригинал).

| IATA | Домен | Язык | Собрано | Не собрано и почему |
|---|---|---|---|---|
| FRA | frankfurt-airport.com | en | transport, taxi, terminals, lounges, sleep, parking, wifi | storage — страницы камеры хранения не нашёл в разделах сайта, поиск по сайту не отдал результат; kids — отдельной страницы не нашёл |
| HND | tokyo-haneda.com | en | transport, taxi, terminals, lounges, storage, sleep, kids, wifi | parking не собирал (8 блоков достаточно). В terminals не взят подземный переход T1–T2: страница одновременно пишет «закрыт на ремонт» и «можно перейти» |
| ICN | airport.kr (ap_en) | en | taxi, terminals, lounges, sleep, kids | transport — страница Airport Railroad Guide даёт маршрут только картинкой, автобусная — только кассы и телефоны; сайт AREX (arex.or.kr) — корпоративный, без расписания. storage — нет в справочнике услуг. Справочник услуг по умолчанию показывает только терминал 1, поэтому lounges/sleep/kids — про T1. Базовый тариф такси не взят: на странице число без валюты |
| DEL | newdelhiairport.in | en | transport, taxi, parking | sleep — страница Infinity Sleeping Pods противоречит себе (то «рядом с аэропортом», то «T3 International Departures», в тексте ещё «Snooze»); lounges, storage, wifi — каталог услуг грузится фильтрами, внятных страниц не нашёл |
| BOM | csmia.adaniairports.com / adaniairports.com | — | ничего | csmia.adaniairports.com (с www и без) — ошибка загрузки Chrome; adaniairports.com — «Error 403 - Forbidden» от F5 (отказ защиты). После трёх попыток аэропорт пропущен, обход не предпринимался |
| SIN | changiairport.com | en | transport, taxi, terminals, lounges, storage, sleep, kids | wifi — страницы не нашёл; часы Skytrain не взяты: рядом с «5:00–2:00» висит заметка о закрытии с 0:00 до 5:00 «on 6 October 2026», неясно, разовая или постоянная |
| KUL | malaysiaairports.com.my (klia1) | en | transport, taxi, terminals, parking | lounges, sleep, storage, wifi — на странице Airport Facilities пункты раскрываются в списки без ссылок и текста. Частота шаттла не взята: страница пересадки пишет «каждые 15 минут», страница парковки — «каждые 10 минут» на том же маршруте; число блоков парковки T1 тоже расходится (A–D и A–C) — не публикуется |

`node scripts/check-guide-fresh.mjs`: по файлам партии провалов нет; 11 провалов — только «нет перевода» (76 из 89), ожидаемо для новых аэропортов.
