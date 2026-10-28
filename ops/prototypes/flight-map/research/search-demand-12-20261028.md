# Поисковые намерения для личной карты перелётов на 12 языках

Дата: 28.10.2026. Исследование для AirportsBoard, рабочая копия `runwayboard-flight-map-prototype-20261028`, исходный HEAD `046374ca`. Исследование не меняет код, дизайн, DNS, кабинеты, индексирование и production. Сайт AirportsBoard не открывался и платные данные не запрашивались.

## Что удалось установить

**Интерес к категории подтверждается существующими продуктами и выдачей, но числовая частотность не измерена.** Ни посещаемость конкурентов, ни количество результатов, ни наличие перевода продукта не доказывают объём запросов. Нет доступа к выгрузке Wordstat / Keyword Planner / OpenSEO; запросы ниже — семантические кандидаты, а не список «высокочастотников».

Проверены языковые запросы через доступный веб-поиск, затем первичные страницы продуктов, магазинов приложений и документация поисковиков. Это не региональная выгрузка Google/Яндекса, не проверка позиций, не Baidu/Naver-аудит. У результата поиска могут быть устаревшие фрагменты. Для TR получена слабая релевантность: журналы пилотов и live tracking преобладают в просмотренной выборке. Это **не означает отсутствие спроса**. Для HI найден прямой продуктовый текст, но преимущественно смешанная Hindi/English лексика; его существование тоже не доказывает массовый спрос.

Лучшее обещание продукта сейчас: **«Добавьте прошлые перелёты, получите свою карту и сохраните картинку — бесплатно, без регистрации»**. Ручной ввод двух аэропортов соответствует этому намерению. «Отследить самолёт», «найти старый билет», «автоматически восстановить все перелёты» — другие задачи, которых этот инструмент не решает.

### Честные границы продукта

- Интерфейс функции сейчас русский. Другие локали сайта существуют, но 11 иностранных `/flight-map` ещё не являются готовым продуктом.
- Пользователь вводит аэропорты; дата и номер рейса необязательны. Номер не означает автоматическое восстановление рейса из архива авиакомпании.
- История сохраняется в этом браузере на этом устройстве. Обновление страницы её не стирает; очистка данных браузера может стереть. Нет обещания облачной синхронизации.
- JSON-резервная копия переносит историю между устройствами. Не обещаем произвольный CSV, импорт из Flighty, почты или посадочных талонов.
- Карта показывает соединения аэропортов. Расстояние приближённое геодезическое, не записанный трек самолёта.
- Страны определяются по аэропортам в добавленных перелётах. Пересадка не доказывает посещение страны за пределами аэропорта.
- PNG создаётся локально; системная отправка зависит от браузера и установленных приложений. Нельзя обещать гарантированное прямое размещение в Instagram Stories.
- Поделиться ссылкой на инструмент ≠ опубликовать личную интерактивную карту. Личные записи не кладём в URL, JSON-LD или поисковый текст.

## Таблица семантики

Первый запрос в каждой строке — основной кандидат для страницы инструмента. Остальные — варианты для текста, FAQ и будущих измерений, **не для одновременного перечисления в title**. В графе «наблюдение» подтверждён тип намерения, а не точная частотность каждой фразы.

| Язык | 4 естественных запроса-кандидата | Наблюдение и первичный источник | Что исключать / уточнять |
|---|---|---|---|
| ru | карта моих перелётов; история перелётов на карте; дневник перелётов; карта перелётов без регистрации | [Bordy](https://apps.apple.com/ru/app/дневник-полётов-bordy/id6759792585) прямо описывает личную историю, карту и статистику; [Mara](https://apps.apple.com/ru/app/mara-карта-путешествий/id1625159306) — историю путешествий и коллекцию флагов. | «Карта полётов онлайн» часто live radar; «история рейса» — архив конкретного борта; «карта путешествий» шире авиации. |
| en | personal flight map; map my past flights; flight history map; free flight log for travelers | [FlightMemory](https://www.flightmemory.com/) — личные перелёты и карты маршрутов; [AirJourneys](https://www.airjourneys.app/index.html) — записи путешественника, карта и статистика. | Flight tracker — часто live; pilot logbook — лицензируемый журнал пилота; flight planner — будущие маршруты. |
| de | persönliche Flugkarte; eigene Flüge auf Karte eintragen; Flugstatistik erstellen; Flugtagebuch für Reisende | [LogMy.World](https://flights.logmy.world/de/) использует Flug-Logbuch и Flugstatistik для личных записей; [FlugStatistik](https://flightmemory.de/) предлагает собственную карту и статистику пассажиру. | Flugbuch может означать журнал пилота; Flugstatistik без persönlich — также статистику отрасли/аэропорта. |
| fr | carte de mes vols; historique de mes vols sur une carte; journal de vols pour voyageurs; créer une carte de mes voyages en avion | [FlightLog FR](https://flightlog.live/fr/about) описывает журнал пассажира и карту истории; [My Flight List](https://play.google.com/store/apps/details?hl=fr&id=com.ffsoft.myflights) — записанные путешествия и статистику. | Carnet de vol сам по себе — также официальный журнал пилота; suivi de vol — live/status. |
| es | mapa de mis vuelos; historial de vuelos personales; diario de vuelos para viajeros; crear mapa de vuelos realizados | [routebook ES](https://www.routebook.io/es) — личный дневник, история и карта; [YourFlights ES](https://apps.apple.com/es/app/yourflights-flight-tracker/id1212158909) — личные перелёты на глобусе. | Rastreador de vuelos — live; mapa de rutas aéreas — сеть авиакомпаний; historial de precios — билеты. |
| it | mappa dei miei voli; storico dei miei voli; diario dei voli per viaggiatori; creare una mappa dei voli effettuati | [routebook IT](https://www.routebook.io/it) — личный дневник и изображение карты для публикации. | Diario di bordo / registro di volo — также журнал пилота; statistiche di volo — пунктуальность отрасли. |
| tr | uçuşlarımın haritası; geçmiş uçuşlarımı kaydetme; yolcular için uçuş günlüğü; kişisel uçuş haritası oluşturma | В проверенной выдаче преобладают другие намерения. [DHMİ](https://www.dhmi.gov.tr/Sayfalar/Haber/ucus-rehberim-uygulamasi-yenilendi.aspx) описывает именно live tracking; [Air Navigation TR](https://www.airnavigation.aero/tr/anp.html) — пилотскую навигацию/журнал. Прямой сильный пассажирский TR-аналог в этой выборке не подтверждён. | Uçuş takibi — live; uçuş günlüğü — пилот/дрон; обязательно пояснение «yaptığınız yolculuklar». Кандидаты требуют проверки носителем и локального замера. |
| zh | 我的飞行地图; 个人飞行记录; 飞行足迹地图; 手动记录飞行经历 | [Apple о 航旅纵横](https://apps.apple.com/us/story/id1468832853) описывает карту собственных маршрутов и историю; [FlightMemory CN](https://my.flightmemory.com/app/cn) использует 我的飞行记录. | 航班查询 — сведения/статус; 飞行轨迹 — может обещать реальный GPS/ADS-B трек; 历史航班查询 — архив рейсов. |
| ja | 搭乗記録 マップ; 自分のフライトマップ; フライト履歴 地図; 搭乗記録 無料 | [フライト記録](https://play.google.com/store/apps/details?hl=ja&id=com.iorikirihara.flight_log_book_record_app) — именно воспоминания пассажира и карта; [Flightログ](https://apps.apple.com/jp/app/flightログ/id6761354682) — журнал и изображения для публикации. | 飛行記録 — может означать пилота; フライト追跡 — live. 搭乗記録 точнее пассажирского опыта. |
| ko | 내 비행 지도; 탑승 기록 지도; 나의 비행 기록; 비행 기록 앱 무료 | [SkyLog](https://apps.apple.com/kr/app/skylog-비행-기록/id6788016400) — путешествия и личный журнал; [FlightLog KO](https://apps.apple.com/kr/app/flightlog-내-비행-일지/id6756842867) — история, карты и карточки для публикации. | 비행 기록 может относиться к DJI/дрону; 항공편 추적 — tracking. Уточнять 탑승한 항공편. |
| ar | خريطة رحلاتي الجوية; سجل رحلاتي الجوية السابقة; إنشاء خريطة للرحلات الجوية; تسجيل رحلاتي الجوية مجانًا | [FlightVault AR](https://play.google.com/store/apps/details?hl=ar&id=ee.koodr.flightlog) — журнал путешественника и мировая карта; [FlightLog AR FAQ](https://flightlog.live/ar/faq) — личная история и карта. | تتبع الرحلات — live; سجل الرحلات без личного контекста — архив авиакомпании; حجز — бронирование. |
| hi | मेरी हवाई यात्राओं का नक्शा; अपनी पिछली फ़्लाइट का रिकॉर्ड; फ़्लाइट हिस्ट्री मैप; हवाई यात्राओं की डायरी | [MyFlight.Life HI](https://myflight.life/in) использует फ़्लाइट, रिकॉर्ड, रूट हिस्ट्री, मैप для личной истории; страница прочитана, не только сниппет. | फ़्लाइट ट्रैकर — live; टिकट बुकिंग — билеты. Сравнить Hindi и English запросы для Индии, не предполагать, что весь спрос Hindi. |

### Какие запросы реально проверены

Контрольные запросы для воспроизведения (не все сгенерированные выше long-tail проверены по отдельности):

- RU: `личная карта перелетов история перелетов приложение`; `"карта перелётов" приложение`; `"карта перелетов" "история"`; `site:apps.apple.com/ru "перелётов" "карта" "история"`.
- EN: `personal flight history map logbook`; `"flight history map" "personal"`.
- DE: `Flugstatistik persönliche Flugkarte Flüge erfassen`; `"Flugstatistik" "Flüge" myFlightradar24`.
- FR: `carte vols effectués carnet de vols personnel`; `carte vols effectués historique vols application passager`.
- ES: `"mapa de mis vuelos"`; `mapa vuelos realizados historial vuelos personal`; `"historial de vuelos" "mapa" aplicación personal`.
- IT: `mappa voli effettuati diario voli personale`.
- TR: `uçuş geçmişim haritası uçuş günlüğü`; `"kişisel uçuş" "harita"`; `site:apps.apple.com/tr "uçuş" "günlüğü" "harita"`.
- ZH: `个人飞行记录 地图 航旅纵横`.
- JA: `搭乗記録 フライトマップ アプリ`.
- KO: `내 비행 기록 지도 앱`.
- AR: `خريطة رحلاتي الجوية سجل الرحلات`.
- HI: `अपनी हवाई यात्राओं का रिकॉर्ड नक्शा ऐप`.

Точные цитируемые фразы в кавычках иногда давали нерелевантные результаты; это отмечает ограничение выборки, не «нулевой спрос». Открытие предполагаемых `/tr` у routebook и `/ru` у MyFlight.Life инструментом не удалось: они не используются как подтверждение локалей.

## Редакционный пакет на 12 языках

**Это предложения, не опубликованные страницы.** Иностранные title/description/H1 ниже допустимы только вместе с полноценным переводом интерфейса, ошибок, помощи, экспорта, резервного копирования и проверкой RTL для AR. Если нужен временный иностранный вводный текст со ссылкой на RU, в нём явно написать язык инструмента; не создавать 11 одинаковых дверных страниц для поисковиков.

В title можно добавить ` | AirportsBoard`, если итог остаётся читаемым. Точного универсального лимита символов для сниппета нет; приоритет — начало с намерением, затем полезное отличие. Две основные пары FAQ для каждой локали даны ниже; общие вопросы о расстоянии, странах и отправке следует переводить по тем же фактам, а не дополнять функциями конкурентов.

### ru

- **Title:** Карта моих перелётов — бесплатно, без регистрации
- **H1:** Мои перелёты на карте
- **Description:** Добавьте прошлые перелёты, сохраните историю в браузере и скачайте карту в PNG. Дата и номер необязательны. Резервная копия в JSON.
- **FAQ:** Как добавить перелёт без даты и номера? — Выберите аэропорты вылета и прилёта. Дату и номер можно оставить пустыми.
- **FAQ:** Где хранится история перелётов? — В этом браузере на этом устройстве. Для переноса скачайте резервную копию JSON и восстановите её на другом устройстве. Очистка данных браузера может удалить историю.
- **Дополнительные ответы RU:** «Можно ли отследить самолёт?» — Этот инструмент показывает добавленные вами перелёты, а не текущее положение самолёта. «Почему расстояние приблизительное?» — Оно рассчитано между аэропортами по кратчайшей линии по поверхности Земли и может отличаться от фактического пути самолёта. «Что означают флаги?» — Это страны аэропортов ваших перелётов; пересадка тоже может добавить страну. «Как поделиться в соцсетях?» — Сохраните PNG или откройте системное меню отправки. Доступные приложения зависят от телефона и браузера. Ссылка на инструмент не содержит вашу историю.

### en

- **Title:** Personal flight map — free, no account needed
- **H1:** My flights on a map
- **Description:** Add past flights, keep your history in this browser and export your map as a PNG. Dates and flight numbers are optional. Back up your flights as JSON.
- **FAQ:** Can I add a flight without a date or flight number? — Yes. Choose the departure and arrival airports; both the date and flight number are optional.
- **FAQ:** Where is my flight history saved? — In this browser on this device. Download a JSON backup and restore it on another device to move your history. Clearing browser data can delete it.

### de

- **Title:** Persönliche Flugkarte — kostenlos, ohne Anmeldung
- **H1:** Meine Flüge auf einer Karte
- **Description:** Trage vergangene Flüge ein, speichere sie in diesem Browser und lade deine Karte als PNG herunter. Datum und Flugnummer sind optional. Sicherung als JSON.
- **FAQ:** Kann ich einen Flug ohne Datum und Flugnummer hinzufügen? — Ja. Wähle den Abflug- und den Ankunftsflughafen. Datum und Flugnummer kannst du leer lassen.
- **FAQ:** Wo werden meine Flüge gespeichert? — In diesem Browser auf diesem Gerät. Lade eine JSON-Sicherung herunter und stelle sie auf einem anderen Gerät wieder her. Beim Löschen der Browserdaten kann die Flugliste verloren gehen.

### fr

- **Title:** Carte de mes vols — gratuite, sans inscription
- **H1:** Mes vols sur une carte
- **Description:** Ajoutez vos vols passés, gardez votre historique dans ce navigateur et exportez la carte en PNG. Date et numéro facultatifs. Sauvegarde JSON disponible.
- **FAQ:** Puis-je ajouter un vol sans date ni numéro ? — Oui. Choisissez les aéroports de départ et d’arrivée. La date et le numéro de vol sont facultatifs.
- **FAQ:** Où mon historique de vols est-il enregistré ? — Dans ce navigateur, sur cet appareil. Téléchargez une sauvegarde JSON pour la restaurer sur un autre appareil. Effacer les données du navigateur peut supprimer votre historique.

### es

- **Title:** Mapa de mis vuelos — gratis y sin registro
- **H1:** Mis vuelos en el mapa
- **Description:** Añade vuelos anteriores, guarda tu historial en este navegador y descarga el mapa en PNG. Fecha y número opcionales. Copia de seguridad en JSON.
- **FAQ:** ¿Puedo añadir un vuelo sin fecha ni número? — Sí. Elige los aeropuertos de salida y llegada. La fecha y el número de vuelo son opcionales.
- **FAQ:** ¿Dónde se guarda mi historial? — En este navegador y en este dispositivo. Descarga una copia JSON y restáurala en otro dispositivo para trasladarlo. Borrar los datos del navegador puede eliminar el historial.

### it

- **Title:** Mappa dei miei voli — gratis, senza registrazione
- **H1:** I miei voli sulla mappa
- **Description:** Aggiungi i voli passati, conserva lo storico in questo browser e scarica la mappa in PNG. Data e numero sono facoltativi. Backup in formato JSON.
- **FAQ:** Posso aggiungere un volo senza data o numero? — Sì. Scegli gli aeroporti di partenza e arrivo. Puoi lasciare vuoti la data e il numero del volo.
- **FAQ:** Dove viene salvato lo storico? — In questo browser, su questo dispositivo. Scarica un backup JSON e ripristinalo su un altro dispositivo per trasferirlo. Cancellare i dati del browser può eliminare lo storico.

### tr

- **Title:** Kişisel uçuş haritası — ücretsiz, üyelik gerektirmez
- **H1:** Uçuşlarım haritada
- **Description:** Geçmiş uçuşlarınızı ekleyin, bu tarayıcıda saklayın ve haritanızı PNG olarak indirin. Tarih ve uçuş numarası isteğe bağlıdır. JSON yedekleme sunulur.
- **FAQ:** Tarih ve uçuş numarası olmadan uçuş ekleyebilir miyim? — Evet. Kalkış ve varış havalimanlarını seçin. Tarihi ve uçuş numarasını boş bırakabilirsiniz.
- **FAQ:** Uçuş geçmişim nerede saklanır? — Bu cihazdaki bu tarayıcıda. Başka bir cihaza taşımak için JSON yedeğini indirip orada geri yükleyin. Tarayıcı verilerini silmek uçuş geçmişinizi silebilir.

### zh（简体中文）

- **Title:** 我的飞行地图 — 免费，无需注册
- **H1:** 在地图上记录我的飞行
- **Description:** 手动添加过去的航班，在当前浏览器中保存飞行记录，并导出 PNG 地图。日期和航班号可不填，支持 JSON 备份与恢复。
- **FAQ:** 不记得日期和航班号，还能添加飞行记录吗？— 可以。选择出发和到达机场即可，日期和航班号都可留空。
- **FAQ:** 飞行记录保存在哪里？— 记录保存在当前设备的当前浏览器中。换设备时，可下载 JSON 备份并在另一台设备上恢复。清除浏览器数据可能会删除记录。

### ja

- **Title:** 自分のフライトマップ — 無料・登録不要
- **H1:** 搭乗記録を地図に
- **Description:** 過去に搭乗したフライトを手入力し、このブラウザーに保存。地図をPNG画像で書き出せます。日付・便名は任意。JSONでバックアップ・復元できます。
- **FAQ:** 日付や便名がわからなくても追加できますか？ — はい。出発空港と到着空港を選ぶだけで追加できます。日付と便名は空欄でも構いません。
- **FAQ:** 搭乗記録はどこに保存されますか？ — この端末のこのブラウザーに保存されます。別の端末へ移すには、JSONバックアップをダウンロードして復元してください。ブラウザーのデータを消去すると、記録が失われる場合があります。

### ko

- **Title:** 나만의 비행 지도 — 무료, 가입 없이
- **H1:** 내 탑승 기록을 지도에
- **Description:** 지난 항공편을 직접 추가하고 이 브라우저에 저장하세요. 지도를 PNG로 내보내고 JSON으로 백업·복원할 수 있습니다. 날짜와 편명은 선택 사항입니다.
- **FAQ:** 날짜나 편명을 몰라도 추가할 수 있나요? — 네. 출발 공항과 도착 공항을 선택하면 됩니다. 날짜와 편명은 비워 둘 수 있습니다.
- **FAQ:** 탑승 기록은 어디에 저장되나요? — 이 기기의 이 브라우저에 저장됩니다. 다른 기기로 옮기려면 JSON 백업을 내려받아 복원하세요. 브라우저 데이터를 지우면 기록이 삭제될 수 있습니다.

### ar

- **Title:** خريطة رحلاتي الجوية — مجانًا وبدون حساب
- **H1:** رحلاتي الجوية على الخريطة
- **Description:** أضف رحلاتك السابقة يدويًا واحفظها في هذا المتصفح. نزّل الخريطة بصيغة PNG ونسخة احتياطية بصيغة JSON. التاريخ ورقم الرحلة اختياريان.
- **FAQ:** هل يمكن إضافة رحلة دون تاريخ أو رقم رحلة؟ — نعم. اختر مطار المغادرة ومطار الوصول. يمكنك ترك التاريخ ورقم الرحلة فارغين.
- **FAQ:** أين يُحفظ سجل رحلاتي؟ — في هذا المتصفح على هذا الجهاز. لنقله إلى جهاز آخر، نزّل نسخة احتياطية بصيغة JSON واستعدها هناك. قد يؤدي مسح بيانات المتصفح إلى حذف السجل.

### hi

- **Title:** मेरी फ़्लाइट का नक्शा — मुफ़्त, बिना खाते के
- **H1:** मेरी हवाई यात्राएँ नक्शे पर
- **Description:** अपनी पिछली फ़्लाइट जोड़ें और रिकॉर्ड इसी ब्राउज़र में रखें। नक्शा PNG में डाउनलोड करें और JSON बैकअप बनाएँ। तारीख़ और फ़्लाइट नंबर देना ज़रूरी नहीं है।
- **FAQ:** क्या तारीख़ या फ़्लाइट नंबर के बिना यात्रा जोड़ सकते हैं? — हाँ। बस प्रस्थान और आगमन के एयरपोर्ट चुनें। तारीख़ और फ़्लाइट नंबर खाली छोड़ सकते हैं।
- **FAQ:** मेरी यात्राओं का रिकॉर्ड कहाँ रहता है? — इसी डिवाइस के इसी ब्राउज़र में। दूसरे डिवाइस पर ले जाने के लिए JSON बैकअप डाउनलोड करके वहाँ बहाल करें। ब्राउज़र का डेटा मिटाने से रिकॉर्ड भी मिट सकता है।

## SEO / GEO / AEO: порядок внедрения

1. **Сейчас: одна сильная русская страница инструмента.** Однозначные title/H1, видимое короткое объяснение ручного добавления, пример с явной подписью «Пример», компактные доступные FAQ. Не называть её radar/tracker и не создавать отдельные почти одинаковые страницы «карта/дневник/история/статистика».
2. **Текст и помощь в SSR.** Не загружать FAQ только после открытия аккордеона через сеть. Текст должен быть в HTML; `<details>` — нормальная пользовательская структура, не невидимый SEO-текст. [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [spam policies](https://developers.google.com/search/docs/essentials/spam-policies).
3. **Международный выпуск — после полноценного перевода функции.** Для готовых языков self-canonical и взаимные HTML `hreflang`, индексируемый HTTP 200, sitemap только реальных страниц. Не выдавать русский инструмент за 11 переводов. [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions). **Актуальная справка Яндекса прямо говорит, что alternate языков в Sitemap больше не поддерживаются; нужны `link rel="alternate" hreflang` в HTML head.** [Яндекс](https://yandex.ru/support/webmaster/ru/yandex-indexing/locale-pages.html).
4. **Приоритет локализации — гипотеза, не рейтинг спроса:** RU улучшать немедленно; EN следующая по широте найденной категории; DE/FR/ES/JA/KO/ZH имеют ясные локальные формулировки; IT/AR также подтверждены продуктовыми страницами; TR/HI требуют больше местных данных. Не ранжировать рынки по населению или числу результатов.
5. **GEO/AEO — прямые проверяемые ответы.** Сущность «бесплатный браузерный дневник перелётов», функции, способ хранения, форматы, границы точности и ограничения отправки. Не обещать гарантированные цитаты ИИ, не добавлять вымышленные отзывы/рейтинги. Google не требует специальной AI-schema или иных особых оптимизаций; действуют обычные требования доступности/индекса/сниппета и полезности. [Google AI features](https://developers.google.com/search/docs/appearance/ai-features).
6. **Schema:** `WebApplication` может описать настоящий инструмент; `inLanguage` только фактический язык интерфейса, бесплатная цена только реальная, `featureList` без планов. Это не гарантирует app rich result: для такого результата Google требует реальный rating/review наряду с остальными полями. Не придумывать оценки. [Google SoftwareApplication](https://developers.google.com/search/docs/appearance/structured-data/software-app). Видимые FAQ полезны сами по себе; не обещаем расширенный FAQ-сниппет.
7. **Приватность и sharing.** Публичные метаданные описывают сервис и демонстрационный пример, не маршрут человека. Экспортируемые личные PNG не публикуются на сервер автоматически. Статический OG-пример должен явно быть примером, не чужой «личной картой».
8. **Внутренние ссылки:** существующая вкладка «Перелёты» плюс естественная ссылка из относящейся к функции помощи. Массовые повторяющиеся SEO-ссылки из каждой строки табло не нужны. Не добавлять тяжёлую карту/каталог аэропортов в JS главной и табло ради ссылки.

## Что измерить следующим шагом

- **Wordstat:** RU запросы карты/истории/дневника с вариантами `е/ё`, мобильными устройствами, РФ и другими русскоязычными регионами. Сохранять период, регион, режим сопоставления и дату; отдельно исключить live/билеты/карты авиакомпаний. Не смешивать широкую частотность с точной.
- **Keyword Planner:** 12 языков, страны отдельно (EN ≠ США; ES ≠ Испания; AR ≠ одна страна; HI ≠ все жители Индии), тот же период. Если даёт диапазоны — сохранить диапазоны, а не середину как точное число. Отдельно сравнить English и Hindi для Индии.
- **GSC / Яндекс Вебмастер:** после появления данных по `/ru/flight-map` смотреть запрос × страница × страна × мобильное устройство, бренд/небренд, показы/клики/CTR/позицию. Странице только что дали новый URL, поэтому день-два — не доказательство спроса или его отсутствия. Сравнить полные 28-дневные окна при достаточных показах.
- **Воронка продукта:** поисковый визит → первый сохранённый перелёт → открытие экспорта → готовый PNG → попытка системной отправки / скачивание. Успех Web Share не доказывает публикацию в соцсети. Не отправлять номера рейсов, маршруты, даты, содержимое JSON в аналитику.
- **Быстродействие:** первый возможный ввод и время до подсказок аэропорта, первый сохранённый перелёт, готовность PNG; p75/p95 по мобильному браузеру и версии выката. Не объявлять Node benchmark на Mac производительностью слабого Android.
- **AI-видимость:** фиксированный набор естественных вопросов на готовых языках, дата/модель/ссылка-цитата. Ответ без ссылки не считать переходом. Нулевые цитаты не лечить невидимым текстом или «инструкциями для ИИ».

Итог: можно улучшить релевантность и понятность русской функции уже сейчас. Рост на остальных 11 языках требует перевода самого продукта и измерения локального спроса; одних переведённых метатегов недостаточно. В этом исследовании частотность, прогноз трафика и рост CTR **не установлены**.

## Дополнение: измерение в Яндекс Wordstat владельцем сессии

28.10.2026 в авторизованном Wordstat, все регионы, десктопы + смартфоны + планшеты, режим «Популярные», запросы без операторов. Значения ниже — **заголовок «Общее число запросов»**, не точная фразовая частотность и не потенциальные посетители инструмента.

| Запрос | Число в заголовке | Показанный период | Ограничение |
|---|---:|---|---|
| карта перелетов | 5 513 | 08.09–07.10.2026 | Live tracking, птицы, БПЛА, улица Перелёта; строка таблицы отдельно 5 462 |
| карта моих перелетов | 14 | 27.09–27.10.2026 | Заголовок есть, таблица «Нет подходящих запросов»; данные неполны |
| история перелетов | 870 | 08.09–07.10.2026 | В таблице виден запрос про Аэрофлот Бонус; не равно интересу к ручному журналу |
| карта путешествий | 84 452 | 08.09–07.10.2026 | Большая доля школьных заданий, банковских/сим-карт; не наш рынок целиком |
| карта посещенных стран | 1 046 | 08.09–07.10.2026 | Смежный инструмент; наша карта учитывает аэропорты, включая пересадки |

В составе «карта путешествий» строки «создать карту путешествий» —681, «как сделать карту путешествий» —274. Это широкие включения за показанный период, их нельзя складывать с родительским запросом.

Источник: [Яндекс Wordstat](https://wordstat.yandex.ru/), запросы по таблице. В момент проверки сервис показывал предупреждение о временной недоступности части данных; периоды отличаются. Поэтому из этой выборки нельзя выводить рост/падение, точную ёмкость или сравнивать языки. Снимки AX сохранены локально в outputs/flight-map-ux-demand-20261028/wordstat-*.txt. Иностранная частотность по-прежнему не измерена.

Решение: title сохраняет «Карта моих перелётов», описание уточняет прошлые поездки/бесплатно/без регистрации. Не подменять продукт обещанием карты всех посещённых стран и не гнаться за широкими 84 тысячами. FAQ объясняет ручной ввод без даты, перенос, приватность, экспорт и отличие от live tracking. В HTML и JSON-LD единый источник ответов. Нерусские страницы не индексировать до полноценного перевода инструмента.
