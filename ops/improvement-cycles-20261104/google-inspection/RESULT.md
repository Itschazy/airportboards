# Google: точечная индексация и первые мобильные TLS — 05.11.2026

Запуск 13/20, trigger 04:50:29 UTC. Проверка закончена около 05:00 UTC.
Рабочая копия runwayboard-flight-map-prototype-20261028, ветка
codex/flight-map-prototype-20261028. База документации e9c41f03;
свежий origin/main и production 2cde8bd734ac99e1f2b10c4d788d2ac231025c2e.
Код и конфигурация не менялись, нового выката нет.

## Подтверждённый результат

Google URL Inspection снова доступен через обычное окно Chrome. Проверять
нужно URL-prefix ресурс https://airportsboard.live/, а не sc-domain:
airportsboard.live — последний показывал отсутствие доступа. Это разные
ресурсы, не доказательство потери доступа к сайту.

Проверены сохранённые данные Google, без TEST LIVE URL и без REQUEST INDEXING.

| URL | Статус Google | Последний обход | Текущее состояние сайта |
|---|---|---|---|
| /en/airport/LHR | URL is unknown to Google | нет | sitemap-8.xml, index/follow, self canonical |
| /ru/airport/KZN | Crawled — currently not indexed | 18.10, 14:51:37, timezone UI не указана | sitemap-7.xml, index/follow, self canonical |
| /en/flight-map | URL is unknown to Google | нет | sitemap-7.xml, index/follow, self canonical |
| /en/airport/ORK | URL is unknown to Google | нет | отсутствует в sitemap, index/follow, self canonical |

У KZN Googlebot smartphone: fetch successful, crawl/index allowed Yes,
Google-selected canonical совпал с inspected URL. Этот обход предшествует
последующим изменениям; он не оценивает сегодняшнюю справочную.
Во всех четырёх инспекциях нет найденного referring sitemap. Это не означает,
что URL отсутствует в опубликованном sitemap: три из четырёх там найдены.
Все четыре HTML получены audit-bot; 12 hreflang + x-default, один self canonical.
robots.txt разрешает обычным индексирующим роботам страницы и указывает /sitemap.xml.

Общий Page indexing по-прежнему **Last update 23.10.2026**: 437 indexed,
24 223 not indexed, включая 6566 crawled-not-indexed и 17255 discovered-not-indexed.
Нельзя называть эти числа свежим результатом ноябрьских выкатов.

Sitemaps: 41 сохранённая отправка. 20 корневых /sitemap-N.xml + индекс имеют
Success. Старые 20 /sitemap/N.xml от 10.10 — Couldn't fetch без last read.
Это уже известная история смены адресов, не новый отказ текущих файлов.
Корневые sitemap-14 и -16 прочитаны 04.11, sitemap-3 — 05.11; остальные
показанные last read старше. /sitemap.xml прочитан 12.10, discovered pages 0:
это индекс карт, не основание заявить, что весь сайт Google неизвестен.
Отправки не удалялись и не повторялись, настройки аккаунта не менялись.

## ORK: что именно ограничивает обнаружение

В текущем data/airport-service.json ORK=35, это mid с intervalMin=180.
В DEMAND_PINNED его нет. lib/warm.ts advertisedInSitemap допускает максимум
120 минут; app/sitemap.ts применяет этот предикат. Поэтому отсутствие ORK
соответствует действующей политике, а не сбою генератора. Страница остаётся
индексируемой. Справочной ORK ещё нет; спрос Bing уже записан в search-growth/REPORT.md.

Следующее содержательное действие: проверить официальные факты Корка и
подготовить справочную на 12 языках, затем отдельно оценить обнаружение и
полезность страницы. Не включать весь хвост в sitemap и не увеличивать
платный прогрев ради одной записи. Не обещать индексацию от повторной отправки.

## Первые живые мобильные TLS нового релиза

Агрегат на сервере, сырые RUM не копировались. Только 2cde8bd734ac,
mobile/navigate, departures+arrivals, все доступные источники/локали:
55 наблюдений, LCP p75 1680 мс, p90 2056 мс; один LCP>4 с.
Это не сегмент поиска Метрики, не физический слабый Android и navigate не
гарантирует холодный кэш. Ночная короткая выборка не доказывает ускорение.

55 согласованных browser/server пар: MISS44, STALE9, HIT2; edge p75 112 мс,
origin p75 112 мс (44 значения). TLS известен в18 записях, неизвестен в37,
некорректных пар0. Внутри18 пар TLS p75 144 мс, beforeTLS p75 114 мс.
Единственная медленная запись — до первого байта, TLS unknown. Нет основания
сейчас менять TLS/nginx по этой выборке. Нельзя считать unknown нулём или
приписывать ему одного оператора/причину. Safari19 записей все unknown,
Chrome7 все известны; подгруппы малы, сравнение браузеров неустойчиво.

## Проверки и ограничения

- check-index production audit-bot: **20/20**.
- Прочитаны все20 опубликованных дочерних sitemap и проверено точное вхождение4 URL.
- Четыре HTML: canonical, robots, 12 языков + x-default проверены.
- Браузер использован только для Google Search Console; своя вкладка закрыта.
- Платных API, изменений DNS/дизайна/аккаунтов/рекламы/данных нет.
- Сборка/tsc/mobile UI в этом запуске не повторялись: runtime не менялся.
  Успех проверок прошлого выката не выдаётся за новые проверки.

Артефакты: outputs/improvement-cycles-20261104/google-inspection в папке чата:
4 AX URL Inspection, screenshot LHR, полный список sitemap, Page indexing AX/PNG,
published-seo.json, rum-aggregate.json, check-index.log.
Следующий запуск14/20: более крупная дневная TLS-выборка; официальные источники
ORK и план переводов. Новую телеметрию без нужды не добавлять. Серию не продлевать.
