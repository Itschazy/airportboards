# Журнал партии b1 — 25.10.2026

Сбор: Claude in Chrome, своя вкладка (закрыта в конце). Все сайты — только английские версии
(русских нет), перевод точный. `check-guide-fresh.mjs`: по файлам партии провалов нет,
11 провалов — только «нет перевода» (ожидаемо).

| IATA | Домен | Собрано | Не собрано и почему |
|---|---|---|---|
| ATL | atl.com (en) | transport (только шаттлы shared-ride), lounges, parking, wifi | transport про MARTA/автобусы и taxi: вкладки «Buses and Trains», «Limousines and Taxis» на /ground-transportation/ не раскрылись — страница не доходила до готовности в 5+ спокойных попытках (зависает рендер), видна только первая вкладка про шаттлы. kids/sleep: внятной страницы не нашлось. Залы и Wi‑Fi — со страницы /about-old/airport-amenities/ (на неё ведёт текущий раздел Passenger Information → Amenities). Строку на /parking/ «ATL Select $15 … Convenient covered parking» (противоречит таблице «$15 — Uncovered») не брал, взял только таблицу тарифов. |
| DFW | dfwairport.com (en) | transport, taxi, lounges, kids, parking, wifi | parking без цен — на странице нет тарифов, только продукты; промоакция EARLYBIRD (ограничена датами) не взята. terminals/sleep не брал (хватает блоков). |
| ORD | flychicago.com (en) | transport, taxi, lounges, sleep, kids, parking, wifi | — |
| DEN | flydenver.com (en) | transport, taxi, lounges, sleep, kids, wifi | parking: тарифы на странице только через калькулятор (в тексте пусто), а место оплаты наличными противоречит само себе (двери 506–509 vs West 504/506 и East 507/509) — блок не публикуется. |
| LAX | flylax.com (en) | transport (FlyAway), taxi, parking, wifi | lounges/kids: единой страницы аэропорта нет. Раздел Public Transportation обрывочен (список мест для шаттла пуст), SkyLink ещё не открыт — не брал. В parking не взяты почасовой тариф Budget ($5 «First hour» vs «Every hour») и высоты гаражей (2A: 8′2″ vs 8′) — противоречия на странице. В wifi длительность рекламы не указана (15–30 vs 30 с). |
| JFK | jfkairport.com (en) | transport (AirTrain), taxi, sleep, wifi | lounges: список на /dine-shop-relax/lounge-and-rest подгружается динамически и не отдал текста. parking: тарифы скрыты, статусы лотов «живые» (T1/T7 закрыты) — не брал. kids: в FAQ только «есть комнаты, смотрите карту» — пусто. sleep и wifi — из ответов на /frequently-asked-questions. |
| MCO | flymco.com (en) | transport, taxi, sleep, kids, parking, wifi | lounges: страницы нет. Wi‑Fi — из /faq/. |

## ATL снят перед переводом (решение проверки 25.10)
Осталось 3 блока: shuttle-сервисы без MARTA и такси (страница транспорта не загрузилась целиком), залы и Wi‑Fi со страницы /about-old/, содержимое которой датируется 2017 годом (verify-v1). Неполная «Как доехать» у крупнейшего аэропорта мира вводит в заблуждение сильнее, чем отсутствие справочной. Собрать заново, когда atl.com/ground-transportation и /parking будут открываться.
