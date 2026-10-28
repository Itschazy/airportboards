// Пересобирается офлайн из уже проверенных проектных названий. Сеть и API
// рейсов не используются. Общие IATA/координаты сохраняют совместимость backup.
// Если перевода собственного имени нет, остаётся английское имя, а не русский
// текст. Английский алиас позволяет искать зарубежный аэропорт на любом языке.
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const base=read('public/flight-map/v1/airports.json'),airports=new Map(read('data/airports.json').map(a=>[a.iata,a])),cities=read('data/city-names.json'),names=read('data/airport-names.json');
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const rows=base.map(old=>{const a=airports.get(old.code);if(!a)throw Error('Missing airport '+old.code);return {...old,city:locale==='en'?a.city:cities[a.city]?.[locale]||a.city,name:locale==='en'?a.name:names[old.code]?.[locale]||a.name,alias:a.city+' '+a.name};});
 fs.writeFileSync(new URL('../public/flight-map/v4/airports-'+locale+'.json',import.meta.url),JSON.stringify(rows)+'\n');
}
console.log('12 offline airport catalogues generated');
