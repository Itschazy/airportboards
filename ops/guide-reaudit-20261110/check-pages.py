import sys,json,pathlib,urllib.request,concurrent.futures,re,hashlib,ssl
from bs4 import BeautifulSoup
base=sys.argv[1];mode=sys.argv[2];out=pathlib.Path('ops/guide-reaudit-20261110');D=pathlib.Path('data/airport-guide')
codes=sorted(p.stem for p in D.glob('*.json'));locs=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']
paths=[(l,c,suf) for l in locs for c in codes for suf in ['', '/arrivals']]
if mode=='production':
 changed=json.loads((out/'changed-guides.json').read_text())
 paths=[(l,c,suf) for l in locs for c in changed for suf in ['', '/arrivals']]
norm=lambda s:' '.join(s.split())
# Use the macOS system CA bundle; retain certificate and hostname verification.
tls=ssl.create_default_context(cafile='/etc/ssl/cert.pem')
def check(t):
 l,c,suf=t;p=f'/{l}/airport/{c}{suf}'
 with urllib.request.urlopen(urllib.request.Request(base+p,headers={'User-Agent':'audit-bot'}),timeout=45,context=tls) as r:status=r.status;html=r.read().decode()
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
  about=g.get('about') if l=='ru' else json.loads((D/l/(c+'.json')).read_text()).get('about')
  if about: assert norm(about) in text,(p,'missing about')
 return {'path':p,'status':status,'h1':s.h1.get_text(' ',strip=True),'characters':len(text),'contentHash':hashlib.sha256(text.encode()).hexdigest(),'faqCount':len(faq),'guideBlocks':len(blocks),'htmlGuideVerified':mode!='before'}
def collect(t):
 try:return check(t)
 except Exception as e:return {'path':'/'+t[0]+'/airport/'+t[1]+t[2], 'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6 if mode=='production' else 4) as pool:
 results=[]
 for result in pool.map(collect,paths):
  results.append(result)
  if len(results)%50==0:
   (out/(mode+'-checkpoint.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2))
   print(f'{mode}: {len(results)}/{len(paths)}, errors={sum("error" in r for r in results)}',flush=True)
(out/(mode+'-pages.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2));errors=[r for r in results if 'error' in r];print('FAIL' if errors else 'PASS',mode,len(results),'pages',json.dumps(errors,ensure_ascii=False));sys.exit(1 if errors else 0)
