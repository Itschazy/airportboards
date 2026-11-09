# Independent RU review of current substantive changes

2026-11-09. Read current data/airport-guide/{SHA,TFU,AMS,DFW,BKK,KEJ,KRR}.json. No data edits by this reviewer. This is an RU content gate, not a translation/build/release approval.

## Passed against evidence read

- SHA storage: «дверь 6», общедоступная зона вылета matches government announcement and official map examined previously. Correctly avoids boarding gate. Existing passport eligibility language retained, no new visa advice introduced.
- TFU sleep: free airport shuttle 06–22; T1 departure door 12, T2 departure door 21; check-in 14:00 and checkout 14:00, minimum age 18 confirmed again in source-tfu.txt. No invented distance.
- AMS sleep: departure on day of checkout and hand baggage only at Mercure matches previously opened Schiphol source. YOTELAIR visa wording is present in official source; not flagged by inference. Train check-in AND check-out addition accurately preserves both steps.
- DFW lounges: PS clearly separated into private terminal; source-dfw.txt independently reread, terminal service and Corporate Aviation location match. Remaining Skylink sentence applies to five passenger terminals, does not now place PS inside them.
- BKK taxi: deletion of broadly negotiable fare is supported; no universal “always meter” claim substituted. Pickup and 50 THB toll distinction retained.
- KEJ parking: new RU «с четвёртого часа тариф за 24 часа 1000 ₽» resolves linguistic ambiguity. Live official page https://airkem.ru/transport/parking/tariff/ returned zero readable lines; cannot independently confirm tariff meaning from this fetch.
- KRR storage hint: read actual storage hint «400 ₽ за первые 24 часа», not parking. Body says «первые сутки». Official https://krr.aero/services/bagazh/kamera-khraneniya/ returned Internal Error/not accessible. This is evidence unavailable, not evidence of wrong price.

## Release blockers / required checks

No new proven factual error found in SHA/TFU/AMS/DFW/BKK changes. Earlier proven NLI operational luggage tariff was a blocker and parent reports removed; verify removal across all translations before release.

KEJ and KRR: parent needs its own successful source evidence for explicit 24-hour interpretation. If evidence says only ambiguous «сутки» (especially calendar day), do not strengthen to 24 hours; use «первые сутки» until confirmed. This is a narrow evidence gate on these new assertions, not a demand to redo every guide.

Language parity, structured data, rendering and all 12 translations are outside this RU review. Do not report their gates passed from these reports alone.

## Optional improvements, not blockers for current patch

- LGW new interterminal shuttle block confirmed; deferred by parent to finish present scope.
- SIN night shuttle/Skytrain hours and SYD T2 Wi-Fi confirmed in medium-04-russian.md; can be next patch.
- PEK parking hint overgeneralises 100 CNY from garage 2 to both 2/3; remove amount from hint or verify garage 3.
- ORD lounge day-pass generalisation can be narrowed without inventing rules; MIA Flagship pass really exists, must not “fix” to no passes.
- LED bus fare belongs under transport, UKX “only taxi” unnecessarily excludes personal car, VKO transition wording risks suggesting unrestricted airside passage.
- NNM unusual tariff is unverified, not proven incorrect. Do not correct based on plausibility.

Scope delivered by reviewer: 29 short + 153 medium = 182 guides editorially read. Six pilot guides excluded by assignment. Selected official sources checked; not all 188 factchecked line by line online.

## Follow-up: ABA, NBC, KEJ, KRR

- ABA: current RU parking block checked against successful ordinary requests GET of https://airportabakan.ru/passazhiram-ru/platnaya-parkovka.html (200), saved recheck-aba.txt. Independently viewed all three aba-map-{0,1,2}.jpg. No closure notice appears. Text explicitly gives 50 m right of terminal, 77 spaces (36+41), round-the-clock operation, terminal cashier cash/card, rounding incomplete days upward, and calculation from entry date/time. Current RU matches. Map 2 has tariffs but no effective date; rightly not added to current RU.
- NBC: ordinary GET https://nbc.aero/airport/about/ succeeded, text saved recheck-nbc.txt. Official text itself groups Naberezhnye Chelny, Nizhnekamsk, Yelabuga and Almetyevsk within 25 km; existing guide repeats it rather than mistranslates. This geographic claim is unsafe to amplify. No need to invent a corrected distance: replace that sentence with «Аэропорт обслуживает Набережные Челны, Нижнекамск, Елабугу, Альметьевск и другие города региона». The source says it serves neighbouring Tatarstan cities/districts and Udmurtia/Bashkortostan. This neutral service-region wording preserves useful meaning without an unreliable radius. Exact corrected distances not researched here.
- KEJ: ordinary requests GET returned HTTP 200 but no extracted visible text (recheck-kej.txt empty). Therefore no additional independent tariff evidence obtained. No bypass attempted.
- KRR: ordinary requests GET failed RemoteDisconnected; no retry with modified identity or bypass. No additional source evidence obtained.
- Clarification on earlier gate: Russian «сутки» ordinarily means 24 hours; absent indication of calendar-day billing, translating it as 24 hours is not itself a proven factual error. KEJ/KRR source availability is a limitation of this independent recheck, not an established release blocker if parent already holds verified source text. ABA is stronger still: entry date/time explicitly defines the period.
