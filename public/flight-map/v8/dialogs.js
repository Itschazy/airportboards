// dialog.close() синхронен, но close/popstate приходят позже. Раньше быстрый
// следующий tap открывал share до history.back() формы; поздний popstate
// закрывал уже share. Дожидаемся снятия старой записи и только затем открываем
// следующее окно, вместе с его фокусом/экспортом. Back по-прежнему закрывает sheet.
export function createDialogHistory({history,dialogs,onOpen,onClose,aborted=()=>false}){
 let returning=false,afterClose=null;
 function open(d,ready=()=>{}){
  if(aborted()||d.open)return;
  if(returning){afterClose=()=>open(d,ready);return;}
  history.pushState({...history.state,abDialog:d.id},'',history.url());
  d.dataset.history='1';d.showModal();onOpen();ready();
 }
 function close(d,next=null){
  afterClose=next;
  if(d.open&&d.dataset.history&&history.state?.abDialog===d.id)returning=true;
  d.close();
 }
 function closed(d){
  if(aborted())return;onClose();
  if(d.dataset.history&&history.state?.abDialog===d.id){delete d.dataset.history;returning=true;history.back();}
 }
 function pop(){
  if(aborted())return;
  for(const d of dialogs().filter(d=>d.open)){delete d.dataset.history;d.close();}
  returning=false;const next=afterClose;afterClose=null;next?.();
 }
 return {open,close,closed,pop};
}
