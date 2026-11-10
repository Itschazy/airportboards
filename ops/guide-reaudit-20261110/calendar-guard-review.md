# Calendar guard — independent review

Read both current scripts after root changes; 25 isolated regression cases PASS on Node v22.23.2. Tests cover calendar keyword retained beside 24/7 and removal in each of 11 locales. The hint/text separator prevents the artificial 7+500 ->7500 number collision.

No blocking defect identified in the narrow lexical guard. Scope limits: it triggers only when RU contains `календарн`; RU midnight-only rules are not covered. It accepts a locale calendar/midnight marker anywhere in hint/text, so an unrelated opening-hours midnight can mask a wrong rolling billing unit; it also cannot bind separate calendar prices to separate services. This is explicitly a narrow regression guard, not source/semantic verification. Do not advertise it as proof of billing equivalence.

No data or script edits performed by reviewer.

Hashes at review:
- check-guide-fresh.mjs: e6df062d0753fabc9b86e0368038a0f086ab40565cf82eae3cfda5600aa053f5
- check-guide-fresh-regressions.mjs: 822c1cb502464e95e826c49c2a2e6f7c40e94350214f9dc927891dafeb2414e6

## Final frozen-data review

29regressions PASS after Turkish inflected thousand and Arabic dual-day controls. Arabic dual nouns يومين/يومان map to2 at letter boundaries, preserving natural translations without weakening the single-day negative control. Latest code hashes are in final-russian-review-hashes.json; older hashes above are historical review snapshots.
