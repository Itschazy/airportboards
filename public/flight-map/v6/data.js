// Каталог и география кодируются при сборке, без потери исходных названий,
// координат аэропортов или видимой береговой линии. Старые v1–v5 не меняются.
export function decodeAirports(data){
 const rows=data.columns?data.columns[0].map((_,i)=>data.columns.map(c=>c[i])):data.rows;
 return rows.map(([code,city,name,country,lat,lon,alias])=>({code,city,name,country,lat,lon,alias:alias===null?city+' '+name:alias}));
}
// Дельты хранят уже округлённые до .01 координаты SVG: ровно такую же строку
// раньше строил createMap после тысяч sin/log. Сохраняем все точки/острова.
export function decodeGeography(data){
 const path=(rows,closed)=>rows.map(row=>{let x=0,y=0,out='M';for(let i=0;i<row.length;i+=2){x+=row[i];y+=row[i+1];out+=(i?'L':'')+(x/100).toFixed(2)+','+(y/100).toFixed(2);}return out+(closed?'Z':'');}).join('');
 return {geom:path(data.land,true),borders:path(data.borders,false)};
}
