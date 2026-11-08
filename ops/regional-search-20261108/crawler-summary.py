# Run on server through ssh stdin. No raw IPs, user agents or visitor URLs are emitted.
import re,json,subprocess,collections
from pathlib import Path
patterns=[('Naver',r'\bYeti\b'),('Baidu',r'Baiduspider'),('Qwant',r'QwantBot|Qwantify'),('DuckDuckGo',r'DuckDuckBot'),('Apple',r'Applebot'),('Petal',r'PetalBot'),('Seznam',r'SeznamBot'),('Brave-claimed',r'Bravebot'),('Yahoo-claimed',r'Slurp'),('Yep',r'YepBot')]
patterns=[(k,re.compile(v,re.I)) for k,v in patterns]
stats={k:{'hits':0,'status':collections.Counter(),'locales':collections.Counter()} for k,_ in patterns}
rx=re.compile(r'^\S+ \S+ \S+ \[([^\]]+)\] "\S+ (\S+) [^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"')
p=subprocess.Popen(['grep','-hEi','Yeti|Baiduspider|Qwantbot|Qwantify|DuckDuckBot|Applebot|PetalBot|SeznamBot|Bravebot|Slurp|YepBot','/var/log/nginx/access.log.1','/var/log/nginx/access.log'],stdout=subprocess.PIPE,text=True,env={'LC_ALL':'C'})
for line in p.stdout:
 m=rx.match(line)
 if not m:continue
 time,path,status,ua=m.groups()
 for name,pat in patterns:
  if pat.search(ua):
   s=stats[name];s['hits']+=1;s['status'][status]+=1
   loc=re.match(r'^/(en|ru|zh|ar|de|ko|ja|fr|es|it|hi|tr)(/|$)',path)
   if loc:s['locales'][loc[1]]+=1
   break
p.wait()
print(json.dumps({'note':'UA claims only; identities not verified. Yesterday rotated log + today partial; requests, not unique URLs.','bots':stats},ensure_ascii=False,indent=2))
s=json.loads(Path('/home/deploy/airportsboard-data/seo/indexnow-v2.json').read_text())
print('INDEXNOW',json.dumps({'sent_by_locale':collections.Counter(k.split('/')[1] for k in s.get('sent',{})),'pending':len(s.get('pending',{})),'recent_runs':s.get('runs',[])[-3:]},ensure_ascii=False))
