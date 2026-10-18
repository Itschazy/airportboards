# Российский вход airportsboard.live

Подготовка 19.10.2026 по согласованию владельца: 1380 ₽/месяц Timeweb +
$9.95/месяц ClouDNS. Дизайн и приложение не меняются. Переключать основной DNS
можно только после успешной проверки владельцем через T2 в Челябинске.

## Узлы

- Origin NL: `217.149.26.240`, Timeweb9367545. Единственный Next.js/flightStore/cron.
- Edge RU: `85.193.89.51`, Timeweb9369161, SPB-3, Ubuntu24.04, 1CPU/1GB/15GB.
- Тест: `ru-test.airportsboard.live`, A на RU, TTL300 в Timeweb.
- GeoDNS зона ClouDNS15463533: `gns21.cloudns.net` … `gns24.cloudns.net`.
  Default apex/www → NL; Russian Federation apex/www → RU; TTL300.
  MX/SPF/DMARC и ru-test перенесены. Trial до17.11.2026, пока без списаний.
- Основная делегация по-прежнему `ns1/ns2.timeweb.ru`, `ns3/ns4.timeweb.org`.

## Конфигурация

`airportsboard-edge.conf` — конфигурация тестового HTTPS-входа. RU подключается
к фиксированному NL IP с Host/SNI airportsboard.live и проверкой сертификата.
IP-заголовки посетителя перезаписываются из TCP peer. Дополнительного кэша нет,
API/RSC/query/cookie/Vary проходят без преобразований. Тест закрыт noindex и
robots.txt. Основные имена в RU server_name пока не включены.

`origin-realip.conf` установлен в NL `/etc/nginx/conf.d/airportsboard-ru-realip.conf`.
Доверяет X-Real-IP только от RU IP; иначе все пользователи РФ делили бы один
per-IP бюджет свежести. Next-код и правило10мин не менялись.

`ssh-hardening.conf` установлен на RU в sshd_config.d/00-airportsboard-key-only.conf.
UFW разрешает только22/80/443. Ключ владельца сохранён; SSH по паролю отключён.

## Сертификат — тестовый вход готов

ACME Let’s Encrypt недоступен из RU, а HTTP-01 validation также получил timeout
при подключении центра сертификации к RU. `acme-origin.conf` и HTTP-01 forwarding
подготовлены как попытка выпуска через NL, но успешность НЕ подтверждена.
Сертификат получен через manual DNS-01 в NL, установлен на RU, действует до
16.01.2027. После синхронизации DNS оборвавшаяся SSH-сессия потребовала завершить
уже pending ACME authorization штатным acme-python клиентом и повторить certbot
с готовой valid authorization. Новые записи Timeweb распространяются между
авторитетными NS не одновременно; ns3 отстаёт. Перед нажатием Enter у certbot
проверять TXT на всех4NS и не повторять выдачу до синхронизации.

`deploy-edge-cert.py` — NL deploy hook /etc/letsencrypt/renewal-hooks/deploy/airportsboard-edge.
`install-edge-cert.py` — RU /usr/local/sbin/install-airportsboard-edge-cert.
Передача по отдельному SSH-ключу, ограниченному IP NL, forced-command и restrict;
нет shell, forwarding или произвольных путей. Сертификат/ключ передаются в stdin,
не печатаются. До установки проверяются цепочка, имя, срок и соответствие ключа.
Ключ NL хранится только в /root/.ssh/airportsboard-edge-cert, в Git его нет.

Это автоматизация ДОСТАВКИ сертификата, а не завершённое автопродление DNS-01.
Перед основным DNS нужно настроить DNS API hook с минимальными правами и
проверить renew. Тестовый сертификат manual не считать автоматически продлеваемым.

## Проверки и ограничения

Проверять prod и RU-proxy только audit-bot. Не открывать в браузере и не обращаться
к /api/flights/* или /api/cron/warm. UI смотрит владелец при согласованном T2-тесте.
Основной сайт: index20/20, sitemap-hreflang, live-refresh, adsense прошли после
установки real-IP. Все4ClouDNS NS отвечают RU/NL по EDNS subnet правильно.
Приложение на main1fb1bce5. Изменение инфраструктуры не требует сборки приложения.

До переключения: завершить тестовый HTTPS; проверить HTML/ассеты/RSC/безопасный API,
перезаписьIP и noindex; получить результат T2; обеспечить main/www TLS на RU и
автопродление; повторно проверить полную зону/NS/DS у регистратора.
Откат маршрутизации — вернуть прежние NS и A; текущий NL сервер не удалять.

Проверки RU завершены: HTTPS/HTTP2, HTML главной/AYT/прилётов, все найденные
JS/CSS главной и прилётов200, безопасныеAPI200/no-store, RSC200/text-x-component
без HIT, noindex/robots. Проверено: источникIP одинаков наedge/origin/direct;
подставныеX-Real-IP/XFF не меняют его. Владелец получил ссылки наT2-тест.
При включении www наRU сохранить301 www→apex, а не отдаватьдубль200.
