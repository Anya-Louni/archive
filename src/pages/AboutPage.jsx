import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <section style={{ paddingBottom: '2.5rem' }}>
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/homepage">Home</Link>
        <span className="breadcrumb-sep">›</span>
        <span>Mission</span>
      </div>

      <div style={{ textAlign: 'center', margin: '0.5rem 0 1.5rem' }}>
        <p className="home-hero-eyebrow" style={{ marginBottom: '0.4rem' }}>
          ABOUT THIS PROJECT
        </p>
        <h1 style={{ margin: '0 0 0.4rem' }}>The Mission</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto' }}>
          A community-driven effort to catalog, preserve, and make sense of
          the internet's forgotten artifacts, lost media, and unresolved mysteries.
        </p>
      </div>

      <div className="post-layout">
        {/* Main content */}
        <div className="stack-gap">
          <article className="card">
            <h3>What is the Internet Artifact Archive?</h3>
            <p>
              The Internet Artifact Archive is an open community archive dedicated to
              documenting digital history. We collect case files on forgotten websites,
              lost games and media, mysterious online phenomena, viral moments with missing
              context, and anything else the internet has half-remembered or abandoned.
            </p>
            <p>
              Every case submitted is a record — not a rumor. Members are expected to
              provide sources, context, and honest assessments of what is known versus
              what is speculation.
            </p>
          </article>

          <article className="card">
            <h3>Why it matters</h3>
            <p>
              Digital culture is fragile. Platforms disappear overnight. Links rot.
              Content is taken down without warning. The collective memory of what the
              early internet looked and felt like is already full of gaps.
            </p>
            <p>
              This archive exists to slow that loss. By collecting and cross-referencing
              what communities remember, we build a record that no single platform or
              person controls.
            </p>
          </article>

          <article className="card">
            <h3>How cases work</h3>
            <div className="ledger-form" style={{ gap: '0.75rem' }}>
              <div className="about-step">
                <span className="about-step-num">01</span>
                <div>
                  <strong>A member submits a case</strong>
                  <p className="meta-line">
                    Any registered member can file a case with a title, description,
                    artifact date, category, and source links.
                  </p>
                </div>
              </div>
              <div className="about-step">
                <span className="about-step-num">02</span>
                <div>
                  <strong>The community investigates</strong>
                  <p className="meta-line">
                    Members comment, add analyses, and vote on the most useful
                    contributions. Upvotes surface the best evidence.
                  </p>
                </div>
              </div>
              <div className="about-step">
                <span className="about-step-num">03</span>
                <div>
                  <strong>Status is updated</strong>
                  <p className="meta-line">
                    Cases move from Unknown → Under Investigation → Explained or Archived
                    as the community reaches consensus.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="card">
            <h3>Community standards</h3>
            <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
              <li>Cite your sources. Speculation must be labeled as such.</li>
              <li>Respect that some things remain genuinely unknown — that's okay.</li>
              <li>No personal attacks, harassment, or off-topic content.</li>
              <li>Duplicate cases will be merged or removed by moderators.</li>
              <li>Content must relate to digital or internet culture history.</li>
            </ul>
          </article>
        </div>

        {/* Sidebar */}
        <aside className="stack-gap">
          <article className="card">
            <h3 style={{ margin: '0 0 0.6rem' }}>Quick links</h3>
            <ul style={{ paddingLeft: '1.1rem', margin: 0, lineHeight: 2 }}>
              <li><Link to="/catalog">Browse the archive</Link></li>
              <li><Link to="/post">Submit a case</Link></li>
              <li><Link to="/auth">Join the community</Link></li>
              <li><Link to="/dashboard">Your dashboard</Link></li>
            </ul>
          </article>

          <article className="card">
            <h3 style={{ margin: '0 0 0.5rem' }}>Status guide</h3>
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {[
                ['Unknown', 'unknown', 'No consensus yet. The mystery stands.'],
                ['Under Investigation', 'under-investigation', 'Active research in progress.'],
                ['Explained', 'explained', 'Community reached a verified conclusion.'],
                ['Archived', 'archived', 'Documented and closed.'],
              ].map(([label, slug, desc]) => (
                <div key={slug}>
                  <span className={`status-badge status-${slug}`}>{label}</span>
                  <p className="meta-line" style={{ margin: '0.1rem 0 0', fontSize: '0.78rem' }}>{desc}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}
