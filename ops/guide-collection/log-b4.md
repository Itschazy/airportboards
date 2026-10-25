# Партия b4 — журнал сбора (25.10.2026)

Сбор — только Claude in Chrome, своя вкладка. Русской версии ни у одного сайта партии нет.

| IATA | Официальный домен | Язык версии | Собрано | Не собрано и почему |
|---|---|---|---|---|
| HKG | hongkongairport.com | en | transport (Airport Express), taxi, lounges (pay-in), storage, sleep (Resting Lounges), wifi | parking, kids, terminals — не искал сверх 6 блоков; про платные залы вводный абзац пишет «24-hour», а у половины залов часы не круглосуточные — слово «круглосуточные» в общий текст не взято, часы даны по каждому залу |
| BKK | suvarnabhumi.airportthai.co.th | en | taxi, terminals (SAT-1), lounges (Miracle), storage (Bellugg) | transport: две официальные страницы автобусов противоречат друг другу (S1 06:00–17:00 / 60 бат на странице 754 от 2022 г. против 06:00–20:00 на странице 317; 554 — 06:30–20:00, 36 бат против 05:00–21:45, 35 THB) — не публикуется; Airport Rail Link на сайте аэропорта не найден. wifi, sleep — страниц не нашлось. Часы работы на карточках сайта даны шаблоном «Sunday 24 hours» — не взяты. Сайт — SPA, карточки открываются со 2–3 попытки |
| PVG | shanghaiairport.com | en; sleep — zh (перевод) | transport (Maglev), taxi, storage, sleep, wifi | lounges: окно «Passenger Lounge» в английской версии пустое; kids: «Children Park» в T1 «暂无此项服务», в T2 один пункт — блок был бы пустым. Окна «Luggage Storage» и «WiFi» открываются на общей странице Service Facilities → Pudong Airport, прямой ссылки нет, url — эта страница. Тариф камеры хранения — картинка в окне T1 |
| PEK | en.bcia.com.cn | en | transport (Airport Express), taxi, storage, kids, parking | lounges: страница Pay Lounge — одна общая фраза без мест и цен; Airport Express — число остановок противоречит (страница «To & From» — 4, подсказка — «5 stops», в расписании есть Beixinqiao): в блок взяты только станции, которые есть везде, число остановок и Beixinqiao не публикуются; часы — таблица без подписи направления, не взяты |
| CAN | gbiac.net | en | transport (метро), taxi, lounges, storage, sleep, wifi | — . Сайт — SPA: вкладки «Subway»/«Taxi» и окна «Left-Luggage»/«WIFI» не имеют своих адресов, url — общая страница раздела (gbiac.net/traffic/tfa, gbiac.net/airportFacility/service) |
| SZX | szairport.com | — | ничего | www.szairport.com, /en/, /szairport/index.html и http:// — во всех 4 спокойных попытках браузер показывает страницу ошибки (сайт не открывается). Файл не создан |
| TFU | sctfia.com (ссылка «天府国际机场» с cdairport.com) | — | ничего | sctfia.com отдаёт «405 Method Not Allowed» от WAF China Telecom (страница защиты с формой обращения) — защита от ботов, не обходилась. cdairport.com — сайт Шуанлю (CTU), не Тяньфу. Файл не создан |

Проверка: `node scripts/check-guide-fresh.mjs` — по файлам HKG, BKK, PVG, PEK, CAN провалов нет; 11 провалов «нет перевода» (по одному на локаль) ожидаемы.
