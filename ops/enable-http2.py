#!/usr/bin/env python3
"""Включить HTTP/2 на существующем nginx 1.24; без --apply только показать diff.

23.10.2026 curl с ALPN h2 получал HTTP/1.1: модуль был собран, но не включён.
Меняем только два HTTPS-listen. Кэш, proxy, TLS-сертификаты и DNS не меняются.
Проверка синтаксиса предшествует graceful reload; при ошибке возвращается backup.
"""
import datetime
import difflib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

config = Path('/etc/nginx/sites-available/airportsboard')
old = config.read_text()
pairs = [
    ('listen [::]:443 ssl ipv6only=on;', 'listen [::]:443 ssl http2 ipv6only=on;'),
    ('listen 443 ssl;', 'listen 443 ssl http2;'),
]
new = old
for before, after in pairs:
    if after in new:
        continue
    if new.count(before) != 1:
        raise SystemExit('Неожиданный listen: остановка, нужен ручной разбор конфигурации')
    new = new.replace(before, after, 1)
if new == old:
    print('HTTP/2 уже включён в конфигурации; проверить живой протокол check-http2.mjs')
    sys.exit(0)
print(''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True),
                                  fromfile=str(config), tofile=str(config))), end='')
if '--apply' not in sys.argv[1:]:
    sys.exit(0)
if sys.argv[1:] != ['--apply'] or os.geteuid() != 0:
    raise SystemExit('Применение: root, единственный аргумент --apply')
version = subprocess.run(['nginx', '-V'], capture_output=True, text=True, check=True).stderr
if '--with-http_v2_module' not in version:
    raise SystemExit('nginx собран без HTTP/2')
subprocess.run(['nginx', '-t'], check=True)
backup = Path('/etc/nginx') / ('airportsboard.pre-http2.' +
    datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.conf')
shutil.copy2(config, backup)
# Копия вне sites-enabled сохраняет права исходника; os.replace не оставляет
# частично записанный конфиг при параллельном чтении. Backup не удаляем.
pending = backup.with_suffix('.pending')
shutil.copy2(config, pending)
pending.write_text(new)
os.replace(pending, config)
try:
    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    # reload посылает сигнал, а не ждёт готовности новых workers. При первой
    # проверке немедленный curl ещё получил 200/1.1 и вызвал безопасный откат.
    # Делаем до десяти попыток с паузой 0.5 с и таймаутом запроса 5 с; каждое
    # соединение новое. При ошибке curl откатываем сразу.
    # Не принимаем просто 200 за успех: протокол тоже обязан стать h2.
    for attempt in range(10):
        time.sleep(0.5)
        probe = subprocess.check_output([
            'curl', '--http2', '--silent', '--show-error', '--max-time', '5',
            '--user-agent', 'audit-bot', '--resolve', 'airportsboard.live:443:127.0.0.1',
            '--output', '/dev/null', '--write-out', '%{http_code} %{http_version}',
            'https://airportsboard.live/ru'], text=True)
        print('Проверка workers:', attempt + 1, probe, flush=True)
        if probe == '200 2':
            break
    if probe != '200 2':
        raise RuntimeError('Проверка после reload: ' + probe)
except Exception:
    shutil.copy2(backup, config)
    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    print('Исходная конфигурация восстановлена', file=sys.stderr)
    raise
print('HTTP/2 включён; резервная копия:', backup)
