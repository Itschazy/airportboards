// v6 опубликована и immutable. Новая версия отделяет поисковые алиасы от
// первого экрана, не удаляя ни одного поля. Итог сравнивается с исходным v4.
import fs from 'node:fs/promises';import {gzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
async function write(name,data){const bytes=Buffer.from(JSON.stringify(data)+'\n'),path=new URL('public/flight-map/v7/'+name,root);if(process.argv.includes('--check')){if(!bytes.equals(await fs.readFile(path)))throw Error(name+' is stale');}else await fs.writeFile(path,bytes);console.log(name,bytes.length,'gzip',gzipSync(bytes).length);}
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const airports=JSON.parse(await fs.readFile(new URL('public/flight-map/v4/airports-'+locale+'.json',root),'utf8'));
 const rows=airports.map(a=>[a.code,a.city,a.name===a.city?null:a.name,a.country,a.lat,a.lon]);
 await write('core-'+locale+'.json',{columns:rows[0].map((_,i)=>rows.map(a=>a[i]))});
 await write('aliases-'+locale+'.json',airports.map(a=>a.alias===a.city+' '+a.name?null:a.alias));
}
