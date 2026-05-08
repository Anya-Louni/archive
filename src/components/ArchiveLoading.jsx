export function ArchiveLoading({
  message = 'Indexing archive records…',
  detail = 'Re-threading case files and warming up the catalog.',
}) {
  return (
    <section className="archive-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="archive-loading-stamp">Internet Artifact Archive</div>
      <div className="archive-loading-card">
        <div className="archive-loading-head">
          <span className="archive-loading-dot" aria-hidden="true" />
          <strong>{message}</strong>
        </div>
        <p>{detail}</p>
        <div className="archive-loading-bars" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  )
}
