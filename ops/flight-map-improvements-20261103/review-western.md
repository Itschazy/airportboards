# Независимая рецензия EN / DE / ES / IT — 03.11.2026

Рецензент: агент map_export, отдельно от автора локализации. Прочитаны целиком enhancement-каталоги (40 ключей × 4) и help-страницы (все заголовки, описания и 8 абзацев × 4), сверены с русскими оригиналами. Это агентская рецензия, не выдаётся за ответ chatgpt.com или проверку носителем языка.

Проверены: optional дата/номер; YYYY и YYYY-MM-DD; каждый участок отдельным рейсом; CSV from/to/date/number; 5000 записей и 2 МБ; явный выбор возможных повторов; отмена последней партии с сохранением отредактированных записей; отсутствие автоматического облачного переноса; приватность ссылки; форматы PNG и системный share. Числа, условия, параметры и возможности не перевёрнуты.

DE: основной UI уже использует du/Verlauf, при этом старые m009/m010 сохраняют Sie. Новый пакет унифицирован с большинством действий; необходимость исправить две старые строки передана родителю/локализатору.

## Изменения

### en: 1 полей

- `help/en.json:sections.1.paragraphs.1`
  - Было: Review the preview before adding flights, fix any errors and decide whether to include possible duplicates. They are not removed automatically. Fields that will not be saved are listed separately. The limit is 5000 flights and 2 MB. You can undo the entire import as long as your history has not changed since it.
  - Стало: Review the preview before adding flights, fix any errors and decide whether to include possible duplicates. They are not removed automatically. Fields that will not be saved are listed separately. The limit is 5000 flights and 2 MB. You can undo the entire import as long as your history has not changed since the import.
  - Причина: Ненативное since it заменено явной отсылкой since the import; условие отмены осталось прежним.

### de: 18 полей

- `enhancements/de.json:xImportHint`
  - Было: Fügen Sie pro Zeile eine Route ein, etwa SVX–IST–CDG, oder wählen Sie eine CSV-Datei. Jede Teilstrecke wird als eigener Flug erfasst.
  - Стало: Füge pro Zeile eine Route ein, etwa SVX–IST–CDG, oder wähle eine CSV-Datei. Jede Teilstrecke wird als eigener Flug erfasst.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xImportErrors`
  - Было: Korrigieren Sie die fehlerhaften Zeilen, bevor Sie die Flüge hinzufügen.
  - Стало: Korrigiere die fehlerhaften Zeilen, bevor du die Flüge hinzufügst.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xInvalidRoute`
  - Было: Geben Sie unterschiedliche Flughäfen mit ihren IATA-Codes an.
  - Стало: Gib unterschiedliche Flughäfen mit ihren IATA-Codes an.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xInvalidDate`
  - Было: Prüfen Sie das Datum: Jahr oder YYYY-MM-DD, spätestens heute.
  - Стало: Prüfe das Datum: Jahr oder YYYY-MM-DD, nicht später als heute.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xAmbiguousDate`
  - Было: Mehrdeutiges Datum. Verwenden Sie YYYY-MM-DD.
  - Стало: Mehrdeutiges Datum. Verwende YYYY-MM-DD.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xInvalidCSV`
  - Было: Die CSV-Datei konnte nicht gelesen werden. Prüfen Sie die Spaltenüberschriften und Anführungszeichen.
  - Стало: Die CSV-Datei konnte nicht gelesen werden. Prüfe die Spaltenüberschriften und Anführungszeichen.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xConfirmImport`
  - Было: Zur Historie hinzufügen
  - Стало: Zum Verlauf hinzufügen
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xUndoUnavailable`
  - Было: Ihre Historie wurde geändert. Der Import lässt sich nicht vollständig rückgängig machen.
  - Стало: Dein Verlauf wurde geändert. Der Import lässt sich nicht vollständig rückgängig machen.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `enhancements/de.json:xSearchHistory`
  - Было: Historie durchsuchen
  - Стало: Verlauf durchsuchen
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `help/de.json:intro`
  - Было: Sammeln Sie Ihre vergangenen Flüge, prüfen Sie die Einträge und speichern Sie eine Sicherung. Ihre Historie liegt im Browser. Diese Anleitung erklärt, wie Sie sie übertragen und eine Karte zum Teilen vorbereiten.
  - Стало: Sammle deine vergangenen Flüge, prüfe die Einträge und speichere eine Sicherung. Dein Verlauf liegt im Browser. Diese Anleitung erklärt, wie du ihn überträgst und eine Karte zum Teilen vorbereitest.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены.
- `help/de.json:sections.0.paragraphs.0`
  - Было: Sehen Sie in alten Tickets, Buchungs-E-Mails, Bordkarten und Fotos nach. Gleichen Sie diese mit Ihren tatsächlich geflogenen Strecken ab: Ein Ticket kann zu einer abgesagten Reise oder einer später geänderten Route gehören. Die Karte liest keine E-Mails und stellt Ihre Historie nicht automatisch wieder her.
  - Стало: Sieh in alten Tickets, Buchungs-E-Mails, Bordkarten und Fotos nach. Gleiche diese mit deinen tatsächlich geflogenen Strecken ab: Ein Ticket kann zu einer abgesagten Reise oder einer später geänderten Route gehören. Die Karte liest keine E-Mails und stellt deinen Verlauf nicht automatisch wieder her.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.
- `help/de.json:sections.0.paragraphs.1`
  - Было: Zum Hinzufügen wählen Sie Abflug- und Ankunftsflughafen. Datum und Flugnummer sind optional. Erinnern Sie sich nur an das Jahr, wählen Sie „Nur Jahr“. Wissen Sie auch das Jahr nicht mehr, lassen Sie den Eintrag ohne Datum. Erfinden Sie kein genaues Datum, nur um das Feld auszufüllen.
  - Стало: Zum Hinzufügen wählst du Abflug- und Ankunftsflughafen. Datum und Flugnummer sind optional. Erinnerst du dich nur an das Jahr, wähle „Nur Jahr“. Weißt du auch das Jahr nicht mehr, lasse den Eintrag ohne Datum. Erfinde kein genaues Datum, nur um das Feld auszufüllen.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.
- `help/de.json:sections.1.paragraphs.0`
  - Было: Fügen Sie pro Zeile eine Route ein, etwa SVX–IST–CDG. Daraus entstehen zwei Flüge: SVX–IST und IST–CDG. Alternativ wählen Sie eine CSV-Datei mit den Spaltenüberschriften from,to,date,number. Verwenden Sie in from und to die IATA-Codes der Flughäfen; Datum und Flugnummer können leer bleiben. Das Datumsformat ist YYYY oder YYYY-MM-DD, etwa 2024 oder 2024-07-18. Zukünftige Daten sind für die Historie vergangener Flüge nicht zulässig.
  - Стало: Füge pro Zeile eine Route ein, etwa SVX–IST–CDG. Daraus entstehen zwei Flüge: SVX–IST und IST–CDG. Alternativ wählst du eine CSV-Datei mit den Spaltenüberschriften from,to,date,number. Verwende in from und to die IATA-Codes der Flughäfen; Datum und Flugnummer können leer bleiben. Das Datumsformat ist YYYY oder YYYY-MM-DD, etwa 2024 oder 2024-07-18. Zukünftige Datumsangaben sind für die Historie vergangener Flüge nicht zulässig.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.
- `help/de.json:sections.1.paragraphs.1`
  - Было: Prüfen Sie vor dem Hinzufügen die Vorschau, korrigieren Sie Fehler und entscheiden Sie, ob mögliche Duplikate übernommen werden sollen. Sie werden nicht automatisch entfernt. Nicht gespeicherte Felder werden gesondert aufgeführt. Die Grenze liegt bei 5000 Flügen und 2 MB. Der gesamte Import lässt sich rückgängig machen, solange die Historie seitdem nicht geändert wurde.
  - Стало: Prüfe vor dem Hinzufügen die Vorschau, korrigiere Fehler und entscheide, ob mögliche Duplikate übernommen werden sollen. Sie werden nicht automatisch entfernt. Nicht gespeicherte Felder werden gesondert aufgeführt. Die Grenze liegt bei 5000 Flügen und 2 MB. Der gesamte Import lässt sich rückgängig machen, solange der Verlauf seitdem nicht geändert wurde.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.
- `help/de.json:sections.2.paragraphs.0`
  - Было: Flüge werden in diesem Browser gespeichert. Sie erscheinen nicht automatisch auf einem anderen Gerät. Beim Löschen der Websitedaten kann die Historie verloren gehen. Speichern Sie vor dem Löschen der Browserdaten oder einem Gerätewechsel ein JSON-Backup und stellen Sie es auf dem Zielgerät im Bereich zum Speichern und Sichern wieder her.
  - Стало: Flüge werden in diesem Browser gespeichert. Sie erscheinen nicht automatisch auf einem anderen Gerät. Beim Löschen der Websitedaten kann der Verlauf verloren gehen. Speichere vor dem Löschen der Browserdaten oder einem Gerätewechsel ein JSON-Backup und stelle es auf dem Zielgerät im Bereich zum Speichern und Sichern wieder her.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.
- `help/de.json:sections.2.paragraphs.1`
  - Было: JSON sichert die Flughistorie mit ihren Feldern. CSV dient dem Austausch der Angaben from,to,date,number und ersetzt keine vollständige JSON-Sicherung. Prüfen Sie die wiederhergestellte Historie, bevor Sie die ursprüngliche Sicherung löschen. Die Dateien können Daten und Flugnummern enthalten. Bewahren Sie sie getrennt von dem Bild auf, das Sie teilen möchten.
  - Стало: JSON sichert den Flugverlauf mit seinen Feldern. CSV dient dem Austausch der Angaben from,to,date,number und ersetzt keine vollständige JSON-Sicherung. Prüfe den wiederhergestellten Verlauf, bevor du die ursprüngliche Sicherung löschst. Die Dateien können Datumsangaben und Flugnummern enthalten. Bewahre sie getrennt von dem Bild auf, das du teilen möchtest.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.
- `help/de.json:sections.3.paragraphs.0`
  - Было: Wählen Sie die gesamte Historie, ein einzelnes Jahr oder einen Flug und erstellen Sie ein PNG. Verfügbar sind die Formate 9:16, 1:1 und 4:5. Prüfen Sie Routen und Beschriftungen in der Vorschau und blenden Sie Statistiken oder Flaggen bei Bedarf aus. Das Bild lässt sich auf dem Gerät speichern.
  - Стало: Wähle den gesamten Verlauf, ein einzelnes Jahr oder einen Flug und erstelle ein PNG. Verfügbar sind die Formate 9:16, 1:1 und 4:5. Prüfe Routen und Beschriftungen in der Vorschau und blende Statistiken oder Flaggen bei Bedarf aus. Das Bild lässt sich auf dem Gerät speichern.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.
- `help/de.json:sections.3.paragraphs.1`
  - Было: „Teilen“ öffnet das Teilen-Menü des Betriebssystems, sofern der Browser das Teilen von Dateien unterstützt. Die angebotenen Apps hängen vom Gerät ab. Das Öffnen des Menüs veröffentlicht noch nichts. Prüfen Sie Bild und Empfänger in der gewählten App. Ein Link zum Dienst allein übermittelt Ihre persönliche Flughistorie nicht.
  - Стало: „Teilen“ öffnet das Teilen-Menü des Betriebssystems, sofern der Browser das Teilen von Dateien unterstützt. Die angebotenen Apps hängen vom Gerät ab. Das Öffnen des Menüs veröffentlicht noch nichts. Prüfe Bild und Empfänger in der gewählten App. Ein Link zum Dienst allein übermittelt deinen persönlichen Flugverlauf nicht.
  - Причина: Единое обращение du и термин Verlauf, как в основных действиях существующей карты (m040/m056/m118/m143); смысл и условия не изменены. Datumsangaben уточняет даты вместо двусмысленного Daten там, где это требуется.

### es: 1 полей

- `help/es.json:description`
  - Было: Recupera tus vuelos pasados, añade rutas o archivos CSV, guarda una copia JSON y comparte tu mapa de vuelos. Sin registro.
  - Стало: Reconstruye tu historial de vuelos, añade rutas o archivos CSV, guarda una copia JSON y comparte tu mapa de vuelos. Sin registro.
  - Причина: Recupera tus vuelos могло читаться как восстановление билетов/рейсов. Уточнено, что пользователь воссоздаёт историю, без обещания автоматического восстановления.

### it: 1 полей

- `help/it.json:intro`
  - Было: Raccogli i voli passati, controlla le voci e conserva un backup. La cronologia è salvata nel browser: questa guida spiega come trasferirla e preparare una mappa da condividere.
  - Стало: Raccogli i dati dei voli passati, controlla le voci e conserva un backup. La cronologia è salvata nel browser: questa guida spiega come trasferirla e preparare una mappa da condividere.
  - Причина: Raccogli i voli — калька «собери перелёты». Уточнён естественный объект: данные перелётов; новых функций не добавлено.

## Проверки

Нужна итоговая сборка и мобильный проход родителя после встраивания UI. Изменения SEO не добавляют скрытых обещаний функций. Тексты импорта сверены по доступному контракту; точное поведение возможных повторов должен подтвердить интеграционный тест формы.

## Повторный проход после изменения контракта Undo

Автор локализации обновил xUndoUnavailable и последний фрагмент help.import во всех языках. Повторно прочитаны RU / EN / DE / ES / IT: теперь отмена удаляет только неизменённые записи последней партии, изменённые остаются. Все пять вариантов соответствуют поведению; прежняя редактура «since the import» в EN заменена новым описанием функции и не считается актуальным результатом. Исторические записи «было → стало» выше сохранены как журнал проверки.

## Дополнительная независимая рецензия FR и оригинала RU

FR: прочитаны все 40 enhancement-строк и вся help-страница против RU, включая обновлённую отмену. Проверены даты/коды/лимиты/форматы/приватность/неавтоматический перенос; подтверждённых смысловых, числовых и языковых ошибок не найдено, косметические правки ради активности не вносились. «Tronçon» уместно для участка путешествия, «doublons possibles» не обещает автоматического удаления, «2 Mo» корректно локализует MB. Обращение vous последовательно, отличие от дружеского немецкого du определяется языковым каталогом.

RU: понятны необязательная дата/номер, точность до года, каждый участок как отдельная запись, ручное подтверждение повторов. Help не обещает чтение почты/автоматический перенос/автоматическую публикацию в соцсетях; эти обещания не внесены. После уточнения Undo исходный текст соответствует безопасной отмене партии, не удаляющей последующие изменения.

## Экспорт, шов карты и устаревшая проверка сжатия

46 профильных тестов map-v10/export-v10/map/map-flags/i18n PASS. 6 PNG RU/AR/JA (все блоки / только карта), реальные SVG на ширине375px, растрированы через sharp и просмотрены. Это проверка изображения, не физический iPhone или нативное меню Safari.

При полном прогоне обнаружен прежний провал12 compact-data сравнений. Воспроизведён на чистом HEAD через git show и data: import без изменения чужих копий: d7187d2a перенёс подписи в v6 с дуг, а тест сравнивал их координаты с v2. Исправлен oracle: полный SVG одного и того же v6-рендерера на исходной и сжатой географии, дополнительно строгий fit и весь SVG v2 без текстовых узлов (земля/маршруты/точки). Сжатие и полная сохранность каталога остаются строгими. Итоговый прогон node --test tests/flight-map/*.test.mjs:152/152 PASS, лог /tmp/flight-map-all-v10-tests.log.

Аудит текущего UI-delta: lazy v10/exporter.js, размер portrait, checkboxes showStats/showFlags передаются в очередь; устаревшие PNG не выдаются для нового выбора; файлы готовятся до tap для Web Share; раскрытие превью сохраняет aspect ratio. Реальный мобильный браузерный проход остаётся за родителем.

## Защита временного нулевого размера карты

При ручном управлении DevTools ширина временно оказалась 1 px вместо320; это не доказательство бага обычного телефона320px. Но обнаружена реальная уязвимость: внутренний mapWrap в такой раскладке становится0px, fit(flights,0/height) сохраняет бесконечную высоту, body делит масштаб точек на0. Простой resizeBox уже испорченного box не восстанавливает Infinity.

Добавлен v10/viewport.js, оба canvas используют проверенный кадр. Нулевые/нечисловые размеры пропускаются; валидный zoom/центр сохраняется, испорченный/отсутствующийbox вычисляется заново при появлении размеров. ResizeObserver на контейнерах восстанавливает кадр также после hidden→visible без window.resize, отключается при abort. Координаты pointer тоже не рассчитываются по нулевому прямоугольнику. Geometry/defs-use не изменены.

Новый тест воспроизводит старый Infinity на реальном createMap с SVX→IST, IST→CDG, SVX→IST; проверяет последовательность размеров375/0/320/1/0/320, отсутствие Infinity/NaN в настоящемSVG, сохранение масштаба и центра после поворота, полноэкранные pointerнулевыхконтейнеров. viewport/UX/performance11/11 PASS. Пересборка runtime и браузерный повтор выполняются родителем.
