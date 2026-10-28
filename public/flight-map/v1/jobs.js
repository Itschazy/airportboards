// PNG держит большой canvas. Быстрые переключения не должны создавать несколько
// canvas одновременно: выполняется одна задача и только последнее ожидание.
// Закрытие диалога обесценивает результат, даже если decode уже нельзя отменить.
export function latestJob({run,done,error}){
 let revision=0,pending=null,running=false;
 async function drain(){if(running)return;running=true;
  try{while(pending){const job=pending;pending=null;
   try{const result=await run(job.value,()=>job.revision===revision);if(job.revision===revision)done(result,job.value);}
   catch(e){if(job.revision===revision)error(e);}
  }}finally{running=false;}
 }
 return {push(value){pending={value,revision:++revision};void drain();},cancel(){revision++;pending=null;}};
}
