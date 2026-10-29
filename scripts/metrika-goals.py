#!/usr/bin/env python3
"""Сверка целей с lib/track.ts; по умолчанию только чтение.

29.10.2026: reachGoal уже отправлялся, но в счётчике была только автоцель формы.
Нельзя создавать дубликаты при повторном запуске или перезаписывать чужую цель.
--apply допустим только после согласия владельца на изменение настроек Метрики.
Токен читается вне репозитория, не попадает в вывод/URL/отчёт.
"""
import argparse
import json
import os
from pathlib import Path
import re
import ssl
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent

def missing_goals(manifest, existing):
    missing = []
    for wanted in manifest:
        key = wanted['conditions'][0]['url']
        matches = [g for g in existing if g.get('type') == 'action' and
                   g.get('conditions') == wanted['conditions']]
        if len(matches) > 1:
            raise ValueError('Дубликаты существующей цели: ' + key)
        if matches:
            continue
        if any(g.get('name') == wanted['name'] or any(c.get('url') == key for c in g.get('conditions', [])) for g in existing):
            raise ValueError('Конфликт имени/условия, требуется ручная проверка: ' + key)
        missing.append(wanted)
    return missing

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'ops/metrika-growth-20261029/goals.json').read_text())
    source = (ROOT / 'lib/track.ts').read_text().split('export const GOALS = {')[1].split('} as const')[0]
    ids = re.findall(r"^  \w+: '([^']+)'", source, re.M)
    assert sorted(ids) == sorted(g['conditions'][0]['url'] for g in manifest['goals'])
    assert len(ids) == len(set(ids))
    token = os.environ.get('YANDEX_OAUTH_TOKEN')
    if not token:
        token = next(line.split('=', 1)[1].strip().strip('\"\'') for line in
                     (Path.home() / '.env.yandex-metrika').read_text().splitlines()
                     if line.startswith('YANDEX_OAUTH_TOKEN='))
    # Явный системный CA лишь при наличии; проверку TLS не отключаем.
    ca = '/etc/ssl/cert.pem'
    context = ssl.create_default_context(cafile=ca if Path(ca).exists() else None)
    url = f"https://api-metrika.yandex.net/management/v1/counter/{manifest['counter']}/goals"
    def request(body=None):
        req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                  headers={'Authorization': 'OAuth ' + token, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, context=context, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            # Не печатаем серверный ответ, который может содержать параметры запроса.
            raise RuntimeError(f'Метрика HTTP {error.code}; остановлено без повторной записи') from None
    before = request()['goals']
    missing = missing_goals(manifest['goals'], before)
    print('Целей в коде:', len(ids), 'в счётчике:', len(before), 'добавить:', len(missing))
    for goal in missing:
        print(goal['conditions'][0]['url'], '—', goal['name'])
    if args.apply:
        for goal in missing:
            # При неоднозначном исходе не повторяем POST: следующий запуск сначала
            # заново прочитает счётчик и пропустит уже созданную цель.
            request({'goal': goal})
        after = request()['goals']
        assert not missing_goals(manifest['goals'], after), 'Не все цели появились'
        assert all(g in after for g in before), 'Существующая цель изменилась'
        print('Подтверждено чтением:', len(after), 'целей; существующие сохранены')
    else:
        after = before
        print('DRY RUN: настройки не изменены')
    if args.output:
        args.output.write_text(json.dumps({'applied': args.apply, 'before': before, 'after': after,
                            'missingBefore': missing}, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
