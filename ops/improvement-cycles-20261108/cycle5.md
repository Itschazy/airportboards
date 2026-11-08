## Codex, 08.11.2026 — airportsboard-8, запуск 5/8: защита истории от падения табло

Опубликован c841da913860a17440d8fc3ca60fb273dd334767; origin/main, серверный HEAD
и health.release c841da913860 совпали. CI 42450185689 success.
Push 06:17 Europe/Amsterdam вне прогрева. Ветка codex/flight-map-prototype-20261028,
рабочая копия /Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028.

Подтверждённый баг: JSON ab_recent с объектом вместо city вызывал React #31 и
Application error всего табло. Repro на настоящем React renderer + локальной
production-сборке. RecentlyViewed теперь проверяет типы/код/длину, пропускает
плохие записи, сохраняет 5 уникальных корректных, исключает текущий аэропорт.
JSON.parse только до 16384 UTF-16 code units; city до 256. Формат legacy iata/city
сохранён, компонент не записывает и не удаляет storage. Дизайн/DNS/SEO без изменений.

30 новых сценариев PASS, прежний компонент падает на negative control; 212 map
unit PASS; search-race, board-logic/regressions/intent17, client-messages,
check:scripts 232148 строк/8351 файлов, 12×395 keys, TypeScript до/после cleanup,
fixture build2473 PASS. Local index20/20, first-paint5/5 (11369Bgzip), sitemap,
live-refresh, adsense, flight-map HTTP/SSR12locale PASS. Первый map-check ошибочно
без базы пошёл на localhost3111 и упал ECONNREFUSED; повтор на3179 прошёл.
IAB Chromium155 при375×812: 12локалей, no overflow/client error, валидный LHR виден;
Show more30→80 без диалога, HI карточка open/close/focus PASS, EN поиск работает.
Единственная console error05:09:59Z от исходного намеренного воспроизведения;
после фикса новых нет. Не Safari/физический Android; ускорение LCP не заявляется.

Production audit-bot: index20/20, sitemap-hreflang, live-refresh, adsense —4 exit0.
Защита RecentlyViewed подтверждена в JS, который ссылается из HTML всех12локалей.
Первый дополнительный checker ошибочно ожидал локальный chunk-id3244, на сервере
он8670: исправлен checker, а не продукт. Локальный SHA файла отличается, поэтому
проверена сама новая функция (16384/type checks/256/unique5), CI/serverHEAD совпали.

ВАЖНО — новый подтверждённый кандидат, приоритет запуска6:
Первый EN HTML после выката сослался на /_next/static/chunks/8670-72ab38f973091ec9.js,
файл ответил404. Повторный EN и финальный полный обход12locale уже отдали новый
8670-1f395a4c48bc2e21.js с защитой, все12 PASS. Это окно несовместимости старого
HTML/новых assets, не исправлено текущим пакетом. scripts/swap-build.mjs хранит
предыдущую сборку .next-prev, но fallback старых JS надо проверить. В следующем
запуске воспроизвести две сборки/старый HTML локально, проверить nginx/Next static
маршрут read-only, сделать ограниченное по размеру/сроку решение без роста диска.
Не скрывать 404 успешным повторным запросом. Логи production-bundles.log и
production-bundles-retry.log сохранены.

Свежий RUM неполного08.11UTC для предыдущего5625ffd1:37mobile navigate аэропортов,
p75LCP2036мс,0>4с; Chrome12/p751820, Safari6/2077, Yandex11/2036, Yandex-app5/2276.
Это малые несопоставимые выборки, вывод об эффекте не делать. Сырые визиты не выгружены.

Далее также: язык названий ab_recent остаётся от предыдущей локали и в поиске,
и в RecentlyViewed; сделать отдельно без полного каталога в бандле/5запросов.
Show more после завершения scroll pointer работает; ранний locatorclick отдал
No node found без click event. Не считать это доказанной исправностью всех touch.
Остаточный CLS BCN и слабый Android/Chrome/Safari требуют отдельного замера.

Серия5/8, осталось3. Журнал ops/improvement-cycles-20261108/progress.json.
Собственные3178/3179 остановлены, .next-cycle85 удалён, generatedTS восстановлены,
IABтаб закрыт/viewportreset. Старый untrackedoutputs/ сохранён. Docs отдельно
локально, не пушить только ради отчёта. Никаких платных API/productionbrowser,
рассылок, DNS, покупок, изменений аккаунтов, рекламы/AdSense-заявок.
Артефакты: /Users/whereiszhenya/Documents/Codex/2026-10-18/airportsboard-live-12-next-js-15/outputs/improvement-cycles-20261108/cycle5/
