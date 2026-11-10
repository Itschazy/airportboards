# European author self-review, 10 November 2026

Applied approved-ru-fixes.json (19 blocks) and second-ru-fixes.json (3 blocks) to en/de/fr/es/it/tr only. Also applied AYT/es hint and NBC/tr about corrections from european-proposed.json. 140 unique changed fields in 116 files. No RU or other-language data edited; no commit/push/deploy.

Re-read all 22 complete blocks (title, hint, text) in all six languages against approved RU. Two output batches covered the 22; an extra IKT-only read covered the middle of the second output that was truncated. Checks included calendar-day midnight/23:59 rules, SVO tariff restricted to B/D, removed retention periods, NJC/IAR removed conflicting ages, ZIA repeat-entry clock origin, IJK scheduled flights and prior agreement, SSH 3h restricted to named programmes, stepped parking prices, conditions/negation/floors and contact numbers. Corrected a Turkish grammatical residue after removing P0 in LED: “ücretsiz otoparkı” → “ücretsiz otopark”. This final correction is in applied-european-final.json.

All changed hints fit35characters. JSON parses. git diff --check passed before formatting restoration; restoration used HEAD literal string substitutions with assertions of unique matches and complete parsed-object equality to the reviewed result. Original file layout restored for all116files.

Artifacts: applied-european-final.json is the consolidated before/actual-after proposal; applied-european-final-hashes.json contains current post-format SHA256 for all116files. Earlier operation logs contain intermediate NJC strings and earlier hashes, and are superseded by final artifacts.

Limitations: author self-review is not independent native-speaker review. Root is arranging independent swap review. Existing and newly inherited explicit24-hour translations of RU сутки remain subject to the new source-ledger precision audit requested by root; do not treat this report as completing that separate gate. No unsupported-precision mass changes made while awaiting the exact list.
