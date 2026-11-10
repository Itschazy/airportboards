import ssl,os,re,json,pathlib,subprocess,urllib.request
sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();token=os.environ.get('GITHUB_TOKEN','')
if not token:
 for l in pathlib.Path('/Users/whereiszhenya/.env.github').read_text().splitlines():
  m=re.match(r'(?:export\s+)?GITHUB_TOKEN\s*=\s*(.*)',l)
  if m:token=m[1].strip().strip('\"\'')
assert token,'No configured GitHub token'
url='https://api.github.com/repos/Itschazy/airportboards/actions/runs?head_sha='+sha
with urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'airportsboard-audit'}),timeout=25,context=ssl.create_default_context(cafile='/etc/ssl/cert.pem')) as res:d=json.load(res)
out=[{k:r[k] for k in ['id','name','status','conclusion','head_sha','html_url','created_at','updated_at']} for r in d['workflow_runs']]
pathlib.Path('ops/guide-reaudit-20261110/ci.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
