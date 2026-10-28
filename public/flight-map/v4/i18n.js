// Переводы передаёт SSR текущего языка: нет второго сетевого запроса или
// русского первого кадра. История хранит только IATA, дату и номер, без языка.
export function createI18n(locale,messages){
 const plural=new Intl.PluralRules(locale);
 const t=(key,params={})=>{
  const value=messages[key];
  if(typeof value!=='string')throw Error('Missing flight-map translation: '+locale+'/'+key);
  return value.replace(/\{(\w+)\}/g,(_,name)=>{if(!(name in params))throw Error('Missing parameter: '+key+'/'+name);return String(params[name]);});
 };
 const countLabel=(kind,count)=>messages.plurals[kind][locale==='hi'&&count===0?'other':plural.select(count)]??messages.plurals[kind].other;
 const statLabel=(kind,count)=>['zh','ja','ko'].includes(locale)?t(kind==='flights'?'m016':'m155'):kind==='flights'?countLabel(kind,count):t('m087',{p3:countLabel(kind,count)});
 return {locale,t,countLabel,statLabel};
}
