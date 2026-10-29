#!/usr/bin/env python3
"""Read-only baseline for fixed URLs. Production uses audit-bot, never flight APIs.
The snapshot is evidence of accessibility, not Google's indexing decision.
Run: python3 ops/seo-growth-20261029/cohort.py OUTPUT_DIR [BASE]
"""
import json,re,subprocess,sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
base=(sys.argv[2] if len(sys.argv)>2 else 'http://127.0.0.1:3119').rstrip('/')
if urlparse(base).hostname not in ['airportsboard.live','localhost','127.0.0.1']:
 raise SystemExit('Only explicit project hosts are allowed')
cohort=[f'/ru/airport/{c}{suffix}' for c in ['IST','DME','AYT','SSH','HRG','KZN','UFA','OVB'] for suffix in ['', '/arrivals']]
cohort += ['/en/airport/LHR','/en/airport/LHR/arrivals']
cohort += [f'/en/airport/{c}/arrivals' for c in ['NCL','LBA','DMM','EDI','MAN']]
cohort += [f'/ru/airport/{c}' for c in ['TAS','HKT','CXR','ALA','LWN','BJV']]
cohort += ['/en/flight-map']
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.title='';self.h1='';self.in_title=False;self.in_h1=False;self.h1_count=0;self.canonical=None;self.description=None;self.robots=None;self.hreflang={};self.links=set();self.guide=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='title':self.in_title=True
  if tag=='h1':self.in_h1=True;self.h1_count+=1
  if tag=='meta' and a.get('name') in ['robots','description']:setattr(self,a['name'],a.get('content'))
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
  if tag=='link' and a.get('hreflang'):self.hreflang[a['hreflang']]=a.get('href')
  if tag=='a' and a.get('href'):self.links.add(a['href'])
  if 'ag-lead' in a.get('class','').split():self.guide=True
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
  if tag=='h1':self.in_h1=False
 def handle_data(self,s):
  if self.in_title:self.title+=s
  if self.in_h1:self.h1+=s

def get(path):
 if not re.fullmatch(r'/(?:[a-z]{2}/(?:airport/[A-Z]{3}(?:/arrivals)?|flight-map)|sitemap(?:-\d+)?\.xml)',path):raise ValueError(path)
 return subprocess.check_output(['curl','--fail','--silent','--show-error','--max-time','40','-A','audit-bot',base+path],text=True)
sm=set();index=get('/sitemap.xml')
for url in re.findall(r'<loc>([^<]+)</loc>',index):
 path=urlparse(url).path
 xml=get(path)
 sm.update(urlparse(u).path for u in re.findall(r'<loc>([^<]+)</loc>',xml))
rows=[]
for path in cohort:
 raw=get(path);p=Page();p.feed(raw)
 (out/(path.strip('/').replace('/','-')+'.html')).write_text(raw)
 rows.append(dict(path=path,title=p.title,description=p.description,h1=p.h1,h1Count=p.h1_count,canonical=p.canonical,robots=p.robots,hreflang=p.hreflang,guide=p.guide,inSitemap=path in sm,airportLinks=sorted(u for u in p.links if '/airport/' in u)))
(out/'cohort.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checked':len(rows),'inSitemap':sum(r['inSitemap'] for r in rows),'singleH1':sum(r['h1Count']==1 for r in rows),'indexable':sum('noindex' not in (r['robots'] or '') for r in rows)},indent=2))
