"""Read only audit-bot: every canonical ORK locale appears once in its stable shard."""
import sys, subprocess, xml.etree.ElementTree as ET, json
base=sys.argv[1].rstrip('/')
expected=0 if '--absent' in sys.argv else 12
path='/airport/ORK'; h=2166136261
for c in path: h=((h^ord(c))*16777619)&0xffffffff
shard=h%20
# Системный curl использует рабочее хранилище CA macOS; проверку TLS не отключаем.
xml=subprocess.check_output(['curl','--fail','--silent','--show-error','--compressed',
    '--max-time','60','-A','audit-bot',f'{base}/sitemap-{shard}.xml'])
root=ET.fromstring(xml)
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9','x':'http://www.w3.org/1999/xhtml'}
rows=[u for u in root.findall('s:url',ns) if u.find('s:loc',ns).text.endswith(path)]
assert len(rows)==expected,(len(rows),expected)
if expected:
 locales={'en','ru','zh','ar','de','ko','ja','fr','es','it','hi','tr'}
 urls={f'https://airportsboard.live/{loc}{path}' for loc in locales}
 assert {u.find('s:loc',ns).text for u in rows}==urls
 for row in rows:
  links={x.attrib['hreflang']:x.attrib['href'] for x in row.findall('x:link',ns)}
  assert set(links)==locales|{'x-default'}
  assert {links[l] for l in locales}==urls
  assert links['x-default']==f'https://airportsboard.live/en{path}'
print(json.dumps({'base':base,'shard':shard,'ORK_loc_count':len(rows),'expected':expected,'result':'PASS'}))
