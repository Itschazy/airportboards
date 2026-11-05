import json,subprocess,sys
from pathlib import Path
from html.parser import HTMLParser
base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:3166'
iata=sys.argv[2] if len(sys.argv)>2 else 'ORK'
assert len(iata)==3 and iata.isascii() and iata.isalpha() and iata.isupper()
root=Path('data/airport-guide')
class P(HTMLParser):
 def __init__(self):super().__init__();self.in_script=False;self.skip=False;self.buf='';self.jsonld=[];self.visible=[];self.canonical=[];self.langs=[];self.robots=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t in ['script','style']:self.skip=True
  if t=='script' and a.get('type')=='application/ld+json':self.in_script=True;self.buf=''
  if t=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
  if t=='link' and 'hreflang' in a:self.langs.append(a['hreflang'])
  if t=='meta' and a.get('name')=='robots':self.robots.append(a.get('content',''))
 def handle_endtag(self,t):
  if t=='script' and self.in_script:self.jsonld.append(json.loads(self.buf));self.in_script=False
  if t in ['script','style']:self.skip=False
 def handle_data(self,s):
  if self.in_script:self.buf+=s
  elif not self.skip:self.visible.append(s)
def walk(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from walk(v)
 elif isinstance(x,list):
  for v in x:yield from walk(v)
for lang in ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']:
 original=json.loads((root/f'{iata}.json' if lang=='ru' else root/lang/f'{iata}.json').read_text())
 blocks=original['blocks'] if lang=='ru' else list(original['blocks'].values())
 for suffix in ['', '/arrivals']:
  path=f'/{lang}/airport/{iata}{suffix}'
  raw=subprocess.check_output(['curl','-fsS','--compressed','--max-time','45','-A','audit-bot',base+path]).decode()
  p=P();p.feed(raw)
  texts=' '.join(p.visible)
  faq=[v for x in p.jsonld for v in walk(x) if v.get('@type')=='FAQPage']
  answers=[q['acceptedAnswer']['text'] for f in faq for q in f['mainEntity']]
  assert p.canonical==['https://airportsboard.live'+path],(path,p.canonical)
  assert (not p.langs if any('noindex' in r for r in p.robots) else len(set(p.langs))==13),(path,p.langs,p.robots)
  if original.get('about'): assert original['about'] in texts,(path,'missing about')
  for b in blocks:
   assert b['text'] in texts,(path,'missing rendered text',b['title'])
   assert answers.count(b['text'])==1,(path,'missing/duplicate FAQ answer',b['title'])
  print('PASS',path,len(blocks),'rendered blocks + unique FAQ answers; about/canonical/hreflang consistent with robots',p.robots)
print('PASS 24 pages / 12 locales')
