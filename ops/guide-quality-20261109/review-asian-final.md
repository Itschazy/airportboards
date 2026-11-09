# Финальная сверка zh/ja/ko/ar/hi после исправлений

09.11.2026. Агент review_asian. HEAD при проверке: 3fe9f0ea24a30dc2e20b4b4d5d28acbb24d20356.
Прочитан фактический git diff рабочих data относительно HEAD: 10 файлов,16 полей переводов.
Остальные20файлов пилота в этихлокалях новых изменений относительноHEAD не имеют.
Сверены текущие RU OVB и SSH, полные новые about/parking/lounges тексты и hint.

## Результат: новых блокирующих расхождений с RU не обнаружено

- SSH во всех5языках явно ONLY пассажиры международных рейсов, ВЫЛЕТАЮЩИХ изТ1.
  Сохранены after passport/security,24h, платныйpass ИЛИmembership и проверкаусловийкарты.
  Японское 出国審査 соответствует вылету, ошибочного переноса наarrivals нет.
- OVB parking: везде явные24часа; сохранены пороги3/6суток, цены700/500/300,1500,
  бесплатные15мин,100₽ за15мин при повторномвъезде в1час после выезда.
  Вzh/ko/hi «1день=24часа» не добавляет новое условие: оно теперь явно дано вRU.
  НомераP1–P4 и условие распознанного номера сохранены.
- OVB about: местные формы названия восстановлены во всех5;17км/запад/UTC+7/4часа
  сохранены. Японский タイムゾーン точнее прежнего 時間帯; имя Покрышкина вернули избазы,
  новой самостоятельной проверки устоявшейся японской транскрипции имени не проводилось.
- ko OVB lounges.hint `Premier 4시간 4000₽`:17codepoints, сохраняет привязку тарифа кPremier,
  срок4часа и4000рублей; пробелы между именем,длительностью,ценой делают строку читаемой.
- T1/Т1: основной агент явно решил сохранять латинское сокращение международного Terminal1.
  Смысловое возражение отсутствует; прежнее замечание о буквальном BRIEF закрыто решением
  редакции. Оно не распространяется на кириллические указателиР1/Р2/1А/111Э вРоссии.
- Новое подтверждение SSH через DragonPass сообщено основным агентом. В actualRU вижу
  primaryPriorityPass, secondDragonPass и thirdSleepingInAirports. Сам сеть заново не открывал,
  поэтому независимым подтверждением второгоисточника мой отчёт не является.

## Независимость и ограничения

Первоначальный пилот проверен независимым от автора агентом (review-asian.md).
Нынешние формулировки SSH/parking предложил этот же рецензент в proposed-asian.json;
повторная сверка actualфайлов здесь — самопроверка внедрения, НЕ ещё одна независимая
редактура. Независимую от автора оценку предложений выполняет основной агент.
Носители языка не участвовали. UI/RTL/render/build/production не проверялись этимагентом.
Data не менялись; публикация не выполнялась. Полный корпус188аэропортов не покрыт.

## SHA256 фактически прочитанных файлов пилота

| Файл | Новые изменения vsHEAD | SHA256 |
|---|---|---|
| data/airport-guide/zh/KZN.json | без новых изменений | `3a56833d8be3def9a18432b3057fbb73329c29b4737f53651af3524f42c65bbe` |
| data/airport-guide/zh/OVB.json | about, parking.text | `a22b755b9dcc9d109afc6f17599342d578406dfa6214d38bd5465bc0102e85b8` |
| data/airport-guide/zh/AYT.json | без новых изменений | `513f990a0abbf17571c4b6937bc692838594b02cc37da2bfe643fac49aae78f1` |
| data/airport-guide/zh/HRG.json | без новых изменений | `a87f252794b2bfa59b5a30cdc4ad8a5ada58b960338ad99b10d29d548362db9c` |
| data/airport-guide/zh/SSH.json | lounges.text | `d712a9c23f6fb1bb2169398c2238a98357d55a2a9006a2635514fd04f455224e` |
| data/airport-guide/zh/IST.json | без новых изменений | `375a87df9f6c332a7339c92affa44ca7e07318add19e653b9da693d36fc53485` |
| data/airport-guide/ja/KZN.json | без новых изменений | `91a78933755105b1f4040025462e8930a43cdebff54c5ba574ef0a5dbab6677f` |
| data/airport-guide/ja/OVB.json | about, parking.text | `dbce2239038622e29bfd5a98f040e672bb5d8f55f3ea05b390f4d322e30d65f9` |
| data/airport-guide/ja/AYT.json | без новых изменений | `b64bd66a5c5800054a28618b952f414cfff742e584f01ba7483fdb3a671dec86` |
| data/airport-guide/ja/HRG.json | без новых изменений | `a199afbe375f0999beeb7a6abb8b52959027e39198ad121db7a72056a0b31378` |
| data/airport-guide/ja/SSH.json | lounges.text | `cbafe50d1f206c75153b574f50da6cc15c4db6a09a21db2da46c03ab8b1f0ffc` |
| data/airport-guide/ja/IST.json | без новых изменений | `422748ce35d5e487409aa15326221afe7a9ba09340dfb751b89b50d909d1cc32` |
| data/airport-guide/ko/KZN.json | без новых изменений | `a4b06417ef9b0f870a1bce08b88ad65c9143e1ef5ae3d8ac4df2c4a3650e5029` |
| data/airport-guide/ko/OVB.json | about, lounges.hint, parking.text | `8971b2e71a4df22d3e61ef91dcef8c47a26417f13a67bb66df1bb3ab769d96d6` |
| data/airport-guide/ko/AYT.json | без новых изменений | `562d9c0116517036fcfa76e55920652bfbef2f82515e98fceb19f3c814db7fa4` |
| data/airport-guide/ko/HRG.json | без новых изменений | `e72e8e4a50f616227e3d8c2bbb0fcea73e8b1ee558ac550a43d10a14e5b21ec6` |
| data/airport-guide/ko/SSH.json | lounges.text | `2ece23d962154e436f84417f2bbc553b39628e18cdcd1999a2db072dc851613d` |
| data/airport-guide/ko/IST.json | без новых изменений | `bc4fa19709009246e93ab321be84f064cb081d5fb5b200dbdb5f449664d7f0f3` |
| data/airport-guide/ar/KZN.json | без новых изменений | `cc4ce06990ea9ddf500abe99a8c25d878bd74a6d54139c9cfde7b1850de78b7b` |
| data/airport-guide/ar/OVB.json | about, parking.text | `1f4e49a8458d44d863d7202db24de0845444c0685977dda33689846a0284d0ae` |
| data/airport-guide/ar/AYT.json | без новых изменений | `3d687c08a8c05aa663d3925a5d4c9f879d06f057cd50abcb399dadc64d7a344e` |
| data/airport-guide/ar/HRG.json | без новых изменений | `48d9a0689f04f787be7a78e2b73783c833b4c22e3b9eefd3d26feaa1da244c16` |
| data/airport-guide/ar/SSH.json | lounges.text | `f4c7bada21e89d4aba3a051421d040c72ee30b98253829e75896998287c55861` |
| data/airport-guide/ar/IST.json | без новых изменений | `be90564998f6e174db80870cab5574a7666cd76ae1d2096e1b702dadb8b667e3` |
| data/airport-guide/hi/KZN.json | без новых изменений | `d9b983c874e5f4c7303756693ac07ba1f68aa699ee570801a15c47ed9132ba99` |
| data/airport-guide/hi/OVB.json | about, parking.text | `b3ab0f10af6e7624486ae9403c855cf6f4903ae5d9dfed73050d123d4ebabe85` |
| data/airport-guide/hi/AYT.json | без новых изменений | `496dd3778a50b9c1cbab6fa1172e431819751e613d77acd0aa1975f4f9840b12` |
| data/airport-guide/hi/HRG.json | без новых изменений | `c33099c0be51fa2fa4849da45875368c0080ee1d62435611cab5272470582ddd` |
| data/airport-guide/hi/SSH.json | lounges.text | `b881ab2078672f33233d7afe23ad315ffba36287963a1cd7cff45991a70c50f0` |
| data/airport-guide/hi/IST.json | без новых изменений | `ac4bea9da52a12fd471983c1eca0673391407ce08acd6355ba7aab55987460ff` |

## SHA256 текущих RU для исправлений

- `data/airport-guide/OVB.json`: `78af4bcfcc0f56a5990e92898d34df650ce0a23ef0b3a01cca8ec13a3e155946`
- `data/airport-guide/SSH.json`: `8d901bbbd549315cb3ab2504b0be2b769677f2c41c28e064526c145fb29766b0`
