## Codex, 08.11.2026 — airportsboard-8, запуск 4/8: устранён скачок первых строк табло

Релиз/origin/main/serverHEAD5625ffd19a5510275d78f6200ef9fa23cf960607;
ветка codex/flight-map-prototype-20261028,
cwd /Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028.
Push05:36:13 Amsterdam вне прогрева; CI42447488552success, health.release совпал.
Первым12строкам .frow задано content-visibility:visible, дальние сохраняют auto.
Причина: исходный первый кадр использовал 72px вместо настоящей высоты81–100px,
после чего видимые строки сдвигались. Дизайн/текст/данные/DNS/SEO не меняются.
12 пар A/B и12 загрузок собранного фикса при375px: медианы CLS BKK0.01578→0.00065,
DXB arrivals0.03837→0.00302,BCN0.03938→0.02055,DOH arrivals0.03652→0.00256.
Конечная геометрия первой строки совпала. Это CLS первого экрана через1с послеload,
не всего визита; CPU/сеть не замедлялись, кэш прогрет, loopback proxy буферизуетHTML.
Нет доказанного ускорения LCP на слабом Android: LCP96–108мс примерно без изменения.
Текущий IAB фактически Chromium155 по UA; НЕ Safari/WebKit. Старое название WebKit
в отчётах1–3 не является доказательством тестирования Safari (движок там не записан).

Fixturebuild2473,tscдо/послеcleanup,12×395keys,scripts232148/8351,client-messages,
boardlogic/regressions/intent17,map212/212 PASS. Записанный baseline checkerexit1
на4страницах, buildmeasurements4PASS. Localindex20/20,firstpaint5/5(11369Bgzip),
sitemap/live-refresh/adsensePASS. Прямой localhost375: все12локалей open/close/focus,
row1visible,row13auto,console0errors. СEnter «Show more» даёт80строк и31-якарточка
работает. Pointerclick при автоскролле дважды открыл последнюю строку вместо кнопки:
это ограничение/кандидат для следующего воспроизведения, не успешный touch-тест.

Production4checkexit0; новый CSS в head12локалей подтверждён, en/fr2-япопытка,
без ручного purge. RUMнеполного08.11UTC:815101aa46mobile navigate,p75LCP1696мс,
2>4с преимущественноDNS/connect; малая несопоставимая выборка не доказывает эффект.

Следующее: воспроизвести на медленной загрузке/после автоскролла «Показать ещё»
с отделением дефекта инструмента от touch; остаточный CLSBCN; RUMпо новымрелизам.
В локальном EN недавнийDXB сохранил Hindiназвание после смены языка: отдельный
кандидат к проверке (AXиз этого цикла), не смешивать с CSSфиксом.
Серия4/8, осталось4; журнал ops/improvement-cycles-20261108/progress.json.
Отчёт ops/improvement-cycles-20261108/board-first-screen/RESULT.md,
сырые синтетические измерения/логи/снимки outputs/improvement-cycles-20261108/cycle4
папки чата. Свои3176/3177/build очищены,IABзакрыт/reset,generatedTSвосстановлены,
старый untrackedoutputsсохранён. Итоговые docs отдельно не пушить.

## Выкат и завершение

Push08.11.2026 05:36:13 Europe/Amsterdam, вне прогрева. Релиз
5625ffd19a5510275d78f6200ef9fa23cf960607. CI42447488552 success;
серверный HEAD совпал, health.release5625ffd19a55, instance1.
Production audit-bot: index20/20,sitemap-hreflang,live-refresh,adsense —4 exit0.
Новый CSS явно найден в head всех12страниц /<locale>/airport/DXB/arrivals:
en/fr потребовали второй запрос после штатного обновления ISR/nginx, остальные первый.
Ручного purge/revalidate не было. Не считать первую старую HTML-копию новым релизом.
Ни платных API, ни production-браузера, ни рекламы/изменений аккаунтов.

Собственные3176/3177 остановлены, .next-cycle84 удалён, generatedTS восстановлены,
после cleanup tscPASS. Собственная IAB-вкладка закрыта, viewportreset.
Старый untracked outputs/ не затронут. Серия4/8; не продлевать.
