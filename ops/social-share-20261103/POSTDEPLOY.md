# Выкат панели шейринга и исправлений аудита — 03.11.2026

Опубликован **ef48386fde201ce201530bb487917b13620f3470**. Пуш в main в **13:36:11 Europe/Amsterdam**, вне окон :00–:05 и :30–:35. До push origin/main=31cd0f14, ahead7/behind0, tracked tree чистое. В пакет вошли социальная панель, реальные прозрачные логотипы, наборы по текущему языку и пять исправлений аудита. Новых продуктовых изменений во время выката не делалось.

GitHub Actions **41637117520 — completed/success**, завершён 12:39:09 UTC:
https://github.com/Itschazy/airportboards/actions/runs/41637117520

Production checkout HEAD совпадает; health.release=ef48386fde20; BUILD_ID **By4MqQYuA1N1plbzk5ybx**. Три pm2 процесса online: PID720069/720053/720080, restart96 (на один штатный выкат больше прежнего95). Повтор на uptime132–134сек: те же PID и счётчики, дополнительных рестартов нет. Свободно58ГБ. Во время сборки старые процессы продолжали отвечать; непрерывный мониторинг всех запросов не проводился.

## Перед выкатом

Свежие fetch/status/log и сравнение с main; повторно 169/169 тестов, TypeScript, runtime/exporter --check, ICU/client-messages, ключи12локалей, diff --check — PASS. Изменений кода относительно уже проверенной fixture build2473страницы и мобильного аудита не было, поэтому их результаты применимы к опубликованному пакету. Новый физический мобильный замер не заявляется.

## После выката — все команды exit0

- `node scripts/check-index.mjs` —20/20.
- `node scripts/check-sitemap-hreflang.mjs https://airportsboard.live` — PASS, взаимность/x-default/сжатие.
- `node scripts/check-live-refresh.mjs` — PASS; это проверка исходников и audit-bot наблюдений, а не покупка свежести реальным человеком. В снимке5из6топ-аэропортов младше10мин, BJV39мин; платных API не вызывали.
- `node scripts/check-adsense.mjs` — PASS, выключенный рекламный код соответствует репозиторию.
- `node scripts/check-flight-map.mjs https://airportsboard.live` — PASS:12языков, SSR/SEO, словари/ресурсы,4соседние страницы, RSC/prefetch.
- `node scripts/check-flight-map-help.mjs https://airportsboard.live` — PASS:12языков, текущие FAQ/metadata/schema,12URLвsitemap.
- `node ops/social-share-20261103/check-deployed-assets.mjs` — PASS: все12страниц получили актуальный runtime с отпечатком URL и новый текст ошибки; SHA256 runtime/exporter/history/storage и8прозрачных логотипов совпадает с локальными файлами.

Все обращения к production только audit-bot. Браузер на production не открывался. Платные `/api/flights/*`, `/api/cron/warm`, DNS, настройки аккаунтов и пользовательские данные не менялись. Логи/JSON: outputs/social-share-20261103/deploy в папке чата.

## Ограничения сохранены

Внешний шейринг использует общее меню ОС, без обещания автоматического выбора приложения. Доставка PNG в физические приложения на iOS/Android не проверена. Риск конкурентной записи без Web Locks, большие SVG/плотные подписи и строгий backup-import после смены пояса остаются из аудита; выкат не означает их исправление. Полный список ops/flight-map-full-audit-20261103/REPORT.md. Следующий приоритет — транзакционный fallback, затем большие карты и физическая матрица.

Документация post-deploy сохраняется локальным коммитом поверх опубликованного ef48386f, без второго push ради отчёта.
