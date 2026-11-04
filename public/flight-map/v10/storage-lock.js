// localStorage атомарен только для ОДНОГО getItem/setItem, а не для их пары.
// Старый Promise.resolve().then(run) без Web Locks позволял двум вкладкам
// подтвердить сохранение и потерять одну правку (worker repro 03.11.2026).
// Резерв: readwrite-транзакции одного IndexedDB object store сериализуются
// между соединениями/вкладками (IndexedDB §2.7.2). Сам журнал остаётся в прежнем
// localStorage: никаких миграций, копий перелётов или задержки первого чтения.
// run — строго синхронная критическая секция; вызываем её в success запроса,
// когда транзакция уже получила доступ. Асинхронные задачи внутри запрещены.
export function withHistoryLock(key,run,failure){
 const locks=globalThis.navigator?.locks;
 if(locks)return locks.request(key,run);
 return new Promise((resolve,reject)=>{
  let db,tx,settled=false,result;
  const finish=(error)=>{
   if(settled)return;settled=true;clearTimeout(timer);
   if(error&&tx)try{tx.abort();}catch{}
   db?.close();
   if(error)reject(error);else resolve(result);
  };
  // Если браузер не завершает open, не оставляем кнопку навечно занятой
  // и не допускаем отложенную запись ПОСЛЕ показанной ошибки.
  const timer=setTimeout(()=>finish(failure()),8000);
  try{
   const request=globalThis.indexedDB.open(`${key}-lock`,1);
   request.onupgradeneeded=()=>{
    if(settled){request.transaction.abort();return;}
    request.result.createObjectStore('mutex');
   };
   request.onblocked=request.onerror=()=>finish(failure());
   request.onsuccess=()=>{
    db=request.result;
    if(settled){db.close();return;}
    db.onversionchange=()=>finish(failure());
    try{
     tx=db.transaction('mutex','readwrite');
     tx.oncomplete=()=>finish();
     tx.onabort=tx.onerror=()=>finish(failure());
     const entry=tx.objectStore('mutex').get(key);
     entry.onsuccess=()=>{
      if(settled)return;
      try{result=run();}catch(error){finish(error);}
     };
    }catch{finish(failure());}
   };
  }catch{finish(failure());}
 });
}
