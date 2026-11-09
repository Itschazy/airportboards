# Финальная рецензия европейских локалей

09.11.2026; отдельный агент review_european. HEAD: 3fe9f0ea24a30dc2e20b4b4d5d28acbb24d20356.

## Результат

Фактический git diff относительно HEAD перечитан: 12 полей blocks.parking.text OVB и blocks.lounges.text SSH в en/de/fr/es/it/tr. Сопоставлены с новыми русскими OVB/SSH. Смысловых регрессий не обнаружено: EN площадь теперь явно перед терминалом аэропорта; все тарифы обозначены за 24 часа; пороги 3/6 таких периодов, ставки 700/500/300, 1500 после 6 часов, повторный въезд 1 час/15 минут/100 сохранены. SSH во всех шести языках ограничен пассажирами международных рейсов, вылетающих из T1; допуск не перепутан с прибытием, местом проживания или гражданством.

P3 FR about ещё открыт на момент снимка: `nommé en l’honneur de A. I. Pokryshkin` → `nommé en l’honneur d’A. I. Pokryshkin`. Файл data/airport-guide/fr/OVB.json, поле about. Это небольшая грамматическая правка, не ошибка пассажирского условия. Родителю указано точное место.

Независимо открыл [DragonPass](https://en.dragonpass.com.cn/lounge/303489): указаны круглосуточная работа, Terminal 1 International Departure, зона после паспортного контроля и досмотра. Это подтверждает международную зону вылета и расположение, согласуется с буквальным ограничением International flights from T1 only в Priority Pass. Сам DragonPass не употребляет отдельное слово only; различие явно сохраняется в выводе. SleepingInAirports остаётся третьим подтверждением способов входа; международное ограничение от него не заявляю.

## Проверки кода

- Прочитан полный diff scripts/check-guide-fresh.mjs и весь новый scripts/check-guide-fresh-regressions.mjs.
- Node22: все 8 изолированных сценариев PASS. Положительная фикстура, отсутствие локали, отсутствие about, подмена значения about, итальянская запись года рядом с числом, японское составное число/подмена, orphan translation.
- Полный check-guide-fresh: PASS,188 аэропортов и11×188 переводов (12 языков вместе с RU).
- Первоначальный запуск обычным node не состоялся из-за PATH; повторён абсолютным Node22 и успешен. Это не ошибка приложения.
- В изменённом коде не обнаружено блокирующих регрессий на актуальном наборе данных.

Ограничения сторожа сохраняются: номера по-прежнему множества, без привязки к валюте/единице/объекту; about не проверяется на русский текст или строковый тип; source3/url3 вообще не валидируются; языковое качество эта проверка не доказывает. Исправление year+count нацелено на20xx перед группированным числом, а не универсальный парсер чисел. Новые regression tests честно покрывают названные случаи, не все эти ограничения. Нужен отдельный проверенный manifest/ручная рецензия, как отмечено в первой рецензии.

## Хеши фактически просмотренного состояния

SHA256 полного файла; остальные24 файла пилота в шести локалях не изменились относительно предыдущей рецензии и включены для фиксации её области. Любая последующая правка меняет соответствующий hash и требует перепроверки. Данные не редактировал.

- `data/airport-guide/en/KZN.json`: `0da05357c26a0c5be13c25872305b9ce85aa6fec4e49686a3cddb389ef1a453d`
- `data/airport-guide/en/OVB.json`: `f5cd3bd5732615439fa3864294c362f8b7d0d466c46ae85bc960a44b11a26b8c`
- `data/airport-guide/en/AYT.json`: `bf70ed3be5d3108f545db0a48038032ee448200fc7bf1cc439171cea5d3a0f25`
- `data/airport-guide/en/HRG.json`: `512188c16ac4a2d8e80d4b76e8d5701d514d4d9e7963739dae380676a3adeb3e`
- `data/airport-guide/en/SSH.json`: `c60a6785b8fac9204d204d545a51cff43ed1ca6838e198d63533d69710e41cef`
- `data/airport-guide/en/IST.json`: `f33095601cbb978ce5795b93de586762230ee1accb3f354122babac3a8588255`
- `data/airport-guide/de/KZN.json`: `0b2c7e298c85a46aedea25a005e455aa0bad757388e600158f6c6e36a8586bf2`
- `data/airport-guide/de/OVB.json`: `98f2fa3b581f0dd990363d2cba3dbd378f62f815f4214a31f9a7139d8a699981`
- `data/airport-guide/de/AYT.json`: `bf590adfbb6913c554656cbda9bc4ae9545cf03a81d8b27c2fc1898f83e7a252`
- `data/airport-guide/de/HRG.json`: `5fee90bf19d6cfa01c672550047565c998f913af311e5f52b766ba00acfccbd9`
- `data/airport-guide/de/SSH.json`: `71e420e4e2fa99b6ffe0204ff95c5161989d86de73dea6d30e2f9ad69ffcf25a`
- `data/airport-guide/de/IST.json`: `29acfa8611cfceef205cb68786ec73cdd762912dae0835b2dbdfb871b071f198`
- `data/airport-guide/fr/KZN.json`: `7cc2083e675e6a3b80183eaf2b3aed5f9c15ffade6d05332dfe2a93c6e464bfc`
- `data/airport-guide/fr/OVB.json`: `4f6e711bb9ea50d3bbf70ba82c34a97a00222163c5d3799f3c482604e8456bbc`
- `data/airport-guide/fr/AYT.json`: `2c435cf0d3e1cfb9b2f6663030b6ca48333a3cccf0a1c2702f78744b350e18ac`
- `data/airport-guide/fr/HRG.json`: `bf1e4dea668e2d5b7a7fa0b45f8c8a84056b1ce233ceab009a3afc52fdae4732`
- `data/airport-guide/fr/SSH.json`: `55a7f36c0df0b5ad474673de14923cc3d9fff5c570836bde65ebd57793d844f2`
- `data/airport-guide/fr/IST.json`: `1895451bf9ebe3eb67f629a82b9dcf6c4c65dcf51445e8658029ba4848fd8ff2`
- `data/airport-guide/es/KZN.json`: `b636f3279f1d9bd4f5d2b6e6cf483cf4a4ddeea0083fcea9762a22d5969f5cba`
- `data/airport-guide/es/OVB.json`: `af56e8946494ee4d7df9c784984dd72f8da081416e9a79b9a00b33e42e898123`
- `data/airport-guide/es/AYT.json`: `689f2d9ccdeb50d114a2d56e20bc2c55fd9485aa651929b348439b762c74f09b`
- `data/airport-guide/es/HRG.json`: `17f63f30788239264950af6d58279320b796e241f704ed5c0828f452f3d06bfe`
- `data/airport-guide/es/SSH.json`: `eb9640840f446ae83c1c8c4ef7a211f38e14e955810177af13668aa5770db4c0`
- `data/airport-guide/es/IST.json`: `0018dd4cd82d33baf8a8774e30f18f8a6fbc9809708d9501c8263f214d524268`
- `data/airport-guide/it/KZN.json`: `f2b7424088f3225c5e54c334eadfac0f30909b374ae46f2e7cec2efaaffc7d3d`
- `data/airport-guide/it/OVB.json`: `053ccfcd2750a29a7f495106df4c4289cb33bb82e80c399c2f89d6192e2f0807`
- `data/airport-guide/it/AYT.json`: `f97059fb57c43f423083145f0f3e2397e1acc44991212bbc6b16770d68767e22`
- `data/airport-guide/it/HRG.json`: `6e331527e9f7fc3f18aa791595e470c8dbb3b302a877d4f725ab20e458e44eb7`
- `data/airport-guide/it/SSH.json`: `5c89dfb7f968bc85e907bebd985f4a161147685c32b4d3b15804de3a9d863f6d`
- `data/airport-guide/it/IST.json`: `02bda0ef89c60397269a4d5ae462fbb192bd3267c0705523c2bc249cc9b646ce`
- `data/airport-guide/tr/KZN.json`: `137006e5b26e3e85d31317c4b6bc9db17ddc0e01cd8dfb8f40420265f9c5fefb`
- `data/airport-guide/tr/OVB.json`: `8faff7c9c525a8e79149e04c683e62c5c1de8bfa8a3ab896ae8922fbc438759a`
- `data/airport-guide/tr/AYT.json`: `dc4b8f52520c2383eb2af56a46ddfd904f70ad343e0b806d27062acb667be44a`
- `data/airport-guide/tr/HRG.json`: `6228ff2ace605dfbfd8706f13017ddab27ff784a1a96dfea47db9fe8cb796154`
- `data/airport-guide/tr/SSH.json`: `946ec8a49e36a0b3f91de378eeb9654c14fd592128fecf5db219b10460e8c957`
- `data/airport-guide/tr/IST.json`: `b991f2312e98707ca257c18092cf8c5bdb5030bdf073562150a6008587a1ba70`
- `data/airport-guide/OVB.json`: `78af4bcfcc0f56a5990e92898d34df650ce0a23ef0b3a01cca8ec13a3e155946`
- `data/airport-guide/SSH.json`: `8d901bbbd549315cb3ab2504b0be2b769677f2c41c28e064526c145fb29766b0`
- `scripts/check-guide-fresh.mjs`: `14d7cc301d79b50d6b8b2d0ab5dd99d8f7325d2a6708f73ab4c6cde63bc6dd7b`
- `scripts/check-guide-fresh-regressions.mjs`: `be7d1219c90b704da3590cf36c8f45fd279b51a37bdec00860cae47b68014cc0`

Рецензия агентская, без носителей языков. Не заменяет локальную сборку, DOM/FAQ и UI-проверки, деплой или проверку production.
