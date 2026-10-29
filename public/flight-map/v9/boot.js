import {mount} from './app.js';

// До v7 готовые данные ждали ещё ~0.9 с общей гидратации Next на Slow 4G.
// SSR запускает тот же DOM-остров раньше. React затем принимает его жизненный
// цикл, не монтируя повторно и не заменяя личный журнал. WeakMap принадлежит
// единственному ESM; abort и удаление записи позволяют безопасный возврат назад.
export function createBoot(mountMap){
 const sessions=new WeakMap();
 function boot(root){
  if(!root)return null;
  const existing=sessions.get(root);if(existing)return existing;
  const {locale,messages}=JSON.parse(root.dataset.mapConfig);
  const controller=new AbortController();let consumer=null,queue=[];
  const session={
   attachTrack(fn){consumer=fn;const pending=queue;queue=[];for(const args of pending)fn(...args);},
   dispose(){controller.abort();queue=[];if(sessions.get(root)===session)sessions.delete(root);},
   ready:null,
  };
  sessions.set(root,session);
  session.ready=Promise.resolve().then(()=>controller.signal.aborted?undefined:mountMap(root,{locale,messages,signal:controller.signal,track:(...args)=>{if(controller.signal.aborted)return;if(consumer)consumer(...args);else if(queue.length<20)queue.push(args);}})).catch(()=>{
   if(controller.signal.aborted)return;
   root.removeAttribute('aria-busy');
   const status=root.querySelector('#storageStatus');if(status)status.textContent=String(messages.loadError);
   const retry=document.createElement('a');retry.href=`/${locale}/flight-map`;retry.dataset.retry='true';retry.textContent=String(messages.retry);status?.after(retry);
  });
  return session;
 }
 return {boot,stop(root){sessions.get(root)?.dispose();}};
}
export const {boot,stop}=createBoot(mount);
