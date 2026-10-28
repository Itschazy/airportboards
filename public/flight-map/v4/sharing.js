export function createSharing(t,locale){
// Web Share открывает меню ОС, а не конкретную соцсеть. PNG уже готов к tap:
// await подготовки файла потерял бы transient activation в Safari.
// Не отправляем вместе с PNG text/url: некоторые targets подменяют изображение
// ссылкой или не принимают смешанный payload. Подпись копируется отдельно.
const SHARE_URL='https://airportsboard.live/'+locale+'/flight-map';
const INVITE=t("m150");
function canShareImage(nav,file){try{return typeof nav.share==='function'&&!!nav.canShare?.({files:[file]});}catch{return false;}}
function shareImage(nav,file){return nav.share({files:[file],title:t("m001")});}
// Эти официальные URL делятся только приглашением на сервис. Личная история
// живёт в браузере и не превращается в публичную карту по такой ссылке.
// Instagram/Facebook доступны через native chooser, непроверенные URI не выдумываем.
function serviceLinks(){const text=INVITE+'\n'+SHARE_URL;return [
 {name:'Telegram',url:'https://t.me/share/url?'+new URLSearchParams({url:SHARE_URL,text:INVITE})},
 {name:'MAX',url:'https://max.ru/:share?'+new URLSearchParams({text})},
 {name:'WhatsApp',url:'https://wa.me/?'+new URLSearchParams({text})},
 {name:'X / Twitter',url:'https://x.com/intent/tweet?'+new URLSearchParams({text:INVITE,url:SHARE_URL})},
];}

return{SHARE_URL,INVITE,canShareImage,shareImage,serviceLinks};
}
