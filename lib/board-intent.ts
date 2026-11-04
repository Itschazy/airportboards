/**
 * Раннее нажатие на SSR-строку, пока Next ещё загружает JavaScript.
 *
 * Воспроизведение: задержать чанки Next, нажать SU112, отпустить чанки. Раньше
 * карточка не открывалась даже после гидратации: до запуска React некому было
 * запомнить событие. Теперь маленький inline-script перед строками хранит только
 * последнее намерение в памяти документа. Он не рисует вторую карточку, не
 * меняет URL/хранилище и не делает запросов. React забирает намерение один раз.
 *
 * Capture + stopPropagation нужны именно ДО готовности табло: иначе при
 * selective hydration тот же click мог бы исполниться и здесь, и через replay
 * React. После первого mount оба обработчика снимаются. Другой клик, клавиша,
 * уход со страницы и минутная давность отменяют отложенное открытие. Фокус
 * остаётся на выбранной строке: preventDefault иначе отменил бы и его, а после
 * закрытия карточки клавиатурный пользователь попадал бы в начало документа.
 */
export const boardIntentBootstrap = String.raw`(function(){
if(window.__abBoardIntent)return;
var s={pending:null};
function clear(){s.pending=null}
function capture(e){
 if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' '){clear();return}
 var row=e.target&&e.target.closest?e.target.closest('[data-board-flight]'):null;
 var board=row&&row.closest('[data-board-intent]');
 if(!board||board.hasAttribute('data-board-ready')){clear();return}
 e.preventDefault();e.stopPropagation();
 row.focus({preventScroll:true});
 s.pending={board:board,key:row.getAttribute('data-board-flight'),url:location.pathname+location.search,at:Date.now(),keyboard:e.type==='keydown'};
}
s.stop=function(){document.removeEventListener('click',capture,true);document.removeEventListener('keydown',capture,true);window.removeEventListener('pagehide',clear)};
document.addEventListener('click',capture,true);document.addEventListener('keydown',capture,true);window.addEventListener('pagehide',clear);
window.__abBoardIntent=s;
})()`;

type Pending = { board: HTMLElement; key: string; url: string; at: number; keyboard: boolean };
declare global {
  interface Window {
    __abBoardIntent?: { pending: Pending | null; stop: () => void };
  }
}

// Номер без времени не уникален: рейс с тем же номером может быть в соседний день.
// JSON остаётся значением React-атрибута, никогда не исполняется и не вставляется в HTML.
export function boardFlightKey(f: { flight: string; ts?: number; scheduled: string }): string {
  return JSON.stringify([f.flight, f.ts ?? null, f.scheduled]);
}

export function claimBoardIntent(board: HTMLElement | null): Pending | null {
  if (!board) return null;
  board.setAttribute('data-board-ready', '');
  const state = window.__abBoardIntent;
  if (!state) return null;
  const pending = state.pending;
  state.stop();
  delete window.__abBoardIntent;
  if (!pending || pending.board !== board || !board.isConnected ||
      pending.url !== location.pathname + location.search ||
      Date.now() - pending.at > 60_000) return null;
  return pending;
}
