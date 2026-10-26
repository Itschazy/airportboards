// Новая партия готовится вне data/: наличие черновика не означает готовность к выкату.
// Старый check-round2 знает только прежние24 аэропорта. Здесь охват определяется
// зафиксированным рейтингом, а все новые файлы проверяются теми же ограничениями.
// Числовой сторож не копируем: запускаем исходный check-guide-fresh в изолированной
// временной копии данных, чтобы его правила и исключения не разошлись с продом.
// --drafts проверяет объединение боевых данных с черновиками, --complete требует
// все100IATA. Это техническая проверка; рецензия смысла/источников остаётся отдельной.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const root=process.cwd(), staged=process.argv.includes('--drafts'), complete=process.argv.includes('--complete');
const ranking=JSON.parse(fs.readFileSync('ops/guide-collection/top100-2025/ranking.json','utf8'));
const codes=ranking.rows.map(row=>row[2]);
const locales='en de fr es it tr zh ja ko ar hi'.split(' ');
const base='data/airport-guide';
// JSON справочной без записи каталога даёт 404 на всех языках (TFU, найдено полным SSR-проходом).
// Проверяем реальную адресуемость, а не только существование текстового файла.
const catalogue=new Set(JSON.parse(fs.readFileSync('data/airports.json','utf8')).map(a=>a.iata));
const originals='ops/guide-collection/top100-2025/drafts';
const translations='ops/guide-translation/top100-2025/drafts';
const read=(f)=>JSON.parse(fs.readFileSync(f,'utf8'));
const originalFile=(c)=>staged&&fs.existsSync(`${originals}/${c}.json`)?`${originals}/${c}.json`:`${base}/${c}.json`;
const translatedFile=(l,c)=>staged&&fs.existsSync(`${translations}/${l}/${c}.json`)?`${translations}/${l}/${c}.json`:`${base}/${l}/${c}.json`;
const known=new Set('transport taxi terminals lounges storage sleep kids parking wifi'.split(' '));
const allowed={zh:/[\p{Script=Latin}\p{Script=Han}]/u,ja:/[\p{Script=Latin}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]/u,ko:/[\p{Script=Latin}\p{Script=Han}\p{Script=Hangul}]/u,ar:/[\p{Script=Latin}\p{Script=Arabic}ـ]/u,hi:/[\p{Script=Latin}\p{Script=Devanagari}]/u};
const native={zh:/\p{Script=Han}/u,ja:/[\p{Script=Hiragana}\p{Script=Katakana}]/u,ko:/\p{Script=Hangul}/u,ar:/\p{Script=Arabic}/u,hi:/\p{Script=Devanagari}/u};
let failures=[],missing=[],files=0,present=0,blocks=0;
if(codes.length!==100||new Set(codes).size!==100) failures.push('рейтинг должен содержать100уникальныхIATA');
for(const code of codes){
 if(!catalogue.has(code))failures.push(`${code}: нет в каталоге, страницы справочной вернут404`);
 const source=originalFile(code);
 if(!fs.existsSync(source)){missing.push(code);continue;}
 const g=read(source);present++;
 // Пустой файл не закрывает аэропорт: иначе рейтинг можно было бы формально
 // заполнить заглушками без единого проверенного факта.
 if(!Array.isArray(g.blocks)||!g.blocks.length){failures.push(`${source}: нет содержательных блоков`);continue;}
 if(g.iata!==code)failures.push(`${source}: неверныйiata`);
 const ids=g.blocks.map(b=>b.id).sort();
 if(new Set(ids).size!==ids.length||ids.some(id=>!known.has(id)))failures.push(`${source}: idблоков`);
 for(const b of g.blocks){
  if(!b.url?.startsWith('https://'))failures.push(`${source}/${b.id}: нуженHTTPS`);
  // BRIEF ограничивает35/18символами переводы; русский оригинал —2–6слов.
  // Не вводим задним числом лимит35для прежних русских подписей.
 }
 const ruText=JSON.stringify(g);
 const allowedCodes=[...new Set(ruText.match(/[A-Za-zА-Яа-яЁё0-9–-]+/g)??[])].filter(s=>/\d/u.test(s)&&/\p{Script=Cyrillic}/u.test(s));
 for(const m of ruText.matchAll(/(\d+)\s*\(([А-Яа-я])\)/gu))allowedCodes.push(m[1]+m[2]);
 for(const l of locales){
  const f=translatedFile(l,code);
  if(!fs.existsSync(f)){failures.push(`${f}: отсутствует`);continue;}
  const t=read(f);files++;
  if(t.iata!==code)failures.push(`${f}: неверныйiata`);
  if(Object.keys(t).some(k=>!['iata','about','blocks'].includes(k)))failures.push(`${f}: лишниеполя`);
  if(JSON.stringify(Object.keys(t.blocks??{}).sort())!==JSON.stringify(ids))failures.push(`${f}: составблоков`);
  if(Boolean(g.about)!==Boolean(t.about))failures.push(`${f}: наличиеabout`);
  for(const [id,b] of Object.entries(t.blocks??{})){
   blocks++;
   if(Object.keys(b).sort().join(',')!=='hint,text,title')failures.push(`${f}/${id}: схемаполей`);
   for(const key of ['title','hint','text']){
    let text=b[key];if(typeof text!=='string'||!text.trim()){failures.push(`${f}/${id}.${key}: пусто`);continue;}
    for(const code of allowedCodes)text=text.replaceAll(code,'');
    const foreign=[...new Set([...text].filter(c=>/\p{L}/u.test(c)&&!(allowed[l]??/\p{Script=Latin}/u).test(c)))];
    if(foreign.length)failures.push(`${f}/${id}.${key}: чужойалфавит${foreign.join('')}`);
    if(key==='text'&&native[l]&&!native[l].test(text))failures.push(`${f}/${id}: нетродногоалфавита`);
   }
   const max=['zh','ja','ko'].includes(l)?18:35;
   if([...b.hint].length>max)failures.push(`${f}/${id}: hint>${max}`);
   if(l==='ar'){
    // Номера поддержки бывают не только международными: 1-844-… и *1107
    // также требуют LTR. Старое условие с обязательным «+» их пропускало.
    // ISO-дата имеет похожие дефисы, но не является номером телефона.
    const phones=(b.text.match(/(?:\+?\(?\d[\d ()-]{5,}\d|\*\d{3,})/g)??[])
     .filter(phone=>!/^\d{4}-\d{2}-\d{2}$/.test(phone));
    for(const phone of phones)if(!b.text.includes(`\u2066${phone}\u2069`))failures.push(`${f}/${id}: телефонбезLTR${phone}`);
   }
  }
 }
}
if(complete&&missing.length)failures.push(`непокрытыеаэропорты:${missing.join(' ')}`);
console.log(`Техническое наличие: ${present}/100, переводов${files}, блоков${blocks}; режим${staged?'счерновиками':'data'}.`);
console.log(`Не хватает${missing.length}: ${missing.join(' ')}`);
for(const f of failures)console.error(f);
let status=failures.length?1:0;
// Копия принадлежит только этому процессу. Удаляется только созданный mkdtemp,
// данные рейсов и data/airport-guide в рабочем дереве не затрагиваются.
if(!status){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'airport-guide-top100-'));
 try{
  const target=path.join(temp,base);fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(base,target,{recursive:true});
  if(staged){
   for(const code of codes){
    const f=`${originals}/${code}.json`;if(fs.existsSync(f))fs.copyFileSync(f,path.join(target,`${code}.json`));
    for(const l of locales){const f=`${translations}/${l}/${code}.json`;if(fs.existsSync(f))fs.copyFileSync(f,path.join(target,l,`${code}.json`));}
   }
  }
  const check=spawnSync(process.execPath,[path.join(root,'scripts/check-guide-fresh.mjs')],{cwd:temp,stdio:'inherit'});status=check.status??1;
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
console.log(status?'Техническая проверка НЕ пройдена.':'Техническая проверка пройдена; это не подтверждение фактов или качества перевода.');
process.exitCode=status;
