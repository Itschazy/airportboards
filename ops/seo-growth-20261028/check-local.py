# Проверка именно серверного HTML: браузерная гидратация не должна быть нужна для справочной.
from html_parser import *
import sys
ORIGIN='http://localhost:3099'
P=Path('data/airport-guide'); results=[];fail=[]
for code in ['LWN','BJV']:
 ru=json.loads((P/(code+'.json')).read_text())
 for loc in LOCS:
  guide=ru if loc=='ru' else json.loads((P/loc/(code+'.json')).read_text())
  blocks=guide['blocks'] if loc=='ru' else list(guide['blocks'].values())
  for suffix in ['', '/arrivals']:
   path=f'/{loc}/airport/{code}{suffix}'
   r=subprocess.run(['curl','-A','audit-bot','-sS','--max-time','60','--write-out','\n%{http_code}',ORIGIN+path],text=True,capture_output=True)
   if r.returncode:fail.append(path+': '+r.stderr);continue
   body,status=r.stdout.rsplit('\n',1); p=Page();p.feed(body)
   text=norm(' '.join(p.text));ld=list(nodes(p.ld)); qs=[n for n in ld if n.get('@type')=='Question']
   answers=[norm(q.get('acceptedAnswer',{}).get('text','')) for q in qs]
   errors=[]
   if status!='200':errors.append('HTTP '+status)
   if p.h1!=1:errors.append('h1 '+str(p.h1))
   if not p.guide:errors.append('no ag-lead')
   if [x.get('href') for x in p.links if x.get('rel')=='canonical']!=['https://airportsboard.live'+path]:errors.append('canonical')
   if 'noindex' in p.meta.get('robots',''):errors.append('noindex')
   if len({x.get('hreflang') for x in p.links if x.get('hreflang')})<12:errors.append('hreflang')
   for b in blocks:
    if norm(b['text']) not in text:errors.append('SSR missing '+b['title'])
    if norm(b['text']) not in answers:errors.append('FAQ missing '+b['title'])
   if guide.get('about') and norm(guide['about']) not in text:errors.append('about missing')
   if len([q.get('name') for q in qs])!=len(set(q.get('name') for q in qs)):errors.append('duplicate questions')
   if loc!='ru' and re.search('[А-Яа-яЁё]',text.replace('Русский','')):errors.append('Cyrillic')
   if re.search(r'Airport airport',text,re.I):errors.append('Airport airport')
   results.append({'path':path,'status':status,'guide':p.guide,'FAQ_questions':len(qs),'errors':errors})
   fail.extend(path+': '+e for e in errors)
   print(path, 'OK' if not errors else errors,flush=True)
if len(sys.argv)>1:Path(sys.argv[1]).write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('RESULT',len(results),'pages;',len(fail),'failures')
if fail:print('\n'.join(fail));sys.exit(1)
