# Final RU review — 10.11.2026

Independently read all 22 updated blocks across 19 Russian guide files and the RU diff against HEAD. All hint/text fields match the two approved packets. File hashes and exact block coverage are in final-russian-review-hashes.json. No data edits by reviewer.

## Result

No new blocking factual defect found in the changed Russian wording. Verified service/billing boundaries: ARH341.60; CEE both calendar tariffs; KUF P1 brackets and P2 first24h only; RGK dated01.11 PDF P11500/P2800/P3800; VVO calendar days; SVO B/D-only700/300; ZIA calendar storage and parking repeat anchor; SVX wardrobe100 only up to1hour; MRV midnight accounting; IKT full parking ladder and mandatory valuation supplement; GYD full tariff ladder; KGD repeat-entry exception. CEE and IKT PDF images independently viewed; RGK full saved extracted PDF table read. Added source URLs correspond to those documents.

SGC/NJC eligibility no longer promises universal card access. SSH3h explicitly belongs to Priority Pass/DragonPass. IAR/NJC conflicting source age boundaries are not invented. NSK whole-day assertion and SVO/ZIA conflicting6month promises removed. KUF unsupported oversized-storage1200 removed. LED applies exact16–30/31–60/next30 brackets to terminal approach, not separate transit zones.

## Evidence limitations, separate from wording review

IJK transport matches approved packet and peer source report, but raw source was not saved locally; independent fresh web open returned403. I did not bypass protection. Thus this is not an independent full-source PASS for IJK. SSH pre-existing paid-pass statement was not independently refreshed in this final pass; the changed program limit was checked earlier today. Preserved source ambiguities (e.g. SVX source interval wording at exactly1hour) are not resolved by invention. Unchanged claims and unrelated guide blocks remain under audit-ledger/residual-issues coverage, not automatically confirmed by this review.

All19 overall checked dates remain unchanged; no partial review is represented as whole-guide freshness. This review does not certify 11 translations, deploy or production.

## Documentation review

Read current CLAUDE.md diff: service-specific billing definitions replace generic сутки=24hours; overall checked advances only after full-guide fact verification. Both changes correctly address the audit findings. Residual outside the22updated blocks: KEJ parking still explicitly says24hours although saved HTML says only сутки and PDF was unavailable. Under the revised rule this should be neutralised to a daily tariff or supported by an explicit definition; this is an unverified qualifier, not a proven contradictory tariff.

## Final supplement

KEJ parking now says1000 ₽ в сутки; independently compared with saved officialAX, no rolling24hour promise. Final reviewed RU scope is23blocks/20files. Overall checked dates unchanged. Source-resolution.json records22wording corrections separately from unchanged baseline168 (101confirmed,38unavailable,10conflict,19partial), retaining38unavailable and19partial source profiles as limitations.

Fresh final regression run:27PASS. Read Turkish multiplier patch: bin, binden, binin, bine accepted; two new tests prove binden preserves883000 and rejects884000. Actual tr/NBC uses binden. Spelling binine is not covered by this regex, not used in reviewed changed text. Calendar guard remains narrow lexical protection; no claim of complete semantic equivalence. Final file/code/doc hashes regenerated.

## Frozen-data final delta

KRR storage hint reviewed:400 ₽ за первые сутки matches the existing RU body; removes unsupported rolling24h interpretation. Source remains unavailable in baseline; this is wording consistency, not new factual confirmation. Reviewed RU scope now24blocks/21files. Arabic dual noun recognition reads يومين/يومان as2 only at Unicode letter boundaries. The new positive control accepts two days and the negative control rejects one day replacing2. Final independent regression run29PASS; no new blocking code issue identified. Hashes refreshed after this delta; no data/code changes by reviewer.
