/**
 * Раньше SSR всегда показывал компактную пустую карту. После чтения журнала
 * она вырастала на ~191px (CLS .36 на 375px). Этот маленький parser-time hint
 * резервирует конечную геометрию до первого кадра, не выводя личные данные.
 * Сам журнал по-прежнему валидирует runtime; hint ничего не записывает.
 * Функция самодостаточная: её исходник также используется в inline-script SSR.
 * @param {HTMLElement | null} root
 */
export function applyInitialMapLayout(root){
 if(!root)return;
 let saved=false;
 try{
  const raw=localStorage.getItem('airportsboard-flight-history-v1');
  if(raw&&raw.length<=2000000){const data=JSON.parse(raw);saved=data?.format==='airportsboard-flight-history'&&data.version===1&&Array.isArray(data.flights)&&data.flights.some(f=>f&&/^[A-Z]{3}$/.test(f.from)&&/^[A-Z]{3}$/.test(f.to)&&f.from!==f.to);}
 }catch{/* Закрытое или повреждённое storage обрабатывается основным runtime. */}
 root.dataset.initialHistory=saved||new URLSearchParams(location.search).has('demo')?'yes':'no';
}
export const initialMapLayoutScript='('+applyInitialMapLayout.toString()+')(document.currentScript.previousElementSibling);';
