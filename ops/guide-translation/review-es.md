# Revisión de la traducción al español (es) — justificación de cada cambio

Revisor: editor independiente, nativo. Fecha: 2026-10-25.
Comparados los 76 archivos `data/airport-guide/es/*.json` con los originales rusos, bloque por bloque, incluido `about`:
sentido, números y unidades, nombres, naturalidad, nada añadido. Estructura (iata, juego de bloques, presencia de `about`)
coincide en los 76; JSON válido; ningún `hint` supera 35 caracteres; sin texto en otra lengua (el único resto de
cirílico son los códigos de ruta/zona/dirección que el original lleva en cirílico: 105с, 8А, Т1/Т2, 111Э, 244-Э, Р1, С2, 3Б…).
Exónimos verificados en todos los archivos: Arcángel, Púlkovo, Kazán, Tiflis, Oremburgo, Majachkalá, Jabárovsk
(los nombres de empresas, redes Wi‑Fi y marcas, p. ej. «Khabarovskie Avialinii», «New Pulkovo Lounge», «Tbilisi Loves You», no se tocan).
`node scripts/check-guide-fresh.mjs`: sin fallos para es.

Total: 39 cambios — sentido 11, nombres 10, estilo 13, números 5.

| Archivo | Bloque | Tipo | Antes → después | Por qué |
|---|---|---|---|---|
| REN | transport | nombres | n.º 101 (к) → n.º 101 (k) | letra entre paréntesis en latín, como en las demás lenguas |
| BTK | lounges | nombres | «Business Standard», «Business Plus» y «Economy Plus» → «Biznes Standart», «Biznes Plyus» y «Ekonom Plyus» | nombres de tarifa inventados en inglés; sin forma latina oficial segura se translitera |
| NBC | lounges | nombres | «Severny Veter» → «Nordwind» | Северный ветер = aerolínea Nordwind, nombre latino oficial |
| LED | about | nombres | «Pulkovo-1» → «Púlkovo-1» | exónimo Púlkovo coherente con el resto del archivo |
| SVX | transport | nombres | Yekaterinburg-Pass. → Ekaterimburgo-Pass. | exónimo español Ekaterimburgo (como Volgogrado-1 en VOG) |
| HMA | about | nombres | Janti-Mansiisk → Jánti-Mansiisk | forma de data/city-names.json |
| NJC | about | nombres | segundo aeropuerto de Janti-Mansi-Yugra → segundo aeropuerto del Distrito Autónomo de Janti-Mansi-Yugra | ХМАО = distrito autónomo, como «Distrito Autónomo de Nenets» en NNM |
| REN | about | nombres | de la provincia de Oremburgo → del óblast de Oremburgo | область = óblast, coherente con «krai» en los demás archivos |
| SVO | about | nombres | provincia de Moscú → óblast de Moscú | область = óblast, coherente con «krai» |
| ZIA | kids | nombres | países de la UEEA → países de la UEE | sigla española de la Unión Económica Euroasiática es UEE |
| IST | sleep | sentido | estas últimas, solo para pasajeros de vuelos internacionales → estas últimas, solo para pasajeros que salen en vuelos internacionales | «только для улетающих международными рейсами»: solo salidas |
| NER | terminals | sentido | La taquilla abre 2 horas antes del vuelo según el horario → La taquilla abre 2 horas antes de la hora programada del vuelo | «за 2 часа до рейса по расписанию» = antes de la hora programada |
| IAR | parking | sentido | La hora de recogida del coche se acuerda por teléfono en el 43-18-00. → La hora de recogida del coche se consulta por teléfono en el 43-18-00. | «уточняют» = consultar, no acordar |
| CEK | parking | sentido | a partir del primer día 700 ₽ por día → más de un día, 700 ₽ por día | «свыше суток» = más de un día |
| HMA | lounges | sentido | Sala para personalidades a la salida: 10 000 ₽ → Sala para personas muy importantes (VIP), a la salida: 10 000 ₽ | «зал для особо важных персон» = sala VIP |
| IKT | kids | sentido | Con el niño, un adulto. → Con el niño, solo un adulto. | «один взрослый» = un solo adulto |
| UKX | kids | sentido | Con el niño puede estar un adulto. → Con el niño puede quedarse un solo adulto. | «может находиться один взрослый» = un solo adulto |
| VKO | lounges | sentido | para salidas internacionales hay que salir 1 hora antes → para salidas internacionales hay que dejar la sala 1 hora antes | aclarar que se sale de la sala, no de viaje |
| EVN | parking | sentido | antes de volver al coche → antes de subir al coche | «до того, как сесть в машину» |
| NYM | kids | sentido | para cambiar pañales y amamantar → para cambiar pañales y dar de comer | «кормления» = alimentar, no solo amamantar |
| IJK | storage.hint | sentido | Planta 1, tras información → Planta 1, detrás de información | «за справкой» = detrás del mostrador de información; «tras» era ambiguo |
| CEK | lounges | estilo | no antes de 3 horas antes de la salida → como máximo 3 horas antes de la salida | doble «antes» |
| CSY | lounges | estilo | Entrada en la sala no antes de 2 horas antes de la salida. → Se entra en la sala como máximo 2 horas antes de la salida. | doble «antes» |
| OSW | lounges | estilo | Se entra no antes de 2 horas antes de la salida. → Se entra como máximo 2 horas antes de la salida. | doble «antes» |
| VKO | kids | estilo | no antes de 6 horas antes de la salida → como máximo 6 horas antes de la salida | doble «antes» |
| CSY | lounges | estilo | con solicitud 24 horas antes → previa solicitud con 24 horas de antelación | giro natural |
| IGT | lounges.hint | estilo | Sala VIP, con solicitud → Sala VIP, previa solicitud | giro natural |
| IGT | lounges | estilo | Servicio con solicitud previa → Servicio previa solicitud | giro natural |
| NOZ | lounges | estilo | Sala VIP en las plantas 1–2, con solicitud; → Sala VIP en las plantas 1–2, previa solicitud; | giro natural |
| NAL | transport | estilo | unos 1 hora 20 minutos → aproximadamente 1 hora y 20 minutos | concordancia («unos 1 hora») |
| BQS | kids | estilo | Admite niños menores de 7 años, con discapacidad hasta 14 años, → Admite a niños menores de 7 años y a niños con discapacidad menores de 14 años, | fórmula uniforme con los demás archivos |
| IAR | kids | estilo | En la sala de llegadas no hay sala. → En la sala de llegadas no la hay. | repetición «sala… sala» |
| ZIA | parking | estilo | Una nueva entrada gratuita, no antes de 45 min. → Una nueva entrada gratuita solo es posible pasados 45 min. | frase sin verbo, ambigua |
| VKO | sleep | estilo | Dirección: 2-ya Reisovaya ul., 2; → Dirección: calle 2-ya Reisovaya, 2; | «ul.» ruso; formato de dirección como en los demás archivos |
| REN | about | números | de más de 24.000 m² → de más de 24 000 m² | separador de miles uniforme (espacio, como 72 972 m²) |
| REN | about | números | más de 950.000 pasajeros → más de 950 mil pasajeros | «950 тысяч»: forma «mil» uniforme con el resto |
| PEE | about | números | de 31.000 m² → de 31 mil m² | «31 тыс.»: forma «mil» uniforme |
| PKC | about | números | 931.000 pasajeros → 931 mil pasajeros | «931 тыс.»: forma «mil» uniforme |
| UUS | about | números | supera los 47.000 m² → supera los 47 mil m² | «47 тыс.»: forma «mil» uniforme |

## Этажи как на указателях

Русское «1 этаж» — это уровень земли и цифра «1» на табличках аэропорта. В Испании «planta 1» —
этаж над «planta baja», поэтому «planta N» и порядковые формы заменены подписью с таблички
**«nivel N»** (с заглавной в начале подсказки: «Nivel 2, 24/7»); номера не перенумерованы.
Род артикля исправлен вместе с существительным: «en la planta 2» → «en el nivel 2», «de la
planta» → «del nivel», «a la planta» → «al nivel», «en las plantas 3 y 4» → «en los niveles 3 y 4».

- Затронуто 57 файлов из 76, 215 полей (title/hint/text/about), 260 упоминаний уровня, из них
  19 порядковых («la primera/segunda/tercera planta» → «el nivel 1/2/3»). «Planta baja» в
  переводе не встречалась.
- Минусовые уровни сохранены: «planta −1» → «nivel −1» (SVO, SVX, VKO); «la planta de
  transporte −2» → «el nivel de transporte −2» (IST).
- Каждое изменённое поле сверено с русским оригиналом по множеству номеров этажей; расхождения
  разобраны вручную. Одно эллиптическое место поправлено руками: DME «el control de pasaportes
  en la 2» → «en el 2» (оригинал «паспортный контроль на 2-м»).
- Не тронуто: количества («7 plantas», «2 plantas», «cada una con 3 plantas», «cuatro
  plantas», «de varias plantas»), «los planos de las plantas», относительное «una planta más
  arriba» (IST), ненумерованный «semisótano» (ASF, DME, KZN, MMK, MRV), «niveles Gold/Platinum»
  программ лояльности.

| IATA | поле | было | стало |
|---|---|---|---|
| ASF | lounges.hint | Planta 2, día y noche | Nivel 2, día y noche |
| ASF | lounges.text | en la segunda planta | en el nivel 2 |
| CEK | kids.text | de la primera planta | del nivel 1 |
| NJC | storage.text | n.º 1, primera planta | n.º 1, nivel 1 |
| GYD | kids.text | en las plantas 3 y 4 | en los niveles 3 y 4 |
| NOJ | lounges.hint | Plantas 1 y 2, a diario | Niveles 1 y 2, a diario |
| LED | transport.text | llegan a la planta 3 y salen de la planta 1 | llegan al nivel 3 y salen del nivel 1 |
| SVX | storage.hint | Terminal A, planta −1 | Terminal A, nivel −1 |
| KHV | lounges.hint | Planta 3 nacional, 4000 ₽ | Nacional, nivel 3, 4000 ₽ |


## Возраст «до N лет» = младше N (25.10, сверка между языками)

Оригинал «до 7 лет» во всех правилах аэропортов значит «не достигшим 7 лет»; ko, fr, de, en, zh, ja уже передают это как «младше N». Здесь «fino a / तक / حتى / hasta» заменены на «sotto i / से कम / دون / menores de» (it/hi/ar — по 80 полей, es — 2). Исключение — LED, где в оригинале «до 7 лет включительно»: там оставлена включающая форма.

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
| AER | storage.text | El primer día cuesta desde 600 ₽ por bulto, cada día siguiente desde 300 ₽. | Las primeras 24 horas cuestan desde 600 ₽ por bulto; cada 24 horas siguientes, desde 300 ₽. |
| ASF | parking.text | más de 4 horas — 900 ₽ por día. | más de 4 horas — 900 ₽ por cada 24 horas. |
| ASF | parking.text | el primer día 600 ₽, dos días 1100 ₽, tres días 1500 ₽, después 300 ₽ por día. | las primeras 24 horas 600 ₽, dos periodos de 24 horas 1100 ₽, tres 1500 ₽, después 300 ₽ por cada 24 horas. |
| CEK | parking.text | el primer día en total 1300 ₽, más de un día, 700 ₽ por día. | las primeras 24 horas en total 1300 ₽, más de 24 horas, 700 ₽ por cada 24 horas. |
| DME | storage.text | 1300 ₽ el primer día si | 1300 ₽ las primeras 24 horas si |
| KRR | storage.text | 400 ₽ por bulto el primer día, 200 ₽ cada día siguiente. | 400 ₽ por bulto las primeras 24 horas, 200 ₽ por cada 24 horas siguientes. |
| LED | parking.text | 1100 ₽ el primer día, a partir de 14 días 700 ₽ por día. | 1100 ₽ las primeras 24 horas, a partir de 14 días 700 ₽ por cada 24 horas. |
| NJC | parking.text | El primer día 1000 ₽, cada día siguiente 800 ₽. | Las primeras 24 horas 1000 ₽, cada 24 horas siguientes 800 ₽. |
| NOZ | storage.text | 400 ₽ el primer día | 400 ₽ las primeras 24 horas |
| NOZ | storage.text | 750 ₽ el primer día | 750 ₽ las primeras 24 horas |
| SVO | storage.text | El primer día cuesta 700 ₽ por bulto; después, 300 ₽ por día. | Las primeras 24 horas cuestan 700 ₽ por bulto; después, 300 ₽ por cada 24 horas. |
| SVX | storage.text | 500 ₽ el primer día, 300 ₽ cada día siguiente. | 500 ₽ las primeras 24 horas, 300 ₽ por cada 24 horas siguientes. |
| SVX | storage.text | 800 ₽ el primer día, 500 ₽ los siguientes. | 800 ₽ las primeras 24 horas, 500 ₽ por cada 24 horas siguientes. |
| UUS | parking.text | 1200 ₽ el primer día y 600 ₽ los siguientes. | 1200 ₽ las primeras 24 horas y 600 ₽ por cada 24 horas siguientes. |
| UUS | parking.text | 500 ₽/día del 1.º al 5.º día, después 400 ₽. | 500 ₽ por cada 24 horas durante los 5 primeros periodos de 24 horas, después 400 ₽. |
| UUS | storage.text | 500 ₽ el primer día, 200 ₽ los siguientes. | 500 ₽ las primeras 24 horas, 200 ₽ por cada 24 horas siguientes. |
| VVO | storage.text | 500 ₽ el primer día, 200 ₽ cada día siguiente, | 500 ₽ las primeras 24 horas, 200 ₽ por cada 24 horas siguientes, |
| VVO | storage.text | El día incompleto se cuenta como completo. | Un periodo de 24 horas incompleto se cuenta como completo. |
| ZIA | storage.text | 700 ₽ el primer día, 300 ₽ cada día siguiente. | 700 ₽ las primeras 24 horas, 300 ₽ por cada 24 horas siguientes. |
| KVX | kids.text | no más de un día. | no más de 24 horas. |
| VOG | kids.text | hasta un día. | hasta 24 horas. |
| UUD | parking.text | no más de un día. | no más de 24 horas. |
| NJC | kids.text | con salida en un plazo máximo de un día. | con salida en las próximas 24 horas. |
| BQS | parking.text | hasta un día 400 ₽, cada día siguiente 400 ₽. | hasta 24 horas 400 ₽, cada 24 horas siguientes 400 ₽. |
| GYD | parking.text | hasta un día 15 AZN | hasta 24 horas 15 AZN |
| NNM | parking.text | Más de una hora y hasta un día: | Más de una hora y hasta 24 horas: |
| NNM | parking.text | Más de un día, hasta 30 días: 600 ₽ por día. | Más de 24 horas, hasta 30 días: 600 ₽ por cada 24 horas. |
| OSW | parking.text | hasta un día 500 ₽, a partir de un día 500 ₽. | hasta 24 horas 500 ₽, a partir de 24 horas 500 ₽. |
| PEE | parking.text | hasta un día 500 ₽, después 500 ₽ por día. | hasta 24 horas 500 ₽, después 500 ₽ por cada 24 horas. |
| PEE | parking.text | hasta un día 400 ₽, después 400 ₽ por día. | hasta 24 horas 400 ₽, después 400 ₽ por cada 24 horas. |
| PEE | parking.text | La hora incompleta y el día incompleto se pagan como completos. | La hora incompleta y el periodo de 24 horas incompleto se pagan como completos. |


## Перекрёстная проверка ChatGPT (выборка 5 пар, 25.10)

Принято: VKO «(con discapacidad, hasta 12)» → «menores de 12» (и ASF «hasta 8» → «menores de 8»), «día y noche y gratis» → «abierta las 24 horas y gratuita», EVN прокат авто, VKO «un solo adulto». Отклонено: «nivel N» → «planta N» (в Испании «planta 1» — этаж над землёй, а российская «1» — первый от земли; оставлен знак-уровень), «ОВЗ» как «necesidades especiales» (принятый во всех языках перевод — инвалидность).
