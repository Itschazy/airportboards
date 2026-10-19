import type { ReactNode } from 'react';

// Оформление заголовка и содержимого прежнее. Только нативное раскрытие:
// оно не ждёт JS и не удаляет текст из HTML для поиска и вспомогательных технологий.
export function SeoSection({ title, children }: { title: string; children: ReactNode }) {
  return <details className="airport-disclosure" style={{ marginTop: 36 }}>
    <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, cursor: 'pointer' }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A' }}>{title}</h2>
      <span className="disclosure-arrow" aria-hidden="true">⌄</span>
    </summary>
    <div style={{ marginTop: 14 }}>{children}</div>
  </details>;
}
