// Набор приложений — предпочтение человека, не геолокация и не список
// установленных программ. Часовой пояс даёт лишь начальную подсказку; оба
// набора всегда доступны. IP/координаты/сторонние SDK не запрашиваем.
export const REGION_KEY='airportsboard-share-region-v1';
const russianZones=new Set(['Europe/Kaliningrad','Europe/Moscow','Europe/Kirov','Europe/Volgograd','Europe/Astrakhan','Europe/Saratov','Europe/Ulyanovsk','Europe/Samara','Asia/Yekaterinburg','Asia/Omsk','Asia/Novosibirsk','Asia/Barnaul','Asia/Tomsk','Asia/Novokuznetsk','Asia/Krasnoyarsk','Asia/Irkutsk','Asia/Chita','Asia/Yakutsk','Asia/Khandyga','Asia/Vladivostok','Asia/Ust-Nera','Asia/Magadan','Asia/Sakhalin','Asia/Srednekolymsk','Asia/Kamchatka','Asia/Anadyr']);
export function initialShareRegion(saved,zone,locale){
 if(saved==='ru'||saved==='world')return saved;
 if(zone)return russianZones.has(zone)?'ru':'world';
 return locale==='ru'?'ru':'world';
}
export const socialGroups={ru:['telegram','vk','max'],world:['instagram','facebook','threads','x','whatsapp']};
// Локальные векторные знаки: нет SDK, удалённых картинок и запросов к соцсетям
// при открытии панели. Подписи остаются текстом и доступны screen reader.
export const socialApps={
 telegram:{name:'Telegram',color:'#229ed9',icon:'<path d="m4 11 15-6c.8-.3 1.1.2.9 1l-2.5 13c-.1.7-.6.9-1.2.5l-4-3-2 2c-.2.2-.4.3-.7.3l.3-4.2 7.7-7c.3-.3-.1-.4-.5-.2l-9.5 6-4-1.3c-.8-.3-.8-.8.5-1.1Z"/>'},
 vk:{name:'VK',color:'#0077ff',icon:'<path d="M3 6h3.3c.2 4 1.9 5.7 3.2 6V6h3.1v3.5c1.3-.1 3-1.8 3.5-3.5h3.1c-.4 2.2-2.3 4-3.6 4.8 1.3.7 3.4 2.4 4.2 5.2h-3.4c-.6-1.7-2-3-3.8-3.2V16h-.4C6.4 16 3.4 12.8 3 6Z"/>'},
 max:{name:'MAX',color:'#6254f5',icon:'<path fill-rule="evenodd" d="M12 3a9 9 0 0 0-8.1 13L3 21l5-1a9 9 0 1 0 4-17Zm0 4a5 5 0 1 1-2 9.6l-2 .4.4-2A5 5 0 0 1 12 7Z"/>'},
 instagram:{name:'Instagram',color:'#c13584',icon:'<rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1"/>'},
 facebook:{name:'Facebook',color:'#0866ff',icon:'<path d="M13.5 21v-8h2.8l.5-3h-3.3V8c0-.9.4-1.5 1.6-1.5H17V3.8c-.3 0-1.4-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.5V10H7v3h3v8Z"/>'},
 threads:{name:'Threads',color:'#171719',icon:'<path d="M18.7 7.7C17.7 4.7 15.4 3.5 12 3.5c-5.2 0-8 3-8 8.5s2.8 8.5 8 8.5c4.5 0 7.5-2.2 7.5-5.3 0-3.5-3.5-5.1-7.2-4.6-3.8.5-4.5 3.9-1.7 5 3.5 1.3 5.3-1.8 4.7-5.8-.4-2.6-3.7-3.3-5.5-1.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'},
 x:{name:'X',color:'#171719',icon:'<path d="M5 4h4l10 16h-4L5 4Zm0 16L19 4" fill="none" stroke="currentColor" stroke-width="1.7"/>'},
 whatsapp:{name:'WhatsApp',color:'#128c52',icon:'<path d="M20 11.5a8 8 0 0 1-12 7L3.5 20l1.3-4.4A8 8 0 1 1 20 11.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 7.5c-.9.5-1 1.5-.4 2.9 1 2.3 2.5 3.8 4.9 4.8 1.4.6 2.4.3 2.9-.6l.3-.9-2.5-1.2-.8 1c-1.5-.7-2.5-1.7-3.2-3.1l1-.8-1.2-2.5Z"/>'},
};
export const moreIcon='<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>';
