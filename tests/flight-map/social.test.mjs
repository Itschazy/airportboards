import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialShareRegion,socialGroups,socialApps} from '../../public/flight-map/v10/social.js';
import {createSharing} from '../../public/flight-map/v4/sharing.js';
import {createI18n} from '../../public/flight-map/v4/i18n.js';

test('region is an overridable preference, not the page language or claimed IP location',()=>{
 assert.equal(initialShareRegion(null,'Europe/London','ru'),'world');
 assert.equal(initialShareRegion(null,'Asia/Yekaterinburg','en'),'ru');
 assert.equal(initialShareRegion('world','Europe/Moscow','ru'),'world');
 assert.equal(initialShareRegion('ru','America/New_York','en'),'ru');
 assert.equal(initialShareRegion('invalid','Asia/Tokyo','ru'),'world');
 assert.equal(initialShareRegion(null,null,'ru'),'ru');
 assert.equal(initialShareRegion(null,null,'ar'),'world');
 assert.deepEqual(socialGroups.ru,['telegram','vk','max']);
 assert.deepEqual(socialGroups.world,['instagram','facebook','threads','x','whatsapp']);
 for(const id of [...socialGroups.ru,...socialGroups.world])assert.ok(socialApps[id]?.name);
});

test('file share preserves prepared PNG, has no public history URL and runs synchronously',async()=>{
 const file=new File(['synthetic png'],'test.png',{type:'image/png'});let called=false;
 const {canShareImage,shareImage}=createSharing(k=>k,'ru');
 const nav={canShare:({files})=>files[0]===file,share:payload=>{called=true;assert.deepEqual(payload,{files:[file],title:'m001'});return Promise.reject(Object.assign(new Error('cancelled'),{name:'AbortError'}));}};
 assert.equal(canShareImage(nav,file),true);
 const result=shareImage(nav,file);assert.equal(called,true);
 await assert.rejects(result,{name:'AbortError'});
 assert.equal(canShareImage({},file),false);
 assert.equal(canShareImage({share(){},canShare(){throw Error();}},file),false);
});

test('all twelve languages have matching keys, valid placeholders and honest destination hints',()=>{
 const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];let keys;
 for(const lang of locales){
  const messages=JSON.parse(fs.readFileSync(new URL(`../../lib/flight-map/enhancements/${lang}.json`,import.meta.url)));
  const current=Object.keys(messages).sort();if(keys)assert.deepEqual(current,keys);else keys=current;
  const {t}=createI18n(lang,messages);
  for(const key of ['xShareTo','xShareRegion','xShareRussia','xShareWorld','xShareOther','xShareHint','xShareUnavailable'])assert.ok(t(key).length);
  for(const key of ['xShareChoose','xShareSaveFor']){assert.deepEqual(messages[key].match(/\{\w+\}/g),['{app}']);assert.ok(t(key,{app:'Telegram'}).includes('Telegram'));}
 }
});
