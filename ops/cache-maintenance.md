# Ограничение кэша Next.js

Причина инцидента 23.10.2026: runtime ISR в `server/route-cache` вырос до 35 ГБ;
вместе с резервной сборкой это заполнило диск во время следующего build.
Next закреплён на 15.5.28 — размещение runtime-кэша проверено на этой версии.
При обновлении Next повторить тест удаления и восстановления страниц.

`npm run build` теперь берёт Linux flock, очищает runtime-кэш и проверяет,
что на файловой системе проекта свободно хотя бы 8 ГБ. Только затем запускает
прежнюю цепочку сборки и swap. Недостаток места не повреждает live/rollback.

Таймер раз в минуту запускает `npm run maintain:cache`:
- live: при превышении 4 ГБ удаляет самые давно записанные ответы до 3 ГБ;
- rollback: удаляет воспроизводимые runtime-ответы;
- записи моложе 10 минут и изменившиеся во время обхода пропускаются;
- удаляет пустые каталоги, не следует по символическим ссылкам;
- `server/app`, static/chunks, данные рейсов и архив не очищает.

Это периодическое ограничение, не файловая квота: между тиками и при большом
объёме свежих записей размер может временно превышать 4 ГБ. Сборка имеет отдельную
проверку места. Рост других файлов на сервере требует отдельной диагностики.
Таймер не конкурирует со сборкой: общий flock расположен вне git clean.
Код 75 означает занятый замок; другие ошибки видны как failed в systemd.

Установка на существующий сервер (после выката файлов):

```sh
install -m 644 ops/airportsboard-cache.service /etc/systemd/system/
install -m 644 ops/airportsboard-cache.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now airportsboard-cache.timer
systemctl start airportsboard-cache.service
systemctl status airportsboard-cache.timer
journalctl -u airportsboard-cache.service -n 10
```

Локальная проверка: `node scripts/check-cache-maintenance.mjs`, затем fixture
build/start с пустым AIRLABS_API_KEY. Проверить главную, страну, sitemap и табло;
остановить локальный сервер, очистить runtime-кэш и повторить после запуска
(так исключается случайное попадание в память предыдущего процесса).
