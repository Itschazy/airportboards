import subprocess,json,pathlib
sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
cmd="cd /var/www/airportsboard && git rev-parse HEAD && python3 - <<'REMOTE'\nimport urllib.request,json\nseen={}\nfor _ in range(18):\n req=urllib.request.Request('http://127.0.0.1:3000/api/health',headers={'User-Agent':'audit-bot','Connection':'close'})\n with urllib.request.urlopen(req,timeout=15) as r:d=json.load(r)\n seen[d['instance']]={k:d[k] for k in ['release','pid','instance','execMode']}\n if len(seen)==3:break\nprint(json.dumps(list(seen.values())))\nREMOTE"
lines=subprocess.check_output(['ssh','deploy@217.149.26.240',cmd],text=True).splitlines(); head=lines[0]; workers=json.loads(lines[-1]); assert head==sha,(head,sha);assert len(workers)==3,workers;assert all(w['release']==sha[:12] for w in workers),workers
raw=subprocess.check_output(['curl','-fsS','-A','audit-bot','https://airportsboard.live/api/health'],text=True);public=json.loads(raw);assert public['release']==sha[:12],public
out={'head':head,'workers':workers,'public':{k:public[k] for k in ['at','release','pid','instance']}}
pathlib.Path('ops/guide-reaudit-20261110/release.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
