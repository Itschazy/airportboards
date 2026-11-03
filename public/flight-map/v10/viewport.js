import {resizeBox} from '../v5/state.js';

// Скрытый/размонтируемый контейнер и промежуточная раскладка могут иметь 0 px.
// Раньше width/height=0 попадал в fit, а body делил на width: Infinity сохранялся
// в box и переживал следующий нормальный resize. Воспроизведено при временной
// ширине DevTools 1 px (это не утверждение о поломке нормального экрана 320 px).
// Ничего не рисуем до измеримого кадра; после появления восстанавливаем fit
// для повреждённого/первого box, но сохраняем zoom и центр корректного box.
export const validMapBox=box=>!!box&&['x','y','w','h','c'].every(k=>Number.isFinite(box[k]))&&box.w>0&&box.h>0;
export function mapFrame(model,flights,box,width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 const ratio=width/height;if(!Number.isFinite(ratio)||ratio<=0)return null;
 const next=validMapBox(box)?resizeBox(box,ratio):model.fit(flights,ratio);
 return validMapBox(next)?{box:next,width,height}:null;
}
export function viewportPoint(event,rect){
 if(!rect||!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<=0||rect.height<=0)return null;
 const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
 return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
}
