"""Prepare a reviewable config; never write the live config or reload nginx here."""
from pathlib import Path
import argparse


def patch(source):
    if 'ab_edge_timing' in source:
        raise ValueError('timing already present; inspect before applying again')
    marker='server {\n    server_name airportsboard.live www.airportsboard.live;'
    if source.count(marker)!=1:
        raise ValueError('unexpected virtual host layout')
    source=source.replace(marker,Path(__file__).with_name('maps.conf').read_text()+'\n'+marker,1)
    start=source.index('    location / {')
    end=source.index('\n    }',start)
    block=source[start:end]
    target='        add_header X-Cache $upstream_cache_status always;'
    if block.count(target)!=1:
        raise ValueError('unexpected page location')
    block=block.replace(target,target+'\n        # Timings contain only durations/cache state, no identifiers or URLs.\n        add_header Server-Timing "$ab_edge_timing$ab_origin_timing, ab-cache;desc=$ab_cache_timing" always;')
    return source[:start]+block+source[end:]

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('source',type=Path);p.add_argument('output',type=Path)
    a=p.parse_args()
    if a.source.resolve()==a.output.resolve():p.error('output must be a separate review file')
    a.output.write_text(patch(a.source.read_text()))
