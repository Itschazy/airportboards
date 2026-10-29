"""Privacy and interpretation regression cases, using synthetic data only."""
import base64
import importlib.util
import json
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('extractor', pathlib.Path(__file__).with_name('extract-har.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class Extraction(unittest.TestCase):
    def test_whitelist_base64_and_unknown_flags(self):
        card = {'json_rephrase_items': json.dumps([{'Query': 'public query', 'Domain': 'WebSearch'},
                                                  {'Query': 'potential', 'IsOnlyPotential': True}]),
                'json_source_data': json.dumps([{'FullUrl': 'https://example.org/page?token=SECRET&event=arrival',
                                                 'DocumentTitle': 'Source', 'UsedAsFootnoteCount': 0}]),
                'private': 'SECRET'}
        messages = [{'dialog_id': 'own', 'content': {'request': {'request_text': 'seed'}}},
                    {'dialog_id': 'own', 'content': {'response': {'cards': [{'neuro_structured_blocks_card': card}]}}},
                    {'dialog_id': 'other', 'content': {'request': {'request_text': 'SECRET'}}}]
        raw = json.dumps({'messages': messages, 'inflight_messages': {'secret': 'SECRET'}})
        entry = {'request': {'url': 'https://rpc.alice.ya.ru/dialog/read_dialog', 'headers': ['SECRET']},
                 'response': {'content': {'encoding': 'base64', 'text': base64.b64encode(raw.encode()).decode()}}}
        result = m.extract({'log': {'entries': [entry]}}, [{'id': 'q01', 'dialogId': 'own', 'query': 'seed'}])
        self.assertEqual(len(result), 1)
        self.assertIsNone(result[0]['expansions'][0]['isOnlyPotential'])
        self.assertTrue(result[0]['expansions'][1]['isOnlyPotential'])
        self.assertEqual(result[0]['sourceCandidates'][0]['reportedFootnoteCount'], 0)
        self.assertNotIn('SECRET', json.dumps(result))
        self.assertNotIn('dialog_id', json.dumps(result))
        messages.append({'dialog_id': 'own', 'content': {'request': {'request_text': 'PRIVATE NEXT TURN'}}})
        later = {'request': {'url': 'https://rpc.alice.ya.ru/dialog/read_dialog'},
                 'response': {'content': {'text': json.dumps({'messages': messages})}}}
        self.assertEqual(m.extract({'log': {'entries': [later]}}, [{'id': 'q01', 'dialogId': 'own', 'query': 'seed'}]), [])
        self.assertEqual(m.extract({'log': {'entries': [entry]}}, [{'id': 'q01', 'dialogId': 'own', 'query': 'wrong'}]), [])

    def test_malformed_and_private_urls(self):
        self.assertIsNone(m.parsed('{bad'))
        self.assertIsNone(m.public_url('https://user:password@example.org/'))
        self.assertIsNone(m.public_url('https://ya.ru/alice/chat/private/'))
        self.assertIsNone(m.public_url('javascript:secret'))
        self.assertEqual(m.extract({'log': {'entries': [{'request': {'url': 'https://other.org/dialog/read_dialog'}}]}}, []), [])

if __name__ == '__main__':
    unittest.main()
