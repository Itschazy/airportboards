import { getTranslations } from 'next-intl/server';
import { locales, localeNames, rtlLocales, type Locale } from '@/lib/i18n';

/**
 * Ряд ссылок на ЭТУ ЖЕ страницу в остальных одиннадцати языках.
 *
 * Зачем он есть. До 28.10.2026 такие ссылки отдавало выпавшее меню языков в шапке: оно
 * рисовалось в серверном HTML всегда, а скрывалось стилем, поэтому обходчик видел с любой
 * внутренней страницы все двенадцать её версий. Когда выбор языка переехал на /settings,
 * меню ушло, и замер показал пропажу ровно двенадцати адресов на каждой внутренней
 * странице — например, /de/airport/KZN на странице /ru/airport/KZN.
 *
 * Чего НЕ хватило взамен. Адреса остались в <link rel="alternate" hreflang>, но hreflang
 * сообщает поиску, какую версию ПОКАЗАТЬ, и не работает ни как средство обнаружения, ни
 * как перенос веса ссылки (то же написано у языкового ряда в SiteFooter). Подвал же ведёт
 * на КОРНИ локалей: с /ru/airport/KZN он отправлял на /de, а не на /de/airport/KZN.
 *
 * Почему это компонент страницы, а не подвала. Подвал рисуется раскладкой, а раскладка в
 * App Router своего адреса не знает. Узнать его можно только заголовком запроса из
 * middleware — и тогда КАЖДАЯ страница сайта стала бы динамической, то есть пришлось бы
 * отдать ISR ради одного ряда ссылок. Страница свой путь знает и так: она уже строит из
 * него карту hreflang в generateMetadata. Поэтому путь приходит пропсом, а ряд встаёт
 * последним элементом содержимого — прямо над подвалом.
 *
 * @param path  путь ПОСЛЕ кода языка, с ведущей косой чертой: `/airport/KZN`
 * @param only  языки, у которых эта страница есть (событие переведено не везде);
 *              по умолчанию все двенадцать
 */
export async function LocaleLinks({ locale, path, only }: {
  locale: Locale;
  path: string;
  only?: readonly string[];
}) {
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const list = only ? locales.filter(l => only.includes(l)) : locales;
  // Одна ссылка — это ссылка на саму себя, и ряда из неё не бывает.
  if (list.length < 2) return null;

  return (
    <nav className="page-langs" aria-label={tNav('language')}>
      {list.map(loc => (
        <a
          key={loc}
          href={`/${loc}${path}`}
          hrefLang={loc}
          // lang и dir на самой ссылке: «العربية» внутри русской страницы иначе читается
          // программой чтения с экрана правилами русского языка, а без dir арабское слово
          // встраивается в поток слева направо.
          lang={loc}
          dir={rtlLocales.includes(loc) ? 'rtl' : 'ltr'}
          className={loc === locale ? 'foot-chip foot-chip--current' : 'foot-chip'}
          aria-current={loc === locale ? 'true' : undefined}
        >
          {localeNames[loc]}
        </a>
      ))}
    </nav>
  );
}
