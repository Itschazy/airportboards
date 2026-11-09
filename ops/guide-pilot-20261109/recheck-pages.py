import sys,pathlib,json,concurrent.futures
sys.argv=['check-pages.py','https://airportsboard.live','production']
s=pathlib.Path('outputs/guide-pilot-20261109/check-pages.py').read_text();exec(s.split('with concurrent.futures.ThreadPoolExecutor')[0])
p=out/'production-pages.json';old=json.loads(p.read_text());bad={r['path'] for r in old if 'error' in r};target=[t for t in paths if '/'+t[0]+'/airport/'+t[1]+t[2] in bad]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:updated=list(pool.map(collect,target))
m={r['path']:r for r in updated};final=[m.get(r['path'],r) for r in old];p.write_text(json.dumps(final,ensure_ascii=False,indent=2));errors=[r for r in final if 'error' in r];print('FAIL' if errors else 'PASS',len(final),'pages; rechecked',len(target),json.dumps(errors,ensure_ascii=False));sys.exit(bool(errors))
