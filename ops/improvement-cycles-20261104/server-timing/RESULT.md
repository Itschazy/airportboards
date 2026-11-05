# Запуск 10/20: время сервера в реальном LCP

База приложения fed2653cb8fbee542fef9d06442cac93f9541973, локальная база
8a1fd4b1b58aa1a23d731a09bd89800f5e81043a. Рабочая копия:
/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028.

## Причина и границы

За 04.11 в 57 из 69 медленных мобильных загрузок табло преобладал TTFB. Имеющиеся
request timing смешивают сеть и backend/cache, поэтому объяснить их медленным
React либо сервером было нельзя. Добавляется диагностика, а не обещание ускорения:
никакого нового измеренного выигрыша LCP в этой работе нет.

nginx передаёт Server-Timing только из существующего location /:

- ab-edge: время от начала обработки запроса до фильтра заголовков, в миллисекундах;
- ab-origin: ожидание заголовков upstream, только MISS/BYPASS/EXPIRED/REVALIDATED;
- ab-cache: строго один из семи статусов кэша (либо unknown).

nginx публикует время в секундах с тремя знаками. Map переводит его в миллисекунды
конкатенацией целой и дробной частей, без njs/Lua или стороннего модуля. Списки
нескольких upstream-попыток отвергаются, а не обрезаются до удобной цифры.
HIT/STALE/UPDATING не получают старое время origin. Нулевой edge допустим при
быстром попадании в микрокэш. Это не время отправки всего HTML, не CPU Next.js,
не DNS и не точная длительность сети.

В RUM добавлены edgeHeader/originHeader/serverCache в прежний единственный запрос.
Идентификаторов, новых cookies, URL, referrer и новых запросов нет; правила согласия
и отказа не менялись. Старые вкладки/записи schema1 совместимы: отсутствующие числа
становятся -1, статус unknown. Отчёт считает перцентили только по известным значениям
и позволяет группировать/фильтровать serverCache. Историческое отсутствие не равно0.

Браузер может вернуть старый Server-Timing из своего кэша: нужны transferSize>0 и
отсутствие service worker. В прочих случаях метрики unknown. Повторы имён, произвольный
cache description, некорректные значения и несогласованное время не принимаются.
Допуски на округление: origin не более edge+10мс; edge не более browser request+100мс.
Из разностей общих p75 нельзя рассчитывать фазы — сравнивать внутри одного замера.

## Проверки

- 23 контрольных примера настоящего helper: все статусы, старый browser cache,
  worker, отсутствующий API/тайминг, корректный0, дубли, неверные числа/описания.
- 12 групп действующего check-rum: настоящий startRum передаёт новые поля; старый
  payload, privacy, bounded store, endpoint и исторический отчёт проходят.
- Реальный локальный nginx: MISS, HIT, BYPASS, STALE, UPDATING, затем HIT.
  Искусственная задержка upstream180мс отображается как ~180мс; HIT/STALE/UPDATING
  без origin и с edge0мс. Это корректность инструмента, не скорость сайта.
- WebKit на localhost прочитал MISS edge183/origin183 и STALE edge0/origin−1.
  Оба видимых результата сохранены. Это не физический iPhone/Android.
- Патчер сохраняет API/static locations и отказывается от повторного применения
  или неизвестной структуры. Установщик сверяет SHA исходного файла, сохраняет
  backup, выполняет nginx -t и graceful reload; при неудаче восстанавливает файл.
- Fixture build2473/2473, tsc до/после cleanup, keys12×395, scripts231968строк/8338файлов,
  local index20/20, first-paint5/5, sitemap/hreflang, AdSense PASS.
- Дизайн/верстка/переводы не менялись. Нового мобильного визуального PASS и замера
  LCP не заявляется. Сайт в production браузером не открывался.

Локальные Next3163 и временный nginx/probe остановлены; .next-cycle10 удалён,
TS восстановлены. Вкладка probe закрыта. Артефакты в папке чата:
outputs/improvement-cycles-20261104/server-timing/.

## Выкат и откат

После успешного CI runtime и обычных проверок установить подготовленный nginx
candidate: исходныйSHA должен совпасть с проверенным snapshot. DNS, TLS, upstream,
cache policy, API locations не менять. На root запускать install-nginx.py только
с проверенным candidate и явным SHA. Backup остаётся в sites-available, не enabled.
Проверить реальные HTML заголовки audit-bot, X-Cache и отсутствие origin у HIT/STALE.
Отказ nginx -t/reload восстанавливает исходный файл; весь файл не удаляется.

Код и заголовки совместимы при любом порядке: без заголовков новые поля unknown,
старый сборщик просто не использует заголовки. Поведение сайта не зависит от них.
Не создавать синтетические RUM-записи на production ради отчёта: дождаться реальных.

Источники: https://nginx.org/en/docs/http/ngx_http_upstream_module.html#var_upstream_header_time
https://nginx.org/en/docs/http/ngx_http_headers_module.html
https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Server-Timing

Результаты выката дописываются после проверки фактического релиза.
