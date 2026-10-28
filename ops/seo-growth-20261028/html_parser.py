import subprocess,json,re,html,time
from pathlib import Path
from html.parser import HTMLParser
BASE='https://airportsboard.live'
LOCS=['en','ru','zh','ar','de','ko','ja','fr','es','it','hi','tr']
def norm(t): return re.sub(r'\s+',' ',html.unescape(t)).strip()
class Page(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.text=[];self.links=[];self.meta={};self.h1=0;self.guide=0;self.ld=[];self.in_script=False;self.in_style=False;self.ldbuf=None;self.lang=None;self.title=[];self.in_title=False
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='html':self.lang=d.get('lang')
  if t=='h1':self.h1+=1
  if 'ag-lead' in d.get('class','').split():self.guide+=1
  if t=='link':self.links.append(d)
  if t=='a':self.links.append({'rel':'anchor',**d})
  if t=='meta':self.meta[d.get('name',d.get('property',''))]=d.get('content','')
  if t=='script':
   self.in_script=True
   if d.get('type')=='application/ld+json': self.ldbuf=[]
  if t=='style':self.in_style=True
  if t=='title':self.in_title=True
 def handle_endtag(self,t):
  if t=='script':
   if self.ldbuf is not None:
    try:self.ld.append(json.loads(''.join(self.ldbuf)))
    except Exception as e:self.ld.append({'parse_error':str(e)})
   self.ldbuf=None;self.in_script=False
  if t=='style':self.in_style=False
  if t=='title':self.in_title=False
 def handle_data(self,d):
  if self.in_script:
   if self.ldbuf is not None:self.ldbuf.append(d)
   return
  if self.in_style:return
  if self.in_title:self.title.append(d)
  self.text.append(d)
def nodes(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from nodes(v)
 elif isinstance(x,list):
  for v in x:yield from nodes(v)
