import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '62vh',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <p
          className="home-hero-eyebrow"
          style={{ margin: '0 auto', width: 'fit-content' }}
        >
          ERROR 404 · MISSING CASE FILE
        </p>

        <span className="not-found-stamp">Not Found</span>

        <p
          className="meta-line"
          style={{ fontSize: '1rem', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}
        >
          This page does not exist in the archive. The link may be outdated,
          mistyped, or the file was never cataloged.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '0.25rem',
          }}
        >
          <Link className="stamp-button" to="/homepage">Return to homepage</Link>
          <Link className="stamp-button" to="/catalog">Browse the archive</Link>
        </div>
      </div>
    </section>
  )
}
