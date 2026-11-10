// Isolated negative controls for translation coverage and about-number regressions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-guide-check-'));
const locales = ['en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
const original = { iata:'AAA', checked:new Date().toISOString().slice(0,10), about:'В 2024 году 883 тыс. пассажиров.', about_url:'https://example.com/about', blocks:[{id:'wifi',title:'Wi-Fi',hint:'1 час',text:'Бесплатно 1 час.',source:'example.com',url:'https://example.com/wifi'}] };
const translated = {iata:'AAA', about:'In 2024, 883,000 passengers.', blocks:{wifi:{title:'Wi-Fi',hint:'1 hour',text:'Free for 1 hour.'}}};
const write = (file, data) => fs.writeFileSync(path.join(root,file),JSON.stringify(data));
const check = (label, pass, expected = '') => {
 const r = spawnSync(process.execPath,['scripts/check-guide-fresh.mjs'],{env:{...process.env,AIRPORT_GUIDE_DIR:root},encoding:'utf8'});
 assert.equal(r.status,pass ? 0 : 1,`${label}: ${r.stdout} ${r.stderr}`);
 if(expected) assert.ok(r.stdout.includes(expected),`${label}: missing diagnostic ${r.stdout}`);
 console.log(`PASS ${label}`);
};
try {
 write('AAA.json',original);
 for(const l of locales){fs.mkdirSync(path.join(root,l));write(`${l}/AAA.json`,translated);}
 check('complete valid fixture',true);
 write('ja/AAA.json',{...translated,blocks:{wifi:{...translated.blocks.wifi,hint:'x'.repeat(18)}}});
 check('CJK hint at limit accepted',true);
 write('ja/AAA.json',{...translated,blocks:{wifi:{...translated.blocks.wifi,hint:'x'.repeat(19)}}});
 check('CJK hint exceeding limit rejected',false,'подсказка длиннее 18');
 write('ja/AAA.json',translated);
 write('AAA.json',{...original,blocks:original.blocks.map(b=>({...b,url3:'https://other.example.com/page',source3:'example.com'}))});
 check('mismatched third source rejected',false,'третий источник');
 write('AAA.json',original);
 fs.renameSync(path.join(root,'en'),path.join(root,'en-hidden'));
 check('missing entire locale rejected',false,'en: отсутствует каталог');
 fs.renameSync(path.join(root,'en-hidden'),path.join(root,'en'));
 write('en/AAA.json',{...translated,about:undefined});
 check('missing translated about rejected',false,'без about');
 write('en/AAA.json',{...translated,about:'In 2024, 884,000 passengers.'});
 check('changed about value rejected',false,'[about]: числа расходятся');
 write('en/AAA.json',{...translated,about:'nel 2024 883.000 persone'});
 check('year beside Italian grouped count preserved',true);
 write('tr/AAA.json',{...translated,about:'2024 yılında 883 binden fazla yolcu.'});
 check('Turkish inflected thousand accepted',true);
 write('tr/AAA.json',{...translated,about:'2024 yılında 884 binden fazla yolcu.'});
 check('Turkish changed inflected thousand rejected',false,'[about]: числа расходятся');
 write('tr/AAA.json',translated);
 write('ja/AAA.json',{...translated,about:'2024年の旅客数は88万3000人。'});
 check('Japanese compound number accepted',true);
 write('ja/AAA.json',{...translated,about:'2024年の旅客数は88万4000人。'});
 check('Japanese changed compound number rejected',false,'[about]: числа расходятся');
 write('ja/AAA.json',translated);
 write('AAA.json',{...original,blocks:[{...original.blocks[0],text:'С 1 октября 2026 года: 24 часа.'}]});
 for(const l of locales) write(`${l}/AAA.json`,{...translated,blocks:{wifi:{...translated.blocks.wifi,text:'From 1 October 2026: 24 hours.'}}});
 write('ja/AAA.json',{...translated,blocks:{wifi:{...translated.blocks.wifi,text:'2026年10月24時間から、1個24時間。'}}});
 check('duration replacing Japanese date rejected',false,'повреждена японская дата');
 write('ja/AAA.json',{...translated,blocks:{wifi:{...translated.blocks.wifi,text:'2026年10月1日から、1個24時間。'}}});
 check('Japanese date beside duration accepted',true);
 write('AAA.json',original);
 for(const l of locales) write(`${l}/AAA.json`,translated);
 write('AAA.json',{...original,blocks:[{...original.blocks[0],text:'До 2 суток: 500 ₽.'}]});
 for(const l of locales) write(`${l}/AAA.json`,{...translated,blocks:{wifi:{...translated.blocks.wifi,text:'Up to 2 days: 500.'}}});
 write('ar/AAA.json',{...translated,blocks:{wifi:{...translated.blocks.wifi,text:'حتى يومين: 500.'}}});
 check('Arabic dual two days accepted',true);
 write('ar/AAA.json',{...translated,blocks:{wifi:{...translated.blocks.wifi,text:'حتى يوم واحد: 500.'}}});
 check('Arabic single day cannot replace two days',false,'числа расходятся');
 write('AAA.json',original);
 for(const l of locales) write(`${l}/AAA.json`,translated);
 write('en/ZZZ.json',{...translated,iata:'ZZZ'});
 check('orphan translation rejected',false,'перевод без русского оригинала');
 fs.unlinkSync(path.join(root,'en/ZZZ.json'));
 write('AAA.json',{...original,blocks:[{...original.blocks[0],hint:'24/7',text:'Хранение 500 ₽ за календарные сутки. Круглосуточно.'}]});
 const terms = {en:'calendar day',de:'Kalendertag',fr:'jour calendaire',es:'día natural',it:'giorno solare',tr:'takvim günü',zh:'自然日',ja:'暦日',ko:'달력상의 하루',ar:'يوم تقويمي',hi:'कैलेंडर दिन'};
 for(const l of locales) write(`${l}/AAA.json`,{...translated,blocks:{wifi:{...translated.blocks.wifi,hint:'24/7',text:`500: ${terms[l]}. 24/7.`}}});
 check('calendar billing with round-the-clock service accepted',true);
 for(const l of locales) {
   write(`${l}/AAA.json`,{...translated,blocks:{wifi:{...translated.blocks.wifi,hint:'24/7',text:'500: 24h. 24/7.'}}});
   check(`${l}: rolling period replacing calendar billing rejected`,false,'потеряно уточнение календарных суток');
   write(`${l}/AAA.json`,{...translated,blocks:{wifi:{...translated.blocks.wifi,hint:'24/7',text:`500: ${terms[l]}. 24/7.`}}});
 }
} finally { fs.rmSync(root,{recursive:true}); }
