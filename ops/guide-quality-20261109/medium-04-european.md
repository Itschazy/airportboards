# Independent review medium04: European locales

## Coverage
Original inventory slice120:160, excluding pilot6: **33 airports, 198 translation files**, 978 translated blocks, 90 nonempty about fields, **3024 textual fields**. All about/title/hint/text read against RU, including unchanged blocks. 231 RU+locale file SHA256 hashes in medium-04-european-hashes.json. This is semantic translation review, not fresh source verification or native-speaker certification. No data files edited.

## Findings
101 proposed fields across71 files in proposed-medium-04-european.json. Exact before/after and reasons included; all proposed after strings read again and before guards matched.

- PKC storage hint/text, REN storage, RGK storage hint/text and parking, SGC/SKX/UFA/ULV/UUD/VKO/ZIA parking: clarify RU сутки tariff as24h. Calendar storage tariffs deliberately excluded. SVX parking двое суток→48h. UUD/ZIA stepped tariff boundaries remain intact.
- REN route101(к) changed to Latin(k) in6locales. Proposed exact suffix; parent may defer if script guard does not yet allow it.
- EN SGC/SKX/TBW/VKO parking and UUDtransport: station forecourt→airport terminal forecourt. SGC ticketoffices→paymentcounters; RU says cashdesks for parking payment.
- RGK ES repeatentry withinonehour, notsamecalendarhour.
- SVX IT cloakroom: комплект wrongly a capo(pergarment), proposed per completo.
- TBW IT malformed nested quotation marks inoperator name.
- UFA ES/IT disabledchild age14 limit: explicitstrictunder14; VKOITunder12. VKOES/IT entrance window clarified from6hoursbeforedeparture, preventingreverseinterpretation.
- VOG FR storage: rez-de-chaussée→niveau1 preservingnumberedfloor.
- VVO EN/DEabout: departurehalls mistranslatedas lounges.

## Important exclusions and checks
- UUA hotel day remainsday: actualcheck-in16:00/check-out12:00, cannotinferrolling24h.
- SGCstorage firstdayuntil00:00; UUD/VOG/VKOstorage calendar day: unchanged. PKXstorage RUday: unchanged. VKOforecourt60minutesdaily limit leftdaily pendingcalendar/rollingrules; onlypaidtariffs24h. VVOgenericdailyparking withoutquotedtariff leftunchanged.
- VVOstorage RUhint400 vs standardtext500 inconsistency inheritedinall6: flaggedparent, no source-backed correction proposed.
- PHX nightwait>=15min+possibletransfer; PKXheight1.3minclusive; PVG15kmexcess-onlysurcharge/night30%; SFOoutboundincludedfee vsinbound; SGNstrictage>12and5–12range; SINthroughcheckedbaggage/transitcondition/GST; STNeligibleairlines/gates1–19/noreturn/under3/cardonly; SVOGettSleepBwithoutpass/Cinternationalpassonly; SYDcannotwalkT1–T2/T3; TBS337schedule/90mintransfer; UKXpaperpass10minutesbeforecheckinclosure; XMNdoorvsboardinggate andairportgroundhandlingrestriction; ZRHcontinuous8h/nochildcare/boardingpassANDID preserved.
- VIE3.5hentrybeforedeparture vs3hmaxstay, children0–3/4–14; YYZMamavaaccesscodefromappORsupport/allgatesandSSID preserved.

## Files actually reviewed

Every row includes RU data/airport-guide/IATA.json plus allsix listedtranslationfiles; hashmanifest lists RU too.

| IATA | RU blocks | en | de | fr | es | it | tr |
|---|---:|---|---|---|---|---|---|
| PHX | 3 | data/airport-guide/en/PHX.json | data/airport-guide/de/PHX.json | data/airport-guide/fr/PHX.json | data/airport-guide/es/PHX.json | data/airport-guide/it/PHX.json | data/airport-guide/tr/PHX.json |
| PKC | 7 | data/airport-guide/en/PKC.json | data/airport-guide/de/PKC.json | data/airport-guide/fr/PKC.json | data/airport-guide/es/PKC.json | data/airport-guide/it/PKC.json | data/airport-guide/tr/PKC.json |
| PKX | 4 | data/airport-guide/en/PKX.json | data/airport-guide/de/PKX.json | data/airport-guide/fr/PKX.json | data/airport-guide/es/PKX.json | data/airport-guide/it/PKX.json | data/airport-guide/tr/PKX.json |
| PMI | 4 | data/airport-guide/en/PMI.json | data/airport-guide/de/PMI.json | data/airport-guide/fr/PMI.json | data/airport-guide/es/PMI.json | data/airport-guide/it/PMI.json | data/airport-guide/tr/PMI.json |
| PVG | 5 | data/airport-guide/en/PVG.json | data/airport-guide/de/PVG.json | data/airport-guide/fr/PVG.json | data/airport-guide/es/PVG.json | data/airport-guide/it/PVG.json | data/airport-guide/tr/PVG.json |
| REN | 6 | data/airport-guide/en/REN.json | data/airport-guide/de/REN.json | data/airport-guide/fr/REN.json | data/airport-guide/es/REN.json | data/airport-guide/it/REN.json | data/airport-guide/tr/REN.json |
| RGK | 7 | data/airport-guide/en/RGK.json | data/airport-guide/de/RGK.json | data/airport-guide/fr/RGK.json | data/airport-guide/es/RGK.json | data/airport-guide/it/RGK.json | data/airport-guide/tr/RGK.json |
| SFO | 7 | data/airport-guide/en/SFO.json | data/airport-guide/de/SFO.json | data/airport-guide/fr/SFO.json | data/airport-guide/es/SFO.json | data/airport-guide/it/SFO.json | data/airport-guide/tr/SFO.json |
| SGC | 4 | data/airport-guide/en/SGC.json | data/airport-guide/de/SGC.json | data/airport-guide/fr/SGC.json | data/airport-guide/es/SGC.json | data/airport-guide/it/SGC.json | data/airport-guide/tr/SGC.json |
| SGN | 3 | data/airport-guide/en/SGN.json | data/airport-guide/de/SGN.json | data/airport-guide/fr/SGN.json | data/airport-guide/es/SGN.json | data/airport-guide/it/SGN.json | data/airport-guide/tr/SGN.json |
| SIN | 7 | data/airport-guide/en/SIN.json | data/airport-guide/de/SIN.json | data/airport-guide/fr/SIN.json | data/airport-guide/es/SIN.json | data/airport-guide/it/SIN.json | data/airport-guide/tr/SIN.json |
| SKX | 5 | data/airport-guide/en/SKX.json | data/airport-guide/de/SKX.json | data/airport-guide/fr/SKX.json | data/airport-guide/es/SKX.json | data/airport-guide/it/SKX.json | data/airport-guide/tr/SKX.json |
| STN | 4 | data/airport-guide/en/STN.json | data/airport-guide/de/STN.json | data/airport-guide/fr/STN.json | data/airport-guide/es/STN.json | data/airport-guide/it/STN.json | data/airport-guide/tr/STN.json |
| SVO | 8 | data/airport-guide/en/SVO.json | data/airport-guide/de/SVO.json | data/airport-guide/fr/SVO.json | data/airport-guide/es/SVO.json | data/airport-guide/it/SVO.json | data/airport-guide/tr/SVO.json |
| SVX | 8 | data/airport-guide/en/SVX.json | data/airport-guide/de/SVX.json | data/airport-guide/fr/SVX.json | data/airport-guide/es/SVX.json | data/airport-guide/it/SVX.json | data/airport-guide/tr/SVX.json |
| SYD | 3 | data/airport-guide/en/SYD.json | data/airport-guide/de/SYD.json | data/airport-guide/fr/SYD.json | data/airport-guide/es/SYD.json | data/airport-guide/it/SYD.json | data/airport-guide/tr/SYD.json |
| TBS | 3 | data/airport-guide/en/TBS.json | data/airport-guide/de/TBS.json | data/airport-guide/fr/TBS.json | data/airport-guide/es/TBS.json | data/airport-guide/it/TBS.json | data/airport-guide/tr/TBS.json |
| TBW | 3 | data/airport-guide/en/TBW.json | data/airport-guide/de/TBW.json | data/airport-guide/fr/TBW.json | data/airport-guide/es/TBW.json | data/airport-guide/it/TBW.json | data/airport-guide/tr/TBW.json |
| TPE | 3 | data/airport-guide/en/TPE.json | data/airport-guide/de/TPE.json | data/airport-guide/fr/TPE.json | data/airport-guide/es/TPE.json | data/airport-guide/it/TPE.json | data/airport-guide/tr/TPE.json |
| UFA | 7 | data/airport-guide/en/UFA.json | data/airport-guide/de/UFA.json | data/airport-guide/fr/UFA.json | data/airport-guide/es/UFA.json | data/airport-guide/it/UFA.json | data/airport-guide/tr/UFA.json |
| UKX | 4 | data/airport-guide/en/UKX.json | data/airport-guide/de/UKX.json | data/airport-guide/fr/UKX.json | data/airport-guide/es/UKX.json | data/airport-guide/it/UKX.json | data/airport-guide/tr/UKX.json |
| ULV | 5 | data/airport-guide/en/ULV.json | data/airport-guide/de/ULV.json | data/airport-guide/fr/ULV.json | data/airport-guide/es/ULV.json | data/airport-guide/it/ULV.json | data/airport-guide/tr/ULV.json |
| UUA | 4 | data/airport-guide/en/UUA.json | data/airport-guide/de/UUA.json | data/airport-guide/fr/UUA.json | data/airport-guide/es/UUA.json | data/airport-guide/it/UUA.json | data/airport-guide/tr/UUA.json |
| UUD | 5 | data/airport-guide/en/UUD.json | data/airport-guide/de/UUD.json | data/airport-guide/fr/UUD.json | data/airport-guide/es/UUD.json | data/airport-guide/it/UUD.json | data/airport-guide/tr/UUD.json |
| UUS | 5 | data/airport-guide/en/UUS.json | data/airport-guide/de/UUS.json | data/airport-guide/fr/UUS.json | data/airport-guide/es/UUS.json | data/airport-guide/it/UUS.json | data/airport-guide/tr/UUS.json |
| VIE | 4 | data/airport-guide/en/VIE.json | data/airport-guide/de/VIE.json | data/airport-guide/fr/VIE.json | data/airport-guide/es/VIE.json | data/airport-guide/it/VIE.json | data/airport-guide/tr/VIE.json |
| VKO | 8 | data/airport-guide/en/VKO.json | data/airport-guide/de/VKO.json | data/airport-guide/fr/VKO.json | data/airport-guide/es/VKO.json | data/airport-guide/it/VKO.json | data/airport-guide/tr/VKO.json |
| VOG | 5 | data/airport-guide/en/VOG.json | data/airport-guide/de/VOG.json | data/airport-guide/fr/VOG.json | data/airport-guide/es/VOG.json | data/airport-guide/it/VOG.json | data/airport-guide/tr/VOG.json |
| VVO | 6 | data/airport-guide/en/VVO.json | data/airport-guide/de/VVO.json | data/airport-guide/fr/VVO.json | data/airport-guide/es/VVO.json | data/airport-guide/it/VVO.json | data/airport-guide/tr/VVO.json |
| XMN | 4 | data/airport-guide/en/XMN.json | data/airport-guide/de/XMN.json | data/airport-guide/fr/XMN.json | data/airport-guide/es/XMN.json | data/airport-guide/it/XMN.json | data/airport-guide/tr/XMN.json |
| YYZ | 4 | data/airport-guide/en/YYZ.json | data/airport-guide/de/YYZ.json | data/airport-guide/fr/YYZ.json | data/airport-guide/es/YYZ.json | data/airport-guide/it/YYZ.json | data/airport-guide/tr/YYZ.json |
| ZIA | 4 | data/airport-guide/en/ZIA.json | data/airport-guide/de/ZIA.json | data/airport-guide/fr/ZIA.json | data/airport-guide/es/ZIA.json | data/airport-guide/it/ZIA.json | data/airport-guide/tr/ZIA.json |
| ZRH | 4 | data/airport-guide/en/ZRH.json | data/airport-guide/de/ZRH.json | data/airport-guide/fr/ZRH.json | data/airport-guide/es/ZRH.json | data/airport-guide/it/ZRH.json | data/airport-guide/tr/ZRH.json |
