# Independent Spec review: zh / ja / ko / ar / hi

Base `e3902bc9`, target `015ff415`; both product commits included. Fresh reread of **658 changed fields, 330 files, 82 airports**, each with corresponding full current Russian block/about. Coverage and frozen/current SHA256: `asian-coverage.json`. Read title/hint/text/about including units, limits, dates, terminal/exit/gate, security access, SSIDs and negations. Coverage is changed fields, not every unchanged field in these files. Prior PASS was not used as evidence.

## Finding: P2, existing discrepancy retained in changed field

`data/airport-guide/ko/KGD.json:28` (`blocks.parking.text`). RU: «Стоянка на первой линии перед зданием запрещена». KO: «건물 앞 첫 번째 차로 정차는 금지됩니다.» Korean 정차 prohibits stopping, which additionally excludes brief passenger drop-off, whereas RU prohibits parking. This exact sentence existed at base: **not a regression introduced by either audited commit**, but still a material translation discrepancy in the delivered field.

Proposed sentence: **건물 앞 첫 번째 차로 주차는 금지됩니다.** Replace only 정차 with 주차; retain surrounding tariff, date, distances and capacity.

## Remaining result and limitations

No other confirmed material semantic errors found among the 658 changed fields. Abbreviated hints were checked with their full block: omitted SSID/brand in compressed hints was not treated as a factual error when full text retained it. Translations of сутки as 24 hours preserve the Russian intended unit, but source tariffs still need independent verification of rolling versus calendar billing. Existing ambiguous RU boundaries were not silently resolved by translation review.

This is an independent model review without native-language human editors. It is not a guarantee against every grammatical nuance and is not by itself verification of real-world facts. External source checking is recorded separately. No data edits, deployment or paid translation calls performed.
