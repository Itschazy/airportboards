#!/usr/bin/env python3
"""Безопасная проверка HTTP, ассетов и RSC: все запросы только audit-bot.
Не обращаемся к /api/flights или прогреву; это реальные платные ручки.
"""
import subprocess, tempfile, pathlib, json, re
base='https://ru-test.airportsboard.live'
with tempfile.TemporaryDirectory() as tmp:
    p=pathlib.Path(tmp)
    def request(path, extra=()):
        command=['curl','-A','audit-bot','-sS','--connect-timeout','10','--max-time','30',
                 '--resolve','ru-test.airportsboard.live:443:85.193.89.51',
                 '-D',str(p/'headers'),'-o',str(p/'body'),'-w','%{http_code} %{time_total}',*extra,base+path]
        out=subprocess.check_output(command,text=True).strip()
        headers=(p/'headers').read_text().lower(); body=(p/'body').read_bytes()
        status=int(out.split()[0])
        print(path, out, len(body), 'bytes')
        assert 'x-airportsboard-edge: ru-spb-test' in headers
        assert 'x-robots-tag: noindex, nofollow' in headers
        return status,headers,body
    status,headers,body=request('/ru')
    assert status==200 and b'<html' in body
    html=body.decode()
    for page in ['/ru/airport/AYT','/ru/airport/AYT/arrivals']:
        status,_,pagebody=request(page)
        assert status==200
        html += pagebody.decode()
    assets=sorted(set(re.findall(r'(?:src|href)="(/_next/static/[^"?]+)',html)))
    assert assets
    for path in assets:
        status,headers,_=request(path)
        assert status==200
    for path in ['/api/health','/api/airports/search?q=AYT','/robots.txt']:
        status,headers,body=request(path)
        assert status==200
        if path=='/robots.txt':assert b'Disallow: /' in body
    status,headers,body=request('/ru?_rsc=edge-audit',('-H','RSC: 1'))
    assert status==200 and 'text/x-component' in headers
    assert 'x-cache: hit' not in headers
    print('PASS: HTML/assets/API/RSC/HTTPS/noindex; paid flight endpoints were not requested')
