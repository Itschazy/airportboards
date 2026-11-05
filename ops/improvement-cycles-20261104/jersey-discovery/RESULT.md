# Джерси в sitemap — запуск 16/20, 05.11.2026

Worktree: /Users/whereiszhenya/projects/runwayboard-flight-map-prototype-20261028.
Ветка codex/flight-map-prototype-20261028, база3f096b40,
свежий origin/main487d134a2cca2c9aa70812f6c4cb7cee1b2f999b.

## Подтверждение и решение

Production sitemap-7 до изменения:0основных страниц JER. Фактическая справочная
существует с30.10:4раздела иabout на12языках. Спрос: примерно1300цитирований
Bing по jersey airport arrivals, сохранённый отчёт search-growth/REPORT.md
(кабинет прочитан04.11, строки заканчиваются01.11). Это не1300посетителей.
Факты/переводы сверены с журналами GUIDE-FACT-REVIEW.md и
GUIDE-TRANSLATION-REVIEW.md в ops/bing-followup-20261030; описанные замечания
первого раунда закрыты. Нового фактчека официальных сайтов05.11не заявляем:
исходные тексты и checked30.10 не менялись.

В data/search-demand-guides.json добавлен толькоJER с источником решения.
Получается +12основных канонических URL; ORK остаётся. Допуск arrivals,
прогрев,robots,страницы городов/стран,расходAirlabs,дизайн/JS/DNS не меняются.
Запрос прилётов подтверждает интерес к аэропорту, но не отменяет отдельную
проверку устойчивости arrivals; в sitemap такие подстраницы не добавлены.

Регрессия исполняет фактический цикл app/sitemap.ts на одинаковых входах:
до36после48URL, ровно12JER; старыеURL сохранены. Для обоих ORK/JER проверены
закрыто/нет обслуживания, переход в обычный ярус, отсутствие дубликатов,
невыбранный хвост иaliases. Дополнительно проверяется переводabout при наличии.
HTTPпроверки обобщены параметромIATA: весьязыковойкластер в устойчивомshard,
about+все блоки вHTMLбезscript/style, каждыйответFAQодинраз,metadataпоrobots.

## Локальные проверки

- fixture build безключа:2473/2473.
- TypeScript до/после сборки и после очистки PASS.
- Guidefresh188×12, scripts232148строк/8351файл PASS.
- Все вложенные ключи12×395 совпадают.
- Sitemap-shards, demand-route regression PASS.
- Scope15500URL,513основных аэропортов,500arrivals; безрасширенияприлётов.
- Hreflang,index20/20,AdSense PASS.
- Sitemap JER12/12(shard7),ORK12/12(shard12),13взаимныхальтернатив каждый.
-24HTMLJER×12:about,4блока и4FAQответа каждый,canonical/robots/hreflang PASS.
-UIнеизменён; свежую проверку физических Safari/Android иAndroidLCP не заявляем.
-Свой3168остановлен,.next-cycle16удалён,сгенерированныеTSвосстановлены.
-Старый untracked outputs/ и чужиерабочиекопии сохранены.

## RUM — два разных среза, не эксперимент до/после

Текущийruntime487d134a2cca:53mobileNavigate табло, LCPp75=1812мс,2slow>4с.
ОдинChromeсдоминированиемrender,одинЯндекссrequestвнеинтервалаnginx.
53serverTimingпары;edgep7587мс,TLS33known/20unknown,p75известных311мс.
НиTLS,нифазадоTLSнепреобладаетвдвухslow. НельзяобвинитьTLSилиReactвовсехслучаях.

Срез05.11UTCнавремяопроса,всерелизы:493mobileNavigate,LCPp75=1775мс,
18slow(3,65%). ServerTimingклассификация:5DNS/connect,5other-before-byte,
3request-outside-nginx,2render,3unknown. TLS143known/350unknown,p75known242мс;
15slowTLSunknown,2neither-dominates,1before-TLS. Старые релизы не имели новых
полей, поэтому unknown350 не означает350испорченныхсоединений.
Chrome94/p75=2056/slow7;Safari142/1531/4;Яндекс140/1556/4;ЯндексСтарт87/1760/3.
УChrome2render,2DNS/connect,1requestoutside,2unknown. Разные сети/страницы/часы
и версии, источникивсе, непоисковыйсегментМетрики. Ниускорение,нирегрессия
междупакетамиэтимне доказаны. Сырыеданныеосталисьнасервере,копированыагрегаты.

## Следом

Выкат проверенного пакета вне окна прогрева; CI,serverHEAD/health,обязательные
postchecks,JER12/12иORK12/12,24HTMLJER. После — подготовить воспроизводимый
профиль задержкиотрисовкиChrome;не переписыватьReactпомалымполевымподгруппам.
Сериюиз20непродлевать. Покупок/рассылок/настроекаккаунтов/рекламынет;
заявкуAdSense03.11неповторяли. Документацию отдельнонепушить радиrestart.
