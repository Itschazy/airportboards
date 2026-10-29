// Сокращаем только представление данных. Источник — опубликованные v4-каталоги
// и Natural Earth v1/land-v2; факты, локальные имена и географию не редактируем.
import fs from'node:fs/promises';import{gzipSync}from'node:zlib';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await fs.readFile(new URL(p,root),'utf8'));
async function write(name,value){const bytes=Buffer.from(JSON.stringify(value)+'\n'),file=new URL('public/flight-map/v6/'+name,root);if(process.argv.includes('--check')){if(!bytes.equals(await fs.readFile(file)))throw Error(name+' is stale');}else await fs.writeFile(file,bytes);console.log(name,bytes.length,'gzip',gzipSync(bytes).length);}
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const airports=await read('public/flight-map/v4/airports-'+locale+'.json');
 const rows=airports.map(a=>[a.code,a.city,a.name,a.country,a.lat,a.lon,a.alias===a.city+' '+a.name?null:a.alias]);
 const columns=rows[0].map((_,i)=>rows.map(a=>a[i])),a={rows},b={columns};
 await write('airports-'+locale+'.json',gzipSync(JSON.stringify(a)).length<gzipSync(JSON.stringify(b)).length?a:b);
}
const data=await read('public/flight-map/v1/land-v2.json');
const project=([lon,lat])=>[(lon+180)*1000/360,500-1000/(2*Math.PI)*Math.log(Math.tan(Math.PI/4+Math.max(-85,Math.min(85,lat))*Math.PI/360))];
const delta=rows=>rows.map(row=>{let x=0,y=0;return row.flatMap(p=>{const [a,b]=project(p).map(n=>Math.round(Number(n.toFixed(2))*100)),d=[a-x,b-y];x=a;y=b;return d;});});
await write('geography.json',{land:delta(data.land),borders:delta(data.borders)});
