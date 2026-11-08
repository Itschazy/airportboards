# Региональный поиск — 08.11.2026

Выкат подтверждён: `b0db1a426410a7687d33e3fe85b0a9e50c538e47`, CI [42508446912](https://github.com/Itschazy/airportboards/actions/runs/42508446912) success, runtime release совпал. После выката в18:11UTC index20/20, sitemap-hreflang, live-refresh, adsense — PASS с audit-bot.

## Подтверждённые исправления

- Naver Yeti в современном Chrome-подобном User-Agent проходил `mayFetchLiveFor` как живой читатель. Регрессия исполняет реальный модуль с подменённым хранилищем: до правки true, после false. Это **не запрет страниц**: бот читает общее хранилище, не инициирует покупку у Airlabs. Проверены обычные Chrome, Samsung, Whale, Naver app и Яндекс.
- Отчёт обходчиков терял Yeti и смешивал Qwant, Baidu, DuckDuckGo, Seznam, Yep с прочими. Они выделены; рекламные/preview варианты Naver/Baidu отдельно. Подпись отчёта теперь явно говорит об отсутствии IP-верификации. Полный CLI-тест подтверждает, что 200 ошибок 503 от заявленного Yeti включают существующую тревогу 5xx, а локаль ko учитывается.
- Исправлен парсер regex в check-live-refresh: внутреннее `/;` в классе символов нельзя принимать за конец объявления. Добавлены Whale/Yeti в штатную регрессию.

## Проверка доступности

32 живых HTML-адреса проверены с audit-bot: 12 главных, по три аэропорта ko/zh/ja/fr/de, пять карт перелётов. Все 32: HTTP200, свой canonical, правильный lang, 12 hreflang, непустые H1/description, отсутствие noindex. HTML без script/style содержит текст и ссылки. Это не замер рендеринга или доступности из КНР. Robots не запрещает региональных поисковых ботов.

Состояние IndexNow: уведомления по 2092 URL каждой рассматриваемой локали приняты ранее; pending0, timer active. Повторная массовая отправка неизменных URL не выполнялась. Naver участвует в обмене IndexNow, отдельная обязательная интеграция endpoint не нужна.

Логи за вчера и часть сегодня, **только заявленные UA**: Qwant1306/HTTP200; DuckDuckBot394 (376×200, остальные redirect); Applebot7531 (7517×200,12×404,1×308,1×500); PetalBot1812 (1810×200,1×404,1×308), преимущественно zh. Naver/Baidu в этом ограниченном окне не обнаружены. Это не доказательство отсутствия индекса. Попытка расширенного 8-файлового анализа остановилась по timeout; цифры выше получены отдельным завершённым проходом двух файлов.

## Публичная выдача (снимок, не полная перепись индекса)

- Naver: site:airportsboard.live — результатов не показал.
- Baidu: site:airportsboard.live — результатов не показал. Форма отправки /zh перевела на login; успешной отправки **не было**.
- Yahoo! JAPAN: общий site-запрос показал /en; site:airportsboard.live/ja — результатов не показал.
- Qwant: показал /en/flight-map и английские аэропорты; отдельный /fr — карту и NCE/FRA/AMS/MRS, другие страницы. Не объявлять этот канал неохваченным.
- Ecosia: /de site-запрос не дал результатов в текущем окружении; провайдер конкретной выдачи не установлен. Начальная автоматическая проверка сети завершилась сама, CAPTCHA не решалась.

## Кабинеты и регистрация

Владелец отдельно разрешил регистрацию Naver/Baidu. Открыты формы; Baidu username airportsboard подготовлен, принятие имени сервером не подтверждено. Создание пароля/телефон/SMS/обязательные согласия переданы владельцу согласно правилам browser tools. Naver сейчас на обязательных Terms; необязательные рекламные/геолокационные пункты не отмечены. Аккаунты и собственность сайта НЕ подтверждены. Не хранить пароли, OTP или персональные данные в отчёте.

После входа: добавить https://airportsboard.live, получить выданный кабинетом verification token/HTML, проверить отсутствие чужой верификации, опубликовать проверенный файл или meta; подтвердить владение и отправить sitemap только после проверки ограничений кабинета. Naver поддерживает sitemap index; Baidu historical docs противоречат друг другу — проверять текущий интерфейс, использовать конечные sitemap URL при необходимости. DNS не менять.

## Воспроизведение и проверки

- `node scripts/check-regional-crawlers.mjs`: 20/20 + полный CLI alarm.
- `node scripts/check-live-refresh.mjs http://localhost:3187`: PASS после исправления парсера.
- Сборка `.next-regional-audit` с fixture и пустым AIRLABS_API_KEY, TypeScript, ключи12локалей: PASS.
- check-scripts/plurals/client-messages/rtl/board-regressions/icu-args/warm-budget: PASS.
- Локальный fixture: search-i18n/index/adsense/sitemap-hreflang: PASS. Начальная search-проверка без сервера закономерно упала; повтор на3187 прошёл.
- Интерфейс и взаимодействия не изменялись; физических Samsung/Whale/Android тестов не было.
- `audit-pages.py` выполняет только ограниченный read-only audit-bot обход. Python TLS в первой попытке не нашёл локальную CA; рабочий проход использует curl с обычной проверкой TLS, без insecure.
- `crawler-summary.py` исполнять на сервере через SSH stdin, он печатает только агрегаты. Не экспортировать сырые IP/UA/пользовательские URL.

Источники:
- https://searchadvisor.naver.com/guide/seo-basic-firewall
- https://searchadvisor.naver.com/guide/indexnow-about
- https://help.qwant.com/hc/en-us/articles/51146433634833-The-Qwant-bot-QwantBot-and-the-robots-txt-file
- https://help.qwant.com/hc/en-us/articles/51727621886353-Referencing-ranking-and-de-referencing-of-web-pages-and-their-media-content
- https://duckduckgo.com/duckduckgo-help-pages/results/duckduckbot
- https://help.baidu.com/question?class=0&id=3001&prod_id=99
- https://o-seznam.cz/napoveda/vyhledavani/en/seznambot-crawler/
- https://yep.com/yepbot/

Следующий контроль через2–4недели: точные локальные URL, обход/индекс/показы/organic landing sessions. Новая автоматизация не создавалась. Частотности запросов и прогноз трафика не измерены.

## Оставшиеся независимые предупреждения

Свежая check-warm-demand: TLV316органических визитов за30дней, норматив90мин вместо60 для топ25. Двукратно просроченных бортов топа нет. Расписание не менялось. Daily08.11: Yandex recrawl0отправлено/3отказа, причина в этом пакете не установлена, повторные отправки не выполнялись. Регистрация Naver/Baidu и верификация сайта ожидают завершения пользователем; никакой успешной регистрации не заявляем.
