// Только локальное чтение на сервере/копии диагностического каталога; публичного API нет.
// Перцентили считаются по отдельным замерам, а не усреднением дневных p75.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
export const dimensions = ['release', 'browser', 'browserMajor', 'device', 'platform', 'page', 'locale', 'airport', 'network', 'memory', 'protocol', 'navigation', 'target'];
const metrics = ['lcp', 'ttfb', 'fcp', 'dns', 'connect', 'request', 'html', 'resourceLoadDelay', 'resourceLoadDuration', 'elementRenderDelay', 'longTaskTotal', 'longTaskMax', 'scriptBytes'];
const quantile = (values, p) => values.length ? values.slice().sort((a,b) => a-b)[Math.ceil(values.length*p)-1] : null;
export async function reportRum({dir, since = new Date(Date.now()-6*86400000).toISOString().slice(0,10), until = new Date().toISOString().slice(0,10), by = ['release','browser','device','page','navigation'], filters = {}, minLcp = 0}) {
  if (![since,until].every(v => /^\d{4}-\d{2}-\d{2}$/.test(v)) || since > until) throw Error('Неверный интервал дат UTC');
  if (!Number.isFinite(minLcp) || minLcp < 0 || minLcp > 300000) throw Error('Неверный minLcp');
  if (!by.length || by.some(k=>!dimensions.includes(k))) throw Error('Неизвестная группировка');
  const groups = new Map(); let records = 0, invalid = 0, truncatedLongTasks = 0;
  const files = [], cappedFiles = [];
  const names = await fs.readdir(dir).catch(e => { if(e.code === 'ENOENT') return []; throw e; });
  for (const name of names.filter(n=>/^rum-(?:[0-9]|1[0-3])-[0-7]\.jsonl$/.test(n)).sort()) {
    const file = path.join(dir,name), stat = await fs.stat(file);
    // Повреждённый/подменённый файл не превращает отчёт в чтение бесконечного журнала.
    if(stat.size > 1024*1024) { invalid++; continue; }
    const [header,...lines] = (await fs.readFile(file,'utf8')).trimEnd().split('\n');
    let day; try { day = JSON.parse(header).day; } catch { invalid++; continue; }
    if(typeof day !== 'string' || day < since || day > until) continue;
    files.push({name,day,bytes:stat.size}); if(stat.size > 1024*1024-4096) cappedFiles.push(name);
    for(const line of lines) {
      let r; try {r = JSON.parse(line);} catch {invalid++;continue;}
      if(r.schema !== 1 || !/^[a-f0-9]{12,40}$/.test(r.release) || !Number.isFinite(r.lcp) || r.lcp<=0 || !r.hour?.startsWith(day+'T')) {invalid++;continue;}
      if(r.lcp < minLcp) continue;
      if(Object.entries(filters).some(([k,v])=>String(r[k])!==v)) continue;
      const tags = Object.fromEntries(by.map(k=>[k,r[k]])), key=JSON.stringify(tags);
      if(!groups.has(key)) groups.set(key,{...tags,n:0,slow:0,firstHour:r.hour,lastHour:r.hour,values:Object.fromEntries(metrics.map(k=>[k,[]])),targets:{},slowestResources:{}});
      const g=groups.get(key); g.n++;records++;if(r.lcp>4000)g.slow++;
      if(r.longTasksTruncated)truncatedLongTasks++;
      if(r.hour<g.firstHour)g.firstHour=r.hour;if(r.hour>g.lastHour)g.lastHour=r.hour;
      g.targets[r.target]=(g.targets[r.target]||0)+1;
      if(r.lcp>4000)g.slowestResources[r.slowestResource]=(g.slowestResources[r.slowestResource]||0)+1;
      for(const k of metrics)if(Number.isFinite(r[k])&&r[k]>=0)g.values[k].push(r[k]);
    }
  }
  return {since,until,by,filters,minLcp,records,invalid,files,cappedFiles,truncatedLongTasks,groups:[...groups.values()].map(g=>{
    const {values,...rest}=g;return {...rest,smallSample:g.n<50,poorPercent:Math.round(1000*g.slow/g.n)/10,
      metrics:Object.fromEntries(metrics.map(k=>[k,{n:values[k].length,p50:quantile(values[k],.5),p75:quantile(values[k],.75),p90:quantile(values[k],.9)}]))};
  }).sort((a,b)=>b.n-a.n)};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const args=process.argv.slice(2), options={filters:{}}; let json=false;
  for(const arg of args) {
    if(arg==='--json') {json=true;continue;}
    const m=arg.match(/^--([a-zA-Z]+)=(.+)$/);if(!m)throw Error('Аргумент: --dir=PATH --since=YYYY-MM-DD --until=YYYY-MM-DD --by=release,browser --device=mobile --json');
    const [,key,value]=m;
    if(['dir','since','until'].includes(key))options[key]=value;
    else if(key==='minLcp')options.minLcp=Number(value);
    else if(key==='by')options.by=value.split(',');
    else if(dimensions.includes(key))options.filters[key]=value;
    else throw Error('Неизвестный аргумент '+key);
  }
  options.dir ||= path.join(process.env.AIRPORTSBOARD_DATA_DIR||path.join(os.homedir(),'airportsboard-data'),'rum');
  const r=await reportRum(options);
  if(json)console.log(JSON.stringify(r,null,2));else {
    console.log(`UTC ${r.since} — ${r.until}: ${r.records} замеров, ${r.files.length} файлов; почти заполнено: ${r.cappedFiles.length}, некорректных строк/файлов: ${r.invalid}`);
    console.table(r.groups.map(g=>({...Object.fromEntries(r.by.map(k=>[k,g[k]])),n:g.n,LCP_p75:g.metrics.lcp.p75,LCP_p90:g.metrics.lcp.p90,TTFB_p75:g.metrics.ttfb.p75,render_p75:g.metrics.elementRenderDelay.p75,longTasks_p75:g.metrics.longTaskTotal.p75,poor_pct:g.poorPercent,small:g.smallSample})));
    console.log('Миллисекунды. n<50 — предварительно. Разность/сумма перцентилей не длительность этапа. Нулевой transferSize может означать кэш или ограничения cross-origin. Поля отсутствующего API не равны нулю.');
  }
}
