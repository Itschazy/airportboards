#!/usr/bin/python3
"""Certbot deploy hook: передаёт только PEM тестового домена по ограниченному SSH.
Секрет не попадает в аргументы, отчёты и логи. Остальные сертификаты игнорируются.
"""
import json, os, pathlib, subprocess
base = pathlib.Path('/etc/letsencrypt/live/ru-test.airportsboard.live')
if pathlib.Path(os.environ.get('RENEWED_LINEAGE', str(base))) != base: raise SystemExit(0)
data = {name: (base/name).read_text() for name in ('fullchain.pem', 'privkey.pem')}
subprocess.run(['ssh', '-i', '/root/.ssh/airportsboard-edge-cert', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', 'root@85.193.89.51', 'install-edge-cert'], input=json.dumps(data).encode(), check=True)
