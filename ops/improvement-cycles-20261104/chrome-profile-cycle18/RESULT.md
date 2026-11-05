# Запуск 18/20 — уточнение медленных загрузок, 05.11.2026

Worktree /Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028,
ветка codex/flight-map-prototype-20261028, база baafcc897e47bee394fcba6ab70183231d6743b1.
Свежий origin/main57c5af40ff29123263734070c8fbbd856ff34137; продукт не менялся.
Нового push/CI/deploy нет; docs отдельно не пушить ради рестарта.

## Незавершённый профиль

Прочитаны shared INSTRUCTIONS/bridge/HANDOFF и latest обоих агентов,
AGENTS/CLAUDE/HANDOFF копии. Чужих tracked изменений нет, старый outputs сохранён.
Возобновлено сохранение профиля Chrome запуска17. Нативный AX читается,
координатный клик опять вернул -10005 noWindowsAvailable. После ответа владельца
«продолжай» диалог Save performance trace открылся, но сохранение файла не
подтверждено: Trace в Downloads нет. AX показывал session#2, screenshot#1;
не считать это валидной повторной записью или новым LCP.
Позднее foreground перешёл на открытки другой задачи, нативные действия прекращены.
Через inventory собственная вкладка найдена (id95840857, localhost:3169/KZN),
но getTab по URL/ID, документированный browser API и сброс cua_repl возвращали
ошибку timeoutMs. Настройки чужих задач не менялись, обхода через CDP/osascript нет.
Инструмент не позволяет сейчас надёжно привязать ввод/измерение к тестовой вкладке.
Повтор6×/20×, экспорт trace, точныйLCP/CLS НЕ завершены. Замер Android не заявлен.

## Новые данные, пригодные для выбора сценария

Readonly SSH, агрегаты текущего release57c5af40ff29,05.11UTC,
mobile+navigate+departures/arrivals, все источники/локали. RawRUM не копировали.
Первый срез115наблюдений: LCPp50=1272мс,p75=1812,p90=2700;6slow>4с.
Доминирующие фазы:4DNS/connect,1request вне nginx,1render.
ServerTiming114пар/1unknown,edgep75=95мс,origin81/p75=115;
TLS59known/56unknown. По браузерам:Chrome24/p752248/1slow;
Safari27/1352/1;Яндекс27/1504/1;ЯндексСтарт31/2148/2;
Samsung2/24644/1;Edge3/2675/0;Opera1/3212/0. Малые группы не сравнение релизов.

Второй, более поздний срез report-rum --minLcp=4001 с группировкой
browser,page,airport,target локализует случаи; между чтениями добавился ещё
LWN, поэтому7slow во втором срезе не противоречат6 в первом.
- RUH departures Safari,text,n1: LCP5330мс,TTFB2623,render2707;
  longTaskAPI отсутствует, не0. Отрисовка лишь немногим больше половиныLCP.
  Это конкретный сценарий для локальной проверки Safari, не доказанный баг CSS/React.
- TAS arrivals Samsung,text,n1: LCP24644,TTFB23910,render734;
  request15615,edge56,origin55. Парный остаток15559мс вне nginx header interval;
  туда могут входить сеть, прокси, планирование браузера. Не доказательство
  блокировки провайдера и не основание менять DNS. Один случай, не Samsungp75.
- LOO Chrome departures,n1: LCP11040,TTFB10416,DNS749,connect6892,
  request2762,edge144. Не ошибка скорости рендера табло.
- DXB Яндекс arrivals,n1: LCP6572,TTFB5183,DNS765,connect3455,render1389.
- LWN ЯндексСтарт departures,n3: медианаLCP6720,TTFB6486,DNS6204,
  connect171,request115,edge19. Медианы НЕ складывать как один визит.

Эти случаи с одной версией, но разными сетями/страницами: причинный эффект
последнего выката не доказан. Содержимое slowestResource=next не означает,
что Next.js вызвал задержку; это лишь самый медленный ресурс в записи.
Ничего не переписывать без воспроизведения и измеримого результата.

## Проверки и очистка

Новая fixture production build2473/2473 с пустым AIRLABS_API_KEY,
.next-cycle18 и отдельными /tmp/ab-cycle18-{fixture.json,data}; сервер3169.
TypeScript послеbuild, локальный index20/20,keys12×395 PASS.
Свой сервер остановлен, buildудалён, generatedTS восстановлены;
TypeScript послеcleanup выполнен отдельно. UI не менялся, касания не засчитаны.
Production браузер/платные endpoint не использованы. Дизайн,DNS,SEO12языков,
данные пользователей, прогрев, аккаунты и реклама сохранены.

Следующий19/20: сначала проверить восстановление управления своей вкладкой;
при успехе реальные повторы6×/20× и точныйLCP/CLS, дополнить RUH/Safari.
Не переиздавать docs, не принимать profile range заLCP, не продлевать серию.
