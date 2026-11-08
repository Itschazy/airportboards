## Codex, 08.11.2026 — серия 2, запуск 1/8: исправлен сдвиг отсчёта

Опубликован 0d555f5cc27aac0f79615f23fd9a81cfcf71ba93; origin/main, серверный git HEAD
и health.release0d555f5cc27a совпадают. CI42463653680 completed/success.
Push09:36:21 Europe/Amsterdam, после окна прогрева. Ветка
codex/flight-map-prototype-20261028, cwd
/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028.
Автоматизация airportsboard-2-8: завершён1 из8, осталось7; предыдущие серии не возобновляли.

Подтверждённый остаточный CLS BCN устранён в основной части: смена «По расписанию»
на «Через N мин» сжимала колонку статуса с56.59 до41.64px. Теперь CSS-псевдоэлемент
с visibility:hidden сохраняет естественную высоту исходной спокойной подписи.
Он не добавляет видимого/озвучиваемого текста в наблюдаемом AX tree. Голосовой
screen reader отдельно не проверен. Фиксированных высот, новых переводов и
запечённых часов ISR нет; актуальная подпись и aria-label остаются текущими.
Посадка, задержка, отмена не используют резерв. Дизайн/DNS/SEO/данные не менялись.

Свежий парный замер: production-сборки на одной синтетической фикстуре, пустой
Airlabs key, IAB Chromium на Mac,375×812, тёплые ресурсы, без CPU/network throttle,
ранний PerformanceObserver через loopback proxy. Три загрузки до/после.
CLS до0.0203298756 во всех трёх, после0.0019508460/0.0006126838/0.0019663892;
медиана0.0019508460, снижение~90.4%. check.mjs доexit1, послеexit0.
Это НЕ физический Android и НЕ новый полевой LCP. Минута отсчёта менялась в
естественном времени (две двузначные подписи в обоих проходах), фикстура не менялась.

12 локалей на375 и320px: overflow0; у11 нерусских геометрия статусов прежняя,
RU375 сохраняет свою SSR-высоту. Карточка открывается/закрывается, фокус возвращается
на строку во всех12 языках. RU «Показать больше» pointer-кликом30→80 строк, без
ложной карточки, overflow0. Console errors0. Это mouse/keyboard на Mac, не touch.

Проверки: две fixture-сборки2473, TypeScript до/после очистки,12×395 ключей,
check-scripts232148строк/8351файл, client-messages, board logic/regressions,
board-interactions, board-intent17, flight-time20, recent-history/recent-locales,
search-race. Локально index20/20,sitemap-hreflang,live-refresh,adsense,first-paint
(CSS11424B gzip),flight-map — exit0. Первый flight-map безbase не нашёл3111;
повтор с настоящим3187 прошёл. Нет замалчиваемого красного продуктового теста.
После выката все4 production-сторожа exit0. Audit-bot HTML BCN содержит новый
class/data-status-base/CSS, правильный canonical и не содержит noindex.
Production-browser/платных endpoints не было, реклама/аккаунты/AdSense не менялись.

RUM ДО выката,08:25:35UTC,релиз8d031b4813f5:93 mobile/navigate аэропортовых
открытия за неполный08.11, p75LCP1838мс,p902350мс,0>4сек. Chrome16/p752128,
Safari27/1782,Yandex28/1582,Yandex-app14/1504. Малые группы, не причинный A/B.
Сырые визиты не выгружались, только серверные агрегаты. Нового RUM-релиза ещё нет.

Следующий запуск: свежие сопоставимые RUM-группы, холодный профиль первого экрана
и первого касания; не повторять исправленный countdown. Физические Safari/Android,
реальная доставка шейринга и остаточный малый CLS остаются непроверенными/открытыми.
Собственные3187/3188 остановлены; .next-s2c1 удалён,generatedTS восстановлены,
вкладка закрыта,viewportreset. Старый untracked outputs/ сохранён.
Результаты/репродукция: ops/improvement-cycles-20261108-series2/countdown/.
Артефакты: /Users/whereiszhenya/Documents/Codex/2026-10-18/airportsboard-live-12-next-js-15/outputs/improvement-cycles-20261108-series2/cycle1/.
