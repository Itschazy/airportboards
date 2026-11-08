"""Bounded, read-only SSR audit. All requests use audit-bot, never flight APIs."""
import json,time,subprocess,tempfile
from html.parser import HTMLParser
from pathlib import Path
BASE='https://airportsboard.live'
OUT=Path('outputs/regional-search-20261108/implementation');OUT.mkdir(parents=True,exist_ok=True)
LOCALES='en ru zh ar de ko ja fr es it hi tr'.split()
PILOT={'ko':['ICN','GMP','CJU'],'zh':['PEK','PVG','CAN'],'ja':['HND','NRT','KIX'],'fr':['CDG','ORY','NCE'],'de':['FRA','MUC','BER']}
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.lang='';self.title=[];self.h1=[];self.links=[];self.metas={};self.canon=[];self.alts={};self.hidden=0;self.in_title=False;self.in_h1=False;self.visible=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if t in ('script','style'):self.hidden+=1
  if t=='html':self.lang=a.get('lang','')
  if t=='title':self.in_title=True
  if t=='h1':self.in_h1=True
  if t=='a':self.links.append(a.get('href',''))
  if t=='meta':self.metas[a.get('name',a.get('property',''))]=a.get('content','')
  if t=='link' and a.get('rel')=='canonical':self.canon.append(a.get('href'))
  if t=='link' and a.get('hreflang'):self.alts[a['hreflang']]=a.get('href')
 def handle_endtag(self,t):
  if t in ('script','style'):self.hidden=max(0,self.hidden-1)
  if t=='title':self.in_title=False
  if t=='h1':self.in_h1=False
 def handle_data(self,s):
  if self.hidden:return
  if self.in_title:self.title.append(s)
  if self.in_h1:self.h1.append(s)
  self.visible.append(s)
def get(path):
 assert path.startswith('/') and not path.startswith('/api/') and not path.startswith('//')
 t=time.monotonic()
 with tempfile.TemporaryDirectory() as d:
  headers_path=Path(d)/'headers';body_path=Path(d)/'body'
  r=subprocess.run(['curl','-fsS','--max-time','30','-A','audit-bot','-D',str(headers_path),'-o',str(body_path),'-w','%{http_code}',BASE+path],capture_output=True,text=True,check=True)
  headers={k.strip().lower():v.strip() for line in headers_path.read_text().splitlines() if ':' in line for k,v in [line.split(':',1)]}
  return int(r.stdout),BASE+path,headers,body_path.read_text(),round(time.monotonic()-t,3)

paths=[f'/{l}' for l in LOCALES]+[f'/{l}/airport/{c}' for l,codes in PILOT.items() for c in codes]+[f'/{l}/flight-map' for l in PILOT]
rows=[]
for path in paths:
 try:
  status,url,headers,html,elapsed=get(path);p=Page();p.feed(html);locale=path.split('/')[1]
  row={'path':path,'status':status,'lang':p.lang,'title':''.join(p.title),'h1':''.join(p.h1),'description':p.metas.get('description'),'canonical':p.canon,'hreflang':p.alts,'robots':p.metas.get('robots'),'x_robots':headers.get('x-robots-tag'),'ssr_links':len(p.links),'text_chars_excluding_scripts_styles':len(' '.join(p.visible)),'fetch_seconds':elapsed}
  row['issues']=[]
  for ok,label in [(status==200,'HTTP'),(p.lang==locale,'lang'),(p.canon==[BASE+path],'canonical'),(bool(row['h1']),'h1'),(bool(row['description']),'description'),('noindex' not in str(row['robots'])+str(row['x_robots']),'noindex'),(set(LOCALES).issubset(p.alts),'hreflang')]:
   if not ok:row['issues'].append(label)
  rows.append(row);print(path,status,row['issues'],flush=True)
 except Exception as e:rows.append({'path':path,'issues':[str(e)]});print(path,str(e),flush=True)
 time.sleep(.15)
(OUT/'pages.json').write_text(json.dumps({'checked_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'limitations':'SSR text excludes scripts/styles, not a rendered visibility or browser performance test. Single client region. No crawler impersonation.','pages':rows},ensure_ascii=False,indent=2))
print('PASS',sum(not r['issues'] for r in rows),'/',len(rows))
