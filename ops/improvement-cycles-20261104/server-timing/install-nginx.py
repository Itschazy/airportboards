"""Explicit root-only install after local tests and review; guarded by source SHA.

Takes a prepared candidate, checks the unchanged live config, preserves a backup,
tests nginx syntax, then reloads gracefully. Failure restores and re-tests backup.
This does not change DNS, proxy/cache policies, certificates or stored data.
"""
import datetime
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys

live=Path('/etc/nginx/sites-available/airportsboard')
candidate=Path(sys.argv[1])
expected=sys.argv[2]
if os.geteuid()!=0:raise SystemExit('root required')
before=live.read_bytes()
if hashlib.sha256(before).hexdigest()!=expected:raise SystemExit('live config changed: stop and review')
after=candidate.read_bytes()
if b'ab_edge_timing' not in after or b'add_header Server-Timing' not in after:raise SystemExit('candidate lacks reviewed timing markers')
backup=live.with_name('airportsboard.before-timing-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
if backup.exists():raise SystemExit('backup already exists')
shutil.copy2(live,backup)
mode=live.stat().st_mode & 0o777

def replace(data):
    temp=live.with_name('airportsboard.timing-new')
    with temp.open('xb') as stream:stream.write(data)
    os.chmod(temp,mode)
    os.replace(temp,live)

replace(after)
try:
    subprocess.run(['nginx','-t'],check=True)
    subprocess.run(['systemctl','reload','nginx'],check=True)
except Exception:
    replace(before)
    subprocess.run(['nginx','-t'],check=True)
    subprocess.run(['systemctl','reload','nginx'],check=True)
    raise
print('installed',hashlib.sha256(after).hexdigest(),'backup',str(backup))
