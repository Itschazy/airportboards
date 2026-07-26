'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { locales, localeNames } from '@/lib/i18n';

type Hit = { iata: string; name: string; city: string; country: string; iso2: string };

const BASE = 'https://airportsboard.live';

/**
 * The generator on /widgets: pick an airport, get code, see it live.
 *
 * The snippet it emits is the whole point of the widget programme — an iframe onto /embed
 * plus a plain <a> UNDERNEATH it, in the host page's own HTML. That anchor is the followed,
 * equity-carrying link; the iframe is merely the reason a webmaster wants it on the page.
 * Keeping the two together in one copy-paste block is what makes the link survive contact
 * with real webmasters.
 */
export function WidgetBuilder({ locale }: { locale: string }) {
  const t = useTranslations('home');
  const tUi = useTranslations('ui');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState<Hit | null>(null);
  const [lang, setLang] = useState(locale);
  const [dir, setDir] = useState<'departures' | 'arrivals'>('departures');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}&locale=${locale}`);
        const data = await res.json();
        setHits((data.airports || []).slice(0, 6));
      } catch { setHits([]); }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, locale]);

  const snippet = sel ? (() => {
    const src = `${BASE}/embed/${sel.iata}?lang=${lang}&dir=${dir}${theme === 'light' ? '&theme=light' : ''}`;
    const href = `${BASE}/${lang}/airport/${sel.iata}${dir === 'arrivals' ? '/arrivals' : ''}`;
    // Anchor and rel are deliberately conservative, and this was a correction, not the first
    // draft. The first draft emitted a followed link with the localized keyword anchor
    // («…онлайн-табло вылетов и прилётов») — which is, word for word, what Google's spam
    // policy names as link spam: "keyword-rich … links embedded in widgets that are
    // distributed across various sites". A manual action over widget links, on a domain that
    // is mid-AdSense-review and climbing out of an indexing hole, is the single most
    // expensive outcome available. So: the airport's name as the anchor (a natural
    // reference, not a money phrase) and rel="nofollow" as shipped. Nofollow links still
    // deliver what this programme actually needs first — referral traffic, brand queries,
    // and discovery (Google treats nofollow as a crawl hint) — without the penalty surface.
    const anchor = `${sel.name} (${sel.iata}) — airportsboard.live`;
    return `<iframe src="${src}"
        style="width:100%;max-width:420px;height:480px;border:0;border-radius:12px"
        loading="lazy" title="${sel.iata} ${dir}"></iframe>
<p style="margin:4px 0 0;font-size:12px">
  <a href="${href}" rel="nofollow">${anchor}</a>
</p>`;
  })() : '';

  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* no-op */ }
  };

  const label = { display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8A8A', margin: '18px 0 8px' } as const;
  const input = { width: '100%', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#FFFFFF' } as const;

  return (
    <div>
      <label style={label} htmlFor="wb-q">{t('widgets_airport')}</label>
      <input id="wb-q" style={input} value={sel ? `${sel.name} (${sel.iata})` : q}
        onChange={e => { setSel(null); setQ(e.target.value); }}
        onFocus={() => { if (sel) { setSel(null); setQ(''); } }}
        placeholder="LHR, Antalya, Палма…" autoComplete="off" />
      {!sel && hits.length > 0 && (
        <div style={{ border: '1px solid #1A1A1A', borderRadius: 12, marginTop: 6, overflow: 'hidden' }}>
          {hits.map(h => (
            <button key={h.iata} type="button" onClick={() => { setSel(h); setHits([]); }}
              style={{ display: 'flex', gap: 10, alignItems: 'baseline', width: '100%', textAlign: 'start', background: '#0B0B0B', border: 0, borderBottom: '1px solid #151515', padding: '10px 14px', color: '#FFFFFF', fontSize: 14, cursor: 'pointer' }}>
              <span style={{ fontWeight: 700 }}>{h.iata}</span>
              <span style={{ color: '#B4B4B4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
              <span style={{ color: '#6A6A6A', marginInlineStart: 'auto', flexShrink: 0 }}>{h.city}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div>
          <label style={label} htmlFor="wb-lang">{t('widgets_language')}</label>
          <select id="wb-lang" style={input} value={lang} onChange={e => setLang(e.target.value)}>
            {locales.map(l => <option key={l} value={l}>{localeNames[l]}</option>)}
          </select>
        </div>
        <div>
          <label style={label} htmlFor="wb-dir">{t('widgets_direction')}</label>
          <select id="wb-dir" style={input} value={dir} onChange={e => setDir(e.target.value as 'departures' | 'arrivals')}>
            {/* ui.departures/arrivals are nominative board labels; home.*_short are the
                genitive fragments other sentences interpolate — «вылетов» alone is not a
                menu option in Russian. */}
            <option value="departures">{tUi('departures')}</option>
            <option value="arrivals">{tUi('arrivals')}</option>
          </select>
        </div>
        <div>
          <label style={label} htmlFor="wb-theme">{t('widgets_theme')}</label>
          <select id="wb-theme" style={input} value={theme} onChange={e => setTheme(e.target.value as 'dark' | 'light')}>
            <option value="dark">{t('widgets_dark')}</option>
            <option value="light">{t('widgets_light')}</option>
          </select>
        </div>
      </div>

      {sel && (
        <>
          <label style={label} htmlFor="wb-code">{t('widgets_code')}</label>
          <textarea id="wb-code" readOnly value={snippet} rows={7}
            style={{ ...input, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
            onFocus={e => e.currentTarget.select()} />
          <button type="button" onClick={copy}
            style={{ marginTop: 10, background: copied ? '#34C759' : '#0A84FF', color: '#FFFFFF', border: 0, borderRadius: 999, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {copied ? t('widgets_copied') : t('widgets_copy')}
          </button>

          <div style={label as React.CSSProperties}>{t('widgets_preview')}</div>
          <iframe
            key={`${sel.iata}-${lang}-${dir}-${theme}`}
            src={`/embed/${sel.iata}?lang=${lang}&dir=${dir}${theme === 'light' ? '&theme=light' : ''}`}
            style={{ width: '100%', maxWidth: 420, height: 480, border: 0, borderRadius: 12 }}
            title={`${sel.iata} ${dir}`} />
        </>
      )}
    </div>
  );
}
