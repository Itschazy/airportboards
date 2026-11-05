"""Small sequential audit-bot sample. No flight API, browser UA or cache purge.

--loopback checks this same HTTPS virtual host from the origin server, preserving
TLS/Host. It is not a mobile-carrier test and the cached sample is not a load test.
"""
import argparse
import json
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--loopback', action='store_true')
args = parser.parse_args()
rows = []
for attempt in range(3):
    for path in ['/ru/airport/AYT', '/ru/airport/OVB', '/ru/airport/GYD', '/en/airport/ORK']:
        with tempfile.NamedTemporaryFile(prefix='ab-audit-headers-') as headers:
            command = ['curl', '-sS', '--compressed', '-A', 'audit-bot', '--max-time', '30',
                       '-o', '/dev/null', '-D', headers.name, '-w', '%{json}',
                       'https://airportsboard.live' + path]
            if args.loopback:
                command += ['--resolve', 'airportsboard.live:443:127.0.0.1']
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            timings = json.loads(result.stdout)
            keep = {k: timings[k] for k in ['http_code', 'http_version', 'time_namelookup',
                    'time_connect', 'time_appconnect', 'time_starttransfer', 'time_total', 'size_download']}
            fields = dict(line.lower().split(':', 1) for line in open(headers.name).read().splitlines() if ':' in line)
            rows.append({'attempt': attempt + 1, 'path': path, **keep,
                         'cache': fields.get('x-cache', '').strip(),
                         'nextCache': fields.get('x-nextjs-cache', '').strip()})
print(json.dumps({'loopback': args.loopback, 'samples': rows}, indent=2))
