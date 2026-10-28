// Prepared for a future Next server page. Default output is deliberately noindex:
// translated descriptions alone do not make the interactive product publishable.
// Only the caller's actually released locales belong in canonical/hreflang/sitemap.
export const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
export const names={ru:'Русский',en:'English',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',tr:'Türkçe',zh:'中文',ja:'日本語',ko:'한국어',ar:'العربية',hi:'हिन्दी'};
export const origin='https://airportsboard.live';
export const pageURL=locale=>`${origin}/${locale}/flight-map`;
const hreflang=locale=>locale==='zh'?'zh-Hans':locale;
export function metadata(locale,copy,{releasedLocales=[],productReady=false}={}){
 if(!locales.includes(locale))throw Error('Unsupported locale');
 if(releasedLocales.some(l=>!locales.includes(l))||new Set(releasedLocales).size!==releasedLocales.length)throw Error('Invalid published locale list');
 if(releasedLocales.length&&!productReady)throw Error('Do not index an unfinished product');
 const index=productReady&&releasedLocales.includes(locale),url=pageURL(locale);
 const languages=Object.fromEntries(releasedLocales.map(l=>[hreflang(l),pageURL(l)]));
 if(index)languages['x-default']=pageURL(releasedLocales.includes('en')?'en':releasedLocales.includes('ru')?'ru':releasedLocales[0]);
 return {title:copy.title,description:copy.description,robots:{index,follow:true},
  ...(index?{alternates:{canonical:url,languages}}:{}),
  openGraph:{type:'website',title:copy.title,description:copy.description,...(index?{url,images:[{url:`${origin}/images/flight-map-demo.jpg`,width:1200,height:630,alt:copy.imageAlt}]}:{})},
  twitter:{card:index?'summary_large_image':'summary',title:copy.title,description:copy.description,...(index?{images:[`${origin}/images/flight-map-demo.jpg`]}:{})}};
}
// No personal records enter this function. No invented stars, reviews, FAQ rich
// result claims or HowTo eligibility. Visible answers still help users and bots.
export function jsonLD(locale,copy,meta){if(!meta.robots.index)return null;const url=meta.alternates.canonical;return {'@context':'https://schema.org','@graph':[
 {'@type':'WebPage','@id':url+'#page',url,name:copy.heading,description:copy.intro,inLanguage:hreflang(locale),breadcrumb:{'@id':url+'#breadcrumb'}},
 {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[{'@type':'ListItem',position:1,name:'AirportsBoard',item:`${origin}/${locale}`},{'@type':'ListItem',position:2,name:copy.heading,item:url}]}
 ]};}
export const serializeJSONLD=data=>JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function sitemapEntries(copies,options={}){return locales.flatMap(locale=>{const m=metadata(locale,copies[locale],options);return m.robots.index?[{url:m.alternates.canonical,alternates:{languages:m.alternates.languages}}]:[];});}
