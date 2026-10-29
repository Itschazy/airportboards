// v1–v8 опубликованы и immutable. Упаковка v9 сохраняет все 6074 аэропорта,
// локальные/английские имена и точные координаты. Brotli создаётся один раз,
// а не при каждом запросе; JSON нужен для резервного пути loadPayload.
import fs from 'node:fs/promises';import {brotliCompressSync,constants} from 'node:zlib';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await fs.readFile(new URL(p,root),'utf8'));
async function write(name,value){const data=Buffer.from(JSON.stringify(value)+'\n'),module=Buffer.from('export default '+JSON.stringify(value)+';\n'),moduleBr=brotliCompressSync(module,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}),br=brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:11}});
 for(const [suffix,bytes] of [['.json',data],['.json.br',br],['.js.br',moduleBr]]){const file=new URL('public/flight-map/v9/'+name+suffix,root);if(process.argv.includes('--check')){if(!bytes.equals(await fs.readFile(file)))throw Error(name+suffix+' is stale');}else await fs.writeFile(file,bytes);}
 console.log(name,data.length,'br',br.length);
}
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const core=await read('public/flight-map/v7/core-'+locale+'.json'),aliases=await read('public/flight-map/v7/aliases-'+locale+'.json');await write('catalogue-'+locale,{...core,aliases});
}
await write('geography',await read('public/flight-map/v6/geography.json'));
