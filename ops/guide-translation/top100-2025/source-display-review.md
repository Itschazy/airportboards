# Независимая проверка показа источников

26.10.2026. Проверены текущие изменения AirportGuide.tsx, AirportBottom.tsx, lib/airport-guide.ts, данные и сторож. Владелец явно отменил прежнее правило видимых подписей: возвращать «По данным …» и ссылки не требуется. Код и JSON проверяющий не менял; браузер/сеть не использовал.

## Результат

**Блокирующих замечаний нет. HTML и FAQ соответствуют принятому решению.**

- AirportGuide печатает дословно b.text внутри прежних нативных details. Под блоками больше нет ag-src, ссылок url/url2 и вывода source/source2. Вводная строка содержит только локализованную подпись даты и time с dateTime=checked.
- guideFaq возвращает ответ строго b.text. Скрытые домены, хвост даты и признаки official/third-party удалены из ответа. Девять тем вопросов сохранены.
- AirportBottom использует новую сигнатуру и labels только с checked; ответы справочной остаются в единой FAQPage.
- Источники, ссылки, basis, checked, вторые независимые источники остаются в JSON/типах. Загрузчик переводов сохраняет доказательные поля из RU. Guard по-прежнему проверяет их, независимость доменов third-party и свежесть.

## Независимое выполнение

В памяти процесса транспилированы текущие TS/TSX через установленный typescript.transpileModule. Реальные getAirportGuide, guideFaq и AirportGuide вызваны с React renderToStaticMarkup. Файлы сборки не создавались; API рейсов не вызывались.

Проверен весь текущий набор data/airport-guide: **100 кодов × 12 языков = 1200 вариантов, 5940 блоков**, включая 24 варианта third-party. Это именно текущие runtime data, а не утверждение, что каждый ещё не перенесённый draft уже опубликован или добавлен в data.

В каждом варианте проверены загрузка перевода, наличие полного текста каждого блока в SSR, точное равенство каждого FAQ-ответа видимому b.text, совпадение количества ответов и блоков, отсутствие ag-src и любых ссылок внутри справочной, сохранение даты в time.

**check-guide-fresh:** успешно, 100 аэропортов, все 11 переводов 100/100, 0 провалов. Первый запуск node не состоялся из-за отсутствия Node в PATH; повторный выполнен существующим /Users/whereiszhenya/.nvm/versions/node/v22.23.2/bin/node и прошёл. Не выдаётся за успех неисполненный первый запуск.

## Дизайн, JavaScript и SEO

Diff не меняет сетку, иконки, порядок блоков, summary, заголовки, подсказки или фактический текст. Убраны согласованные подписи/ссылки и вводный текст происхождения. Уменьшение высоты — ожидаемое следствие этого решения. app/globals.css в diff не изменён; оставшиеся правила ag-src неиспользуемы и не влияют на HTML.

Новые клиентские компоненты, эффекты, обработчики, зависимости или запросы не добавлены. Нативные details и полный SSR-текст сохранены. Canonical, hreflang, metadata страницы, маршруты и sitemap этим изменением не затронуты. В lib/airport-guide.ts относительно HEAD есть также ранее отдельно проверенная правка amenityFeature: sleep/kids не выводят неподтверждённые типы, Wi-Fi не объявляется автоматически бесплатным. Она согласована независимо от удаления подписей, см. metadata-amenities-review.md.

Полезные домены в самом b.text, например адрес покупки билета, не являются восстановленной строкой источника. Атрибуции других модулей, например Wikipedia/CC BY-SA, этим решением не удалены и не относятся к источникам справочной.

Это техническая проверка сохранности текста/разметки, без обещания будущих позиций, AdSense или индексирования. Полный Next build, интеграционный HTML маршрутов и мобильный визуальный контроль здесь не выполнялись: остаются у основного исполнителя.

## XIY и RUH

Прочитаны исправленные **переводные drafts** de/XIY и en/RUH и ранее сохранённые первичные источники. de/XIY ещё отсутствует в runtime data на момент дополнительной проверки; не объявляется выложенным.

- de/XIY: `eine Waschküche` соответствует Accor `laundry room`. Прежний Wäscheservice заменён; стирка сотрудниками, бесплатность или режим самообслуживания не обещаны.
- en/RUH: `laundry facilities` соответствует общему Marriott `On-Site Laundry`, не задаёт способ обслуживания. Бесплатность отдельно относится к парковке; minimum check-in age 18 и явное отсутствие airport shuttle сохранены. Риска новой формулировки не найдено.

У scripts/check-guide-fresh.mjs остался старый вводный комментарий о печати источника под блоком и дате в FAQ. Логика проверки от этого не меняется; это необязательное последующее уточнение документации, а не требование вернуть публичные ссылки или ослабить guard.

**Итог:** подписи справочной удалены по решению владельца, внутренняя доказательная база сохранена, FAQ точно совпадает с текстом читателя. Исправлений к исполняемой логике не требуется.

## Повтор после полной интеграции 172 аэропортов

26.10.2026. Старый результат для 100 runtime-кодов выше — исторический промежуточный замер. После интеграции 72 новых RU и 792 переводных JSON повторно исполнены реальные текущие TS/TSX через TypeScript → React SSR. Новый проход завершился с кодом 0: **172 кода × 12 языков = 2064 варианта, 8604 блока**, включая **24 варианта third-party**. Это локальные runtime data текущего рабочего дерева; публикация и полный Next build этим проходом не подтверждаются.

В каждом из 2064 вариантов заново проверены: загрузка справочной, полный видимый текст каждого блока в SSR; точное равенство `guideFaq(...)[index].a === b.text`; равенство количества FAQ и блоков; отсутствие `ag-src` и любых `<a>` в HTML справочной; наличие `<time dateTime="checked">`. Все проверки прошли. Фактические домены, если они являются частью `b.text`, сохранены как текст, а публичных подписей источника/ссылок не появилось. XIY теперь входит в общий интегрированный runtime-проход.

Отдельно заново проверены **60 вариантов amenityFeature**: пять аэропортов × 12 языков. Из sleep/kids не выводятся гостиница/капсулы или комната матери и ребёнка; Wi-Fi не получает автоматического признака бесплатности. Русские имена результата:

| Код | amenityFeature | Значимые ограничения |
|---|---|---|
| MSP | Wi-Fi | Тихие зоны отдыха не превращены в гостиницу. |
| SHA | Камера хранения | Детская площадка не превращена в комнату матери и ребёнка. |
| BLR | Парковка, Wi-Fi | Бесплатность не выведена автоматически. |
| MEL | Камера хранения, Wi-Fi | sleep/kids остаются полным видимым текстом и FAQ, без догадки о типе услуги. |
| SGN | Бизнес-зал, Wi-Fi | sleep остаётся полным видимым текстом и FAQ, без догадки о типе услуги. |

Полный guard для нового набора повторяет основной исполнитель: старый результат `100/100` не переносится на 172. Код проекта, JSON, сборочные файлы и браузер в этом независимом проходе не изменялись.

### Воспроизводимая команда

Node вызывается абсолютным путём, поскольку `node` отсутствовал в PATH исходной оболочки. Код транспилируется только в памяти процесса.

```sh
cd /Users/whereiszhenya/projects/runwayboard/.claude/worktrees/festive-khorana-78e8fa
/Users/whereiszhenya/.nvm/versions/node/v22.23.2/bin/node <<'JS'
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=process.cwd();
function compile(rel,alias){const file=path.join(root,rel),m=new Module(file,module);m.filename=file;m.paths=module.paths;const req=m.require.bind(m);m.require=id=>alias&&Object.hasOwn(alias,id)?alias[id]:req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);return m.exports;}
const lib=compile('lib/airport-guide.ts'),{AirportGuide}=compile('components/AirportGuide.tsx',{'@/lib/airport-guide':lib});
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'],codes=lib.guideIatas();let variants=0,blocks=0,thirdParty=0;
for(const iata of codes)for(const loc of locales){const g=lib.getAirportGuide(iata,loc);if(!g)throw Error('Missing guide '+iata+'/'+loc);const html=renderToStaticMarkup(React.createElement(AirportGuide,{guide:g,title:'GUIDE_TITLE',labels:{checked:'DATE_LABEL'},numLocale:loc}));if(/ag-src|<a\b/.test(html))throw Error('Source markup '+iata+'/'+loc);if(!html.includes('<time dateTime="'+g.checked+'">'))throw Error('Missing date '+iata+'/'+loc);const faq=lib.guideFaq(g,iata,(k,v)=>k+':'+v.a);if(faq.length!==g.blocks.length)throw Error('FAQ coverage '+iata+'/'+loc);g.blocks.forEach((b,index)=>{if(!html.includes(renderToStaticMarkup(React.createElement('p',null,b.text))))throw Error('Missing visible text '+iata+'/'+loc+'/'+b.id);if(faq[index].a!==b.text)throw Error('FAQ mismatch '+iata+'/'+loc+'/'+b.id);});variants++;blocks+=g.blocks.length;if(g.basis==='third-party')thirdParty++;}
const amenity=[];
for(const iata of ['MSP','SHA','BLR','MEL','SGN'])for(const loc of locales){const g=lib.getAirportGuide(iata,loc);if(!g)throw Error('Missing amenity guide '+iata+'/'+loc);const got=lib.guideAmenities(g).amenityFeature??[];if(got.some(x=>/Гостиница|капсул|матери|Бесплатн/.test(x.name)))throw Error('False claim '+iata+'/'+loc);const expected=g.blocks.filter(b=>['lounges','storage','parking','wifi'].includes(b.id)).length;if(got.length!==expected)throw Error('Amenity category mismatch '+iata+'/'+loc);if(loc==='ru')amenity.push({iata,features:got.map(x=>x.name),blocks:g.blocks.map(b=>b.id)});}
console.log(JSON.stringify({airportCodes:codes.length,locales:locales.length,variants,blocks,thirdPartyVariants:thirdParty,sourceLinksAbsent:true,datePresent:true,faqExactlyEqualsVisibleText:true,amenityVariantsChecked:60,amenity},null,2));
JS
```
