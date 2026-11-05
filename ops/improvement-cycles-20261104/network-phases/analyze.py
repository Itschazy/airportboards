"""Read bounded anonymous RUM in place; emit aggregates only, never raw visits.

TTFB includes more than server work. Compare phases WITHIN each record: differences
of population percentiles do not describe any visitor. `request` includes network
transit and backend/cache time; the remaining pre-byte time cannot be labelled DNS.
Unknown/missing timings are not zero; inconsistent sums are excluded explicitly.
"""
import argparse
import collections
import datetime
import json
import math
from pathlib import Path
import re

PHASES = ('ttfb', 'resourceLoadDelay', 'resourceLoadDuration', 'elementRenderDelay')
NAMES = ('before_first_byte', 'resource_wait', 'resource_transfer', 'render')
BROWSERS = ('chrome', 'safari', 'yandex', 'yandex-app', 'samsung', 'edge', 'opera', 'chrome-ios', 'firefox', 'other')


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0


def classify(row):
    lcp = row.get('lcp')
    if not number(lcp) or not lcp:
        return 'invalid', 'invalid'
    parts = [row.get(k) for k in PHASES]
    if not all(number(x) for x in parts):
        return 'unknown', 'unknown'
    # Each field is rounded to milliseconds at ingestion; allow 10ms, not seconds.
    if abs(sum(parts) - lcp) > 10:
        return 'inconsistent', 'inconsistent'
    main = next((name for name, value in zip(NAMES, parts) if value > lcp / 2), 'mixed')
    timing = [row.get(k) for k in ('dns', 'connect', 'request')]
    if not all(number(x) for x in timing):
        return main, 'unknown'
    dns, connect, request = timing
    if sum(timing) > row['ttfb'] + 10:
        return main, 'inconsistent'
    # These nested counts describe the entire LCP, not only a percentage of TTFB.
    if dns + connect > lcp / 2:
        detail = 'dns_connect'
    elif request > lcp / 2:
        detail = 'request_roundtrip'
    elif row['ttfb'] - sum(timing) > lcp / 2:
        detail = 'other_before_byte'
    else:
        detail = 'mixed'
    return main, detail


def quantile(values, fraction):
    return sorted(values)[math.ceil(len(values) * fraction) - 1] if values else None


def read_rows(root, since, until):
    files, rows = [], []
    invalid = oversized = 0
    for file in sorted(root.iterdir()):
        if not re.fullmatch(r'rum-(?:[0-9]|1[0-3])-[0-7]\.jsonl', file.name):
            continue
        size = file.stat().st_size
        if size > 1024 * 1024:
            oversized += 1
            continue
        lines = file.read_text().splitlines()
        try:
            day = json.loads(lines[0])['day']
            datetime.date.fromisoformat(day)
        except (ValueError, KeyError, IndexError, TypeError):
            invalid += 1
            continue
        if not since <= day <= until:
            continue
        files.append({'day': day, 'bytes': size, 'nearCap': size > 1024 * 1024 - 4096})
        for line in lines[1:]:
            try:
                r = json.loads(line)
                if not (isinstance(r, dict) and r.get('schema') == 1
                        and isinstance(r.get('hour'), str) and r['hour'].startswith(day + 'T')
                        and isinstance(r.get('release'), str) and re.fullmatch('[a-f0-9]{12,40}', r['release'])
                        and r.get('browser') in BROWSERS and number(r.get('lcp')) and r['lcp'] > 0):
                    raise ValueError('record')
            except (ValueError, TypeError):
                invalid += 1
                continue
            if r.get('device') == 'mobile' and r.get('navigation') == 'navigate' and r.get('page') in ('departures', 'arrivals'):
                rows.append(r)
    return rows, {'files': files, 'invalid': invalid, 'oversizedFiles': oversized}


def summarize(rows):
    slow = [r for r in rows if r['lcp'] > 4000]
    phases = collections.Counter()
    network = collections.Counter()
    render_memory = collections.Counter()
    for r in slow:
        main, detail = classify(r)
        phases[main] += 1
        if main == 'before_first_byte':
            network[detail] += 1
        if main == 'render':
            render_memory[r.get('memory', 'unknown')] += 1
    metrics = {}
    for key in ('lcp', 'ttfb', 'dns', 'connect', 'request', 'html', 'elementRenderDelay', 'longTaskTotal'):
        values = [r[key] for r in rows if number(r.get(key))]
        metrics[key] = {'n': len(values), 'p50': quantile(values, .5), 'p75': quantile(values, .75), 'p90': quantile(values, .9)}
    return {'n': len(rows), 'smallSample': len(rows) < 50, 'slow': len(slow),
            'slowPercent': round(100 * len(slow) / len(rows), 2) if rows else None,
            'slowPhases': dict(phases), 'preByteDetails': dict(network),
            'renderMemory': dict(render_memory), 'metrics': metrics}


def report(root, since, until):
    rows, audit = read_rows(root, since, until)
    by_browser, by_release = collections.defaultdict(list), collections.defaultdict(list)
    for r in rows:
        by_browser[r['browser']].append(r)
        by_release[(r['release'], r['browser'])].append(r)
    return {'since': since, 'until': until, 'scope': 'mobile/navigate/arrivals+departures; all eligible sources and locales',
            **audit, 'total': summarize(rows),
            'browsers': {k: summarize(v) for k, v in sorted(by_browser.items())},
            'releases': [{'release': k[0], 'browser': k[1], 'firstHour': min(r['hour'] for r in v),
                          'lastHour': max(r['hour'] for r in v), **summarize(v)} for k, v in sorted(by_release.items())],
            'limitations': ['No user identity, carrier, geography or search-referrer linkage.',
                            'request roundtrip does not isolate backend time.',
                            'Different releases and hours are not a controlled experiment.',
                            'No LCP API, rejected consent, early exits or undelivered reports are absent.']}


def date_arg(value):
    parsed = datetime.date.fromisoformat(value)
    if parsed.isoformat() != value:
        raise ValueError('Expected YYYY-MM-DD')
    return value


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dir', type=Path, default=Path.home() / 'airportsboard-data/rum')
    parser.add_argument('--since', required=True, type=date_arg)
    parser.add_argument('--until', required=True, type=date_arg)
    args = parser.parse_args()
    if args.since > args.until:
        parser.error('since must not be after until')
    print(json.dumps(report(args.dir, args.since, args.until), indent=2))
