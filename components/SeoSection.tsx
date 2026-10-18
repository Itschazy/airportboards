/** Справочный текст раньше занимал длинную ленту, а «Читать далее» требовало JS.
 * По решению владельца разделы свёрнуты, но не лениво загружены: весь children уже
 * есть в серверном HTML. Native details доступен с клавиатуры и без гидратации.
 * Не используем content-visibility с intrinsic-height: закрытому разделу не нужна
 * резервная высота 320 px. Полнота текста и FAQ schema проверяются по HTML.
 */
export function SeoSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return <details className="seo-section">
    <summary><h2>{title}<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></h2></summary>
    <div className="seo-section-content">{children}</div>
  </details>;
}
