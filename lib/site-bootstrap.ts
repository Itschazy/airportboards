/** Тема и избранное до гидратации: String.raw сохраняет экранирование JS.
 * Прежняя обычная template string съедала \ перед кавычкой CSS-селектора,
 * весь inline script падал SyntaxError, включая применение сохранённой темы.
 * Проверка tests/flight-map/bootstrap.test.mjs компилирует именно итоговую
 * строку и выполняет её с обеими темами и избранным. Оформление не меняется.
 */
export const siteBootstrap = String.raw`try{var t=localStorage.getItem('ab_theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}try{var f=JSON.parse(localStorage.getItem('ab_fav')||'[]');var c=[];for(var i=0;i<f.length;i++){var k=f[i]&&f[i].iata;if(typeof k==='string'&&/^[A-Z0-9]{3}$/.test(k))c.push(k)}if(c.length){var r=document.documentElement;r.dataset.fav='1';var st=document.createElement('style');st.textContent=c.map(function(k){return ':root:not([data-hydrated]) .fav-heart[data-iata=\''+k+'\']{color:var(--ab-ff453a)}:root:not([data-hydrated]) .fav-heart[data-iata=\''+k+'\'] svg{fill:currentColor}'}).join('');document.head.appendChild(st)}}catch(e){}`;
