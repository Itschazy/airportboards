// Координаты пальцев — доли видимой области. При pinch точка между пальцами
// остаётся под их центром. Изменяем только viewBox; SVG пересобирается после
// жеста, чтобы слабый телефон не разбирал береговую линию на каждом pointermove.
export function gestureBox(box,start,current){
 if(!start.length||start.length!==current.length)return box;
 const middle=ps=>ps.reduce((a,p)=>({x:a.x+p.x/ps.length,y:a.y+p.y/ps.length}),{x:0,y:0});
 const a=middle(start),b=middle(current);
 let scale=1;
 if(start.length===2){const distance=ps=>Math.hypot((ps[1].x-ps[0].x)*box.w,(ps[1].y-ps[0].y)*box.h);const old=distance(start),now=distance(current);if(old>0&&now>0)scale=old/now;}
 // Широкий fit на горизонтальном экране может превышать обычный zoom-out.
 // Первый pinch не должен прыгать к 1500 и менять направление жеста.
 const w=scale===1?box.w:Math.min(Math.max(1500,box.w),Math.max(60,box.w*scale)),h=box.h*w/box.w;
 return {...box,x:box.x+a.x*box.w-b.x*w,y:box.y+a.y*box.h-b.y*h,w,h};
}
