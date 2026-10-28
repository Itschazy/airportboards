// Публичные изображения содержат только явно подписанный пример.
// Генерация локальная, без API, внешних карт и личных записей.
import fs from 'node:fs';
import sharp from 'sharp';
import {createMap,escapeXML} from '../public/flight-map/v2/map.js';
const root=new URL('../',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(root+'/'+p)),land=read('public/flight-map/v1/land-v2.json');
const flights=[{id:'example1',from:'LHR',to:'HND'},{id:'example2',from:'HND',to:'SIN'},{id:'example3',from:'SIN',to:'CDG'}];
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const messages=read('lib/flight-map/locales/'+locale+'.json'),model=createMap(read('public/flight-map/v4/airports-'+locale+'.json'),land);
 const box=model.fit(flights,1160/350),body=model.body(flights,box,700,null,false),title=escapeXML(messages.m153);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><style>text{font-family:Arial,sans-serif;unicode-bidi:plaintext}.land{fill:#253343;stroke:#34404e;stroke-width:.4}.flight-path{fill:none;stroke:#459fff;stroke-width:2;vector-effect:non-scaling-stroke}.route-halo{fill:none}.airport-dot{fill:#459fff}.airport-ring{fill:#459fff;opacity:.15}.airport-label{fill:#f7f8fa;paint-order:stroke;stroke:#111419;font-weight:bold}.airport-city{font-weight:normal}</style><rect width="1200" height="630" fill="#111419"/><text x="600" y="56" text-anchor="middle" fill="#b1b8c4" font-size="26">airportsboard</text><text x="600" y="120" text-anchor="middle" fill="#f7f8fa" font-size="44">${title}</text><svg x="20" y="160" width="1160" height="350" viewBox="${box.x} ${box.y} ${box.w} ${box.h}">${body}</svg><text x="600" y="554" text-anchor="middle" fill="#b1b8c4" font-size="22">${escapeXML(messages.m158)}</text><text x="600" y="604" text-anchor="middle" fill="#b1b8c4" font-size="24">airportsboard.live</text></svg>`;
 await sharp(Buffer.from(svg)).jpeg({quality:88}).toFile(root+'/public/images/flight-map-'+locale+'.jpg');
}
console.log('12 localized demo OG images generated');
