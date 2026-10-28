import type copy from './ru.json';

const escape=(s: string)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
const arrow='<svg class="srow-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5"/></svg>';
// Native details keeps content in initial HTML, even with failed JS or a slow
// airport catalogue. It is an explanation people can open, not hidden keyword text.
export function renderInfo(c: typeof copy,{expanded=false}={}){return `<section class="flight-map-info" aria-label="${escape(c.summary)}"><div class="sg"><details class="sdet"${expanded?' open':''}><summary><span class="srow-t">${escape(c.summary)}</span>${arrow}</summary><div class="sdet-body"><p>${escape(c.intro)}</p><h2>${escape(c.stepsHeading)}</h2><ol>${c.steps.map(s=>`<li>${escape(s)}</li>`).join('')}</ol><h2>${escape(c.faqHeading)}</h2>${c.faq.map((f,i)=>`<details class="sdet" id="flight-map-question-${i+1}"><summary><span class="srow-t">${escape(f.question)}</span>${arrow}</summary><div class="sdet-body"><p>${escape(f.answer)}</p></div></details>`).join('')}</div></details></div></section>`;}
