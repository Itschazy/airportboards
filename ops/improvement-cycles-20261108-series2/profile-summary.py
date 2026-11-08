#!/usr/bin/env python3
"""Summarize exported DevTools traces, without treating local emulation as RUM.

Usage: python3 profile-summary.py /absolute/Trace-*.json.gz [...]
No browser control, network, or production requests. Nested durations are not summed.
An absent navigation start yields null LCP; the recording range is never used as LCP.
"""
import gzip
import hashlib
import json
import sys
from pathlib import Path


def summarize(path):
    raw = Path(path).read_bytes()
    trace = json.loads(gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw)
    events = trace['traceEvents']
    data = lambda e: e.get('args', {}).get('data', {})
    navs = {data(e)['navigationId']: e for e in events
            if e['name'] == 'navigationStart' and data(e).get('documentLoaderURL')
            and data(e).get('isOutermostMainFrame')}
    candidates = [e for e in events if e['name'] == 'largestContentfulPaint::Candidate'
                  and data(e).get('isOutermostMainFrame')]
    last = max(candidates, key=lambda e: e['ts'], default=None)
    nav = navs.get(data(last).get('navigationId')) if last else None
    frame = last.get('args', {}).get('frame') if last else None
    shifts = sorted([e for e in events if e['name'] == 'LayoutShift'
                     and data(e).get('is_main_frame') and not data(e).get('had_recent_input')
                     and (not frame or e.get('args', {}).get('frame') == frame)], key=lambda e: e['ts'])
    max_window = window = 0
    start = previous = None
    for e in shifts:
        if start is None or e['ts'] - previous > 1000000 or e['ts'] - start > 5000000:
            start, window = e['ts'], 0
        window += data(e).get('weighted_score_delta', data(e).get('score', 0))
        max_window = max(max_window, window)
        previous = e['ts']
    interactions = {}
    for e in events:
        d = data(e)
        if e['name'] != 'EventTiming' or not d.get('interactionId') or 'duration' not in d:
            continue
        if frame and d.get('frame') != frame:
            continue
        key = d['interactionId']
        row = {'id': key, 'event': d['type'], 'durationMs': d['duration'],
               'processingMs': round(d['processingEnd'] - d['processingStart'], 3),
               'atMsSinceNavigation': round((e['ts'] - nav['ts']) / 1000, 3) if nav else None}
        if key not in interactions or interactions[key]['durationMs'] < row['durationMs']:
            interactions[key] = row
    main_threads = {(e['pid'], e['tid']) for e in events
                    if e['name'] == 'thread_name' and e.get('args', {}).get('name') == 'CrRendererMain'}
    tasks = [e for e in events if e['name'] == 'RunTask' and e.get('dur', 0) > 50000
             and (e['pid'], e['tid']) in main_threads]
    return {'file': str(path), 'sha256': hashlib.sha256(raw).hexdigest(),
            'metadata': {k: trace.get('metadata', {}).get(k) for k in
                         ['startTime', 'emulatedDeviceTitle', 'cpuThrottling', 'networkThrottling']},
            'navigationFound': nav is not None,
            'lcpCandidateMs': round((last['ts'] - nav['ts']) / 1000, 3) if nav else None,
            'clsMaxSessionInRecordedRange': max_window,
            'interactions': list(interactions.values()),
            'maxRecordedInteractionMs': max([v['durationMs'] for v in interactions.values()], default=None),
            'rendererLongTasksMs': [round(e['dur'] / 1000, 3) for e in tasks],
            'limitations': 'Local desktop emulation with extensions. Trace interval only; no physical phone or field INP claim. Renderer tasks include embedded SVG documents.'}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    print(json.dumps([summarize(p) for p in sys.argv[1:]], ensure_ascii=False, indent=2))
