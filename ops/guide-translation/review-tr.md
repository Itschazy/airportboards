# Рецензия перевода справочной — tr

Рецензент: независимый редактор (носитель-уровень, турецкий). Дата: 2026-10-25.
Проверено: все 76 файлов `data/airport-guide/tr/` против `data/airport-guide/<IATA>.json`, каждый блок
(title, hint, text) и `about`. Скриптом: валидность JSON, полный набор ключей блоков, совпадение
множества чисел в каждом hint/text/about с оригиналом (расхождений нет), длина hint ≤ 35 (превышений
нет), кириллица — только в кодах маршрутов/зон/домов (111Э, 244-Э, 106н, Т1, Р1, С2, 3Б и т. п.),
посторонних языков (en/de/fr/es/it, CJK, арабица, деванагари) в tr/ нет — смешения из общих черновиков
не обнаружено. `node scripts/check-guide-fresh.mjs`: по tr провалов нет.

## Проверка догадок переводчика
- **BTK, тарифы** «Бизнес Стандарт / Бизнес Плюс / Эконом Плюс»: официальные латинские названия
  подтвердить нельзя (неясно даже, чьи это тарифы) → заменены на транслитерацию
  Biznes Standart / Biznes Plyus / Ekonom Plyus. По той же логике SVO «Инфинит/Инфинит Про» →
  Infinit / Infinit Pro (Gold, Platinum — официальные формы Aeroflot Bonus, оставлены);
  ZIA «Стандарт лайт» → Standart Layt.
- **«Северный ветер» → Nordwind** (NBC): верно, официальный бренд перевозчика. Оставлено.
- **Формы городов**: Şeremetyevo, Erivan, Tiflis, Bakü, Soçi, Çelyabinsk, Kazan, Moskova и пр.
  совпадают с `city-names.json`/`airport-names.json` и турецкой нормой, единообразны внутри файлов.
  Исправлен только GDX «Mağadan» → Magadan. Сознательно не трогал смешение турецкой (Blagoveşçensk,
  Kurçatov) и английской транслитерации (Khoroshee, Krasnaya Polyana) для улиц/остановок/компаний:
  это латиница по правилу BRIEF, а формы городов совпадают с данными сайта.

## Правки (было → стало)

| Файл | Блок | Тип | Было → стало | Почему |
|---|---|---|---|---|
| ARH | parking.text | стиль | Otopark biletinin kaybı: 2 000 ₽. → Otopark biletini kaybetme: 2 000 ₽. | «biletin kaybı» — калька с «потеря билета» |
| NJC | storage.text | стиль | Numaralı fişin kaybı 400 ₽. → Numaralı fişi kaybetme: 400 ₽. | калька «утеря номерка», как в ARH |
| BTK | lounges.text | имена | Business Standard, Business Plus, Economy Plus tarifeleri → Biznes Standart, Biznes Plyus, Ekonom Plyus tarifeleri | официальные латинские названия тарифов не подтверждены — транслитерация вместо придуманных английских |
| EYK | storage.text | смысл | (01.10.2026 tarihli tarife) → (01.10.2026'dan itibaren geçerli tarife) | «прейскурант с 01.10.2026» — действует с даты, а не «датированный» |
| GDX | transport.text | имена | Mağadan otogarı → Magadan otogarı | общепринятая турецкая форма — Magadan (ğ в начале слога неверно) |
| GDZ | storage.text | стиль | Ödeme ödeme makinesinde nakit veya kartla; → Ücret, ödeme makinesinde nakit veya kartla ödenir; | повтор «Ödeme ödeme» |
| IWA | parking.text | смысл/стиль | Ödeme ödeme makinesinde (para üstü verilmez, nakit veya kart), → Ödeme otomatik makinede nakit (para üstü verilmez) veya kartla, | «наличные без сдачи» относится к наличным, не к карте; повтор «Ödeme ödeme» |
| HMA | about | смысл | 2004'ten beri devlet sınır kapısı olarak hizmet veriyor. → 2004'ten beri burada hava hudut kapısı faaliyette. | в оригинале «действует пункт пропуска», а не «аэропорт служит пунктом пропуска» |
| IAR | about | смысл | Havada devlet sınır kapısı çalışır, gümrük noktası var. → Hava hudut kapısı faaliyette, gümrük noktası var. | «Havada» = «в воздухе» — ошибка; «воздушный пункт пропуска» = hava hudut kapısı |
| ZIA | about | стиль | burada devlet sınır kapısı çalışır. → burada hava hudut kapısı faaliyette. | единый термин «hava hudut kapısı» для пункта пропуска |
| HMA | lounges.text | стиль | Çok önemli kişiler salonu, gidişte 10 000 ₽. → Gidişte VIP salonu 10 000 ₽. | калька «зал для особо важных персон»; по-турецки VIP salonu |
| KEJ | about | стиль | Savunma Bakanlığı ile Rosgvardiya ile ortak kullanılır. → Savunma Bakanlığı ve Rosgvardiya ile ortak kullanılır. | двойное «ile» |
| KZN | lounges.text | смысл | 4 numaralı çıkıştan sonra sağda → 4 numaralı kapıdan sonra sağda | «выход №4» после досмотра — выход на посадку (kapı), не выход из здания |
| OVB | lounges.text | смысл | 6 numaralı çıkışın karşısından → 6 numaralı kapının karşısından | «выход № 6» в чистой зоне — выход на посадку |
| UFA | lounges.text | смысл | 2 numaralı çıkışın karşısında → 2 numaralı kapının karşısında | «выход №2» — выход на посадку |
| LED | kids.text | стиль | 7 yaşına kadar (dahil) çocuklarla → 7 yaşına kadar (bu yaş dahil) çocuklarla | неясно, что включено |
| NBC | lounges.text | стиль | Tek seferlik ziyareti her biletle yolcu satın alabilir; → Tek seferlik ziyareti, bileti ne olursa olsun her yolcu satın alabilir; | неграмотная конструкция «her biletle yolcu» |
| NER | terminals.text | смысл | Bilet gişesi tarifeye göre uçuştan 2 saat önce açılır → Bilet gişesi tarifedeki kalkış saatinden 2 saat önce açılır | «за 2 часа до рейса по расписанию» — от времени рейса, а не «по расписанию открывается» |
| NJC | about | стиль | Pist 3200'e 60 m. → Pist 3200 × 60 m. | «3200'e 60 m» не по-турецки |
| NOJ | lounges.text | смысл | çay, kahve ve şekerlemeler var → çay, kahve ve tatlılar var | «кондитерские изделия» ≠ şekerleme (конфеты) |
| NSK | kids.text | смысл | havayolu tarafından ücretsiz yerleştirilir → masrafları havayoluna ait olmak üzere ücretsiz yerleştirilir | «за счёт авиакомпании» — авиакомпания платит, а не размещает |
| IST | sleep.text | смысл | Rezervasyon 4 saatten itibaren. → Rezervasyon en az 4 saatlik yapılır. | «бронирование от 4 часов» — минимальная длительность; было двусмысленно |
| SVO | sleep.text | смысл | ödeme saatlik, 4 saatten itibaren. → ödeme saatlik, en az 4 saat. | минимальная оплата 4 часа, а не «с 4 часов» |
| SVO | kids.text | стиль | Gece gündüz ve ücretsiz açık. → Gece gündüz açık ve ücretsiz. | «ücretsiz açık» — неверная конструкция |
| SVO | lounges.text | имена | Aeroflot Bonus Gold, Platinum, Infinite ve Infinite Pro kart sahipleri → Aeroflot Bonus Gold, Platinum, Infinit ve Infinit Pro kart sahipleri | «Инфинит» — официальная латинская форма не подтверждена, транслитерация вместо английского слова |
| SVO | parking.text | стиль | Geliş ve Giden alanlarına → Geliş ve Gidiş alanlarına | пара Geliş/Gidiş, как на табличках |
| SVO | parking.text | стиль | yanındaki Giden alanında → yanındaki Gidiş alanında | то же |
| TBW | kids.text | стиль | Taşımacılık organizasyon servisine başvurun. → Yolcu hizmetleri servisine başvurun. | калька «служба организации перевозок»; как в CEE |
| UFA | storage.text | стиль | Bir parça üç boyutunun toplamı 203 cm'yi ve 32 kg'ı geçmemelidir. → Bir parçanın üç boyutunun toplamı 203 cm'yi, ağırlığı 32 kg'ı geçmemelidir. | грамматически неверное предложение |
| VKO | lounges.text | смысл | dış hat gidişinde 1 saat önce çıkılmalıdır → dış hat uçuşunda salondan kalkıştan 1 saat önce çıkılmalıdır | неясно, откуда и до чего «1 saat önce» |
| ZIA | storage.text | имена | Standart lite: 600 ₽ → Standart Layt: 600 ₽ | тариф «Стандарт лайт» — транслитерация, не английское слово |
| TBS | wifi.text | стиль | Giden ve geliş terminallerindeki → Gidiş ve geliş terminallerindeki | пара gidiş/geliş |
| DME | lounges.text | стиль | iç/dış hatlar giden steril alanı (×2) → gidiş steril alanı | пара gidiş/geliş |

### Пакетная стилевая правка: «giden» → «gidiş» в названиях зон
Переводчик сочетал «geliş salonu» (прилёт) с «giden salonu/alanı/terminali» (вылет) — несимметричная
пара, а в SVO, AYT, TBS даже в одной фразе («Geliş ve Giden alanları», «geliş ve giden salonları»).
Для зон/залов/терминалов приведено к паре geliş/gidiş, как на турецких табличках; «giden yolcular»
(вылетающие пассажиры) не тронуто. Затронуто (поле → giden … → gidiş …):

- AYT storage.text
- AYT wifi.text
- DLM wifi.text
- GOJ lounges.text
- GYD wifi.text
- IAR kids.hint
- IAR kids.text
- IJK terminals.text
- IST sleep.text
- KUF lounges.text
- LED lounges.text
- LED terminals.hint
- LED terminals.text
- MRV about
- MRV parking.text
- NER lounges.text
- NNM lounges.text
- NSK lounges.text
- NUX storage.hint
- NUX storage.text
- RGK about
- RGK terminals.text
- TBW terminals.hint
- TBW terminals.text
- UFA lounges.text
- VVO lounges.text
- ZIA kids.text

## Итог по типам
- смысл: 13 (EYK, HMA about, IAR about, IWA, KZN, OVB, UFA lounges, NER, NOJ, NSK, IST, SVO sleep, VKO)
- числа: 0 (все числа совпадают с оригиналом)
- имена: 4 (BTK тарифы, SVO Infinit, ZIA Standart Layt, GDX Magadan)
- стиль: 16 точечных (включая TBS, DME) + 27 полей пакетной правки giden → gidiş

## Три самые серьёзные ошибки
1. IAR about: «Havada devlet sınır kapısı çalışır» — буквально «в воздухе работает пограничный пункт»;
   исправлено на «Hava hudut kapısı faaliyette».
2. KZN/OVB/UFA lounges: «выход №N» (выход на посадку) переведён как «çıkış» (выход из здания) —
   читатель искал бы зал у выхода из терминала; исправлено на «N numaralı kapı».
3. NSK kids: «размещаются бесплатно за счёт авиакомпании» стало «авиакомпания размещает» — потерян
   смысл, кто платит; исправлено. Также BTK: придуманные английские названия тарифов заменены
   транслитерацией.

## Этажи как на указателях

Турок читает «1. kat» как первый этаж НАД землёй (уровень земли — zemin kat), а в российских
аэропортах «1 этаж» — это уровень земли и цифра на табличке. Все ссылки переведены в форму
указателя «Kat N» с аффиксами по произношению числа: 268 упоминаний в 216 полях, 56 файлов.
Номера не менялись, каждый блок сверен с оригиналом.

- `1. kat, 24/7` → `Kat 1, 24/7`; `2. katta` → `Kat 2'de`; `3. katta` → `Kat 3'te`; `1. kattaki` → `Kat 1'deki`;
- родительный перестроен в местный: `terminal binasının 2. katında` → `terminal binasında Kat 2'de`,
  `Terminal 1'in 3. katında` → `Terminal 1'de Kat 3'te`, `C sektörünün 3. katında` → `C sektöründe Kat 3'te`;
- `Terminal 2'nin 1. katı` → `Terminal 2, Kat 1`; LED `3. kata getirir, 1. kattan kalkar` → `Kat 3'e … Kat 1'den`;
- словесные: `ikinci katta` → `Kat 2'de`, `birinci kat` → `Kat 1`; диапазоны NOZ `Kat 1–2'de`, GYD `Kat 3 ve Kat 4'te`;
- `−1. kat` (VKO) → `Kat −1`. «Bodrum kat» для цокольного этажа оставлен.

## Сутки = 24 часа

«Сутки» в тарифах — 24 часа от сдачи/въезда, а не календарный день: «первые сутки — 700 ₽, дальше
300 ₽ в сутки» значит первые 24 часа и каждые следующие 24 часа. Перевод «first day / per day»
читается как календарный день и даёт другой счёт. Исправлено 31 фрагментов в 23 блоках:
14 блоков с «первые сутки» (AER/DME/KRR/NOZ/SVO/SVX/UUS/VVO/ZIA storage, ASF/CEK/LED/NJC/UUS
parking) и 9 блоков со сроком в сутках (KVX/VOG kids «не дольше/до одних суток», NJC kids
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
| AER | storage.text | İlk gün parça başına 600 ₽'den, sonraki her gün 300 ₽'den başlar. | İlk 24 saat parça başına 600 ₽'den, sonraki her 24 saat 300 ₽'den başlar. |
| ASF | parking.text | 4 saatten fazlası günlüğü 900 ₽. | 4 saatten fazlası her 24 saat için 900 ₽. |
| ASF | parking.text | 181. dakikadan itibaren ilk gün 600 ₽, iki gün 1100 ₽, üç gün 1500 ₽, sonrası günlüğü 300 ₽. | 181. dakikadan itibaren ilk 24 saat 600 ₽, iki adet 24 saatlik dönem 1100 ₽, üç dönem 1500 ₽, sonrası her 24 saat için 300 ₽. |
| CEK | parking.text | ilk gün toplamda 1300 ₽, bir günün üzerinde günlüğü 700 ₽. | ilk 24 saat toplamda 1300 ₽, 24 saatin üzerinde her 24 saat için 700 ₽. |
| DME | storage.text | ilk gün 1300 ₽. | ilk 24 saat 1300 ₽. |
| KRR | storage.text | İlk gün parça başına 400 ₽, sonraki her gün 200 ₽. | İlk 24 saat parça başına 400 ₽, sonraki her 24 saat 200 ₽. |
| LED | parking.text | ilk gün 1100 ₽, 14 günden itibaren günlüğü 700 ₽. | ilk 24 saat 1100 ₽, 14 günden itibaren her 24 saat için 700 ₽. |
| NJC | parking.text | İlk gün 1000 ₽, sonraki her gün 800 ₽. | İlk 24 saat 1000 ₽, sonraki her 24 saat 800 ₽. |
| NOZ | storage.text | ilk gün 400 ₽ | ilk 24 saat 400 ₽ |
| NOZ | storage.text | ilk gün 750 ₽ | ilk 24 saat 750 ₽ |
| SVO | storage.text | İlk gün parça başına 700 ₽, sonrası günlüğü 300 ₽. | İlk 24 saat parça başına 700 ₽, sonrası her 24 saat için 300 ₽. |
| SVX | storage.text | ilk gün 500 ₽, sonraki her gün 300 ₽. | ilk 24 saat 500 ₽, sonraki her 24 saat 300 ₽. |
| SVX | storage.text | ilk gün 800 ₽, sonraki günler 500 ₽. | ilk 24 saat 800 ₽, sonraki her 24 saat 500 ₽. |
| UUS | parking.text | sonra ilk gün 1200 ₽ ve sonraki günler 600 ₽. | sonra ilk 24 saat 1200 ₽ ve sonraki her 24 saat 600 ₽. |
| UUS | parking.text | 1. ila 5. gün günlüğü 500 ₽, sonrası 400 ₽. | 24 saatlik ilk 5 dönemde her 24 saat için 500 ₽, sonrası 400 ₽. |
| UUS | storage.text | ilk gün 500 ₽, sonraki günler 200 ₽. | ilk 24 saat 500 ₽, sonraki her 24 saat 200 ₽. |
| VVO | storage.text | ilk gün 500 ₽, sonraki her gün 200 ₽; | ilk 24 saat 500 ₽, sonraki her 24 saat 200 ₽; |
| VVO | storage.text | Tamamlanmamış gün tam gün sayılır. | Tamamlanmamış 24 saatlik dönem tam sayılır. |
| ZIA | storage.text | ilk gün 700 ₽, sonraki her gün 300 ₽. | ilk 24 saat 700 ₽, sonraki her 24 saat 300 ₽. |
| KVX | kids.text | en fazla bir gün. | en fazla 24 saat. |
| VOG | kids.text | en fazla bir gün. | en fazla 24 saat. |
| UUD | parking.text | en fazla bir gün. | en fazla 24 saat. |
| NJC | kids.text | en geç bir gün içinde kalkışı olan | 24 saat içinde kalkışı olan |
| BQS | parking.text | bir güne kadar 400 ₽, sonraki her gün 400 ₽. | 24 saate kadar 400 ₽, sonraki her 24 saat 400 ₽. |
| GYD | parking.text | bir güne kadar 15 AZN | 24 saate kadar 15 AZN |
| NNM | parking.text | Bir saatin üzerinde ve bir güne kadar: | Bir saatin üzerinde ve 24 saate kadar: |
| NNM | parking.text | Bir günün üzerinde, 30 güne kadar: günlüğü 600 ₽. | 24 saatin üzerinde, 30 güne kadar: her 24 saat için 600 ₽. |
| OSW | parking.text | bir güne kadar 500 ₽, bir günden itibaren 500 ₽. | 24 saate kadar 500 ₽, 24 saatten itibaren 500 ₽. |
| PEE | parking.text | bir güne kadar 500 ₽, sonrası günlüğü 500 ₽. | 24 saate kadar 500 ₽, sonrası her 24 saat için 500 ₽. |
| PEE | parking.text | bir güne kadar 400 ₽, sonrası günlüğü 400 ₽. | 24 saate kadar 400 ₽, sonrası her 24 saat için 400 ₽. |
| PEE | parking.text | Tamamlanmamış saat ve gün tam olarak ücretlendirilir. | Tamamlanmamış saat ve 24 saatlik dönem tam olarak ücretlendirilir. |


## Перекрёстная проверка ChatGPT (выборка 4 пары, 25.10)

Принято: возраст «до N лет» = младше N — «N yaşına kadar» → «N yaşından küçük» (122 мест, кроме LED «до 7 лет включительно»), «1195 numaralı otobüs», «geceleri seferlere ara verilir», «Başlanan gün tam gün olarak ücretlendirilir». Отклонено: Т1 → T1 (кириллица по правилам), «Bufetъ» (твёрдый знак в латинице нечитаем), «Kat 2» → «2. katta» (этаж как на указателе).
