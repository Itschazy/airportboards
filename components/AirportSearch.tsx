'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { track, GOALS } from '@/lib/track';
import { prepareQuick, quickSearch, prioritizeQuick, type AirportSuggestion, type QuickTuple } from '@/lib/quick-search';

type Result = AirportSuggestion;

const RECENT_KEY = 'ab_recent';
const MAX_RECENT = 5;

const flag = (iso2: string) => {
  if (!iso2 || iso2.length !== 2) return '';
  return [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
};

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  const end = idx + q.length;
  // Guard against case-fold width mismatches (ß→ss, İ/i, etc.) corrupting the slice.
  if (text.slice(idx, end).toLowerCase() !== q.toLowerCase()) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--ab-ffffff)', fontWeight: 700 }}>{text.slice(idx, end)}</span>
      {text.slice(end)}
    </>
  );
}

function getRecent(): Result[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function saveRecent(a: Result) {
  try {
    const prev = getRecent().filter(r => r.iata !== a.iata);
    localStorage.setItem(RECENT_KEY, JSON.stringify([a, ...prev].slice(0, MAX_RECENT)));
  } catch {}
}

// Стабильный тип компонента сохраняет DOM строк при вводе следующей буквы.
// Вложенный Section раньше пересоздавался на каждом render и размонтировал кнопки.
function SearchSection({ label, items, startIndex = 0, active, query, pending = false, go, setActive }: {
  label: string; items: Result[]; startIndex?: number; active: number; query: string;
  pending?: boolean; go: (airport: Result) => void; setActive: (index: number) => void;
}) {
  return (
    <>
      <div style={{
        padding: '8px 14px 4px',
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em',
        color: 'var(--ab-8a8a8a)',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {items.map((a, i) => {
        const globalIdx = startIndex + i;
        const isActive = !pending && active === globalIdx;
        return (
          <button
            key={a.iata}
            // onMouseDown СОХРАНЁН: он срабатывает до blur и до того, как экранная
            // клавиатура сдвинет вёрстку. Но на нативной кнопке Enter и Space дают
            // click, а не mousedown, — то есть выбор с клавиатуры по этой ветке не
            // работал вовсе. Двойного срабатывания нет: mousedown уже уводит на
            // страницу, и click по исчезнувшей кнопке не приходит.
            id={`ap-opt-${globalIdx}`}
            role="option"
            aria-selected={isActive}
            disabled={pending}
            onMouseDown={() => go(a)}
            onClick={() => go(a)}
            onMouseEnter={() => setActive(globalIdx)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center',
              gap: 12,
              padding: '13px 16px',
              border: 'none',
              borderBottom: i < items.length - 1 ? '1px solid rgba(var(--ab-ink),0.06)' : 'none',
              // Подсветка строки — полупрозрачная краска по стеклу, а не плашка
              // цвета --ab-1c1c1e: непрозрачный прямоугольник внутри стеклянной выдачи
              // читался заплаткой и спорил с её собственной заливкой.
              background: isActive ? 'rgba(var(--ab-ink),0.09)' : 'transparent',
              color: 'var(--ab-ffffff)',
              cursor: pending ? 'progress' : 'pointer',
              textAlign: 'start',
              transition: 'background 0.1s',
            }}
          >
            {/* Flag */}
            <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center', lineHeight: 1 }}>
              <span className="locale-flag">{flag(a.iso2)}</span>
            </span>

            {/* IATA */}
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ab-0a84ff)', flexShrink: 0, width: 38, letterSpacing: '-0.02em' }}>
              {highlight(a.iata, query)}
            </span>

            {/* Город и название — в одну строку, а не столбиком: строка выдачи
                вдвое ниже, и на экран помещается вдвое больше аэропортов.
                Название приглушено и сжимается первым, город не обрезается. */}
            <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8, overflow: 'hidden' }}>
              <span style={{ fontSize: 16, color: 'var(--ab-e4e4e7)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {highlight(a.city, query)}
              </span>
              <span className="srch-name" style={{ fontSize: 13, color: 'var(--ab-6a6a6a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                {highlight(a.name, query)}
              </span>
            </span>
          </button>
        );
      })}
    </>
  );
}

export function AirportSearch({ locale, placeholder }: { locale: string; placeholder: string }) {
  const tNav = useTranslations('nav');
  const [query, setQuery]     = useState('');
  const [response, setResponse] = useState<{ query: string; locale: string; airports: Result[]; failed?: boolean } | null>(null);
  // Результаты принадлежат конкретному запросу: даже до запуска effect старый
  // список нельзя выбрать быстрым Enter или касанием после изменения поля.
  const [bootstrap, setBootstrap] = useState<{ locale: string; index: ReturnType<typeof prepareQuick> } | null>(null);
  const cache = useRef(new Map<string, Result[]>());
  const currentQuery = query.trim();
  const cacheKey = `${locale}:${currentQuery.toLowerCase()}`;
  const isCurrent = response?.query === currentQuery && response.locale === locale;
  const cached = cache.current.get(cacheKey);
  const quick = bootstrap?.locale === locale ? quickSearch(bootstrap.index, currentQuery) : [];
  // Полный ответ всегда главнее предварительных совпадений, даже когда он пустой.
  // До него разрешён выбор только проверенного совпадения с текущим вводом.
  const results = isCurrent ? (response.failed ? quick : prioritizeQuick(response.airports, quick))
    : cached ? prioritizeQuick(cached, quick) : quick;
  // Если быстрый словарь не покрывает запрос, сохраняем прежний плавный переход.
  // При уточнении «чел» → «челя» раньше results=[] убирал весь список на debounce
  // и сетевой round-trip. Сохраняем прежние строки до ответа, но временно запрещаем
  // их выбор и сообщаем aria-busy. Enter по-прежнему использует только results.
  // Для другого запроса/языка подсказки не переносим. Пустой ответ или ошибка сети
  // завершает ожидание и убирает прежние строки. Проверено check-search-race.
  const pending = !isCurrent && !cached && results.length === 0 && !!currentQuery && !!response?.query && response.locale === locale && (
    currentQuery.toLowerCase().startsWith(response.query.toLowerCase()) ||
    response.query.toLowerCase().startsWith(currentQuery.toLowerCase())
  );
  const visibleResults = pending ? response.airports : results;
  const [recent, setRecent]   = useState<Result[]>([]);
  const [open, setOpen]       = useState(false);
  const [active, setActive]   = useState(-1);
  const [focused, setFocused] = useState(false);
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // Запроса геолокации здесь БОЛЬШЕ НЕТ, и это осознанно.
  //
  // Он висел в useEffect с пустыми зависимостями, то есть браузер спрашивал разрешение на
  // доступ к местоположению СРАЗУ при загрузке главной — без единого действия человека и до
  // того, как тот вообще понял, куда попал. Диалог разрешения, показанный без спроса, стоит
  // доверия дороже, чем стоила выгода: подсказка «ближайшие аэропорты» в выпадашке поиска.
  //
  // Выгода при этом почти нулевая по устройству трафика: люди приходят из поиска сразу на
  // страницу нужного аэропорта, а не на главную. Замер по Яндекс.Вебмастеру: 99 382 показа,
  // и практически все запросы вида «онлайн табло аэропорт ‹город›» — человек уже знает, какой
  // аэропорт ему нужен, и подбирать ему ближайший по координатам незачем.
  //
  // Вместе с запросом убраны раздел «ближайшие» в выпадашке и маршрут /api/airports/nearest,
  // у которого этот компонент был единственным потребителем.

  // Раньше каждый символ требовал нового сетевого round-trip (0.65–1.2с в замере),
  // а изменение query отменяло даже подготовку популярных подсказок. Компактный
  // словарь загружается один раз независимо от ввода; до его готовности работает
  // прежний API. В клиентский JS большой каталог и алиасы не входят.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/airports/search?locale=${locale}&bootstrap=1`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('Search bootstrap'); return res.json(); })
      .then(data => {
        if (!controller.signal.aborted) setBootstrap({ locale, index: prepareQuick((data.quick || []) as QuickTuple[]) });
      }).catch(() => { /* Полный поиск остаётся доступным при ошибке словаря. */ });
    return () => controller.abort();
  }, [locale]);

  // Полный поиск сохраняет опечатки/алиасы/редкие аэропорты. Отмена и query+locale
  // не дают старому ответу заменить новый. Последние 32 успешных ответа хранятся
  // только в памяти компонента: возврат к запросу не требует ещё одного RTT,
  // а неограниченный пользовательский ввод не раздувает память телефона.
  useEffect(() => {
    if (!open || !currentQuery || cache.current.has(cacheKey)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(currentQuery)}&locale=${locale}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
        const data = await res.json();
        if (!controller.signal.aborted) {
          const airports = data.airports || [];
          cache.current.set(cacheKey, airports);
          if (cache.current.size > 32) cache.current.delete(cache.current.keys().next().value!);
          setResponse({ query: currentQuery, locale, airports });
          setActive(-1);
        }
      } catch {
        // При недоступной сети оставляем проверенные локальные совпадения;
        // устаревшую выдачу другого запроса показывать/выбирать нельзя.
        if (!controller.signal.aborted) setResponse({ query: currentQuery, locale, airports: [], failed: true });
      }
    }, 100);
    return () => { clearTimeout(timer); controller.abort(); };
    // quick не зависимость: загрузка словаря не должна перезапускать текущий запрос.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuery, open, locale, cacheKey]);

  // Close on outside click
  useEffect(() => {
    const h = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  const onFocus = useCallback(() => {
    setRecent(getRecent());
    setFocused(true);
    setOpen(true);
  }, []);

  const onBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const go = (a: Result) => {
    track(GOALS.searchPick);
    saveRecent(a);
    router.push(`/${locale}/airport/${a.iata}`);
    setOpen(false);
    setQuery('');
  };

  // На пустом поле показываем ТОЛЬКО то, что человек искал сам: популярные
  // аэропорты закрывали половину экрана ещё до первой буквы. Истории нет —
  // список не раскрывается вовсе.
  const seen = new Set<string>();
  const recentF = recent.filter(a => !seen.has(a.iata) && seen.add(a.iata));
  const emptyFlat = recentF;
  const navList = query.trim() ? results : emptyFlat;

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v => Math.min(v + 1, navList.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      // A flight number used to route to /flight/<CODE>. That page can never resolve — it
      // reads a store key nothing writes — so the site's main search box was taking anyone
      // who typed "BA175" straight to a dead end. Flight numbers now fall through to the
      // normal airport matching rather than being special-cased into nothing.
      const item = active >= 0 ? navList[active] : navList[0];
      if (item) go(item);
    }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };


  /* Подсказка, которая печатается сама.
   *
   * Настоящий placeholder НИКУДА НЕ ДЕВАЕТСЯ: он остаётся в разметке полной фразой,
   * его читает программа чтения с экрана, он же работает без скриптов. Анимация —
   * отдельная строка поверх поля, помеченная aria-hidden, а сам placeholder на время
   * анимации делается прозрачным стилем. Подменять атрибут посимвольно нельзя: каждое
   * изменение placeholder программа чтения объявляет заново, и поле «говорило» бы
   * без умолку.
   *
   * Крутится, только пока поле пустое и не в фокусе. Как только человек нажал на поле,
   * анимация останавливается: мигающая чужая строка рядом с собственным курсором сбивает.
   *
   * prefers-reduced-motion: анимации нет вовсе, видна обычная подсказка. Это не
   * украшение, от которого можно отмахнуться, — печатающийся текст относится ровно к
   * тому роду движения, от которого людям с вестибулярными расстройствами плохо.
   */
  /* ПРИМЕРЫ, а не названия видов. «Аэропорт · Город · Код ИАТА» называет виды
   * того, что принимает поиск, но не показывает, как это выглядит набранным.
   * «Казань · Шереметьево · KZN» показывает ровно те же три вида и заодно
   * снимает главный вопрос — «а код-то трёхбуквенный или четырёх?».
   *
   * Все 108 примеров (девять на каждом из двенадцати языков) проверены настоящим
   * поиском: подсказка,
   * которая ничего не находит, хуже отсутствия подсказки. На этой проверке отсеялись
   * 首都 (находит Гаррисберг в США), حمد (Ахмадабад) и немецкий Tegel — он закрыт.
   * Первым всюду стоит город: по замеру Метрики именно с города начинают.
   */
  const typeWords = useMemo(
    // Девять примеров, а не три, и идут они ПО КРУГУ вида: город → название
    // аэропорта → код, и так трижды. Сгруппированные по виду (три города подряд,
    // потом три названия) они читались как перечень городов: человек, глянувший
    // на поле дважды, видел два города и решал, что кроме городов ничего нельзя.
    // Чередование показывает все три вида ввода за первые секунды, а трёх кругов
    // хватает примерно на минуту — короткий круг превращался в мигающую надпись.
    () => Array.from({ length: 9 }, (_, i) => tNav(`ph_ex${i + 1}` as 'ph_ex1')),
    [tNav],
  );
  const [typed, setTyped] = useState('');
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (query || focused) { setTyping(false); setTyped(''); return; }
    try {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch { return; }

    let word = 0, ch = 0, erasing = false, timer: ReturnType<typeof setTimeout>;
    setTyping(true);

    const step = () => {
      const w = typeWords[word % typeWords.length] || '';
      if (!erasing) {
        ch++;
        setTyped(w.slice(0, ch));
        // Добрав слово до конца, держим его на полторы секунды: подсказку надо
        // успеть прочитать, а не поймать взглядом.
        timer = setTimeout(step, ch >= w.length ? 1500 : 85);
        if (ch >= w.length) erasing = true;
      } else {
        ch--;
        setTyped(w.slice(0, Math.max(0, ch)));
        if (ch <= 0) { erasing = false; word++; timer = setTimeout(step, 320); }
        else timer = setTimeout(step, 40);   // стирается вдвое быстрее, чем пишется
      }
    };
    // Начинаем сразу, без паузы: пауза в полсекунды читалась как «сначала одна
    // подсказка, потом вдруг другая», то есть ровно как подгрузка. Первый кадр
    // анимации приходит в том же такте, что и гидратация.
    timer = setTimeout(step, 0);
    return () => { clearTimeout(timer); setTyping(false); };
  }, [query, focused, typeWords]);

  const showList = open && (query.trim() ? visibleResults.length > 0 : emptyFlat.length > 0);

  /* Предзагрузка выбранной строки.
   *
   * Замер: сама страница аэропорта отдаётся за 5–370 мс, то есть сервер тут ни при чём.
   * Долгой навигация была потому, что строки выдачи — обычные <button> с router.push, а
   * Next подгружает маршрут заранее только у <Link>. Значит, вся RSC-нагрузка страницы
   * (для KZN это 151 КБ) начинала качаться ТОЛЬКО в момент нажатия, и на телефоне это
   * заметная пауза ещё до того, как страница начнёт рисоваться.
   *
   * Греем РОВНО ОДИН адрес — тот, что под курсором или под стрелкой, а при открытии
   * выдачи первый в списке. Греть всю выдачу нельзя: десять строк это полтора мегабайта
   * у человека, который выберет одну.
   *
   * Денег это не стоит: предзагружается страница, а она рендерится с live:false и к
   * поставщику не ходит (см. lib/flights.ts). Платный запрос делает уже само табло
   * после открытия.
   *
   * Проверки navigator.connection здесь НЕТ, хотя на медленной связи она была бы
   * кстати: Safari считает Network Information API отпечатком браузера и при
   * включённой расширенной защите показывает поверх страницы своё предупреждение.
   * Ради одного необязательного условия пугать читателя не стоит; греется и так
   * ровно один адрес.
   */
  const warmed = useRef(new Set<string>());
  useEffect(() => {
    if (!showList) return;
    const pick = navList[active] ?? navList[0];
    if (!pick) return;
    const href = `/${locale}/airport/${pick.iata}`;
    if (warmed.current.has(href)) return;
    warmed.current.add(href);
    router.prefetch(href);
  }, [showList, active, navList, locale, router]);




  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        {/* Лупа 24px вместо 19: на стеклянном поле тонкий мелкий значок терялся
            в узоре, просвечивающем сквозь линзу. Толщина штриха поднята до 1.7 по
            той же причине — 1.5 на 24px выглядит тоньше, чем 1.5 на 19. */}
        <svg
          width="24" height="24" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          style={{ position: 'absolute', insetInlineStart: 20, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
        >
          <circle cx="6.5" cy="6.5" r="4" stroke={focused ? 'var(--ab-e4e4e7)' : 'var(--ab-8a8a8a)'} strokeWidth="1.7"/>
          <path d="M10 10L13.5 13.5" stroke={focused ? 'var(--ab-e4e4e7)' : 'var(--ab-8a8a8a)'} strokeWidth="1.7" strokeLinecap="round"/>
        </svg>

        {/* Договор роли combobox выполняется целиком: aria-controls указывает на список,
            aria-activedescendant — на строку под выделением. Раньше роль была объявлена, а
            списка с ролью listbox и строк с ролью option не существовало: программа чтения
            слышала «поле со списком» и не находила списка. */}
        {/* Строка набора. Левый отступ совпадает с padding-inline поля, кегль — с его
            собственным, иначе буквы «прыгнут» в момент, когда человек начнёт печатать. */}
        {typing && (
          <span className="srch-typer" aria-hidden="true">
            {typed}<i className="srch-caret" />
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={placeholder}
          aria-expanded={showList}
          aria-autocomplete="list"
          aria-controls="ap-listbox"
          aria-activedescendant={active >= 0 ? `ap-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setActive(-1); setOpen(true); }}
          onKeyDown={onKey}
          onFocus={onFocus}
          onBlur={onBlur}
          data-typing={typing || undefined}
          className="search-pill search-lens"
        />

        {query && (
          <button
            type="button"
            aria-label={tNav('clear')}
            // mousedown не вызывается при Enter/VoiceOver. Очистка должна работать
            // через стандартный click; preventDefault сохраняет фокус при касании.
            onMouseDown={e => e.preventDefault()}
            onClick={() => { setQuery(''); setActive(-1); inputRef.current?.focus(); }}
            style={{
              position: 'absolute', insetInlineEnd: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 1,
              background: 'transparent', border: 'none', borderRadius: '50%',
              width: 44, height: 44, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ padding: 9, background: 'var(--ab-2c2c2e)', borderRadius: '50%' }}>
              <path d="M1 1L9 9M9 1L1 9" stroke="var(--ab-8a8a8a)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showList && (
        // role="listbox" и id: роль combobox на поле была объявлена, а вторая половина
        // её договора — список с ролью listbox, строки с ролью option и указатель на
        // активную — отсутствовала целиком. Программа чтения слышала «поле со списком»
        // и не находила списка.
        // Выдача — то же стекло, что у остального интерфейса. Прежде это была
        // глухая плашка цвета --ab-111111 с рамкой и чёрной тенью: единственная
        // непрозрачная поверхность на всей главной, и она висела ровно под
        // стеклянным полем. Плотность берёт glass-dense (0.90): под выдачей лежит
        // СОДЕРЖИМОЕ страницы, а не обои, и при меньшей сквозь названия городов
        // читался бы текст под ними — это уже меряли на меню языков.
        <div id="ap-listbox" className="srch-list glass-dense" role="listbox" aria-label={placeholder} aria-busy={pending} style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          borderRadius: 'var(--r-card)',
          overflow: 'hidden',
          overflowY: 'auto',
          // На высоте240px прежние 100dvh−220px оставляли20px: только заголовок,
          // ни одного доступного города. Минимум88px вмещает заголовок и строку;
          // длинная выдача всё ещё прокручивается внутри, страница — снаружи.
          maxHeight: 'min(480px, max(88px, calc(100dvh - 220px)))',
          /* Прокрутка не уходит на страницу, когда список кончился: иначе
             колесо «пробивало» выдачу и уводило страницу под ней. */
          overscrollBehavior: 'contain',
          zIndex: 100,
        }}>
          {query.trim() ? (
            <SearchSection active={active} query={query} go={go} setActive={setActive} label={tNav('results')} items={visibleResults} pending={pending} />
          ) : (
            recentF.length > 0 && <SearchSection active={active} query={query} go={go} setActive={setActive} label={tNav('recent')} items={recentF} startIndex={0} />
          )}
        </div>
      )}
    </div>
  );
}
