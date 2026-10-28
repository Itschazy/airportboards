"""Проверяем сторож на данных, а не его регулярное выражение: сезон CJK допустим,
подмена месяца или цены должна остаться ошибкой. В рабочие справочные не пишем."""
import json,os,subprocess,tempfile
from pathlib import Path
root=Path.cwd();node=os.environ.get('NODE','node');script=root/'scripts/check-guide-fresh.mjs'
ru=json.loads((root/'data/airport-guide/BJV.json').read_text());zh=json.loads((root/'data/airport-guide/zh/BJV.json').read_text())
with tempfile.TemporaryDirectory(prefix='ab-guide-guard-') as d:
 p=Path(d)/'data/airport-guide';(p/'zh').mkdir(parents=True)
 (p/'BJV.json').write_text(json.dumps(ru,ensure_ascii=False))
 for label,change,expected in [('valid-season',lambda s:s,0),('wrong-month',lambda s:s.replace('11月','12月'),1),('wrong-price',lambda s:s.replace('70 €','71 €'),1)]:
  (p/'zh/BJV.json').write_text(change(json.dumps(zh,ensure_ascii=False)))
  r=subprocess.run([node,str(script)],cwd=d,capture_output=True,text=True)
  assert r.returncode==expected,(label,r.stdout,r.stderr)
  print(label, 'PASS')
