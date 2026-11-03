import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
import fs from 'node:fs';import crypto from 'node:crypto';
const root=new URL('../../',import.meta.url).pathname;
const sourceDir=process.argv[2];if(!sourceDir)throw Error('Usage: node ops/social-share-20261103/build-transparent.mjs /path/to/reviewed-originals');
const manifest=JSON.parse(fs.readFileSync(root+'/ops/social-share-20261103/brand-sources.json'));
for(const [id,source] of Object.entries(manifest.sources)){
 const file=id==='x'?sourceDir+'/x-mark.svg':sourceDir+'/'+id+'-official'+(['telegram','vk','max'].includes(id)?'.svg':'');
 const svg=file.endsWith('.svg');let input=fs.readFileSync(file);
 if(crypto.createHash('sha256').update(input).digest('hex')!==source.sourceSha256)throw Error('Source mismatch: '+id);
 let p=sharp(input,svg?{density:864}:{});
 if(id==='facebook'){
  // The official reference is a circle on white. Keep the white f inside
  // its circle and discard only the outside canvas.
  const circle=await p.trim({threshold:20}).resize(288,288).toBuffer();
  p=sharp(circle).composite([{input:Buffer.from('<svg width="288" height="288"><circle cx="144" cy="144" r="143.5" fill="white"/></svg>'),blend:'dest-in'}]);
  p=sharp(await p.png().toBuffer());
 }else if(!svg){
  const {data,info}=await p.ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=0;i<data.length;i+=4){const min=Math.min(data[i],data[i+1],data[i+2]);const a=Math.min(1,(255-min)/16);if(a<1)for(let c=0;c<3;c++)data[i+c]=a?Math.max(0,Math.round((data[i+c]-255*(1-a))/a)):0;data[i+3]=Math.round(data[i+3]*a);}
  p=sharp(data,{raw:info});
 }
 const result=await p.trim({threshold:10}).resize(96,96,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true,effort:6}).toBuffer();
 source.previousFile=source.file;source.file='public/flight-map/brands-v3/'+id+'.webp';source.bytes=result.length;source.sha256=crypto.createHash('sha256').update(result).digest('hex');fs.writeFileSync(root+'/'+source.file,result);
}
manifest.processing='Transparent brand glyphs, 96x96 within 112x112 canvas. SVGs preserve source alpha. White reference canvas removed from near-white pixels; colored pixels preserved. Facebook keeps the white f inside its circular mark. Lossless WebP, CSS56px. X/Threads rendered white in dark theme via CSS invert, black in light theme. Original v1 kept for cache compatibility.';
fs.writeFileSync(root+'/ops/social-share-20261103/brand-sources-transparent.json',JSON.stringify(manifest,null,2)+'\n');
