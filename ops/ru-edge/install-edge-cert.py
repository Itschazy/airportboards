#!/usr/bin/python3
"""Принимает только сертификат тестового домена от NL, без произвольных команд.
Ключ SSH ограничен forced-command и IP NL. Проверяем пару ключ/сертификат и имя
до замены; приватный ключ не выводим. Это обеспечивает автопродление при
недоступном из SPB ACME. После GeoDNS нужно расширить имена осознанно.
"""
import json, os, pathlib, subprocess, sys, tempfile
os.umask(0o077)
raw = sys.stdin.buffer.read(65537)
if len(raw) > 65536: raise SystemExit('certificate input too large')
data = json.loads(raw)
base = pathlib.Path('/etc/letsencrypt/live/ru-test.airportsboard.live')
base.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(dir=base) as tmp:
    p = pathlib.Path(tmp)
    for name in ('fullchain.pem', 'privkey.pem'):
        (p/name).write_text(data[name])
    def run(*args): return subprocess.check_output(args, stderr=subprocess.DEVNULL)
    run('openssl', 'verify', '-CAfile', '/etc/ssl/certs/ca-certificates.crt', '-untrusted', str(p/'fullchain.pem'), '-verify_hostname', 'ru-test.airportsboard.live', str(p/'fullchain.pem'))
    run('openssl', 'x509', '-in', str(p/'fullchain.pem'), '-noout', '-checkend', '86400')
    certpub = run('openssl', 'x509', '-in', str(p/'fullchain.pem'), '-pubkey', '-noout')
    keypub = run('openssl', 'pkey', '-in', str(p/'privkey.pem'), '-pubout')
    if certpub != keypub: raise SystemExit('key mismatch')
    for name in ('fullchain.pem', 'privkey.pem'): os.replace(p/name, base/name)
subprocess.run(['nginx', '-t'], check=True)
subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
print('RU test certificate installed')
