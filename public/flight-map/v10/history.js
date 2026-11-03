// Неполная дата — факт, а не 1 января выбранного года. Храним точность в самой
// строке, чтобы старые JSON-копии остались совместимы и фильтр по году работал
// одинаково для YYYY и YYYY-MM-DD. Не используем Date.parse для исправления
// несуществующего 30 февраля и не угадываем порядок дня/месяца в чужом CSV.
export function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function validateDate(value,{today=localToday(),allowFuture=false}={}){
 if(typeof value!=='string')return {valid:false,code:'date_format'};
 if(value==='')return {valid:true,precision:'unknown'};
 if(!/^\d{4}(?:-\d{2}-\d{2})?$/.test(value))return {valid:false,code:'date_format'};
 const year=Number(value.slice(0,4));if(year<1)return {valid:false,code:'date_range'};
 if(value.length===4)return allowFuture||year<=Number(today.slice(0,4))?{valid:true,precision:'year'}:{valid:false,code:'date_future'};
 const date=new Date(`${value}T12:00:00Z`);
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return {valid:false,code:'date_invalid'};
 return allowFuture||value<=today?{valid:true,precision:'day'}:{valid:false,code:'date_future'};
}
export function formatHistoryDate(value,locale){
 if(!value)return '';
 if(value.length===4)return value;
 // Полдень локально защищает дату от смещения при форматировании без UTC.
 return new Date(`${value}T12:00:00`).toLocaleDateString(locale,{day:'numeric',month:'short',year:'numeric'});
}
export function semanticKey(f){return JSON.stringify([f.from,f.to,f.date,f.number.replace(/\s+/g,'').toUpperCase()]);}
export function sameFlight(a,b){return ['id','from','to','date','number'].every(k=>a[k]===b[k]);}
export function markDuplicates(rows,current=[]){const seen=new Map(current.map(f=>[semanticKey(f),f.id]));return rows.map(f=>{const key=semanticKey(f),duplicateOf=seen.get(key);if(!duplicateOf)seen.set(key,f.id);return {...f,...(duplicateOf?{duplicateOf}:{})};});}
