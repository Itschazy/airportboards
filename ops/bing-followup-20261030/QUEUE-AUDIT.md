# IndexNow: покрытие содержательных изменений после a9a002b8

30.10.2026. Локальная рабочая копия `/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028`, HEAD `1a9f083c`; production `a9a002b8` взят из актуальной передачи, не проверялся по сети этим исполнителем. Прочитаны AGENTS/CLAUDE/HANDOFF и git log. Исследованы исходники, существующие unit-тесты и sitemap/metadata-предикаты. Ни запросов production, ни браузера, ни настроек/секретов, ни отправок IndexNow не было. Изменён только этот отчёт, продукт не менялся.

## Вывод

**Подтверждён пробел:** надёжный транспорт очереди работает, но содержательные изменения route/country/city/widgets/legal/home после первого discovery не обнаруживаются. Для этих семейств fingerprint сейчас равен `hash(path + 'discovered')`. Изменение файла или перевода не меняет эту строку.

Поэтому принятые IndexNow уведомления аэропортов после a9a002b8 нельзя считать доказательством уведомления изменённых маршрутов/каталогов/виджетов/legal. Первоначально новый URL может быть отправлен через daily discovery; речь именно о последующих содержательных изменениях уже известного URL. Фактическую очередь/историю production здесь не читали.

## 1. Что реально хешируется

Основной источник: [contentManifest](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow-queue.mjs:114).

| Семейство | Зависимости текущего fingerprint | Что не обнаруживается |
|---|---|---|
| Airport parent + arrivals для 182 справочных/приоритетных кодов | AirportBottom, airport-guide/content, две airport page; home/ui/nav конкретного языка; RU guide и перевод этого языка | Общие зависимости вне этого списка; изменение любой home-строки даёт шум, даже если она только про route/widgets |
| Остальные airport URL из catalogue | Airport template hash + весь messages соответствующего языка | Общие зависимости, не перечисленные в airportCode; отдельной проверки canonical/robots нет |
| Event detail | event-content, event detail и hub code; event.meta, локаль события, вычисляемый status | Изменение messages.event, общей локализации единиц и других внешних зависимостей само по себе |
| Events hub | event code + хеши detail-страниц этой локали | Те же неперечисленные зависимости |
| Flight map | page, content.ts, localization.ts; UI locale JSON и SEO locale JSON | Изменения runtime JS/map exporter/CSS сами по себе; это ранее сознательно не универсальный пиксельный детектор |
| Route, city, country, widgets, legal, home, /airports, /az | Для обнаруженных URL только `hash(path + 'discovered')` | Любые последующие правки содержимого, шаблонов, переводов и исходных данных |
| Flight/airline, если они ошибочно окажутся в catalogue | Тот же постоянный discovery hash | Нет отдельного допуска семейств; сами страницы сейчас 404/noindex в обычном потоке |

Контентный manifest без переданного catalogue в текущем checkout: **4548 URL** = airport 4368, event 156, events hub 12, flight-map 12. Route/country/city/widgets/legal/home в этом наборе нет. Это подсчёт локальной функции, не размера очереди/индекса сайта.

## 2. Локальное доказательство пробела

Запущен существующий `scripts/check-indexnow-queue.mjs` на Node 22.23.2: PASS, все HTTP ответы подменены mock-функциями. Логи со словами api.indexnow.org/200 относятся к mock, внешних обращений не было.

Дополнительно вызван реальный `contentManifest` с безопасным списком примеров `/en`, `/en/route/SVO-LED`, `/en/airports`, `/en/airports/united-kingdom`, `/en/city/london`, `/en/widgets`, `/en/about`, `/en/privacy`, `/en/terms`, `/en/contact`, `/de/about`, `/en/flight/SU112`, `/en/airline/SU`. **Все 13 получили ровно `hash(path + 'discovered')`.** Последние три — диагностические примеры допуска, не утверждение, что они находятся в реальной серверной очереди.

В изолированном временном дереве с обязательными зависимостями manifest проведены мутации файлов:

- `app/[locale]/route/[pair]/page.tsx` → 0 изменённых fingerprints;
- `lib/route-facts.ts` → 0;
- country page → 0;
- city page → 0;
- widgets page → 0;
- `data/legal/about.json` → 0.

Затем изменение только `messages/en.json → home.route_desc` дало **24 airport fingerprints в минимальном fixture**, но не изменило `/en/route/SVO-LED`. В fixture отсутствовали справочные и события; 24 — 12 приоритетных кодов × parent/arrivals, не число затронутых страниц production. В полном checkout такая зависимость затрагивает больше аэропортов. Временное дерево удалено после проверки, исходники не менялись.

## 3. Допуск URL, canonical и sitemap

### Синтаксический допуск не является проверкой индексируемости

[validPath](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow-queue.mjs:14) исключает `/api`, чужие origin, query/traversal и `/departures`; последнее верно, потому что canonical вылетов — parent airport. Но функция не проверяет наличие аэропорта, closed, isUnfillable, реальность города/страны, существование локализованного события, индексируемость legal или soft-404 типов flight/airline.

Текущий default manifest не содержит закрытых аэропортов по `data/airports.json` — проверено локально. **При этом самого closed-guard в contentManifest нет**: сохранённый catalogue или будущая справочная могут добавить такой URL. Не следует представлять это как уже обнаруженную массовую отправку closed.

Airport arrivals имеет более строгий допуск, чем parent: [metadata arrivals](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/app/[locale]/airport/[iata]/arrivals/page.tsx:125) учитывает closed/no-service/unfillable и стабильный допуск либо строки. Хеш справочной сам по себе не доказывает, что arrivals индексируется.

### Blind EN → 12 создаёт лишние локали

[Discovery in sender](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow.mjs:33) расширяет каждый `/en...` на все 12 языков с комментарием, будто карта содержит только EN + hreflang. Но [sitemap entry](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/app/sitemap.ts:80) давно выдаёт отдельный `<loc>` каждого настоящего языка.

Legal в карте и metadata существуют для RU/EN: [LEGAL_LOCALES и robots](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/components/legal-page.tsx:39). EN expansion искусственно создаёт ещё десять noindex fallback URL на документ, а fallback-ветка manifest их принимает. Аналогично необходимо уважать фактические локали событий. Это не означает, что уведомление noindex/удаления всегда запрещено IndexNow: при реальном изменении состояния такая отправка может быть намеренной. Но генерировать отсутствующую локализацию из EN как новое полезное содержимое нельзя.

### Устойчивый scope сохранить

[Состав sitemap](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/app/sitemap.ts:175) намеренно ограничивает аэропорты по `advertisedInSitemap`, города/страны по текущим предикатам, маршруты по реальным данным, legal — RU/EN, events — датам/статусам. Снятие URL из карты не означает удаления или noindex. `state.catalogue` сейчас пополняется объединением с предыдущим набором; это намеренно сохраняет известные страницы.

Поэтому исправление fingerprint **не требует** расширять sitemap до всех аэропортов/всех пар, менять canonical, включать flight/airline, удалять старые URL из state или хешировать ежедневные борта. Для новых семейств безопасный старт — уже обнаруженные canonical URL с отдельной политикой семейств, не генерация полного комбинаторного пространства.

## 4. Что в очереди уже правильно и не требует переписывания

- [Publication guard/lock](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow.mjs:14): production Linux/cwd, общий flock, совпадение HEAD/build/runtime SHA. Не отправлять fingerprint из checkout до завершения публикации.
- [Reconcile](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow-queue.mjs:38): неизменившаяся версия не возвращается в pending; новая версия сбрасывает предыдущие попытки конкретного URL.
- [Drain](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow-queue.mjs:57): 50 URL на POST, максимум 100 за запуск; sent только для принятой партии; persist после каждой партии; restart/backoff; 429 без обхода через другой endpoint.
- [State](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow-queue.mjs:19): fail closed при повреждённом JSON/схеме, атомарная запись вне git clean. Состояние и историю не обнулять ради миграции fingerprint.
- [Discovery](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/scripts/indexnow-queue.mjs:89): audit-bot, официальный origin, разрешённый путь дочерней sitemap, redirect error, timeout 30 секунд общий/15 на запрос, не более 100 частей; сбой сохраняет прежний каталог.
- 200/202 — приём, не индексация и не гарантия цитирования.

### Приоритеты и бюджеты

`priority=0` — 12 выбранных Bing-аэропортов; `1` — содержательная новая версия уже известного пути; `2` — первоначальный discovery. Внутри — время постановки. Семейства маршрутов/каталогов после появления content fingerprint естественно получают priority 1, если уже есть fingerprints; менять алгоритм ради них не нужно.

Это **лимит 100 на запуск, не дневная квота**. Таймер [10 минут + jitter](/Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028/ops/bing-growth-20261029/airportsboard-indexnow.timer) теоретически даёт порядка 14 400 URL за сутки при непрерывно непустой очереди, плюс daily-вызов; точный максимум зависит от времени выполнения/lock/задержек. Отдельного persisted daily counter в этом коде нет. Не путать с 150/сутки Вебмастера: это другой отправитель/API. Никакой AirLabs-квоты очередь не расходует — живые данные не запрашиваются. До обнаружения новых Bing-доказательств недостатка скорости не увеличивать партии, частоту и количество endpoint.

## 5. Минимальный безопасный план

1. **Убрать blind expansion EN.** Принимать фактические `<loc>` из sitemap, уже содержащей реальные локали; оставить dedupe и origin/path guards. Старый каталог фильтровать на отправку по отдельной явной политике, не стирать sent/history/рейсы.
2. **Добавить зависимые fingerprints для уже известных семейств.** Route: route page + route-facts + относящиеся к route home-строки. Country/city: соответствующий шаблон + relevant home-строки + статический каталог/данные измерения, которые реально меняют видимый состав. Widgets: widgets page/WidgetBuilder + widgets-строки; embed-шаблон учитывать как версию продукта, не каждую смену рейсов. Legal: legal-page/LegalArticle/legal-content + документ только в его реальном языке. Home/airports/az: соответствующие шаблоны + соответствующая локализация/статический каталог. Использовать стабильную сериализацию/версии зависимостей, не время сборки и не state счётчиков.
3. **Избежать ложной универсальности.** Прямо документировать зависимости и ограничения. По возможности выделить ключи home по семействам, чтобы изменение виджета не переотправляло все аэропорты. Не включать в fingerprint актуальные board timestamps/статусы отдельных рейсов: это создаст постоянный churn и отодвинет реальные редакционные обновления.
4. **Eligibility отделить от validPath.** Последний оставить синтаксической проверкой. Отдельно не изобретать /de/about и не вводить flight/airline из произвольного catalogue. Для archived/noindex/cancelled/closed различать «новое содержимое для продвижения» и намеренное уведомление изменения состояния. Удаление/переезд — отдельная редакционная операция, не автоматическая очистка всего, что ушло из sitemap.
5. **Однократная миграция без залпа.** Известные URL поменяют постоянный discovery hash на контентный; это ожидаемо. Показать dry-run по семействам/локалям и количеству изменившихся fingerprints перед публикацией. Дренировать прежними 50/100, без сброса состояния. После публикации ждать совпадения SHA; сохранять очереди/логи и проверять конкретные обновлённые URL в кабинете.

Индексируемость по динамической наличности рейсов нельзя имитировать неполным самописным предикатом. Если для допуска понадобится читать store, это должно быть явное бесплатное чтение с той же функцией, что страница; не включать результат в content hash. Если такой общей функции пока нет, не обещать универсальную проверку canonical/robots по одной строке пути.

## 6. Необходимые тесты

- Реальная mutation-проверка: изменение route template/route-facts затрагивает route, не оставляет hash «discovered»; отдельный RU/DE текст не меняет чужие локали без причины.
- Country/city: изменение списка или classified unknown меняет нужные страницы; `served + unserved + unknown` не теряется. Не путать изменение статического service measurement с текущим платным flight store.
- Widgets и legal: изменение соответствующего текста/шаблона меняет нужный путь. RU legal → только RU, EN legal → EN и честный fallback не добавляется как индексируемый.
- EN `<loc>` не создаёт дополнительные языки; RU/EN legal, частично переведённое событие, неизвестная локаль.
- Canonical departures исключён; closed/unknown/unfillable и flight/airline не становятся случайными новыми продвиженческими URL. Старые indexable страницы вне sitemap не считаются удалёнными автоматически.
- Живой flight store, timestamp сборки, clock tick и неизменный повтор manifest не меняют редакционные fingerprints. Исключение — документированный одноразовый переход статуса события.
- Миграция state: сохраняются sent/история/backoff; обычный контентный апдейт обгоняет первый discovery; лимиты 50/100 не меняются. Повреждённый JSON, bad origin/path и mismatched release остаются fail closed.
- Existing mocks 200/202/429, частичная партия, сетевой fallback, restart и атомарное сохранение должны остаться PASS. Новые проверки не делают HTTP по настоящим URL и не печатают ключ.

## Ограничения вывода

Это доказательство конкретного пробела механизма уведомления, а не доказательство причины низких позиций или неиндексации Bing. Новые данные кабинета/production state собирает родитель. Нельзя выводить рост кликов/цитирования из того, что URL принят endpoint, или называть локальный manifest точной очередью сервера. Безопасная полезная реализация — обнаружить уже сделанные редакционные изменения и доставлять их прежней устойчивой очередью, не расширяя расход и пространство URL.
