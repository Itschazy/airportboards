## Codex, 08.11.2026 — airportsboard-8, запуск 6/8: старые ресурсы переживают выкат

Опубликован 68d59e2255b538cbf9f12f61ad715bfddb9cf252; origin/main, серверный HEAD
и health.release68d59e2255b5 совпали. CI42453385684 success.
Push07:06:28 Europe/Amsterdam, вне прогрева. Ветка codex/flight-map-prototype-20261028,
cwd /Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028.

Подтверждённая причина: swap убирал старые .next/static из обслуживаемого каталога,
а nginx мог отдавать прежний HTML (30s + stale background update). Старый JS404
вызывал ChunkLoadError и Application error. Две настоящие fixture-сборки2473страницы:
69старых файлов, до фикса4HTTP404; после переноса69/69HTTP200, точные SHA256 и
immutable. На375px до фикса — ошибка, после — все12языков и карточкиopen/close/focus
работают,20строк,overflow0,console0. IABChromium155, неSafari/физическийAndroid.
Первый новыйтаб сбросил viewport до1280: desktopпроход сохранён отдельно, затем
повторён и подтверждён375px. УскорениеLCP этим не заявляется.

scripts/retain-static-assets.mjs переносит только публичную static из live/prev
в готовую stage ДО изменения live/rollback. TTL7дней без продления при переносе;
истёкшее исключается при следующем выкате, отдельного таймера нет. Предел добавочных
ресурсов128MiB/8000файлов НА сборку, при превышении остановка до замены live.
Новые файлы приоритетны, symlinks запрещены, copies независимы от rollback.
Старый expired файл изlive не возрождается изprev. Частичная ошибка копирования
убирает созданные копии, данные рейсов/история/HTML/servercache не затрагиваются.
Дизайн/DNS/nginx/аккаунты/AdSense не менялись. Ни платныхAPI, ни productionbrowser.

16новых regression PASS (настоящий swap, TTL, повторныевыкаты, capacity guard,
copy failure, symlinks, rollback). cache-maintenance PASS; recent-history30,
search-race, boardlogic/regressions, client-messages, scripts232148строк/8351файлов,
12×395keys, map212/212, tscдо/послеcleanup, fixturebuild2473. Localindex20/20,
first-paint5/5(11401Bgzip), sitemap/hreflang/live-refresh/adsense/mapHTTP12locale PASS.
Минимальный swaprepro и настоящийHTTPbefore — red; после переноса green.

Production audit-bot: index20/20, sitemap-hreflang, live-refresh, adsense —4exit0.
Перед push сохранены hash/size76ресурсов изlive+prev. После CI прямой HTTP Next
для76/76:200, SHA256 совпал, immutable. Manifest:14добавочных файлов/189665байт,
TTL до15.11 примерно06:08UTC. Внешний HTTPобход12страницAYT:все15уникальных
ссылочныхJS/CSS/font ресурсов доступны, по12ресурсов наязык. Сами ресурсы разных
сборок могут иметь разные имена: проверяется исторический URL + bytes, не название
локального module-id. Вероятность наполнения диска ограничена явно, не бесконечным
копированием всех прошлых build-кэшей.

Ограничение: удалённые ДО внедрения файлы, которых нет ни вlive, нивprev, не восстановлены
(старый8670-72ab38f973091ec9.js израннегонаблюдения). Оченьстаройвкладке понадобится
reload. Общая совместимость произвольных старых RSC/server-протоколов этим не обещана.
Политика касается статических ресурсов последующих выкатов; expiry проверяется наswap.

Свежий RUM перед выкатом: неполный08.11UTC, c841da91 38mobile airport navigate,
p75LCP1702ms,1>4s(Yandex13003ms, преимущественноother_before_byte). Chrome9/p751628,
Safari8/950,Yandex9/720,Yandex-app6/1548. Малые несопоставимые группы: вывода обэффекте
релизов нет; задержка до первого байта не доказательство JS/React bottleneck.

Следующее, запуск7: язык названий истории ab_recent остаётся от предыдущей локали
в RecentlyViewed и главном поиске. Воспроизведение EN→HI→EN записано вцикле5.
Исправлять без полного каталога в клиентском бандле/пяти дополнительных запросов;
проверить поведение offline и старый формат. Также наблюдатьRUM текущихрелизов,
оставшийсяCLSBCN и быстрыйscroll/Show more — физическийtouch пока не доказан.
Серия6/8, осталось2, не продлевать. После8 удалитьавтоматизацию штатнымtool.

Собственные3180/3181/3182остановлены, дваbuildкаталога удалены, generatedTS
восстановлены, браузерныевкладки закрыты/viewportreset. Старыйuntrackedoutputs/
сохранён. Финальныеdocsкоммитятсялокально, не пушить только ради отчёта.
Артефакты /Users/whereiszhenya/Documents/Codex/2026-10-18/airportsboard-live-12-next-js-15/outputs/improvement-cycles-20261108/cycle6/
