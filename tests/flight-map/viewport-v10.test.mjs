import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap} from '../../public/flight-map/v10/map.js';
import {mapFrame,validMapBox,viewportPoint} from '../../public/flight-map/v10/viewport.js';
import {gestureBox} from '../../public/flight-map/v3/gestures.js';
const airports=[{code:'SVX',lat:56.74,lon:60.8,city:'Екатеринбург'},{code:'IST',lat:41.27,lon:28.75,city:'İstanbul'},{code:'CDG',lat:49.01,lon:2.55,city:'Paris'}];
const map=createMap(airports,[]),flights=[{id:'f_1',from:'SVX',to:'IST'},{id:'f_2',from:'IST',to:'CDG'},{id:'f_3',from:'SVX',to:'IST'}];

test('zero-width reproduces old Infinity, guarded frame postpones rendering and recovers',()=>{
 const old=map.fit(flights,0/300);assert.equal(validMapBox(old),false,'fixture exposes real zero-width failure');
 let box=null,count=0;
 for(const [width,height] of [[0,0],[0,300],[375,260],[0,260],[320,240],[1,260],[0,0],[320,240]]){
  const frame=mapFrame(map,flights,box,width,height);
  if(!width||!height){assert.equal(frame,null);continue;}
  box=frame.box;assert.ok(validMapBox(box));assert.doesNotMatch(map.body(flights,box,frame.width),/NaN|Infinity/);count++;
 }
 assert.equal(count,4);
 const recovered=mapFrame(map,flights,old,320,240);assert.ok(validMapBox(recovered.box));assert.doesNotMatch(map.body(flights,recovered.box,320),/NaN|Infinity/);
});

test('hidden/fullscreen invalid measurements never reach map fit or body',()=>{
 const model={fit(){assert.fail('invalid dimensions must not fit');}};
 for(const [w,h] of [[0,0],[0,200],[200,0],[-1,200],[200,-1],[Infinity,1],[1,Infinity],[NaN,300],[300,NaN],[Number.MAX_VALUE,Number.MIN_VALUE]])assert.equal(mapFrame(model,[],null,w,h),null);
});

test('normal orientation change preserves user zoom and geographic center',()=>{
 const initial=mapFrame(map,flights,null,375,260).box;
 const zoom=gestureBox(initial,[{x:.25,y:.5},{x:.75,y:.5}],[{x:.1,y:.5},{x:.9,y:.5}]);
 for(const [w,h] of [[320,240],[740,350],[375,260]]){
  const next=mapFrame(map,flights,zoom,w,h).box;assert.equal(next.w,zoom.w);assert.equal(next.x,zoom.x);assert.equal(next.c,zoom.c);assert.ok(Math.abs(next.y+next.h/2-zoom.y-zoom.h/2)<1e-8);
 }
});

test('fullscreen pointer after hidden/resize cannot inject NaN into gesture state',()=>{
 const event={clientX:80,clientY:120};
 for(const rect of [{left:0,top:0,width:0,height:200},{left:0,top:0,width:200,height:0},{left:0,top:0,width:NaN,height:200}])assert.equal(viewportPoint(event,rect),null);
 assert.deepEqual(viewportPoint(event,{left:0,top:20,width:320,height:200}),{x:.25,y:.5});
 assert.equal(viewportPoint({clientX:NaN,clientY:120},{left:0,top:20,width:320,height:200}),null);
});

test('runtime uses guarded frames for both canvases and observes recovery from hidden containers',()=>{
 const source=fs.readFileSync(new URL('../../public/flight-map/v9/app.js',import.meta.url),'utf8');
 assert.match(source,/function map\(\)[\s\S]*?mapFrame\(model,visible\(\),box,wrap.clientWidth,wrap.clientHeight\);if\(!frame\)return/);
 assert.match(source,/function drawFull\(\)[\s\S]*?mapFrame\(model,fs,fullBox,wrap.clientWidth,wrap.clientHeight\);if\(!frame\)return/);
 assert.match(source,/mapObserver\?\.observe\(\$\('#mapWrap'\)\)/);assert.match(source,/mapObserver\?\.observe\(\$\('#fullMapCanvas'\)\)/);assert.match(source,/mapObserver\?\.disconnect\(\)/);
 assert.doesNotMatch(source,/model\.body\([^\n]*clientWidth/);
});

// Execute the actual resize dispatcher with controlled DOM dimensions. The small
// map redraw already refreshes fullscreen; one resize must not do that twice.
test('resize dispatcher redraws fullscreen once when either canvas changes',()=>{
 const source=fs.readFileSync(new URL('../../public/flight-map/v9/app.js',import.meta.url),'utf8');
 const body=source.match(/function resizeMaps\(\)\{([\s\S]*?)\n\}/)[1];
 for(const [width,height,lastWidth,lastHeight,opened]of [[320,240,375,260,true],[375,260,375,260,true],[0,0,375,260,true],[320,240,375,260,false]]){
  let small=0,full=0;
  const $=selector=>selector==='#mapWrap'?{clientWidth:width,clientHeight:height}:{open:opened};
  const drawFull=()=>{full++;};
  const map=()=>{small++;if(opened)drawFull();};
  const run=new Function('signal','fitStats','$','lastMapWidth','lastMapHeight','validMapBox','box','map','drawFull',body);
  run({aborted:false},()=>{},$,lastWidth,lastHeight,()=>true,{},map,drawFull);
  assert.equal(full,opened?1:0);assert.equal(small,width>0&&height>0&&(width!==lastWidth||height!==lastHeight)?1:0);
 }
});
