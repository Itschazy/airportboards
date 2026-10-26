#!/usr/bin/env python3
"""Выборка проверяет сложные условия всех партий, а не случайные простые Wi-Fi строки.

Запросы каждый раз читают актуальные runtime JSON после интеграции. Сохранённый
промпт не считается отправкой или проверкой; ответы и решения записываются отдельно.
"""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / 'chatgpt-prompts'
NAMES = dict(en='английский', de='немецкий', fr='французский', es='испанский', it='итальянский', tr='турецкий', zh='китайский', ja='японский', ko='корейский', ar='арабский', hi='хинди')
DEFAULT = [('ATL','lounges'),('SHA','storage'),('STN','lounges'),('CAI','lounges'),('AUH','storage'),('XMN','taxi')]
SPECIAL = {'hi':(1,('SZX','sleep')), 'ja':(3,('OKA','transport')), 'ko':(5,('CJU','kids')), 'ar':(3,('LIM','wifi')), 'fr':(5,('OKA','transport')), 'de':(5,('SZX','sleep'))}
INTRO = '''Независимая проверка перевода справочной аэропортов: {language}. НЕ используй поиск в интернете. Ниже 6 пар русский оригинал → перевод. Оригинал — источник фактов; не добавляй собственные цены, советы, условия или доступность услуг.

Найди конкретные ошибки смысла, чисел и валют, условий (кому/когда/бесплатно/платно/до или после досмотра), имён и естественности. Для каждой: аэропорт/блок, точная ошибочная цитата, минимальная правка и причина. Если ошибки нет, не придумывай её ради ответа. Раздели обязательное и факультативное.

Правила проекта: этажи как на указателях Level/Ebene/niveau/nivel/livello/Kat/المستوى/लेवल, не first floor/1.Etage/primer piso/planta/1°piano. В CJK допустимы местные этажные формы с тем же номером. Младше N не равно N включительно. Сутки —24 часа; дневной тариф не заменяется 24 часами без этого числа в оригинале. Gate/Door/Exit различаются, неподтверждённую метку Gate A не превращаем в посадочный выход. Бренды/SSID сохраняются; проверенные официальные местные названия станций допустимы вместо английских. Западные цифры0–9; запись количества словом допустима при том же значении. Телефоны ar в LRI/PDI; начальные символы SSID в ar также могут быть изолированы для RTL. Hint≤35 символов, CJK≤18: он может быть короче оригинала, все факты остаются в text. Время24-часовое. Синонимы с тем же смыслом не ошибка. Строки с внешними источниками владелец убрал с экрана; фактчекинг и ссылки сохраняются в данных — не проси вернуть подпись в этом переводе.
'''
OUT.mkdir(exist_ok=True)
for lang,name in NAMES.items():
 pairs=DEFAULT.copy()
 if lang in SPECIAL:
  index,pair=SPECIAL[lang];pairs[index]=pair
 chunks=[INTRO.format(language=name)]
 for code,block in pairs:
  ru=json.loads((ROOT/f'data/airport-guide/{code}.json').read_text())
  source=next(b for b in ru['blocks'] if b['id']==block)
  tr=json.loads((ROOT/f'data/airport-guide/{lang}/{code}.json').read_text())['blocks'][block]
  chunks.append(f'\nАЭРОПОРТ {code}, БЛОК {block}\nРУССКИЙ ОРИГИНАЛ:\n'+ '\n'.join(source[k] for k in ['title','hint','text'])+'\nПЕРЕВОД:\n'+'\n'.join(tr[k] for k in ['title','hint','text']))
 (OUT/f'{lang}.txt').write_text('\n'.join(chunks)+'\n')
print('Подготовлено11актуальных запросов по6пар; они ещё не отправлены.')
