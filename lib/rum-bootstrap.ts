// До гидратации запоминаем только границы жизненного цикла документа. Иначе поздно
// загруженная библиотека не узнает, что вкладку уже скрывали, и примет фоновый paint
// за пользовательский LCP. Нет сетевых запросов, cookies, таймеров или обхода DOM.
export const rumBootstrap = `(function(){if(window.__abRumGate)return;var g=window.__abRumGate={path:location.pathname,firstHidden:document.visibilityState==='hidden'?0:Infinity,restored:false};document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&g.firstHidden===Infinity)g.firstHidden=performance.now()},{capture:true});window.addEventListener('pageshow',function(e){if(e.persisted)g.restored=true});})();`;
