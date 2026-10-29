// Содержательные изменения остальных семейств, 30.10.2026.
// Раньше URL из sitemap получал постоянный hash(path+'discovered'): после
// a9a002b8 правки route/country/city/widgets/legal не замечались вовсе.
// Здесь только версии исходников/редакционных данных. Живой store, времена
// рейсов/сборки, аналитика и личная история пользователя НЕ читаются.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const LANG='(?:ru|en|de|fr|es|it|tr|zh|ja|ko|ar|hi)';
export function pageFamily(p) {
  if(typeof p!=='string'||!new RegExp(`^/${LANG}(?:/[a-zA-Z0-9-]+)*$`).test(p)) return null;
  const [,locale,...parts]=p.split('/');
  const rest=parts.join('/');
  if(!rest)return 'home';
  if(/^(about|privacy|terms|contact)$/.test(rest))return ['en','ru'].includes(locale)?'legal':null;
  if(rest==='airports')return 'airports';
  if(/^airports\/[a-z0-9-]+$/.test(rest))return 'country';
  if(/^city\/[a-z0-9-]+$/.test(rest))return 'city';
  if(/^route\/[A-Z]{3}-[A-Z]{3}$/.test(rest)&&rest.slice(6,9)!==rest.slice(10,13))return 'route';
  if(/^az\/[a-zA-Z]$/.test(rest))return 'az';
  if(rest==='widgets')return 'widgets';
  if(/^airport\/[A-Z0-9]{3}(?:\/arrivals)?$/.test(rest))return 'airport';
  if(/^event\/[a-z0-9-]+$/.test(rest))return 'event';
  if(rest==='events')return 'events';
  if(rest==='flight-map')return 'flight-map';
  // Ни alias /departures, ни личные экраны, ни старые thin flight/airline.
  // Это статический допуск семейства, НЕ обещание runtime index для всякого URL:
  // конкретные адреса остальных семейств приходят только из canonical sitemap.
  return null;
}
export const pageSources={
  route:['app/[locale]/route/[pair]/page.tsx','lib/route-facts.ts','lib/flights.ts','lib/airline-ru.ts','lib/airports.ts','lib/airport-names.ts','lib/places.ts','lib/i18n.ts','lib/list-separator.ts','lib/title.ts'],
  country:['app/[locale]/airports/[country]/page.tsx','lib/airports.ts','lib/airport-names.ts','lib/places.ts','lib/warm.ts','lib/i18n.ts','lib/measured-date.ts','lib/es-article.ts','lib/country-slug-aliases.ts','components/Breadcrumb.tsx'],
  city:['app/[locale]/city/[slug]/page.tsx','lib/airports.ts','lib/airport-names.ts','lib/places.ts','lib/warm.ts','lib/i18n.ts','lib/fr-elision.ts','components/Breadcrumb.tsx'],
  widgets:['app/[locale]/widgets/page.tsx','components/WidgetBuilder.tsx','app/embed/[iata]/route.ts','lib/i18n.ts'],
  home:['app/[locale]/page.tsx','lib/airports.ts','lib/places.ts','lib/airport-names.ts','lib/warm.ts','lib/country-demand.ts','lib/i18n.ts','components/PopularList.tsx'],
  airports:['app/[locale]/airports/page.tsx','lib/airports.ts','lib/places.ts','lib/warm.ts','lib/measured-date.ts','lib/i18n.ts'],
  az:['app/[locale]/az/[letter]/page.tsx','lib/airports.ts','lib/airport-names.ts','lib/places.ts','lib/i18n.ts'],
  legal:['components/legal-page.tsx','components/LegalArticle.tsx','lib/legal-content.ts','lib/warm.ts','lib/i18n.ts',...['about','contact','privacy','terms'].map(kind=>`app/[locale]/${kind}/page.tsx`)],
};
// Эти общие правила меняют видимые имена/бренд и hreflang. Их правки тоже
// содержательные; CSS и интерактивные обработчики сюда не включаем.
for(const [family,files] of Object.entries(pageSources)) {
  if(files.includes('lib/airport-names.ts'))files.push('lib/generic-word.ts');
  if(['country','city','airports','az'].includes(family))files.push('lib/title.ts');
  files.push('components/LocaleLinks.tsx');
}
const choose=(object,predicate)=>Object.fromEntries(Object.entries(object||{}).filter(([key])=>predicate(key)));
// Не переносим в hashes всех страниц перевод route_desc или конкретного legal.
// Свои namespace/prefix и локаль; nav общий, как и видимая навигация.
function labels(family,m) {
  const prefixes={route:['route_'],country:['country_','grid_','airports_count'],city:['city_'],widgets:['widgets_'],az:['az_','airports_count'],airports:['world_','country_','grid_','sec_countries','airports_count']};
  const home=prefixes[family]?choose(m.home,k=>prefixes[family].some(p=>k.startsWith(p))):m.home;
  if(family==='legal')return [m.legal,m.nav];
  if(family==='widgets')return [home,m.ui,m.nav];
  return [home,m.nav,m.ui];
}
// Только УЖЕ обнаруженные canonical URL. Не строим Cartesian product городов,
// маршрутов или языков legal и не расширяем sitemap. Чтение ленивое: старый
// manifest аэропортов/событий не требует файлов неиспользуемых семейств.
export function pageContentManifest(root,catalogue) {
  const cache=new Map();
  const read=file=>{if(!cache.has(file))cache.set(file,fs.readFileSync(path.join(root,file),'utf8'));return cache.get(file);};
  const parsed=new Map();
  const json=file=>{if(!parsed.has(file))parsed.set(file,JSON.parse(read(file)));return parsed.get(file);};
  const code=new Map();
  const source=family=>{if(!code.has(family))code.set(family,hash(pageSources[family].map(read).join('\n')));return code.get(family);};
  const names=(file,locale)=>Object.fromEntries(Object.entries(json(file)).map(([key,value])=>[key,value?.[locale]??null]));
  const result={};
  // Тысячи маршрутов одной локали делят источники и справочники. JSON и их
  // digest считаем один раз на family/locale, а не сериализуем весь мир для
  // каждого URL: worker не должен отбирать CPU у живого табло.
  const inputs=new Map();
  for(const p of new Set(catalogue)) {
    const family=pageFamily(p);if(!pageSources[family])continue; // specialized manifest обрабатывает airport/event/map
    const locale=p.split('/')[1];const m=json(`messages/${locale}.json`);
    const inputKey=family+':'+locale+(family==='legal'?':'+p.split('/')[2]:'');
    if(!inputs.has(inputKey)) {
      let data;
      if(family==='legal') {
        const kind=p.split('/')[2];const doc=json(`data/legal/${kind}.json`);
        if(!doc[locale])continue; // в точности настоящее RU/EN, не английский fallback
        data=[doc[locale],kind==='about'?[json('data/airport-service.json'),json('data/airport-service-unverified.json')]:null];
      } else if(family==='widgets')data=[];
      else {
        data=[json('data/airports.json'),names('data/airport-names.json',locale),names('data/city-names.json',locale),names('data/country-names.json',locale)];
        if(['home','airports','country','city'].includes(family))data.push(json('data/airport-service.json'),json('data/airport-service-unverified.json'));
        if(family==='route')data.push(json('data/airlines.json'));
      }
      inputs.set(inputKey,hash(JSON.stringify([source(family),labels(family,m),data])));
    }
    result[p]=hash(p+inputs.get(inputKey));
  }
  return result;
}
