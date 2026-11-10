# Asian corrections self-review — 2026-11-10

Scope: approved-ru-fixes.json (19 blocks) and second-ru-fixes.json (3 blocks), zh/ja/ko/ar/hi. Applied 110 full text fields and 5 IKT storage hints, 115 fields in 95 files. Complete actual text fields were printed and reread after writing, in batches 0:15,15:35,35:55,55:75,75:100 and all 15 second-packet texts. Coverage and exact file/value SHA256 are in asian-fixes-hashes.json; before/after logs are applied-asian-fixes.json and applied-asian-second-fixes.json.

Checked prices, duration intervals, charge units/calendar day, first/subsequent day, fee condition, negative conditions, location/floors, cards/carrier agreements and ages. VVO calendar ends23:59. KUF357/682/1000/1391 and P2first24h791. KGD repeatwithin2h nofreeperiod; KO prohibition uses주차. ZIA free reentry anchor is end of first15minutes, then at least45minutes. NJC uncertain child age thresholds removed; carrier agreement condition explicit. IAR age promise removed, boarding pass and public/secure placement retained. SSH3h applies specifically to PriorityPass/DragonPass.

JA CEE numeric guard cleanup after log: 1暦日→暦日, 料金計算上の1日→料金計算上の日. Actual version reread and recorded in manifest. No semantic change. Hint lengths remain within existing limits.

Original HEAD formatting restored with exact JSON-string replacements and parsed semantic equality assertion. All95 JSON files parse. Only five assigned locales modified by this agent; no RU edits, commit, push or deploy. This is author self-review; independent swap review is still required. No native-language reviewer, and no claim that unsupported source facts are independently confirmed. Awaiting Russian reviewer decision on inherited rolling24h assumptions before final publication.

Neutral10 completed: 65 fields updated; all full resulting texts reread, explicit SVX1–24h and ARH24h operating retained. SHA manifest refreshed for combined unique fields. Pending KUF P4 and further Russian scope.

Independent swap by European reviewer found three inherited semantic inaccuracies: JA KGD row→lane; ZH/JA IKT oversized charge by occupied storage spaces, not number of items. All corrected verbatim and full resulting texts reread; applied-asian-swap-fixes.json. KUF P4 neutral2days per root approved, P1/P2 explicit24hours preserved. Current manifest refreshed after these8fields.

## Final additional44 self-review

Applied260 field edits in additional44 blocks across5locales. Full actual hint/text of every block reread against suppliedRU in batches0:8,8:16,16:24,24:32,32:44. Targeted follow-up rereads covered all grammatical cleanup and opening-hours preservation. GOJ24h freeparking opening explicitly retained; mixed BQS first24h, GOJ1–24h, KUF P1/P2 first24h, SVX P1first24h retained. No changes to LAX or kidsduration blocks. Dates EYK01.10.2026, OSW01.01.2026, NNM01.08.2026 retained. Two inherited JA row/lane inaccuracies in GOJ/MCX corrected within alreadychangedblocks. Additional after-values in applied-asian-additional.json. Final combined manifest now400 unique fields in250files. Needs independent additional swap signoff before publication.

Root corrected RU KRR storage hint to 400 ₽ за первые сутки, aligning neutral dailybilling. The numeric24 absence in KO/AR/HI was not lost opening hours: all three retain equivalent roundtheclock expressions.

Independent additional swap reviewer European reports all44×5 full blocks read with no remaining semantic issues. Final250file hash manifest independently rechecked unchanged at contentfreeze. All content edits complete; build/deploy handled by root.
