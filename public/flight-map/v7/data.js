// Все аэропорты, локальные имена и точные координаты доступны сразу.
// Лишь дополнительные поисковые алиасы отделены: карта и PNG ими не пользуются.
export function decodeCore(data){
 return data.columns[0].map((_,i)=>{const [code,city,shortName,country,lat,lon]=data.columns.map(c=>c[i]);const name=shortName===null?city:shortName;return {code,city,name,country,lat,lon,alias:city+' '+name};});
}
export function applyAliases(airports,aliases){
 if(!Array.isArray(aliases)||aliases.length!==airports.length||aliases.some(x=>x!==null&&typeof x!=='string'))throw Error('Invalid search aliases');
 airports.forEach((a,i)=>{a.alias=aliases[i]===null?a.city+' '+a.name:aliases[i];});
}
