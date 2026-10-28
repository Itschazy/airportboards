// Сравниваем факты, а не ссылки: store.read валидирует и создаёт новые объекты.
// Порядок тоже важен для журнала и быстрых маршрутов. При изменении записи
// в другой вкладке следующий sync обязан обновить интерфейс.
export function sameFlights(a,b){return a.length===b.length&&a.every((f,i)=>['id','from','to','date','number'].every(k=>f[k]===b[i][k]));}
// Пропорции меняются без fit: масштаб и географический центр остаются прежними.
export function resizeBox(box,ratio){if(!box||!Number.isFinite(ratio)||ratio<=0)return box;const h=box.w/ratio;return {...box,y:box.y+(box.h-h)/2,h};}
