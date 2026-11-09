# Проверка коротких справочников: zh / ja / ko / ar / hi

09.11.2026. Рецензент review_asian. Read-only данные сайта; публикации, сеть и платные API не использовались.
Отбор строго из ops/guide-quality-20261109/inventory.json: 29 аэропортов с1–2блоками.
Прочитаны все29 RU и145 переводов:41 исходный блок /205 переведённых блоков,
в каждом title/hint/text; также все имеющиеся about (IWA,KGP,LWN,NLI).
Не является аудитом остальных159 справочников или всех188 аэропортов.

## Подтверждённые проблемы

### P2: ja/NLI storage.text включает лишнюю границу3часа

RU: «При задержке вылета **больше3часов** …0,88₽ за кг вчас».
JA: `出発が3時間以上遅れた場合` означает «3часа и более».
При ровно3часах перевод уже назначает тариф, а оригинал ещё нет.
Исправление `出発が3時間を超えて遅れた場合` сохраняет строгое >3.
Другие4перевода NLI эту границу сохраняют: 超过/넘게/أكثر من/से अधिक.

### P2: сутки ослаблены до календарно-неопределённого дня в двух блоках всех5локалей

IWA parking: RU400₽ за сутки; zh每天, ja1日, ko하루, arاليوم, hiएक दिन.
NLI storage: RU418,83₽ за место в сутки (hint округлён419); zh每天, ja1日,
ko하루, arفي اليوم, hiप्रति दिन — вtext иhint.
Такая формулировка может читаться как календарный день и не гарантирует24часа,
явно требуемые BRIEF. Это семантическая неоднозначность срока, не доказанная ошибка суммы.
В предложении везде явные24часа, без новых тарифов/условий. NLI hint остаётся419,
как RU; text418.83 остаётся точным. RU-метаданные/checked менять только при новой проверке
источника, которая в этом read-only переводческом проходе не выполнялась.

## Предложения исправлений

`short-guides-asian-proposed-01.json`:15 полей /10 файлов.
IWA parking.text ×5, NLI storage.text+hint ×5; ошибка >3 включена вjaNLItext.
Для каждого поля before/after/reason. Данные не изменены.
Это предложения автора рецензии; до применения нужны проверка другим исполнителем,
сверка чисел (впереводах появится24, возможно потребуется явное24 вRU), сборка/renderпроверки.

## Смысловые проверки без подтверждённых проблем

- JED: во всех5 сохранены international departureT1/Level2/after transitsecurity,
  запрет domestic-only, уточнение mixeditinerary, не проходить arrivalpassportcontrol,
  невозможность возвращения без следующегоboardingpass; hourlybooking не сталdaily.
- KGP: точные десятичные суммы10223.60/5111.80; тарифыarrival/departure/встречающие/
  провожающие не перепутаны; VAT и дата; check-in2h/40min.
- KMG: taxi напротивdoor3/B1, metroB2; отсутствие emptyreturncharge только для
  поездок внутри административных границ, не общее обещание отсутствия доплат.
- SHA: условияfree1piece/72h только паспорту для240hvisa-free; paidmaximum1month;
  документ при сдаче И получении; Gate6 сохранён как вRU без самостоятельной догадки;
  childrenT10international/HK/Macau/Taiwan противT26domestic.
- SLC: воскресное отсутствиеFrontRunner не перенесено наTRAX; направленияOgden/Provo
  альтернативны, аэропортстанция снаружи, часы05:21–23:21.
- SEA: SkybridgeSix/left/parkingbuilding, cart05:00–midnight бесплатен всем;
  nightbus примерно30min и примерно15min после lasttrain.
- TAS: первая полоса только указанным6службам, прочие вторая/max10min;
  arrivalCIP отдельныйтранспорт ИЛИjetbridge; paymentcashdesk ИЛИbot.
- RUH: явно НЕТ airportshuttle, бесплатноparking; возраст18 и15:00/12:00.
- LWN: НЕТ rentaloffice, Meet&Greet с табличкой;3.5км поворот +2км, не общие3.5км.
- HKT: busstop СНАРУЖИ domesticterminal/EXIT3, неboardinggate; Wi-Fi email И terms,
  60min послеconfirmation; free применено кWi-Fi.
- CUN: ADO15min является возможным интервалом, не гарантией; изменение билета
  не позднее30minдоотправления поусловиям; hotelshuttle бесплатен длягостей.
- DTW: FAST только обозначенныеостановки,15–20min вpeak, hotelminage21;
  CGO exitG→T2/E→T1, раздельныечасыдвухлиний и одинаковость будней/праздников.
- ATH/CGK/CKG/HGH/MXP/NKG/SAW/SZX/TFU/URC/WUH/XIY: сохраненыlocation,
  check-in/out, scopefree, minimumage wherepresent. MXP15EUR oneway и51min
  безпересадки не стали return/expressnonstop. TFU14:00check-in+out одинаковокакRU,
  бесплатность shuttleне добавлена. WUH бесплатность толькоparking, неshuttle.
- BOM: GateA сохранён буквальнокакRU, не переинтерпретирован какboardinggate/door.
- SCW: хранениеwheelchairfree,Level1, обозначение3Б; disabilityboardingarea уramp.

## Покрытие: каждый перечисленный файл прочитан

Каждая строка означает6файлов: `data/airport-guide/CODE.json` и
`data/airport-guide/{zh,ja,ko,ar,hi}/CODE.json`. Перечислены все прочитанные блоки.
SHA256 всех174файлов сохранены вshort-guides-asian-file-hashes.json.

| Код | Прочитанные блоки и about | Файлы по локалям |
|---|---|---|
| ATH | sleep | ru, zh, ja, ko, ar, hi |
| BOM | lounges | ru, zh, ja, ko, ar, hi |
| CGK | sleep | ru, zh, ja, ko, ar, hi |
| CGO | transport | ru, zh, ja, ko, ar, hi |
| CKG | lounges, sleep | ru, zh, ja, ko, ar, hi |
| CUN | transport, sleep | ru, zh, ja, ko, ar, hi |
| DTW | transport, sleep | ru, zh, ja, ko, ar, hi |
| HGH | sleep | ru, zh, ja, ko, ar, hi |
| HKT | transport, wifi | ru, zh, ja, ko, ar, hi |
| IWA | transport, parking; about | ru, zh, ja, ko, ar, hi |
| JED | sleep | ru, zh, ja, ko, ar, hi |
| KGP | terminals, lounges; about | ru, zh, ja, ko, ar, hi |
| KMG | transport, taxi | ru, zh, ja, ko, ar, hi |
| LWN | transport; about | ru, zh, ja, ko, ar, hi |
| MXP | transport, sleep | ru, zh, ja, ko, ar, hi |
| NKG | sleep | ru, zh, ja, ko, ar, hi |
| NLI | storage, lounges; about | ru, zh, ja, ko, ar, hi |
| RUH | sleep | ru, zh, ja, ko, ar, hi |
| SAW | sleep | ru, zh, ja, ko, ar, hi |
| SCW | storage, parking | ru, zh, ja, ko, ar, hi |
| SEA | transport | ru, zh, ja, ko, ar, hi |
| SHA | storage, kids | ru, zh, ja, ko, ar, hi |
| SLC | transport | ru, zh, ja, ko, ar, hi |
| SZX | sleep | ru, zh, ja, ko, ar, hi |
| TAS | taxi, lounges | ru, zh, ja, ko, ar, hi |
| TFU | sleep | ru, zh, ja, ko, ar, hi |
| URC | sleep | ru, zh, ja, ko, ar, hi |
| WUH | sleep | ru, zh, ja, ko, ar, hi |
| XIY | sleep | ru, zh, ja, ko, ar, hi |

## Ограничения и прочие проверки

Все205 hints программно проверены поUnicode codepoints: ≤18CJK, ≤35ar/hi, нарушенийнет.
Это не UIoverflowtest. Браузер,RTLтелефоны,layout не проверялись.
Числа/даты/условия сверялись чтением, полноценный корпусный numericguard не запускался.
Имена существующих брендов/городов не переименовывались безисточника.
Носители языков не участвовали; независимый агентский review неравен профессиональной
редактуре носителем. Наличиеfewfindings не доказывает отсутствие всехошибок.
Источники о текущих ценах/часах не проверялись: здесь только соответствие RU→переводы.
Нулевые замечания по блоку означают «в этом проходе не обнаружено», не абсолютную гарантию.
