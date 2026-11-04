"""Read-only diagnosis: compare LCP phases within each sample, never subtract p75s.

Run over the bounded anonymous RUM journal on the server. No URLs, identifiers,
secrets or individual records leave it. A dominant phase is a measurement, not
proof of its cause (render delay also includes HTML delivery/font waiting).
"""
import collections
import datetime
import json
import math
from pathlib import Path
import re
import statistics
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'airportsboard-data/rum'
since, until = '2026-10-28', '2026-11-03'
phase_keys = ['ttfb', 'resourceLoadDelay', 'resourceLoadDuration', 'elementRenderDelay']
phase_names = ['before_first_byte', 'resource_wait', 'resource_transfer', 'after_resource_ready']
counts = collections.Counter()
groups = collections.defaultdict(list)
invalid = 0
for file in sorted(root.iterdir()):
    if not re.fullmatch(r'rum-(?:[0-9]|1[0-3])-[0-7]\.jsonl', file.name):
        continue
    if file.stat().st_size > 1024 * 1024:
        invalid += 1
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
    for line in lines[1:]:
        try:
            row = json.loads(line)
            if not (row.get('schema') == 1 and row.get('hour', '').startswith(day+'T')
                    and re.fullmatch('[a-f0-9]{12,40}', row.get('release', ''))):
                raise ValueError('record')
            if (row.get('browser'), row.get('device'), row.get('navigation')) != ('chrome', 'mobile', 'navigate'):
                continue
            lcp = row['lcp']
            if not isinstance(lcp, (float, int)) or not math.isfinite(lcp) or lcp <= 0:
                raise ValueError('lcp')
            if lcp <= 4000:
                continue
            parts = [row[key] for key in phase_keys]
            if any(not isinstance(x, (float, int)) or not math.isfinite(x) or x < 0 for x in parts):
                raise ValueError('phase')
        except (ValueError, KeyError, TypeError):
            invalid += 1
            continue
        counts['slow'] += 1
        # Rounded RUM phases should add up to LCP; don't classify inconsistent samples.
        if abs(sum(parts) - lcp) > 10:
            counts['inconsistent_phase_sum'] += 1
            continue
        dominant = [phase_names[i] for i, value in enumerate(parts) if value > lcp * .5]
        phase = dominant[0] if len(dominant) == 1 else 'mixed'
        groups[(row.get('memory', 'unknown'), phase)].append(row)
        if row.get('dns', 0) >= 2000:
            counts['dns_over_2s'] += 1
        if row.get('connect', 0) >= 2000:
            counts['connect_over_2s'] += 1
        if row.get('dns', 0) + row.get('connect', 0) > lcp * .5:
            counts['dns_connect_over_half_lcp'] += 1
        if row.get('longTasksTruncated'):
            counts['truncated_long_tasks'] += 1
result = []
for (memory, phase), rows in sorted(groups.items()):
    def median(key):
        values = [r[key] for r in rows if isinstance(r.get(key), (float, int)) and r[key] >= 0]
        return statistics.median(values) if values else None
    result.append({'memory': memory, 'phase': phase, 'n': len(rows),
                   'lcpMedian': median('lcp'), 'ttfbMedian': median('ttfb'),
                   'renderMedian': median('elementRenderDelay'),
                   'longTasksMedian': median('longTaskTotal'),
                   'airports': dict(collections.Counter(r.get('airport') or 'home' for r in rows))})
print(json.dumps({'since': since, 'until': until, 'counts': dict(counts), 'invalid': invalid,
                  'groups': result, 'note': 'Phase shares are paired per record; medians must not be added. Small subgroups are descriptive only.'}, indent=2))
