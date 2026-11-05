"""Real local nginx cache/header-filter test. All traffic stays on loopback."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, os, socket, subprocess, tempfile, threading, time, urllib.request


def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0));return s.getsockname()[1]

upstream,front=port(),port()
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        time.sleep(.18)
        self.send_response(200);self.send_header('Content-Length','7');self.end_headers();self.wfile.write(b'fixture')
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',upstream),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
nginx=os.environ.get('NGINX_BIN','/opt/homebrew/bin/nginx')
results=[]
with tempfile.TemporaryDirectory(prefix='ab-nginx-timing-') as folder:
    root=Path(folder);maps=Path(__file__).with_name('maps.conf').read_text()
    config=f'''daemon off; master_process off; pid {root}/nginx.pid;
error_log {root}/error.log; events {{ worker_connections 64; }}
http {{ access_log off; proxy_temp_path {root}/temp;
proxy_cache_path {root}/cache keys_zone=abtest:1m inactive=1m;
{maps}
map $http_rsc $skip {{ default 1; "" 0; }}
server {{ listen 127.0.0.1:{front};
location / {{ proxy_pass http://127.0.0.1:{upstream};
proxy_cache abtest; proxy_cache_valid 200 1s;
proxy_cache_bypass $skip; proxy_no_cache $skip;
proxy_cache_lock on; proxy_cache_background_update on; proxy_cache_use_stale updating;
add_header X-Cache $upstream_cache_status always;
add_header Server-Timing "$ab_edge_timing$ab_origin_timing, ab-cache;desc=$ab_cache_timing" always;
}} }} }}'''
    (root/'nginx.conf').write_text(config)
    subprocess.run([nginx,'-t','-p',str(root),'-c',str(root/'nginx.conf')],check=True,capture_output=True)
    proc=subprocess.Popen([nginx,'-p',str(root),'-c',str(root/'nginx.conf')],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    try:
        for _ in range(100):
            try:
                with socket.create_connection(('127.0.0.1',front),timeout=.1):break
            except OSError:time.sleep(.02)
        def get(headers={}):
            req=urllib.request.Request(f'http://127.0.0.1:{front}/board',headers={'User-Agent':'audit-bot',**headers})
            with urllib.request.urlopen(req,timeout=5) as response:
                assert response.read()==b'fixture'; raw=response.headers['Server-Timing']; state=response.headers['X-Cache']
            values={}
            for segment in raw.split(','):
                parts=segment.strip().split(';');values[parts[0]]=dict(x.split('=',1) for x in parts[1:])
            edge=float(values['ab-edge']['dur']);origin=float(values['ab-origin']['dur']) if 'ab-origin' in values else None
            assert values['ab-cache']['desc']==state
            results.append({'state':state,'edgeMs':edge,'originMs':origin,'header':raw})
            return state,edge,origin
        s,e,o=get();assert s=='MISS' and o>=150 and e>=o-10
        s,e,o=get();assert s=='HIT' and o is None and e<100
        s,e,o=get({'RSC':'1'});assert s=='BYPASS' and o>=150
        time.sleep(2.1)
        s,e,o=get();assert s=='STALE' and o is None and e<100
        s,e,o=get();assert s=='UPDATING' and o is None and e<100
        time.sleep(.3)
        s,e,o=get();assert s=='HIT' and o is None
    finally:
        proc.terminate();proc.wait(timeout=5)
server.shutdown();server.server_close()
print(json.dumps({'pass':True,'results':results},indent=2))
