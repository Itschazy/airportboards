# Старый HTML после выката: сохранение статических ресурсов

Запуск 6/8, 08.11.2026. База 90cbc400 / origin/main c841da91.
Исходное production-наблюдение: старый HTML EN ссылался на отсутствующий
8670-72ab38f973091ec9.js. Свежая проверка подтверждает прямой 404 от Next,
а текущий chunk возвращает 200. Nginx кэширует HTML30s со stale background update,
статику200 —7d; /.next-prev не обслуживается маршрутом /_next/static.

## Воспроизведение

Реальный scripts/swap-build.mjs на минимальных готовых каталогах терял старый JS.
Две полные fixture-сборки Next15.5.28 (по2473страницы): before с RecentlyViewed
из5625ffd1, after с текущим c841da91. Текущий исходник возвращён после первой
сборки, в gitdiff пользовательского интерфейса нет. Из69старых файлов4 стали404
(включая JS/CSS). Loopback proxy3182 отдаёт старый настоящий HTML12языков,
все ресурсы и API берёт с новой локальной сборки3181 без ключа Airlabs.
На375px before: ChunkLoadError3244, Application error; after: табло/карточки работают.

## Решение

Перед заменой live переносим отсутствующие публичные static-файлы из live и prev
в новую готовую сборку. Manifest вне static сохраняет expiry, перенос его не продлевает.
7дней, максимум128MiB/8000добавочных файлов на сборку; просроченное исключается
при следующем выкате, отдельный таймер не добавлен. При превышении лимита или
ошибке копирования live/rollback ещё не изменены. Не копируем HTML/server/runtime
кэш, данные рейсов, пользовательское хранилище. Symlinks запрещены, новые файлы
приоритетны, копии независимы от rollback. CSS/дизайн/DNS/аккаунты не меняются.
Локально перенесено4файла/107431байт; после этого69/69старых HTTP-ответов200,
SHA256 совпал с исходным, cache-control immutable сохранён.

## Проверки

16регрессий retention (включая реальный swap, TTL/повторныевыкаты, лимит, частичную
ошибку копирования, symlinks и сохранность live/prev); cache-maintenance;
recent-history30, search-race, board-logic/regressions, client-messages,
check:scripts232148строк/8351файлов, map212/212, keys12×395, tsc,
fixturebuild2473. Local index20/20, first-paint5/5, sitemap/hreflang,
live-refresh, adsense, flight-mapHTTP12locale PASS.
Старый HTML/new assets:12локалей desktop и отдельно375px, карточкаopen/close/focus,
20строк, documentwidth375,console0errors. Первый после открытияновоготаба проход
был1280px: не выдан за mobile, повтор375 записан отдельно.
Это IABChromium155; неSafari/физическийAndroid, не замерLCP. Речь об устранении
ошибки загрузки. Новые серверные/RSCпротоколы между произвольными версиями этим
не гарантируются. Старые ресурсы, удалённые ДО первого внедрения и отсутствующие
в live/prev, восстановить этим механизмом нельзя; такому старому табу нужен reload.

## Свежий RUM, неполный день08.11UTC

c841da91:38mobile navigate аэропортов, p75LCP1702ms,1>4s(Yandex13003ms,
основная часть до первого байта, other_before_byte; не доказана проблема JS).
Chrome9/p751628,Safari8/950,Yandex9/720,Yandex-app6/1548. Выборки малы и
несопоставимы; улучшение между релизами не заявляется. Только агрегаты.

Артефакты outputs/improvement-cycles-20261108/cycle6 папки чата.
Перед выкатом сохранены76productionstatic-файлов с hash/размером изlive+prev
для точной проверки после замены. Production-результат дописать после CI.

## Выкат проверен

68d59e2255b538cbf9f12f61ad715bfddb9cf252, CI42453385684 success; push07:06:28 Amsterdam.
СерверныйHEAD/healthсовпали. Production index20/20,sitemap/live-refresh/adsensePASS.
76/76историческихресурсов:200+SHA256+immutable. Перенесено14файлов/189665байт.
Внешнийобход12HTML:15уникальныхJS/CSS/fontURLs,все200. См.cycle6.md и артефакты.
