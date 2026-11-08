## Codex, 08.11.2026 — серия 2, запуск 4/8: ранний поиск табло

Trigger 2026-11-08T10:39:19.009Z, automation airportsboard-2-8.
Рабочая копия /Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028,
ветка codex/flight-map-prototype-20261028. Начальный HEAD 78dc647f;
актуальный origin/main перед изменением 0d555f5c, чужих tracked правок не было.

### Воспроизведение и исправление

Продолжена незавершённая проверка до гидратации. Настоящая fixture production
сборка на localhost3190; loopback proxy3191 удерживает Next JS, управление3192.
Видны20SSR-строк AYT при held=true,pending6,ready=false. Ранний click SU112
isTrusted=true уже корректно открывал карточку после release — прежний фикс жив.

Новый подтверждённый баг: на той же сборке ранний click кнопки поиска теряется.
После release ready=true, поиск остаётся collapsed; второй click открывает поле.
Проверялись отсутствие capture для поиска, сброс состояния эффектом и неверная
цель клика. Нормальный клик в ту же кнопку после готовности работает, а новый
тест реального bootstrap на старом коде красный: prevented/stopped=false
вместо true. Причина — capture видел только data-board-flight.

В существующую одноразовую очередь добавлен data-board-search, без второго UI,
новых запросов, storage или переводов. При первом mount открывается обычная
панель поиска, затем существующий эффект выставляет фокус после снятия inert.
Последний выбор между карточкой/поиском побеждает; Escape/другой click/pagehide,
сменаURL/DOM иTTL остаются защитой. Ранний поиск важнее старого ?flight.
Inline bootstrap 960→1048 B, gzip445→465 B. Это исправление потерянного действия,
не заявленное ускорение LCP; миллисекунды прежних профилей за новый эффект не выдаются.

### Проверки

- Две fixture production builds (до/после), 2473 страницы, пустой Airlabs key.
- 22 сценария реального bootstrap (17 прежних+5 новых), красный/зелёный журнал.
- 25 проверок FlightBoard hooks, board logic,4 board regressions,20 flight-time.
- TypeScript послеbuild и послеcleanup;12x395 leaf keys;client-messages PASS.
- scripts:232148 строк/8351файлов, нет примесей чужих алфавитов.
- Local index20/20,sitemap/hreflang,live-refresh,AdSense,first-paint5/5 PASS.
- HTTP12/12: кнопка поиска с родным label, новый inline capture, canonical верны.
- IAB Chromium,iframe375x812: RU и AR trustedclick до React, послеrelease
  searchOpen=true, фокус в поле, повторное нажатие не требуется.
- RU вводSU фильтрует табло, clickSU112 открывает именноSU112 и закрывает поиск.
- EN раннийclick+Escape доrelease: ready=true/searchOpen=false послеrelease.
- Снимки RU/AR375 и AX-доказательства сохранены. Нет утверждения о физическом
  Android/Safari/iPhone, программном открытии клавиатуры iOS или измеренном INP.
  Это детерминированная задержка чанков, а не модель скорости мобильной сети.

### Поле и границы

До выката серверный анализатор для0d555f5cc27a: 100 mobile/navigate наблюдений
за08.11UTC, p50LCP1232ms,p751788,p902437;5>4s, все преимущественно before-first-byte.
Browser n/p75:Chrome19/2072,Safari26/1912,Yandex25/1336,Yandex-app24/1788,
Edge1/1554,Firefox1/1321,Samsung2/1860,Opera2/9316. Малые неоднородные группы,
не причинное сравнение релизов. Rawвизиты не копировали. DNS не менялся.

Свои Next3190 PID94341 иproxy3191/3192 PID94359 остановлены; .next-s2c4 удалён,
только generatedTS изменения восстановлены. IAB27 закрыта. Старый outputs/ сохранён.
Production не открывался в браузере, платные endpoints не вызывались.
Дизайн, SEO/GEO/AEO, 12локалей, данные пользователей/аккаунты/реклама сохранены.

Выкат: продуктовый SHA6e5937f2871249075430b4266c228a0c672852cc,
push11:49:30.882719 Europe/Amsterdam, вне прогрева. Actions42473054932.
CI 42473054932 завершился success. Серверный git HEAD совпадает с полным SHA;
health 10:53:17 UTC: release 6e5937f28712, 3 PM2 instances, uptime 67 s.
Свежие production-проверки с audit-bot: index 20/20, sitemap/hreflang,
live-refresh и AdSense — PASS. Live-refresh сообщил возраст топа 11–25 минут
(0/7 моложе 10 минут); это наблюдение сохранено, пользовательские платные
запросы для проверки не запускались.

Production HTML всех 12 AYT проверен: локализованный label, единственная
кнопка data-board-search, новый inline bootstrap и canonical. Первый ответ EN
ещё содержал старый bootstrap 960 B; повторный обычный audit-bot GET в10:54:32 UTC
уже вернул новый1048 B. Первый и итоговый результаты сохранены, кэш не очищался.
Итого12/12 PASS. Это HTTP-проверка релиза, не клики на production.

Запуск 4/8 завершён; осталось4. Автоматизация не изменялась и не продлевалась.

Повторение: fixture build/start на3190, node early-search/fixture-proxy.mjs;
localhost3191/?locale=ru илиar; контрольlocalhost3192/__reset и /__release.
Stall только loopback. Read-onlyиндикатор показывает held/ready/searchOpen иtrustedclick.
Артефакты: /Users/whereiszhenya/Documents/Codex/2026-10-18/airportsboard-live-12-next-js-15/outputs/improvement-cycles-20261108-series2/cycle4/.
Следующий шаг: новые подтверждённые проблемы карты/сохранения/шейринга, отдельно
физический Safari/Android. Не повторять countdown/ранний поиск и не приписывать
исправлению влияние на полевой LCP без сопоставимого замера.
