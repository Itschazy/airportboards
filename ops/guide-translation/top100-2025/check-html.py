#!/usr/bin/env python3
"""Проверка реального локального SSR после сборки, а не наличия исходных JSON.

Открытые и свёрнутые <details> должны содержать одинаковые с FAQPage факты.
Иначе новая справочная существует в файлах, но не доступна читателю/поисковику.
Только loopback: этот тест нельзя случайно направить на платный прод. Источники
аэропортов здесь не скачиваются; их проверка выполняется отдельно обычным Chrome.
"""
import argparse
import html.parser
import json
from pathlib import Path
import re
import subprocess
import unicodedata
import urllib.parse

ROOT = Path(__file__).resolve().parents[3]
LANGS = 'ru en de fr es it tr zh ja ko ar hi'.split()


def norm(text):
    return ' '.join(unicodedata.normalize('NFC', text).split())


class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.hidden = 0
        self.guide_depth = None
        self.guide_text = []
        self.text = []
        self.ld_depth = None
        self.ld_parts = []
        self.ld = []
        self.leads = 0
        self.source_rows = 0
        self.guide_links = 0
        self.lead_depth = None
        self.guide_dates = []
        self.canonical = []
        self.alternates = {}
        self.robots = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name') == 'robots':
            self.robots.append(attrs.get('content', ''))
        if tag == 'link' and attrs.get('rel') == 'alternate' and attrs.get('hreflang'):
            self.alternates[attrs['hreflang']] = attrs.get('href', '')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href', ''))
        if 'ag-lead' in attrs.get('class', '').split():
            self.leads += 1
        if 'ag-src' in attrs.get('class', '').split():
            self.source_rows += 1
        if tag == 'a' and self.guide_depth is not None:
            self.guide_links += 1
        if tag == 'time' and self.lead_depth is not None:
            self.guide_dates.append(attrs.get('datetime'))
        # HTML void элементы не создают уровень вложенности. Счётчики иначе
        # сбиваются на <br>, и скрипт мог бы принять текст соседнего блока за guide.
        if tag in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            return
        self.stack.append(tag)
        if 'ag-lead' in attrs.get('class', '').split():
            self.lead_depth = len(self.stack)
        if tag in {'script', 'style'}:
            self.hidden += 1
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.ld_depth = len(self.stack)
            self.ld_parts = []
        if tag == 'div' and 'ag-body' in attrs.get('class', '').split():
            self.guide_depth = len(self.stack)

    def handle_endtag(self, tag):
        if tag not in self.stack:
            return
        depth = len(self.stack) - self.stack[::-1].index(tag)
        if self.ld_depth is not None and depth == self.ld_depth:
            self.ld.append(json.loads(''.join(self.ld_parts)))
            self.ld_depth = None
        if self.guide_depth is not None and depth == self.guide_depth:
            self.guide_depth = None
        if self.lead_depth is not None and depth == self.lead_depth:
            self.lead_depth = None
        removed = self.stack[depth - 1:]
        self.hidden -= sum(t in {'script', 'style'} for t in removed)
        self.stack = self.stack[:depth - 1]

    def handle_data(self, data):
        if self.ld_depth is not None:
            self.ld_parts.append(data)
        if not self.hidden:
            self.text.append(data)
            if self.guide_depth is not None:
                self.guide_text.append(data)


def objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from objects(child)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='http://localhost:3099')
    ap.add_argument('--codes', nargs='*')
    ap.add_argument('--locales', nargs='*', choices=LANGS, default=LANGS)
    ap.add_argument('--output', default='/tmp/top100-html-results.json')
    args = ap.parse_args()
    base = urllib.parse.urlsplit(args.base)
    if base.scheme != 'http' or base.hostname not in {'localhost', '127.0.0.1', '::1'} or base.username or base.password or base.path not in {'', '/'} or base.query or base.fragment:
        ap.error('Разрешён только локальный http loopback без пути и реквизитов')
    ranking = json.loads((ROOT / 'ops/guide-collection/top100-2025/ranking.json').read_text())
    all_codes = [row[2] for row in ranking['rows']]
    codes = args.codes if args.codes is not None else all_codes
    if not codes or any(not re.fullmatch('[A-Z]{3}', code) or not (ROOT / f'data/airport-guide/{code}.json').is_file() for code in codes):
        ap.error('Каждый IATA должен иметь русский оригинал справочной')
    results = []
    for code in codes:
        ru = json.loads((ROOT / f'data/airport-guide/{code}.json').read_text())
        for locale in args.locales:
            route = f'/{locale}/airport/{code}'
            errors = []
            try:
                response = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '60', '-A', 'audit-bot', args.base.rstrip('/') + route], capture_output=True, text=True, check=True)
                page = Page()
                page.feed(response.stdout)
                expected = ru['blocks'] if locale == 'ru' else list(json.loads((ROOT / f'data/airport-guide/{locale}/{code}.json').read_text())['blocks'].values())
                visible = norm(' '.join(page.guide_text))
                faq_pages = [obj for ld in page.ld for obj in objects(ld) if obj.get('@type') == 'FAQPage']
                # После добавления TFU проверяем и SEO-маршрут: 200 сам по себе не
                # гарантирует index или связи12языковых версий.
                expected_alternates = {lang: f'https://airportsboard.live/{lang}/airport/{code}' for lang in LANGS}
                expected_alternates['x-default'] = f'https://airportsboard.live/en/airport/{code}'
                if page.alternates != expected_alternates:
                    errors.append('Некорректный полный набор hreflang')
                if not page.robots or any('noindex' in value.lower() for value in page.robots):
                    errors.append('Страница справочной не разрешена к индексированию')
                if page.leads != 1:
                    errors.append(f'ag-lead: {page.leads}, ожидалась 1')
                if page.source_rows:
                    errors.append('Остались публичные строки источников ag-src')
                if page.guide_links:
                    errors.append('Остались ссылки под справочными блоками')
                if page.guide_dates != [ru['checked']]:
                    errors.append('Потеряна дата проверки справочной')
                if len(faq_pages) != 1:
                    errors.append(f'FAQPage: {len(faq_pages)}, ожидалась 1')
                questions = [q for faq in faq_pages for q in faq.get('mainEntity', [])]
                answers = [norm(q.get('acceptedAnswer', {}).get('text', '')) for q in questions]
                for block in expected:
                    text = norm(block['text'])
                    if text not in visible:
                        errors.append('Нет полного текста блока в SSR: ' + block['title'])
                    if text not in answers:
                        errors.append('Нет полного текста блока в FAQ: ' + block['title'])
                names = [norm(q.get('name', '')).casefold() for q in questions]
                if len(set(names)) != len(names):
                    errors.append('Дубли вопросов FAQ')
                if any(re.search(r'\bairport\s+airport\b', name) for name in names):
                    errors.append('Airport airport в вопросе')
                # Проверяем только саму справочную: русский автноним в меню языков
                # допустим. Код зоны 1А/Т1 сохраняется ровно как в оригинале.
                codes_ru = re.findall(r'[A-Za-zА-Яа-яЁё0-9–-]*\d[A-Za-zА-Яа-яЁё0-9–-]*', json.dumps(ru, ensure_ascii=False))
                foreign = visible
                for marker in codes_ru:
                    foreign = foreign.replace(marker, '')
                if locale != 'ru' and re.search('[А-Яа-яЁё]', foreign):
                    errors.append('Кириллица в иностранной справочной')
                if not any(urllib.parse.urlsplit(url).path.rstrip('/') == route for url in page.canonical):
                    errors.append('Неверный canonical')
                if len(expected) != len(ru['blocks']):
                    errors.append('Потеря переводных блоков')
            except Exception as error:
                errors.append(str(error))
            results.append({'route': route, 'errors': errors})
            if errors:
                print(route + ': ' + '; '.join(errors), flush=True)
        print(f'{code}: проверено {len(args.locales)} локалей', flush=True)
    Path(args.output).write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    bad = sum(bool(row['errors']) for row in results)
    print(f'Локальный SSR/FAQ: {len(results)-bad}/{len(results)}, ошибок страниц {bad}.')
    return int(bad != 0)


if __name__ == '__main__':
    raise SystemExit(main())
