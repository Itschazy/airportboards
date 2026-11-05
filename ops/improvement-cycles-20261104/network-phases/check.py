"""Controls exercise the same analyzer used on the server, without a paid request."""
import json
from pathlib import Path
import tempfile
from analyze import classify, report, summarize

base = dict(schema=1, hour='2026-11-04T13', release='123456789abc', browser='chrome',
            device='mobile', navigation='navigate', page='departures', memory='low',
            lcp=6000, ttfb=5000, resourceLoadDelay=0, resourceLoadDuration=0,
            elementRenderDelay=1000, dns=2000, connect=1500, request=1200)
n = 0

def check(row, expected):
    global n
    assert classify(row) == expected, (classify(row), expected)
    n += 1

check(base, ('before_first_byte', 'dns_connect'))
check({**base, 'dns': 100, 'connect': 100, 'request': 4500}, ('before_first_byte', 'request_roundtrip'))
check({**base, 'dns': 100, 'connect': 100, 'request': 100}, ('before_first_byte', 'other_before_byte'))
check({**base, 'ttfb': 1000, 'elementRenderDelay': 5000, 'dns': 10, 'connect': 10, 'request': 900}, ('render', 'mixed'))
check({**base, 'ttfb': 3000, 'elementRenderDelay': 3000, 'dns': 100, 'connect': 100, 'request': 2500}, ('mixed', 'mixed'))
check({**base, 'elementRenderDelay': 1001}, ('before_first_byte', 'dns_connect'))
check({**base, 'elementRenderDelay': 1200}, ('inconsistent', 'inconsistent'))
check({**base, 'request': 9000}, ('before_first_byte', 'inconsistent'))
for invalid in [-1, None, float('nan')]:
    check({**base, 'dns': invalid}, ('before_first_byte', 'unknown'))
check({**base, 'elementRenderDelay': -1}, ('unknown', 'unknown'))
check({**base, 'lcp': True}, ('invalid', 'invalid'))
check({**base, 'lcp': 0}, ('invalid', 'invalid'))
s = summarize([base, {**base, 'lcp': 4000}])
assert s['n'] == 2 and s['slow'] == 1 and s['smallSample']
assert s['metrics']['lcp']['p75'] == 6000
n += 1
with tempfile.TemporaryDirectory(prefix='ab-network-report-') as folder:
    p = Path(folder)
    (p/'rum-1-0.jsonl').write_text('\n'.join(json.dumps(x) for x in [
        {'day': '2026-11-04'}, base, {**base, 'device': 'desktop'},
        {**base, 'navigation': 'reload'}, {**base, 'page': 'home'},
        {**base, 'schema': 2}, {**base, 'hour': '2026-11-03T13'}, ['invalid']
    ])+'\n{broken\n')
    (p/'not-rum.jsonl').write_text('secret')
    (p/'rum-2-0.jsonl').write_text(json.dumps({'day': '2026-11-03'})+'\n'+json.dumps(base))
    (p/'rum-3-0.jsonl').write_bytes(b'x' * (1024*1024+1))
    r = report(p, '2026-11-04', '2026-11-04')
    assert r['total']['n'] == 1 and r['invalid'] == 4 and r['oversizedFiles'] == 1
    assert len(r['files']) == 1 and len(r['releases']) == 1
    assert r['browsers']['chrome']['slowPhases'] == {'before_first_byte': 1}
    n += 1
print(f'PASS {n} controls: paired phases, rounding, missing API, invalid sums, sample scope, bounded files')
