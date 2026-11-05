"""Controls exercise the same analyzer used on the server, without a paid request."""
import json
from pathlib import Path
import tempfile
from analyze import classify, report, summarize, server_pair, server_summary, connection_summary

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
    reload = report(p, '2026-11-04', '2026-11-04', navigation='reload', release='123456789abc')
    assert reload['total']['n'] == 1 and 'mobile/reload/' in reload['scope']
    assert report(p, '2026-11-04', '2026-11-04', release='ffffffffffff')['total']['n'] == 0
    n += 1
    for options in [{'navigation': 'back_forward'}, {'release': 'not-a-release'}]:
        try:
            report(p, '2026-11-04', '2026-11-04', **options)
            raise AssertionError('Invalid scope accepted')
        except ValueError:
            n += 1
paired = {**base, 'serverCache': 'MISS', 'edgeHeader': 100, 'originHeader': 99}
cases = [
    (base, ('unknown', None)),
    (paired, ('paired', 1100)),
    ({**paired, 'serverCache': 'HIT', 'edgeHeader': 0, 'originHeader': -1}, ('paired', 1200)),
    ({**paired, 'serverCache': 'STALE'}, ('invalid', None)),
    ({**paired, 'edgeHeader': 1250, 'originHeader': -1}, ('negative_within_tolerance', None)),
    ({**paired, 'edgeHeader': 1301}, ('invalid', None)),
    ({**paired, 'originHeader': 111}, ('invalid', None)),
    ({**paired, 'originHeader': -1}, ('paired', 1100)),
    ({**paired, 'edgeHeader': -1}, ('invalid', None)),
    ({**paired, 'edgeHeader': True}, ('invalid', None)),
    ({**paired, 'request': float('nan')}, ('invalid', None)),
]
for row, expected in cases:
    assert server_pair(row) == expected, (server_pair(row), expected)
    n += 1

slow_cases = [
    (paired, 'dns_connect'),
    ({**paired, 'dns': 10, 'connect': 10, 'request': 4800}, 'request_outside_nginx'),
    ({**paired, 'dns': 10, 'connect': 10, 'request': 4800, 'edgeHeader': 4000}, 'nginx_header_interval'),
    ({**paired, 'dns': 10, 'connect': 10, 'request': 200}, 'other_before_byte'),
    ({**paired, 'ttfb': 1000, 'elementRenderDelay': 5000, 'dns': 10, 'connect': 10, 'request': 900}, 'render'),
    ({**paired, 'elementRenderDelay': 1100}, 'unusable_browser_phases'),
    ({**paired, 'request': 9900}, 'unusable_browser_phases'),
]
for row, expected in slow_cases:
    assert server_summary([row])['slowDominant'] == {expected: 1}
    n += 1
# Regression: matching within each row differs from subtracting two p75 values.
population = [
    {**paired, 'request': 100, 'edgeHeader': 100, 'originHeader': -1},
    {**paired, 'request': 900, 'edgeHeader': 0, 'originHeader': -1},
    {**paired, 'request': 1000, 'edgeHeader': 950, 'originHeader': -1},
    {**paired, 'request': 1100, 'edgeHeader': 1000, 'originHeader': -1},
    base,
]
s = server_summary(population)
assert s['coverage'] == {'paired': 4, 'unknown': 1}
assert s['requestOutsideNginx']['p75'] == 100  # Not p75(request)-p75(edge) = 50.
assert s['originHeader']['n'] == 0 and s['edgeHeader']['n'] == 4
n += 1
for patch, coverage, cause in [
    ({}, 'unknown', 'unknown'),
    ({'tls': 3500, 'connect': 4000, 'dns': 100, 'request': 500, 'protocol': 'h2'}, 'paired', 'tls'),
    ({'tls': 100, 'connect': 4000, 'dns': 100, 'request': 500, 'protocol': 'http/1.1'}, 'paired', 'before_tls'),
    ({'tls': 0, 'protocol': 'h2'}, 'paired', 'neither_dominates'),
    ({'tls': 1501, 'protocol': 'h2'}, 'invalid', 'invalid'),
    ({'tls': 100, 'protocol': 'h3'}, 'invalid', 'invalid'),
    ({'tls': float('nan'), 'protocol': 'h2'}, 'invalid', 'invalid'),
    ({'tls': True, 'protocol': 'h2'}, 'invalid', 'invalid'),
    ({'tls': 100, 'protocol': 'h2', 'request': 9999}, 'paired', 'unusable_browser_phases'),
]:
    s = connection_summary([{**base, **patch}])
    assert s['coverage'] == {coverage: 1} and s['slowDominant'] == {cause: 1}, s
    n += 1
s = connection_summary([base, {**base, 'tls': 100, 'protocol': 'h2'}])
assert s['tls']['n'] == 1 and s['connectBeforeTls']['p75'] == 1400
n += 1
print(f'PASS {n} controls: paired phases/server/TLS clocks, old records, stale cache, rounding, missing API, invalid sums, sample scope, bounded files')
