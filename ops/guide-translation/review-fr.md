# Рецензия перевода справочной — fr

Рецензент: независимый редактор (fr). Сверены все 76 файлов `data/airport-guide/fr/` с оригиналами `data/airport-guide/<IATA>.json`: каждый блок (title, hint, text) и `about`.

## Итог

- Точечных правок: 43 (смысл 14, имена 8, стиль 21, числа 0).
- Системная правка этажей: 247 вхождений в 55 файлах (тип — смысл).
- `node scripts/check-guide-fresh.mjs`: по fr провалов нет.

## Системная правка: этажи

Переводчик писал «1 этаж» как «1er étage», «2 этаж» как «2e étage». Во французском 1er étage — это второй этаж над землёй (первый — rez-de-chaussée), то есть каждый этаж уезжал на один вверх. Пересчитать в французскую нумерацию нельзя: на табличках в аэропорту стоят те же цифры, что в оригинале, и проверка сравнивает числа. Поэтому везде, где этаж задан цифрой: «Ne étage» → «niveau N» (уровень по табличке, как уже было сделано для «этаж −1» → «niveau −1» и для «уровня» во Внукове); «1er et 2e étages» → «niveaux 1 et 2»; «deuxième/troisième étage» → «deuxième/troisième niveau». Там, где переводчик уже написал «rez-de-chaussée» для словесного «на первом этаже», оставлено: это верно по смыслу. Счётные «7 étages», «2 étages», «un étage plus haut» не тронуты.

Файлы: AER, ARH, ASF, BAX, BQS, BTK, CEE, CEK, CSY, DME, EVN, EYK, GDX, GDZ, GOJ, GYD, HRG, IJK, IKT, KEJ, KGD, KHV, KRR, KUF, KVX, KZN, LED, MMK, MRV, NBC, NER, NJC, NNM, NOJ, NOZ, NSK, NUX, OVB, PEE, PKC, REN, RGK, SCW, SGC, SVO, SVX, TBW, UFA, ULV, UUD, UUS, VKO, VOG, VVO, ZIA.

## Точечные правки

| Файл | Блок | Было | Стало | Тип | Почему |
|---|---|---|---|---|---|
| BQS | transport.text | « m-n Blagovechtchensk » | « Magasin Blagovechtchensk » | имена | «м-н» — сокращение «магазин», а не часть названия |
| DLM | taxi.hint | Coopérative de taxis | Coopérative des taxis de l'aéroport | смысл | потеряно «аэропорта» |
| DLM | parking.hint | jour et nuit, terminaux 1 et 2 | Jour et nuit, terminaux 1 et 2 | стиль | подпись со строчной буквы |
| DME | transport.text | L'Aeroexpress part de la gare de Paveletski, environ 45 minutes, et de Verkhnie Kotly (MTsK), environ 40 minutes. | L'Aeroexpress met environ 45 minutes depuis la gare de Paveletski et environ 40 minutes depuis Verkhnie Kotly (MTsK). | стиль | калька «part de…, environ 45 minutes» |
| DME | terminals.text | contrôle des passeports au 2e, | contrôle des passeports au niveau 2, | смысл | этажи: «на 2-м» — уровень 2 по табличке |
| GDX | transport.text | l'aéroport de Sokol | l'aéroport Sokol | имена | Сокол — имя аэропорта, а не населённый пункт |
| GOJ | about | avec 29 destinations au réseau | et son réseau compte 29 destinations | стиль | калька «в сети 29 направлений» |
| GYD | parking.text | jour et nuit, plus de 2 000 places | Ouvert jour et nuit, plus de 2 000 places | стиль | текст начинался со строчной буквы |
| HMA | lounges.text | Salon pour personnalités au départ 10 000 ₽. | Salon VIP au départ : 10 000 ₽. | стиль | «зал для особо важных персон» по-французски — salon VIP |
| HRG | taxi.hint | Prix à fixer avant | Prix fixé avant de monter | стиль | обрубленная подпись «до посадки» |
| HRG | terminals.text | distributeurs automatiques | distributeurs de billets | смысл | банкомат — distributeur de billets, не «автомат» |
| SSH | taxi.hint | Prix à fixer avant | Prix fixé avant de monter | стиль | обрубленная подпись «до посадки» |
| SSH | transport.hint | Minibus, prix à fixer avant | Minibus, prix fixé à l'avance | стиль | обрубленная подпись «цену — заранее» |
| SSH | terminals.text | Distributeurs automatiques | Distributeurs de billets | смысл | банкомат — distributeur de billets |
| IAR | about | international de Iaroslavl | international d'Iaroslavl | стиль | элизия перед гласной |
| IAR | transport.text | gare routière de Iaroslavl | gare routière d'Iaroslavl | стиль | элизия перед гласной |
| IGT | about | L'aéroport Soultan-Oskanov | L'aéroport S. S. Oskanov | имена | в оригинале инициалы С. С.; «Soultan» выдумано (лётчика звали Сулейман) |
| IST | transport.text | partent de l'étage transports −2 | partent du niveau −2 (transports) | стиль | калька «транспортный этаж −2» |
| IST | sleep.text | cette dernière réservée aux passagers de vols internationaux | cette dernière réservée aux passagers partant sur un vol international | смысл | потеряно «улетающих» |
| IST | sleep.text | Réservation à partir de 4 heures. | Réservation pour 4 heures minimum. | смысл | «от 4 часов» — минимальный срок брони, фраза читалась как «через 4 часа» |
| KGD | transport.text | « Iouzhny » | « Ioujny » | имена | французская транслитерация ж — j |
| KHV | terminals.hint | Intérieur et international | Intérieur et international séparés | смысл | потеряно «отдельно» |
| KHV | lounges.hint | 3e étage intérieur, 4000 ₽ | Niveau 3, vols intérieurs, 4000 ₽ | стиль | «3e étage intérieur» читалось как «внутренний этаж» |
| KHV | sleep.text | Matveïevskoïe chaussée, 30 | chaussée Matveïevskoïe, 30 | стиль | порядок слов как в «chaussée de Poulkovo» (LED) |
| KVX | kids.text | . jour et nuit et gratuite, | . Ouverte jour et nuit et gratuite, | стиль | предложение со строчной буквы |
| LED | sleep.text | Paiement à l'heure 1100 ₽ de l'heure, en espèces ou par carte. | Tarif horaire : 1100 ₽, en espèces ou par carte. | стиль | тавтология «à l'heure … de l'heure» |
| NAL | transport.text | « Prielbrouse » | « Prielbrousie » | имена | Приэльбрусье — Prielbrousie |
| NBC | about | PJSC « KAMAZ » | SA publique « KAMAZ » | стиль | английская аббревиатура PJSC во французском тексте; ПАО — SA publique (АО везде SA) |
| NER | about | Neriungri | Nerioungri | имена | французская транслитерация ю — iou |
| NJC | kids.text | uniquement avec un billet dont le départ a lieu au plus tard dans un délai d'un jour. | uniquement sur présentation d'un billet pour un départ dans un délai d'un jour au plus. | стиль | тяжёлая калька |
| NNM | about | obedinionny | obiedinionny | имена | транслитерация «объединённый» |
| NOZ | kids.text | . jour et nuit, gratuite. | . Ouverte jour et nuit, gratuite. | стиль | предложение со строчной буквы |
| PKC | sleep.text | départ à 12:00 | libération de la chambre à 12:00 | смысл | «расчётный час» — время освобождения номера, «départ» двусмысленно |
| REN | kids.text | dans l'heure (1 heure) suivant l'arrivée | dans un délai de 1 heure après l'arrivée | стиль | повтор «dans l'heure (1 heure)» |
| SVO | kids.text | (enfants handicapés jusqu'à 14 ans) | (enfants handicapés : moins de 14 ans) | смысл | «до 14 лет» везде «moins de», здесь «jusqu'à» включало 14-летних |
| SVX | kids.text | (handicapés jusqu'à 14 ans) | (enfants handicapés : moins de 14 ans) | смысл | «до 14 лет» = moins de 14 ans, как во всех файлах |
| UFA | kids.text | (handicapés jusqu'à 14) | (enfants handicapés : moins de 14 ans) | смысл | «до 14» = moins de 14 ans |
| VKO | kids.text | (handicapés jusqu'à 12) | (enfants handicapés : moins de 12 ans) | смысл | «до 12» = moins de 12 ans |
| SVO | sleep.hint | Capsules dans B, C et au train | Capsules : B, C et Aeroexpress | смысл | «у поезда» — терминал «Аэроэкспресс», «au train» непонятно |
| UFA | about | SA « Aéroport international Oufa » | SA « Aéroport international d'Oufa » | стиль | форма как у других операторов (de Sotchi, d'Irkoutsk) |
| VKO | lounges.hint | Terminal A, 24 heures | Terminal A, 24 h/24 | смысл | «24 часа» = круглосуточно, а не «24 heures» (длительность) |
| VVO | about | Il y a des salles pour les départs intérieurs et internationaux. | Il dispose de halls de départ intérieurs et internationaux. | стиль | «salles» неясно; залы вылета — halls de départ |
| ZIA | kids.text | pays de l'UEEA | pays de l'UEE | имена | ЕАЭС по-французски — UEE (Union économique eurasiatique) |

## Проверено и оставлено как есть

- **Транслитерация названий** единообразна во всех файлах: Cheremetievo (SVO; сеть «_Sheremetyevo Wi-Fi» — латиницей как в оригинале), Vnoukovo, Poulkovo (бренд «New Pulkovo Lounge» — как в оригинале), Domodedovo, Kouroumotch, Tolmatchevo, Koltsovo; города — общепринятые французские формы (Sotchi, Oufa, Iekaterinbourg, Nijni Novgorod, Tcheliabinsk, Novossibirsk, Kazan, Erevan, Bakou, Tbilissi, Charm el-Cheikh, Hurghada).
- **«Аэрофлот Бонус»** (SVO): «Aeroflot Bonus» уровней Gold, Platinum, Infinite и Infinite Pro — латинские названия уровней программы; «Infinite / Infinite Pro» соответствуют «Инфинит / Инфинит Про», оставлено. В ARH, CSY уровни Gold/Platinum уже латиницей в оригинале.
- **Имена в названиях аэропортов**, раскрытые переводчиком из инициалов, сверены: Guerman-Titov (BAX), Igor-Kourtchatov (CEK), Valeri-Tchkalov (GOJ), Fiodor-Abramov (ARH), Alexandre-Vassilevski (IWA), Alexeï-Leonov (KEJ), Alexandre-Pokrychkine (OVB), Boris-Volynov (NOZ), Nikolaï-Karamzine (ULV) — верны. Неверное (IGT «Soultan») исправлено.
- **Коды маршрутов и зон** с кириллической буквой (111Э, 244-Э, 106н, 110С, 8А, А50, 652Т, 19к, 2А, Т1/Т2, С2, С5, А1–А3, Р1–Р4, 3Б) сохранены как в оригинале. В REN «№101 (к)» переводчик дал «(k)»; оставлено (у других языков ровно это место падает в проверке на кириллице).
- **Числа**: проверка значений по всем блокам чистая; величины, валюты, время (24 ч) не менялись.
- «par nuit» для гостиничного «в сутки» (BTK, HMA, NOZ, UUA) оставлено: для номера это естественная французская единица той же длительности.
- Нейтральный справочный регистр, без вводных, оценок и эмодзи; подписи (hint) ≤ 35 символов во всех файлах.


## Перекрёстная проверка ChatGPT (выборка 5 пар, 25.10)

Принято по всем файлам: «zone stérile» → «zone réservée» (термин французских аэропортов), «gratuit pour la classe affaires» → «… pour les passagers de classe affaires», «moins de 2 ans gratuit» → «entrée gratuite…», «hors format» → «hors gabarit», «horodateurs» → «bornes de paiement». Отклонено: Т2 → T2 (кириллица в оригинале), «enfants handicapés» для ОВЗ (принятый перевод во всех языках), заголовок «Salons».

## Сутки = 24 часа

«Сутки» в тарифах — 24 часа от сдачи/въезда, а не календарный день: «первые сутки — 700 ₽, дальше
300 ₽ в сутки» значит первые 24 часа и каждые следующие 24 часа. Перевод «first day / per day»
читается как календарный день и даёт другой счёт. Исправлено 30 фрагментов в 22 блоках:
14 блоков с «первые сутки» (AER/DME/KRR/NOZ/SVO/SVX/UUS/VVO/ZIA storage, ASF/CEK/LED/NJC/UUS
parking) и 8 блоков со сроком в сутках (KVX/VOG kids «не дольше/до одних суток», NJC kids
«не позднее чем через сутки», UUD parking «не дольше суток», BQS/GYD/NNM/OSW/PEE parking «до суток»).
В том же предложении «в сутки / каждые следующие» переведено как «за 24 часа», чтобы единица
не менялась посреди тарифа. «Двое/трое суток» (ASF) и «с 1 по 5 сутки» (UUS) переданы через
число периодов по 24 часа: сторож чисел не пускает 48/72 и требует 5.

Не тронуто: календарные сутки с привязкой к часам (MRV «до 24:00», NBC, SGC, BAX «календарные»,
KZN «до полуночи текущих суток»); цены «в сутки» вне предложений с «первыми сутками» и «до суток»
(гостиницы, ARH, AER parking и т. п.); сроки хранения «до 30 суток» → «30 days»; GYD «каждый
следующий день» (в оригинале «день»); «меньше суток оплачивается как сутки» в GDX, KEJ, OVB, NOZ
parking — не входило в задачу, оставлено как «day».

| IATA | поле | было | стало |
|---|---|---|---|
| AER | storage.text | Le premier jour coûte à partir de 600 ₽ par bagage, chaque jour suivant à partir de 300 ₽. | Les premières 24 heures coûtent à partir de 600 ₽ par bagage, chaque tranche de 24 heures suivante à partir de 300 ₽. |
| ASF | parking.text | au-delà de 4 heures 900 ₽ par jour. | au-delà de 4 heures 900 ₽ par 24 heures. |
| ASF | parking.text | 600 ₽ pour le premier jour, 1100 ₽ pour deux jours, 1500 ₽ pour trois, ensuite 300 ₽ par jour. | 600 ₽ pour les premières 24 heures, 1100 ₽ pour deux tranches de 24 heures, 1500 ₽ pour trois, ensuite 300 ₽ par 24 heures. |
| CEK | parking.text | premier jour au total 1300 ₽, au-delà d'un jour 700 ₽ par jour. | les premières 24 heures au total 1300 ₽, au-delà de 24 heures 700 ₽ par 24 heures. |
| DME | storage.text | 1300 ₽ pour le premier jour si | 1300 ₽ pour les premières 24 heures si |
| KRR | storage.text | 400 ₽ par bagage le premier jour, 200 ₽ chaque jour suivant. | 400 ₽ par bagage pour les premières 24 heures, 200 ₽ par tranche de 24 heures suivante. |
| LED | parking.text | 1100 ₽ pour le premier jour, à partir de 14 jours 700 ₽ par jour. | 1100 ₽ pour les premières 24 heures, à partir de 14 jours 700 ₽ par 24 heures. |
| NJC | parking.text | Premier jour 1000 ₽, chaque jour suivant 800 ₽. | Premières 24 heures 1000 ₽, chaque tranche de 24 heures suivante 800 ₽. |
| NOZ | storage.text | 400 ₽ le premier jour | 400 ₽ les premières 24 heures |
| NOZ | storage.text | 750 ₽ le premier jour | 750 ₽ les premières 24 heures |
| SVO | storage.text | Le premier jour coûte 700 ₽ par bagage, ensuite 300 ₽ par jour. | Les premières 24 heures coûtent 700 ₽ par bagage, ensuite 300 ₽ par 24 heures. |
| SVX | storage.text | 500 ₽ pour le premier jour, 300 ₽ pour chaque jour suivant. | 500 ₽ pour les premières 24 heures, 300 ₽ par tranche de 24 heures suivante. |
| SVX | storage.text | 800 ₽ pour le premier jour, 500 ₽ pour les suivants. | 800 ₽ pour les premières 24 heures, 500 ₽ par tranche de 24 heures suivante. |
| UUS | parking.text | 1200 ₽ pour le premier jour et 600 ₽ pour les suivants. | 1200 ₽ pour les premières 24 heures et 600 ₽ par tranche de 24 heures suivante. |
| UUS | parking.text | 500 ₽/jour du 1er au 5e jour, ensuite 400 ₽. | 500 ₽ par 24 heures pour les 5 premières tranches de 24 heures, ensuite 400 ₽. |
| UUS | storage.text | 500 ₽ pour le premier jour, 200 ₽ pour les suivants. | 500 ₽ pour les premières 24 heures, 200 ₽ par tranche de 24 heures suivante. |
| VVO | storage.text | 500 ₽ pour le premier jour, 200 ₽ pour chaque jour suivant, | 500 ₽ pour les premières 24 heures, 200 ₽ par tranche de 24 heures suivante, |
| VVO | storage.text | Tout jour entamé est dû en entier. | Toute tranche de 24 heures entamée est due en entier. |
| ZIA | storage.text | 700 ₽ pour le premier jour, 300 ₽ pour chaque jour suivant. | 700 ₽ pour les premières 24 heures, 300 ₽ par tranche de 24 heures suivante. |
| KVX | kids.text | pas plus d'un jour. | pas plus de 24 heures. |
| VOG | kids.text | jusqu'à un jour. | jusqu'à 24 heures. |
| UUD | parking.text | un jour maximum. | 24 heures maximum. |
| NJC | kids.text | pour un départ dans un délai d'un jour au plus. | pour un départ dans les 24 heures. |
| BQS | parking.text | jusqu'à un jour 400 ₽, chaque jour suivant 400 ₽. | jusqu'à 24 heures 400 ₽, chaque tranche de 24 heures suivante 400 ₽. |
| NNM | parking.text | Au-delà d'une heure et jusqu'à un jour : | Au-delà d'une heure et jusqu'à 24 heures : |
| NNM | parking.text | Au-delà d'un jour, jusqu'à 30 jours : 600 ₽ par jour. | Au-delà de 24 heures, jusqu'à 30 jours : 600 ₽ par 24 heures. |
| OSW | parking.text | jusqu'à un jour 500 ₽, au-delà d'un jour 500 ₽. | jusqu'à 24 heures 500 ₽, au-delà de 24 heures 500 ₽. |
| PEE | parking.text | jusqu'à un jour 500 ₽, ensuite 500 ₽ par jour. | jusqu'à 24 heures 500 ₽, ensuite 500 ₽ par 24 heures. |
| PEE | parking.text | jusqu'à un jour 400 ₽, ensuite 400 ₽ par jour. | jusqu'à 24 heures 400 ₽, ensuite 400 ₽ par 24 heures. |
| PEE | parking.text | Toute heure ou journée entamée est due en entier. | Toute heure ou tranche de 24 heures entamée est due en entier. |

GYD parking в fr уже был переведён как «jusqu'à 24 heures» — не трогали, поэтому блоков на один меньше.

## Раунд 2 (25.10.2026): 24 аэропорта мирового топа

Проверены блок за блоком против русских оригиналов: AMS BCN BKK CAN CDG DEL DEN DFW FRA HKG HND
ICN JFK KUL LAS LAX LHR MAD MCO MIA ORD PEK PVG SIN. Числа, валюты (€, $, £, ¥, ₩, S$, HK$, RM, ₹,
THB/bahts, yuans), часы, этажи (niveau N / B1 / L6 — как на указателе), «до N лет» (JFK: moins de
5 ans), сутки = 24 heures, бесплатно/платно и «до/после досмотра» сверены вручную — расхождений
по числам и условиям нет. Правок 25 в 15 файлах: смысл 9, числа 0, имена 3, стиль 13.

Решения по вопросам переводчика:
- **porte / sortie / entrée.** Посадочный выход в чистой зоне — `porte` (оставлено везде).
  Двери у тротуара — `sortie` (прилёт, такси, остановки) или `entrée` (зал вылета, CAN T1/T3,
  PEK, PVG); `porte N` для дверей снято, т. к. указатели там «Door/Exit», а не «Porte».
- **Экзонимы** Leyde, La Haye, Mayence, Canton, Aschaffenbourg, Francfort, Séoul — стандартные
  французские формы, оставлены.
- **Сокращённые hint** проверены: потеря информации без искажения допустима (LHR без Piccadilly,
  MIA без Metrobus, ICN без «стоянки»); исправлен только JFK, где выпадение Howard Beach
  создавало впечатление единственной станции.
- «Downtown Brooklyn» (JFK) оставлен — это название района; «Даунтаун Денвера/Орландо» → centre-ville.

| Файл | Блок | Было | Стало | Почему |
|---|---|---|---|---|
| CAN | sleep.text | à gauche après la porte 61 | à gauche après l'entrée 61 | 61 — номер двери зала (как 50/53/75), не посадочный выход |
| CAN | lounges.text | intérieur — … , international — … | celui des vols intérieurs …, celui des vols internationaux … | «salon intérieur» не по-французски, неясно |
| DEL | transport.text | Distributeurs de billets | Automates de vente de billets | «distributeur de billets» = банкомат |
| DEN | taxi.text | près des portes 505, 507 et 511 | près des sorties 505, 507 et 511 | двери у тротуара, не gate |
| DEN | taxi.text | Downtown Denver (zone A) | centre-ville de Denver (zone A) | район — общепринятой формой языка |
| DEN | taxi.hint | Downtown — forfait 72,04 $ | Centre-ville : forfait 72,04 $ | то же |
| DEN | wifi.text | sièges et tablettes | sièges et plans de travail | «tablettes» читается как планшеты |
| DFW | kids.hint | Aire de jeux D8, allaitement | Jeux en D8, salles d'allaitement | «allaitement» без «salles» — обрубок |
| HKG | taxi.hint | Rouges urbains, Central 375 HK$ | Taxis rouges, Central 375 HK$ | калька «Urban» |
| HND | lounges.text | boissons dont alcoolisées | boissons, y compris alcoolisées | грамматика |
| JFK | transport.hint | AirTrain vers Jamaica, 8,75 $ | AirTrain : Jamaica, Howard Beach | потеряна вторая станция; цена есть в тексте, лимит 35 |
| KUL | terminals.text | au terminal 1 — porte 4 | au terminal 1 — sortie 4 | дверь у тротуара (Door 4) |
| LAS | taxi.text | près de la porte 52 | près de la sortie 52 | дверь у выдачи багажа |
| LAS | terminals.text | près de la porte 55 | près de la sortie 55 | дверь на Level Zero |
| LAS | transport.text | au niveau Level Zero | au Level Zero | тавтология |
| LAS | transport.text | Ici s'arrêtent | S'y arrêtent | стиль |
| LAS | parking.hint | 17 000+ places, dès 14 $/24 h | Plus de 17 000 places, dès 14 $ | «17 000+» — англицизм; ставка за 24 ч есть в тексте |
| LAX | transport.text | circulent … entre chaque terminal et Van Nuys et la gare Union Station | relient … chaque terminal à Van Nuys et à la gare Union Station | двойное «et» неоднозначно |
| MAD | taxi.text | il faut prendre une voiture uniquement à la station | ne prendre un taxi qu'à la station | калька |
| MCO | taxi.text | Downtown Orlando | centre-ville d'Orlando | район — формой языка |
| MIA | storage.text | accessoires de voyage | accessoires pour bagages | оригинал: багажные аксессуары |
| ORD | lounges.hint | United, Admirals Club, Sky Club | United Club, Admirals, Sky Club | название зала — United Club |
| ORD | kids.text | salles pour les mères | salles mère-enfant | единообразно с ICN, естественнее |
| SIN | transport.text | gares routières souterraines | quais de bus en sous-sol | «gare routière» — автовокзал, а это площадки (bus bays) |

Оставлено как есть (проверено): AMS BCN BKK CDG FRA ICN LHR PEK PVG — без правок; «garage»
в названиях паркингов US/PEK (Garage C, garages Dolphin/Flamingo) — собственные имена.
`node scripts/check-guide-fresh.mjs`: по fr провалов нет (остались чужие de/it — «переведено N из 100»).

## Раунд 2 — независимая выборка Codex, 26.10.2026

https://chatgpt.com/c/6ade6c54-86f8-8331-bfcc-6a259bb2153c — шесть пар MIA/lounges, LAS/parking, HND/lounges, PVG/storage, ICN/terminals, SIN/terminals; без поиска. Переводы fr не изменялись: владелец разрешил только правки дверей шага 2.

- №2 **отклонено**: ChatGPT требует portes вместо entrées/sortie у PVG. Это нарушает согласованную таблицу терминов проекта (porte = выход на посадку, entrée/sortie = дверь). Двери и источник уже проверены.
- №6 **отклонено как обязательная правка**: passerelle не является доказанной смысловой ошибкой; русский «переход» допускает это соответствие, утверждений об этажности перевод не добавляет.
- №1 — стилистическая рекомендация, предлагается уточнить oneworld как авиакомпанию альянса, условия оставить с et. Пока не внесено.
- №3 **подтверждено, ожидает разрешения владельца**: PVG/storage «Tous les points sont ouverts …, garde jusqu'à 2 mois …» → «Tous les points de consigne sont ouverts …; la durée de garde est de 2 mois au maximum …». Исходная конструкция грамматически несвязная.
- №4 **подтверждено, ожидает разрешения**: «pour une durée jusqu'à 4, 10 et 24 heures» → «pour des durées allant jusqu'à 4, 10 et 24 heures, respectivement».
- №5 **подтверждено, ожидает разрешения**: SIN/terminals «par tapis roulants» → «en empruntant les trottoirs roulants»; точнее пассажирские движущиеся дорожки.
- LAS, HND, ICN — замечаний к смыслу, числам и условиям по выборке нет.


## Раунд 2 (26.10.2026)

| Файл | Блок | Было | Стало | Тип | Почему |
|---|---|---|---|---|---|
| PEK | taxi.text | Pour les courses de plus de 15 km, 50% du montant s'ajoutent au titre du trajet retour | Pour la portion du trajet au-delà de 15 km, une majoration de 50% du tarif kilométrique s'applique au titre du retour à vide | смысл | Официальная китайская версия bcia.com.cn/wljc.html: 单程载客15公里以上部分，每公里租价加收50%费用. Подтверждённая правка оригинала согласована владельцем 26.10 |
| ICN | sleep.text | au niveau B1 | au niveau 1 | смысл | Официальный корейский каталог airport.kr/ap_ko/1008/subview.do: 캡슐호텔 다락휴(T1), 교통센터 1층 중앙. Исправление оригинала и 11 переводов согласовано владельцем 26.10 |
| MIA | lounges.text | Les salons American sont accessibles selon le statut et avec un billet en classe affaires ou première d'American ou de oneworld | L’accès aux salons American dépend du statut du passager et de son billet en classe affaires ou en première classe sur American ou une compagnie de l’alliance oneworld | стиль | Подтверждённая ошибка французского: исправление дополнительно разрешено владельцем 26.10. Условия и числа сохранены |
| MIA | lounges.text | un pass à la journée est vendu s'il reste des places | un pass pour un accès unique est vendu s'il reste des places | смысл | Подтверждённая ошибка французского: исправление дополнительно разрешено владельцем 26.10. Условия и числа сохранены |
| PVG | storage.text | Tous les points sont ouverts de 06:00 à 24:00, garde jusqu'à 2 mois, pièce d'identité requise au dépôt, les objets sont passés aux rayons X. | Tous les points de consigne sont ouverts de 06:00 à 24:00 ; la durée de garde est de 2 mois au maximum. Une pièce d'identité est requise au dépôt et les objets sont contrôlés aux rayons X. | стиль | Подтверждённая ошибка французского: исправление дополнительно разрешено владельцем 26.10. Условия и числа сохранены |
| PVG | storage.text | pour une durée jusqu'à 4, 10 et 24 heures | pour des durées allant jusqu'à 4, 10 et 24 heures, respectivement | стиль | Подтверждённая ошибка французского: исправление дополнительно разрешено владельцем 26.10. Условия и числа сохранены |
| SIN | terminals.text | on peut aussi passer de l'un à l'autre par tapis roulants | on peut aussi se déplacer entre ces terminaux en empruntant les trottoirs roulants | стиль | Подтверждённая ошибка французского: исправление дополнительно разрешено владельцем 26.10. Условия и числа сохранены |

Владелец 26.10 разрешил исправлять подтверждённые ошибки французского и синхронизировать подтверждённые ошибки оригинала. Ожидание снято: внесены №1,3–5 и исправлен дневной pass на разовый по межъязыковой сверке. №2 и6 остаются отклонены по причинам выше.
| MIA | parking.text | frais de réservation de 2,99 | frais de réservation | числа | Официальный источник miami-airport.com/airport-parking.asp даёт 2.99 без валюты; в условиях booking.mia-parking.com/terms-and-conditions суммы нет. Не придумываем валюту: неполную сумму убрали, невозвратность сбора сохранили. Правка подтверждённых проблем оригинала во всех языках разрешена владельцем 26.10 |
| ICN | sleep.text | au centre du pôle de transport au niveau 1 | au centre du pôle de transport | смысл | Повторная проверка: английский официальный каталог даёт Center of Transportation Center 1BF, корейский 교통센터 1층 중앙. По CLAUDE.md при противоречии факт не публикуется: убран только спорный этаж Darakhyu, центр транспортного центра сохранён |
