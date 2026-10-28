import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {locales,names,metadata,jsonLD,serializeJSONLD,sitemapEntries} from './metadata.mjs';
import {escape,renderInfo} from './render.mjs';
const base=fileURLToPath(new URL('../',import.meta.url));
const copies=Object.fromEntries(locales.map(l=>[l,JSON.parse(fs.readFileSync(new URL(l+'.json',import.meta.url),'utf8'))]));
// This command has no publish flag and never creates an indexable local page.
// Release metadata is a separate pure adapter tested offline, not an invitation
// to remove noindex while the product remains an unapproved Russian prototype.
for(const l of locales){const c=copies[l],m=metadata(l,c);const dir=path.join(base,'seo-preview',l);fs.mkdirSync(dir,{recursive:true});
 const links=locales.map(loc=>`<a href="/seo-preview/${loc}/" lang="${loc}" dir="${loc==='ar'?'rtl':'ltr'}"${loc===l?' aria-current="page"':''}>${names[loc]}</a>`).join(' ');
 const html=`<!doctype html><html lang="${l}" dir="${l==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${escape(m.title)}</title><meta name="description" content="${escape(m.description)}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(m.title)}"><meta property="og:description" content="${escape(m.description)}"><meta name="twitter:card" content="summary"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/seo.css"></head><body><main class="map-page seo-preview"><p class="form-note">${escape(c.previewNote)}</p><h1>${escape(c.heading)}</h1><a class="primary save" href="/ru/my-flights-prototype/" lang="ru">${escape(c.cta)}</a>${renderInfo(c,{expanded:true})}<nav class="seo-locales" aria-label="Languages">${links}</nav></main></body></html>`;
 fs.writeFileSync(path.join(dir,'index.html'),html);
 if(jsonLD(l,c,m)!==null)throw Error('Preview must not advertise published schema');
}
const tool=path.join(base,'ru/my-flights-prototype/index.html');let html=fs.readFileSync(tool,'utf8');const start='<!-- flight-map-seo:start -->',end='<!-- flight-map-seo:end -->';const block=start+renderInfo(copies.ru)+end;
if(html.includes(start))html=html.replace(/<!-- flight-map-seo:start -->[\s\S]*?<!-- flight-map-seo:end -->/,block);else html=html.replace('<footer>',block+'<footer>');
if(!html.includes('/assets/seo.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/seo.css"></head>');
if(!html.includes('name="description"'))html=html.replace('</head>',`<meta name="description" content="${escape(copies.ru.description)}"></head>`);
fs.writeFileSync(tool,html);
if(sitemapEntries(copies).length)throw Error('Prototype cannot enter sitemap');
console.log('Prepared 12 noindex previews and static Russian tool explanation. No production files changed.');
