'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
              padding: '10px 14px',
              border: 'none',
              borderBottom: i < items.length - 1 ? '1px solid var(--ab-161616)' : 'none',
              background: isActive ? 'var(--ab-1c1c1e)' : 'transparent',
              color: 'var(--ab-ffffff)',
              cursor: pending ? 'progress' : 'pointer',
              textAlign: 'start',
              transition: 'background 0.1s',
            }}
          >
            {/* Flag */}
            <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center', lineHeight: 1 }}>
              {flag(a.iso2)}
            </span>

            {/* IATA */}
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ab-0a84ff)', flexShrink: 0, width: 34, letterSpacing: '-0.02em' }}>
              {highlight(a.iata, query)}
            </span>

            {/* City + name */}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, color: 'var(--ab-e4e4e7)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {highlight(a.city, query)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ab-6a6a6a)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {highlight(a.name, query)}
              </span>
            </span>

            {/* Country */}
            <span style={{ fontSize: 11, color: 'var(--ab-8a8a8a)', flexShrink: 0, maxWidth: 80, textAlign: 'end', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.country}
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
  const [bootstrap, setBootstrap] = useState<{ locale: string; popular: Result[]; index: ReturnType<typeof prepareQuick> } | null>(null);
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
        if (!controller.signal.aborted) setBootstrap({ locale, popular: data.airports || [], index: prepareQuick((data.quick || []) as QuickTuple[]) });
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

  // Sections rendered in the empty state, and the flat list keyboard nav walks.
  // De-dupe across sections (an airport can be in recent AND popular)
  // so there are no duplicate React keys and arrow-keys + Enter hit the right row.
  const seen = new Set<string>();
  const recentF = recent.filter(a => !seen.has(a.iata) && seen.add(a.iata));
  const popularItems = (bootstrap?.locale === locale ? bootstrap.popular : []).slice(0, 6).filter(a => !seen.has(a.iata) && seen.add(a.iata));
  const emptyFlat = [...recentF, ...popularItems];
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

  const showList = open && (query.trim() ? visibleResults.length > 0 : emptyFlat.length > 0);



  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="6.5" cy="6.5" r="4" stroke={focused ? 'var(--ab-8a8a8a)' : 'var(--ab-4a4a4a)'} strokeWidth="1.5"/>
          <path d="M10 10L13.5 13.5" stroke={focused ? 'var(--ab-8a8a8a)' : 'var(--ab-4a4a4a)'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        {/* Договор роли combobox выполняется целиком: aria-controls указывает на список,
            aria-activedescendant — на строку под выделением. Раньше роль была объявлена, а
            списка с ролью listbox и строк с ролью option не существовало: программа чтения
            слышала «поле со списком» и не находила списка. */}
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
          style={{
            width: '100%',
            padding: '14px 40px 14px 40px',
            fontSize: 16,
            border: `1px solid ${focused ? 'var(--ab-333333)' : 'var(--ab-1a1a1a)'}`,
            borderRadius: 16,
            outline: 'none',
            background: 'var(--ab-0b0b0b)',
            color: 'var(--ab-ffffff)',
            WebkitAppearance: 'none',
            transition: 'border-color 0.15s',
          }}
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
              position: 'absolute', insetInlineEnd: 4, top: '50%', transform: 'translateY(-50%)',
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
        <div id="ap-listbox" role="listbox" aria-label={placeholder} aria-busy={pending} style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          background: 'var(--ab-111111)',
          border: '1px solid var(--ab-1e1e1e)',
          borderRadius: 16,
          overflow: 'hidden',
          overflowY: 'auto',
          // На высоте240px прежние 100dvh−220px оставляли20px: только заголовок,
          // ни одного доступного города. Минимум88px вмещает заголовок и строку;
          // длинная выдача всё ещё прокручивается внутри, страница — снаружи.
          maxHeight: 'min(480px, max(88px, calc(100dvh - 220px)))',
          zIndex: 100,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}>
          {query.trim() ? (
            <SearchSection active={active} query={query} go={go} setActive={setActive} label={tNav('results')} items={visibleResults} pending={pending} />
          ) : (
            <>
              {recentF.length > 0 && <SearchSection active={active} query={query} go={go} setActive={setActive} label={tNav('recent')} items={recentF} startIndex={0} />}
              {popularItems.length > 0 && <SearchSection active={active} query={query} go={go} setActive={setActive} label={tNav('popular')} items={popularItems} startIndex={recentF.length} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
