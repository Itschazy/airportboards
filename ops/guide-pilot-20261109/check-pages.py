import sys,json,pathlib,urllib.request,concurrent.futures,re,hashlib
from bs4 import BeautifulSoup
base=sys.argv[1];mode=sys.argv[2];out=pathlib.Path('outputs/guide-pilot-20261109');D=pathlib.Path('data/airport-guide')
codes=['KZN','OVB','AYT','HRG','SSH','IST'];locs=['ru'] if mode=='before' else ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']
paths=[(l,c,'') for l in locs for c in codes]+[('ru',c,'/arrivals') for c in codes]
norm=lambda s:' '.join(s.split())
def check(t):
 l,c,suf=t;p=f'/{l}/airport/{c}{suf}'
 with urllib.request.urlopen(urllib.request.Request(base+p,headers={'User-Agent':'audit-bot'}),timeout=45) as r:status=r.status;html=r.read().decode()
 s=BeautifulSoup(html,'html.parser');j=[]
 for el in s.select('script[type="application/ld+json"]'):
  data=json.loads(el.string or el.get_text());j.extend(data if isinstance(data,list) else [data])
 def walk(x):
  if isinstance(x,dict):
   if x.get('@type')=='FAQPage':yield x
   for v in x.values():yield from walk(v)
  elif isinstance(x,list):
   for v in x:yield from walk(v)
 faq=[e['acceptedAnswer']['text'] for x in walk(j) for e in x.get('mainEntity',[])]
 for e in s(['script','style']):e.decompose()
 text=norm(s.get_text(' ',strip=True));g=json.loads((D/(c+'.json')).read_text());blocks=g['blocks'] if l=='ru' else list(json.loads((D/l/(c+'.json')).read_text())['blocks'].values())
 if mode!='before':
  for b in blocks:
   assert norm(b['text']) in text,(p,'missing HTML',b['text'][:50]);assert b['text'] in faq,(p,'FAQ differs',b['text'][:50])
  assert len(s.find_all('h1'))==1,(p,'H1')
  canonical=s.select_one('link[rel=canonical]')['href'];assert canonical=='https://airportsboard.live'+p,(p,canonical)
  assert not any('noindex' in x.get('content','') for x in s.select('meta[name=robots]')),(p,'noindex')
 return {'path':p,'status':status,'h1':s.h1.get_text(' ',strip=True),'characters':len(text),'contentHash':hashlib.sha256(text.encode()).hexdigest(),'faqCount':len(faq),'guideBlocks':len(blocks),'htmlGuideVerified':mode!='before'}
def collect(t):
 try:return check(t)
 except Exception as e:return {'path':'/'+t[0]+'/airport/'+t[1]+t[2], 'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(collect,paths))
(out/(mode+'-pages.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2));errors=[r for r in results if 'error' in r];print('FAIL' if errors else 'PASS',mode,len(results),'pages',json.dumps(errors,ensure_ascii=False));sys.exit(1 if errors else 0)
