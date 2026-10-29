#!/usr/bin/env python3
"""Verify all new guide blocks in SSR and FAQ, plus the real board navigation URLs.
Local fixture only: this batch must never become a browser/paid production probe.
"""
import json,re,subprocess,sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:3119').rstrip('/')
assert urlparse(base).hostname in {'localhost','127.0.0.1'}
out=Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/ab-seo-growth-20261029/pages.json')
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.skip=0;self.text=[];self.lds=[];self.ld=None;self.h1=0;self.canonical='';self.robots='';self.alts={};self.links=set();self.guide=False
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t in {'script','style'}:
   self.skip+=1
   if t=='script' and a.get('type')=='application/ld+json':self.ld=''
  if t=='h1':self.h1+=1
  if t=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
  if t=='link' and 'hreflang' in a:self.alts[a['hreflang']]=a.get('href')
  if t=='meta' and a.get('name')=='robots':self.robots=a.get('content','')
  if t=='a' and a.get('role')=='button':self.links.add(a.get('href'))
  if 'ag-lead' in a.get('class','').split():self.guide=True
 def handle_endtag(self,t):
  if t=='script' and self.ld is not None:self.lds.append(json.loads(self.ld));self.ld=None
  if t in {'script','style'}:self.skip-=1
 def handle_data(self,s):
  if self.ld is not None:self.ld+=s
  if not self.skip:self.text.append(s)
def nodes(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from nodes(v)
 elif isinstance(x,list):
  for v in x:yield from nodes(v)
rows=[]
locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']
for loc in locales:
 for code in ['TAS','HKT','CXR','ALA']:
  g=json.loads((Path('data/airport-guide')/(f'{code}.json' if loc=='ru' else f'{loc}/{code}.json')).read_text())
  blocks=g['blocks'] if loc=='ru' else g['blocks'].values()
  for suffix in ['', '/arrivals']:
   path=f'/{loc}/airport/{code}{suffix}'
   raw=subprocess.check_output(['curl','-fsS','--max-time','45','-A','audit-bot',base+path],text=True)
   p=Page();p.feed(raw);visible=' '.join(p.text);answers=[x['text'] for x in nodes(p.lds) if x.get('@type')=='Answer'];questions=[x['name'] for x in nodes(p.lds) if x.get('@type')=='Question']
   assert p.h1==1,(path,'h1',p.h1)
   assert p.guide,(path,'guide missing')
   assert p.canonical=='https://airportsboard.live'+path,(path,'canonical')
   assert 'noindex' not in p.robots,(path,'robots',p.robots)
   assert set(p.alts)==set(locales+['x-default']),(path,'hreflang')
   assert len(questions)==len(set(questions)),(path,'duplicate questions')
   assert not any(re.search(r'airport airport',q,re.I) for q in questions),(path,'duplicate airport')
   for b in blocks:
    assert b['text'] in visible,(path,b['id'] if loc=='ru' else b['title'],'missing visible text')
    assert b['text'] in answers,(path,b['title'],'missing FAQ answer')
   assert f'/{loc}/airport/{code}' in p.links and f'/{loc}/airport/{code}/arrivals' in p.links,(path,'board links')
   rows.append({'path':path,'guideBlocks':len(g['blocks']),'h1':p.h1,'faqQuestions':len(questions),'pass':True})
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(f'PASS {len(rows)}/96 pages: SSR text, FAQ equality, canonical, robots, 12 locales + x-default, board links')
