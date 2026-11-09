# Независимая рецензия пилота: zh / ja / ko / ar / hi

Дата: 09.11.2026. Рецензент: отдельный агент review_asian, не автор текстов.
Рабочая копия: /Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028.
Проверенный HEAD: 3fe9f0ea24a30dc2e20b4b4d5d28acbb24d20356; продуктовый релиз c08e6a09.
База смыслового diff: e3902bc9. JSON сравнивался по значениям, а не форматированию.
Данные не изменялись; commit/push, production-запросы и платные API не выполнялись.

## Объём

Прочитаны AGENTS.md, CLAUDE.md, HANDOFF.md, shared-context INSTRUCTIONS и bridge read airportsboard,
ops/guide-translation/BRIEF.md, REVIEW.md, ROUND2-RESULT.md.
Полностью сверены все 105 изменённых полей 30 переводов с текущими шестью RU-оригиналами.
Для каждого языка: KZN 2 поля, OVB 6, AYT 4, HRG 3, SSH 3, IST 3 =21.
Форматирование неизменённых полей не считается содержательным изменением.

| Файл | Проверенные поля |
|---|---|
| data/airport-guide/zh/KZN.json | parking.hint,text |
| data/airport-guide/zh/OVB.json | about; transport.hint,text; lounges.hint,text; parking.text |
| data/airport-guide/zh/AYT.json | wifi.text; terminals.title,hint,text |
| data/airport-guide/zh/HRG.json | sleep.title,hint,text |
| data/airport-guide/zh/SSH.json | lounges.title,hint,text |
| data/airport-guide/zh/IST.json | storage.title,hint,text |
| data/airport-guide/ja/KZN.json | parking.hint,text |
| data/airport-guide/ja/OVB.json | about; transport.hint,text; lounges.hint,text; parking.text |
| data/airport-guide/ja/AYT.json | wifi.text; terminals.title,hint,text |
| data/airport-guide/ja/HRG.json | sleep.title,hint,text |
| data/airport-guide/ja/SSH.json | lounges.title,hint,text |
| data/airport-guide/ja/IST.json | storage.title,hint,text |
| data/airport-guide/ko/KZN.json | parking.hint,text |
| data/airport-guide/ko/OVB.json | about; transport.hint,text; lounges.hint,text; parking.text |
| data/airport-guide/ko/AYT.json | wifi.text; terminals.title,hint,text |
| data/airport-guide/ko/HRG.json | sleep.title,hint,text |
| data/airport-guide/ko/SSH.json | lounges.title,hint,text |
| data/airport-guide/ko/IST.json | storage.title,hint,text |
| data/airport-guide/ar/KZN.json | parking.hint,text |
| data/airport-guide/ar/OVB.json | about; transport.hint,text; lounges.hint,text; parking.text |
| data/airport-guide/ar/AYT.json | wifi.text; terminals.title,hint,text |
| data/airport-guide/ar/HRG.json | sleep.title,hint,text |
| data/airport-guide/ar/SSH.json | lounges.title,hint,text |
| data/airport-guide/ar/IST.json | storage.title,hint,text |
| data/airport-guide/hi/KZN.json | parking.hint,text |
| data/airport-guide/hi/OVB.json | about; transport.hint,text; lounges.hint,text; parking.text |
| data/airport-guide/hi/AYT.json | wifi.text; terminals.title,hint,text |
| data/airport-guide/hi/HRG.json | sleep.title,hint,text |
| data/airport-guide/hi/SSH.json | lounges.title,hint,text |
| data/airport-guide/hi/IST.json | storage.title,hint,text |

## Находки

### 1. Исправить: ko/OVB lounges.hint превышает лимит CJK

`Premier: 4시간 4000 ₽` содержит19 Unicode code points, лимит18.
Минимальное исправление `Premier:4시간 4000 ₽` содержит18 и сохраняет зал, срок и тариф.
Другие34 изменённых hints укладываются в лимиты18/35 (считались Python len, включая пробелы и RTL-маркеры).
Это дефект правила длины, не доказанный визуальный overflow: браузер в этой рецензии не запускался.

### 2. Исправить локализацию названия OVB в about (пять файлов)

Во всех пяти языках прежняя местная форма названия аэропорта заменена на `Tolmachevo`.
Это не меняет аэропорт, но противоречит BRIEF: названия аэропортов/городов в общепринятой форме языка;
латиницей сохраняются отдельные залы, бренды, станции. Без необходимости потеряна существовавшая локализация.
Рекомендуется вернуть прежние формы без отката новых фактов:
zh `托尔马切沃`, ja `トルマチェヴォ`, ko `톨마체보`, ar `تولماتشيوفو`, hi `टोल्माचेवो`.
Для ar/hi написание здесь взято из проверенной базы, не заново утверждено носителем.

### 3. Исправить японский термин часового пояса

ja/OVB about: `時間帯はUTC+7` → `タイムゾーンはUTC+7`.
時間帯 обычно означает промежуток времени/временной диапазон; タイムゾーン точнее передаёт часовой пояс.
ЧислоUTC+7 и опережение Москвы на4часа переданы правильно.

### 4. Формальное расхождение кодов Т1/T1 в новых hints (15 полей)

Во всех пяти локалях AYT.terminals.hint, HRG.sleep.hint, SSH.lounges.hint используют латинское `T1`,
тогда как RU содержит кириллическое `Т1`. BRIEF явно требует сохранять код `Т1`, включая кириллицу.
Это визуально похожие, но разные символы. При буквальном применении нынешнего правила заменить
T→Т в этих15полях. Если редакция хочет для международных аэропортов официальное латинское T1,
решать на уровне оригинала и правила; не объявлять выбор переводчика точным посимвольным соответствием.
В KZN коды Р1/Р2/1А и в OVB 111Э сохранены правильно во всех пяти переводах.

### 5. Пробел RU-исходника: SSH, международные рейсы T1

Локальный архив `outputs/guide-pilot-20261109/sources/ssh-priority.txt`:
раздел Location прямо ограничивает доступ международными рейсами изT1.
В RU SSH.lounges.text и всех пяти переводах этой оговорки нет. Переводы точно следуют RU,
поэтому это НЕ пять ошибок перевода. Риск: пассажир другого терминала/внутреннего рейса сочтёт
общую возможность оплаты достаточным условием доступа.
Второй архив `ssh-sleep.txt` подтверждаетT1/airside/24h/paid pass/membership, но НЕ явно это ограничение.
Для соблюдения two-source правила нужна адресная проверка или осторожная формулировка необходимости
уточнить доступ для своего рейса; нельзя незаметно добавить факт только в переводы.

## Что сверено без замечаний по смыслу

- KZN: бесплатные20мин наР1 и5мин наР2; повторный въезд в1час без бесплатного периода;
  выезд в20мин после оплаты; выбор паркомат ИЛИ приложение; телефон неизменён.
- OVB: UTC+7/4часа/запад17км; отправления05:00–00:30 от вокзала и04:00–23:30 от аэропорта;
  30мин интервал; пересадка вOb; №4/40₽ устанции;111Э/112 у2-ya Severnaya/Stantsionnaya.
- OVB lounges: тариф4000₽/4ч теперь относится кPremier и международному залу, а неKomfort;
  дети2–12/2000₽ и младше2бесплатно сохранены. Этажи2/3, сектораC/B, gate6,50мест не перепутаны.
  CJK 2楼/2階/2층 соответствуют разрешённой в BRIEF нумерации; ar المستوى, hi लेवल сохранены.
- OVB parking: новая платность100₽ первых15мин при повторном въезде в1час ПОСЛЕ выезда сохранена.
- AYT: соединение международногоT1 с внутренним, отдельные входы, пеший переход;
  T2 примерно2.5км/5мин наавтомобиле; автобус ИЛИ такси. Wi-Fi телефон/паспорт/ID — альтернативы,
  не обязательное сочетание; PIN/киоски/1час/CIP иlounges безлимит сохранены.
- HRG: капсулы Pearl LoungeT1; обе проверки ДО оплаты (доступ пассажирам своего рейса И включение
  места сна вуслугу). Не добавлены бесплатность, тариф, круглосуточность или гарантированный доступ.
- SSH: after passport/security,24h, pass ИЛИprogramme, проверить условиякарты — сохраняются.
- IST: arrivalslevel, domesticpassengerEXIT и напротивEXIT13, неboardinggate;
 24часа,210/270/550₺ и разные размеры; отдельный тариф длябольшего багажа — сохраняются.
- Западные цифры в ar/hi сохранены. Новых перепутанных отрицаний, сравнений возраста, валют,
  before/after, terminal/gate/exit в переводах относительноRU не обнаружено.

## Ограничения

Это независимая модельная рецензия вторым исполнителем, а не проверка носителями пяти языков
и не внешний профессиональный редактор. Смысл читался вручную, длины считались программно.
Не проверялось заново всё неизменённое содержимое30файлов и остальной корпус188аэропортов.
Не проводилась браузерная проверка RTL/переносов, сборка или production-проверка: это отдельные этапы.
Не утверждается свежая независимая проверка всех первоисточников: архив SSH прочитан для конкретного сомнения.
Данные оставлены без изменений; указанные находки переданы основному агенту для правки и повторной сверки.

## Последующая подготовка предложений

По запросу основного агента подготовлен proposed-asian.json: SSH international T1-only,
OVB явно per24h и ko hint `Premier 4시간 4000₽` (17символов). Это авторские предложения
этого рецензента, требующие независимой проверки основным агентом. Предложение убрать
Premier из hint отклонено основным агентом: тариф должен оставаться привязан к залу.
Данные сайта не менялись.
