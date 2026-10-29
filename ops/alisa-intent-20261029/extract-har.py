#!/usr/bin/env python3
"""Offline-only extraction of public research fields from a manually exported HAR.

HAR files can contain credentials and unrelated conversations. Never copy the raw
file into the repo. An explicit private case manifest restricts accepted dialogs;
only allowlisted fields leave this script. Missing flags remain unknown, not false.
No HTTP requests, cookie access, or RPC replay are performed.
Source URL paths/titles still require manual review before publication; unknown
secrets in paths cannot be recognized by a general URL sanitizer.
"""
import argparse
import base64
import json
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode


def parsed(value):
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return None


def public_url(value):
    if not isinstance(value, str):
        return None
    try:
        p = urlsplit(value)
        if p.scheme not in ('https', 'http') or not p.hostname or p.username or p.password:
            return None
        if p.hostname in ('rpc.alice.ya.ru', 'passport.yandex.ru') or '/alice/chat/' in p.path:
            return None
        # Keep a few observed functional parameters; drop tracking and unknown tokens.
        query = urlencode([(k, v) for k, v in parse_qsl(p.query)
                           if k in ('event', 'lang', 'date')
                           or (p.hostname == 'forum.awd.ru' and k == 't' and v.isdigit())])
        return urlunsplit((p.scheme, p.netloc, p.path, query, ''))
    except ValueError:
        return None


def extract(har, cases):
    allowed = {c['dialogId']: c for c in cases}
    found = {}
    for entry in har.get('log', {}).get('entries', []):
        p = urlsplit(entry.get('request', {}).get('url', ''))
        if p.hostname != 'rpc.alice.ya.ru' or p.path != '/dialog/read_dialog':
            continue
        content = entry.get('response', {}).get('content', {})
        raw = content.get('text', '')
        try:
            if content.get('encoding') == 'base64':
                raw = base64.b64decode(raw, validate=True).decode('utf-8')
            data = parsed(raw)
        except (ValueError, UnicodeError):
            continue
        if not isinstance(data, dict):
            continue
        # Do not inspect inflight_messages: it may contain unrelated account data.
        messages = data.get('messages', [])
        if not isinstance(messages, list):
            continue
        for dialog_id, case in allowed.items():
            own = [m for m in messages if isinstance(m, dict) and m.get('dialog_id') == dialog_id]
            queries = [m.get('content', {}).get('request', {}).get('request_text') for m in own]
            # A saved multi-turn chat can contain unrelated private questions.
            # Fail closed instead of exporting every card after any seed match.
            nonempty = [q for q in queries if isinstance(q, str) and q.strip()]
            if nonempty != [case['query']]:
                continue
            cards = [card.get('neuro_structured_blocks_card') for m in own
                     for card in m.get('content', {}).get('response', {}).get('cards', [])
                     if isinstance(card, dict) and card.get('neuro_structured_blocks_card')]
            if not cards:
                continue
            expansions, sources = [], []
            available = False
            for card in cards:
                items = parsed(card.get('json_rephrase_items'))
                if isinstance(items, list):
                    available = True
                    for item in items:
                        if not isinstance(item, dict) or not isinstance(item.get('Query'), str):
                            continue
                        expansions.append({'query': item['Query'], 'domain': item.get('Domain'),
                                           'isOnlyPotential': item.get('IsOnlyPotential')
                                           if isinstance(item.get('IsOnlyPotential'), bool) else None})
                items = parsed(card.get('json_source_data'))
                if isinstance(items, list):
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        url = public_url(item.get('FullUrl'))
                        if url:
                            count = item.get('UsedAsFootnoteCount')
                            sources.append({'url': url, 'title': item.get('DocumentTitle'),
                                            'reportedFootnoteCount': count if type(count) is int else None})
            found[case['id']] = {'id': case['id'], 'query': case['query'],
                                'observedAt': entry.get('startedDateTime'),
                                'expansionsAvailable': available, 'expansions': expansions,
                                'sourceCandidates': sources}
    return sorted(found.values(), key=lambda x: x['id'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('har')
    parser.add_argument('private_manifest', help='JSON list: id, query, dialogId; do not commit')
    parser.add_argument('output')
    args = parser.parse_args()
    with open(args.har) as f:
        har = json.load(f)
    with open(args.private_manifest) as f:
        cases = json.load(f)
    result = extract(har, cases)
    with open(args.output, 'w') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'Extracted {len(result)} registered cases; no network requests.')
