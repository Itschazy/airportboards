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


def server_pair(row):
    """Validate timings of ONE navigation before comparing browser and nginx clocks.

    Older records have no server fields. Never impute zero, or interpret replayed
    origin time on HIT/STALE as current backend work. A residual is outside the
    measured nginx header interval, not proven network/carrier latency: browser
    scheduling, proxies and clock precision can also contribute. Negative residuals
    within the client's 100ms tolerance are counted, not clamped into a fast sample.
    """
    state = row.get('serverCache', 'unknown')
    edge, origin, request = (row.get(k) for k in ('edgeHeader', 'originHeader', 'request'))
    if state not in ('MISS', 'BYPASS', 'EXPIRED', 'REVALIDATED', 'HIT', 'STALE', 'UPDATING'):
        return 'unknown', None
    if not number(edge) or edge > 300000 or not number(request):
        return 'invalid', None
    if edge > request + 100:
        return 'invalid', None
    if state in ('HIT', 'STALE', 'UPDATING'):
        if origin not in (None, -1):
            return 'invalid', None
    elif origin is not None and origin != -1 and (not number(origin) or origin > edge + 10):
        return 'invalid', None
    if edge > request:
        return 'negative_within_tolerance', None
    return 'paired', request - edge


def server_summary(rows):
    coverage, cache, causes = collections.Counter(), collections.Counter(), collections.Counter()
    residuals, slow_residuals, edges, origins = [], [], [], []
    for r in rows:
        state, residual = server_pair(r)
        coverage[state] += 1
        cache[r.get('serverCache', 'unknown')] += 1
        if state == 'paired':
            residuals.append(residual)
            edges.append(r['edgeHeader'])
            if number(r.get('originHeader')):
                origins.append(r['originHeader'])
        if r['lcp'] <= 4000:
            continue
        main, detail = classify(r)
        if state != 'paired':
            cause = state
        elif main in ('invalid', 'inconsistent', 'unknown') or detail in ('inconsistent', 'unknown'):
            cause = 'unusable_browser_phases'
        else:
            slow_residuals.append(residual)
            # No subtraction of population percentiles. Only a phase occupying
            # MORE THAN half this navigation's LCP is called dominant.
            if r['edgeHeader'] > r['lcp'] / 2:
                cause = 'nginx_header_interval'
            elif r['dns'] + r['connect'] > r['lcp'] / 2:
                cause = 'dns_connect'
            elif residual > r['lcp'] / 2:
                cause = 'request_outside_nginx'
            elif main == 'before_first_byte' and detail == 'other_before_byte':
                cause = 'other_before_byte'
            elif main == 'render':
                cause = 'render'
            else:
                cause = 'mixed'
        causes[cause] += 1
    metric = lambda v: {'n': len(v), 'p50': quantile(v, .5), 'p75': quantile(v, .75), 'p90': quantile(v, .9)}
    return {'coverage': dict(coverage), 'cache': dict(cache), 'slowDominant': dict(causes),
            'edgeHeader': metric(edges), 'originHeader': metric(origins),
            'requestOutsideNginx': metric(residuals), 'slowRequestOutsideNginx': metric(slow_residuals)}


def connection_summary(rows):
    """TLS is a subset of connect on known HTTP/1.1 or h2 connections only.

    Compare within each row; the pre-TLS remainder is not an exact TCP RTT and
    may include proxies or coarsened clocks. Older/reused/cache/QUIC timings stay
    unknown. Count invalid pairs instead of silently turning them into zero.
    """
    coverage, slow = collections.Counter(), collections.Counter()
    tls_values, before_values = [], []
    for r in rows:
        tls, connect = r.get('tls', -1), r.get('connect')
        if tls is None or tls == -1:
            state = 'unknown'
        elif not number(tls) or not number(connect) or tls > connect or connect > 300000 or r.get('protocol') not in ('h2', 'http/1.1'):
            state = 'invalid'
        else:
            state = 'paired'
            tls_values.append(tls)
            before_values.append(connect - tls)
        coverage[state] += 1
        if r['lcp'] > 4000:
            main, detail = classify(r)
            if state != 'paired':
                slow[state] += 1
            elif main in ('invalid', 'inconsistent', 'unknown') or detail in ('inconsistent', 'unknown'):
                slow['unusable_browser_phases'] += 1
            else:
                slow['tls' if tls > r['lcp'] / 2 else 'before_tls' if connect - tls > r['lcp'] / 2 else 'neither_dominates'] += 1
    metric = lambda v: {'n': len(v), 'p50': quantile(v, .5), 'p75': quantile(v, .75), 'p90': quantile(v, .9)}
    return {'coverage': dict(coverage), 'tls': metric(tls_values), 'connectBeforeTls': metric(before_values), 'slowDominant': dict(slow)}


def read_rows(root, since, until, navigation='navigate'):
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
            if r.get('device') == 'mobile' and r.get('navigation') == navigation and r.get('page') in ('departures', 'arrivals'):
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
            'renderMemory': dict(render_memory), 'metrics': metrics, 'serverTiming': server_summary(rows),
            'connectionTiming': connection_summary(rows)}


def report(root, since, until, navigation='navigate', release=None):
    if navigation not in ('navigate', 'reload'):
        raise ValueError('Expected navigate or reload')
    if release is not None and not re.fullmatch('[a-f0-9]{12,40}', release):
        raise ValueError('Expected exact release')
    rows, audit = read_rows(root, since, until, navigation)
    if release is not None:
        rows = [r for r in rows if r['release'] == release]
    by_browser, by_release = collections.defaultdict(list), collections.defaultdict(list)
    for r in rows:
        by_browser[r['browser']].append(r)
        by_release[(r['release'], r['browser'])].append(r)
    return {'since': since, 'until': until, 'release': release,
            'scope': f'mobile/{navigation}/arrivals+departures; all eligible sources and locales',
            **audit, 'total': summarize(rows),
            'browsers': {k: summarize(v) for k, v in sorted(by_browser.items())},
            'releases': [{'release': k[0], 'browser': k[1], 'firstHour': min(r['hour'] for r in v),
                          'lastHour': max(r['hour'] for r in v), **summarize(v)} for k, v in sorted(by_release.items())],
            'limitations': ['No user identity, carrier, geography or search-referrer linkage.',
                            'request roundtrip does not isolate backend time.',
                            'Paired request minus edgeHeader is outside the nginx header interval, not proven network latency.',
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
    # Reloads can have a slow new connection too, but must not silently change the
    # baseline navigate denominator. Report them explicitly as a separate cohort.
    parser.add_argument('--navigation', choices=('navigate', 'reload'), default='navigate')
    parser.add_argument('--release')
    args = parser.parse_args()
    if args.since > args.until:
        parser.error('since must not be after until')
    print(json.dumps(report(args.dir, args.since, args.until, args.navigation, args.release), indent=2))
