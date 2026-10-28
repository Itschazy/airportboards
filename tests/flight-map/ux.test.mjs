import test from 'node:test';
import assert from 'node:assert/strict';
import {createJournalSearch} from '../../public/flight-map/v3/journal.js';
import {gestureBox} from '../../public/flight-map/v3/gestures.js';

test('journal searches city, code, number and date without changing stored order or full history',()=>{
 const airports={CEK:{city:'Челябинск'},AYT:{city:'Анталья'},CDG:{city:'Paris'},NCE:{city:'Nice'}};
 const flights=[{id:'a',from:'CEK',to:'AYT',number:'SU 123',date:''},{id:'b',from:'CDG',to:'NCE',number:'AF23',date:'2025-01-05'}];
 const before=JSON.stringify(flights),search=createJournalSearch(flights,airports);
 for(const query of ['чел','CEK','SU123','su 123','чел ант'])assert.deepEqual(search(query).map(f=>f.id),['a']);
 assert.deepEqual(search('2025').map(f=>f.id),['b']);assert.equal(search('<script>').length,0);
 assert.deepEqual(search('').map(f=>f.id),['b','a']);assert.equal(JSON.stringify(flights),before);
});

test('gesture preserves the map point under the pinch midpoint and supports translation',()=>{
 const box={x:100,y:200,w:800,h:400,c:500};
 const start=[{x:.25,y:.5},{x:.75,y:.5}],current=[{x:.1,y:.4},{x:1.1,y:.4}];
 const next=gestureBox(box,start,current);
 assert.equal(next.w,400);assert.equal(next.h,200);assert.equal(next.c,500);
 assert.ok(Math.abs(next.x+.6*next.w-(box.x+.5*box.w))<1e-8);
 assert.ok(Math.abs(next.y+.4*next.h-(box.y+.5*box.h))<1e-8);
 const pan=gestureBox(next,[{x:.3,y:.4}],[{x:.4,y:.5}]);
 assert.equal(pan.w,next.w);assert.ok(Math.abs(pan.x-next.x+40)<1e-8);
});

test('zoom limits remain finite; stationary/mismatched pointers do not jump the map',()=>{
 const box={x:0,y:0,w:800,h:400,c:500};
 assert.deepEqual(gestureBox(box,[],[]),box);
 assert.deepEqual(gestureBox(box,[{x:0,y:0}],[]),box);
 assert.deepEqual(gestureBox(box,[{x:.5,y:.5},{x:.5,y:.5}],[{x:.5,y:.5},{x:.5,y:.5}]),box);
 const min=gestureBox(box,[{x:0,y:0},{x:.01,y:0}],[{x:0,y:0},{x:1,y:0}]);assert.equal(min.w,60);
 const max=gestureBox(box,[{x:0,y:0},{x:1,y:0}],[{x:0,y:0},{x:.01,y:0}]);assert.equal(max.w,1500);
 const wide={...box,w:1800};
 assert.equal(gestureBox(wide,[{x:0,y:0},{x:1,y:0}],[{x:0,y:0},{x:.96,y:0}]).w,1800);
 assert.ok(Math.abs(gestureBox(wide,[{x:0,y:0},{x:1,y:0}],[{x:0,y:0},{x:1.1,y:0}]).w-1800/1.1)<1e-8);assert.equal(gestureBox(wide,[{x:0,y:0}],[{x:.1,y:0}]).w,1800);
});
