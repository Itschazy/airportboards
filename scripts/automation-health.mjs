// Нулевой пустой тик IndexNow исправен; свежий отказ нельзя скрыть старой доставкой.
export function deliveryHealth(state) {
  const runs=state.runs??[];
  const last=runs.at(-1);
  const accepted=runs.slice(-5).reduce((n,r)=>n+(r.accepted??r.ok??r.n??0),0);
  const failed=runs.slice(-5).reduce((n,r)=>n+(r.failed??r.fail??0),0);
  const lastAccepted=last?.accepted??last?.ok??last?.n??0;
  const lastFailed=last?.failed??last?.fail??0;
  const idle=state.version===2 && last?.pending===0 && lastFailed===0;
  return {accepted,failed,idle,ok:!!last && lastFailed===0 && (lastAccepted>0 || idle)};
}
