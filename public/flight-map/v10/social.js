// По уточнению владельца набор определяется ТОЛЬКО текущим языком сайта.
// Часовой пояс и сохранённый ранее выбор больше не участвуют: русская страница
// всегда показывает Telegram/VK/MAX, остальные 11 — международные приложения.
export function socialGroupForLocale(locale){return locale==='ru'?'ru':'world';}
export const socialGroups={ru:['telegram','vk','max'],world:['instagram','facebook','threads','x','whatsapp']};
// Оригинальные опубликованные знаки, локальные оптимизированные копии.
// Происхождение, контрольные суммы и лицензия VK — ops/social-share-20261103.
// Файлы создаются в DOM только при открытии экспорта: первый экран карты
// не делает восемь лишних запросов. Имя приложения остаётся доступным текстом.
export const socialApps=Object.fromEntries([
 ['telegram','Telegram'],['vk','VK'],['max','MAX'],['instagram','Instagram'],
 ['facebook','Facebook'],['threads','Threads'],['x','X'],['whatsapp','WhatsApp']
].map(([id,name])=>[id,{name,src:'/flight-map/brands-v3/'+id+'.webp'}]));
export const moreIcon='<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>';
