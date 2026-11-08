import {validateDate,markDuplicates} from '../v10/history.js';
const LIMIT=5000,MAX_BYTES=2*1024*1024;
// CSV рассматривается как данные, никогда как HTML или формулы. При экспорте
// защищаем номер рейса от формул Excel. Обратное снятие апострофа разрешено
// только для опасного префикса; произвольные апострофы пользователя сохраняются.
function cell(value){let s=String(value);if(/^'|^\s*[=+\-@]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
export function exportCSV(flights){return '\uFEFFfrom,to,date,number\r\n'+flights.map(f=>[f.from,f.to,f.date,f.number].map(cell).join(',')).join('\r\n')+'\r\n';}
// Конечный автомат RFC4180: кавычки и переносы внутри ячейки не создают
// фиктивных рейсов. Запрещаем мусор после закрывающей кавычки и незакрытые
// кавычки целиком, а не возвращаем обманчиво успешный частичный импорт.
function csv(text,delimiter){const records=[];let row=[],value='',quoted=false,closed=false,line=1,start=1;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else{value+=c;if(c==='\n')line++;}continue;}
  if(c==='"'){if(value||closed)throw {code:'csv_quotes',line};quoted=true;continue;}
  if(c===delimiter){row.push(value);value='';closed=false;continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))records.push({cells:row,line:start});if(records.length>LIMIT+1)throw {code:'record_limit',line};row=[];value='';closed=false;line++;start=line;continue;}
  if(closed)throw {code:'csv_quotes',line};value+=c;
 }
 if(quoted)throw {code:'csv_quotes',line:start};row.push(value);if(row.some(x=>x.trim()))records.push({cells:row,line:start});if(records.length>LIMIT+1)throw {code:'record_limit',line};return records;
}
const header=s=>s.trim().toLowerCase().replace(/[ _-]+/g,'');
// Только явные названия колонок, используемые собственным CSV и стандартными
// выгрузками OpenFlights / myFlightradar24. Без заголовка нельзя надёжно отличить
// ID аэропорта, IATA, дату и время. Полные названия аэропорта не разбираем эвристикой.
const aliases={from:['from','fromiata','departureiata','origin'],to:['to','toiata','arrivaliata','destination'],date:['date','flightdate'],number:['number','flightnumber','flight']};
export function createTransfer({codes,newId,today}={}){
 function parse(text,{format='auto',current=[]}={}){
  const result={rows:[],errors:[],warnings:[],source:'csv'};
  if(typeof text!=='string'||new Blob([text]).size>MAX_BYTES){result.errors.push({code:'file_size'});return result;}
  text=text.replace(/^\uFEFF/,'');if(!text.trim()){result.errors.push({code:'empty'});return result;}
  const add=(from,to,date,number,line)=>{
   from=from.trim().toUpperCase();to=to.trim().toUpperCase();date=date.trim();
   if(/^''|^'\s*[=+\-@]/.test(number))number=number.slice(1);
   const problems=[];for(const [field,value] of [['from',from],['to',to]])if(!codes.has(value))problems.push({code:'airport_unknown',line,field,value});
   if(from===to)problems.push({code:'route_same',line});const valid=validateDate(date,today?{today}:{});if(!valid.valid)problems.push({code:valid.code==='date_format'&&/[/.]/.test(date)?'date_ambiguous':valid.code,line,field:'date',value:date});
   if(number.length>24||/[\x00-\x1f\x7f]/.test(number))problems.push({code:'number_invalid',line,field:'number'});
   if(problems.length){result.errors.push(...problems);return;}if(result.rows.length>=LIMIT){result.errors.push({code:'record_limit',line});return;}
   result.rows.push({id:newId(),from,to,date,number});
  };
  const first=text.split(/\r?\n/,1)[0];
  const routes=format==='routes'||(format==='auto'&&!/[;,\t]/.test(first)&&/^\s*[a-z]{3}(?:\s*(?:→|->|—|–|-)\s*|\s+)[a-z]{3}/i.test(first));
  // Stop the complete route-chain walk at the first excess record. Continuing
  // previously allocated one error for every remaining leg of a large paste.
  if(routes){result.source='routes';const lines=text.split(/\r\n|\n|\r/);routesLoop:for(let i=0;i<lines.length;i++){const line=lines[i].trim();if(!line)continue;if(i>LIMIT){result.errors.push({code:'record_limit',line:i+1});break;}const parts=line.toUpperCase().split(/\s*(?:→|->|—|–|-)\s*|\s+/).filter(Boolean);if(parts.length<2||parts.some(x=>! /^[A-Z]{3}$/.test(x))){result.errors.push({code:'route_format',line:i+1});continue;}for(let j=1;j<parts.length;j++){if(result.rows.length>=LIMIT){result.errors.push({code:'record_limit',line:i+1});break routesLoop;}add(parts[j-1],parts[j],'','',i+1);}}}
  else{
   let records,columns;for(const delimiter of [',',';','\t']){try{const candidate=csv(text,delimiter);if(!candidate.length)continue;const normalized=candidate[0].cells.map(header);const found=Object.fromEntries(Object.entries(aliases).map(([k,names])=>[k,normalized.findIndex(x=>names.includes(x))]));if(found.from>=0&&found.to>=0){records=candidate;columns=found;break;}}catch(e){result.errors=[e];}}
   if(!records){if(!result.errors.length)result.errors.push({code:'headers_required'});return result;}result.errors=[];
   const headers=records.shift().cells,known=new Set(Object.values(columns).filter(i=>i>=0));
   const extras=headers.filter((_,i)=>!known.has(i));if(extras.length)result.warnings.push({code:'fields_ignored',fields:extras});
   for(const [key,names] of Object.entries(aliases)){if(headers.filter(h=>names.includes(header(h))).length>1)result.errors.push({code:'headers_duplicate',field:key,line:1});}if(result.errors.length)return result;
   for(const record of records){if(record.cells.length!==headers.length){result.errors.push({code:'columns_mismatch',line:record.line});continue;}const value=k=>columns[k]<0?'':record.cells[columns[k]];add(value('from'),value('to'),value('date'),value('number'),record.line);}
  }
  result.rows=markDuplicates(result.rows,current);const duplicates=result.rows.filter(r=>r.duplicateOf).length;if(duplicates)result.warnings.push({code:'duplicates',count:duplicates});
  if(!result.rows.length&&!result.errors.length)result.errors.push({code:'empty'});return result;
 }
 return {parse,exportCSV,LIMIT,MAX_BYTES};
}
