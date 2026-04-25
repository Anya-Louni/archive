import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatError, logError } from '../lib/errorUtils'
import { supabase } from '../lib/supabase'

const pageSize = 10

const mockFeedRows = [
  {
    id: 'mock-1',
    user_id: null,
    title: '2007 browser game with missing final level audio',
    description:
      'Community reports mention a hidden final level track in an archived browser game build. Current mirrors include gameplay assets, but the audio channel is stripped in every known SWF dump.',
    category_name: 'Lost Media',
    artifact_date: '2007-11-09',
    status: 'Under Investigation',
    username: 'analogArchivist',
    vote_score: 231,
    is_mock: true,
  },
  {
    id: 'mock-2',
    user_id: null,
    title: 'Strange geocities backup page listing broken ARG clues',
    description:
      'A preserved index page references clue files that now return 404 in every mirror. We recovered two screenshot fragments and one dead domain registration entry for timeline correlation.',
    category_name: 'ARGs',
    artifact_date: '2003-04-22',
    status: 'Unknown',
    username: 'cacheGhoul',
    vote_score: 118,
    is_mock: true,
  },
  {
    id: 'mock-3',
    user_id: null,
    title: 'Forum thread documenting "vanishing mascot" campaign',
    description:
      'Archived forum logs capture users tracking a promotional mascot account that posted cryptic updates for 13 days before all image links were scrubbed from the host.',
    category_name: 'Forums/Communities',
    artifact_date: '2011-02-02',
    status: 'Explained',
    username: 'splineIndex',
    vote_score: 89,
    is_mock: true,
  },
  {
    id: 'mock-4',
    user_id: null,
    title: 'Deleted webcomic mirror with alternate ending panel',
    description:
      'A fan-maintained mirror appears to include an alternate final panel not present in official re-uploads. Metadata indicates this copy was scraped one day before takedown.',
    category_name: 'Digital Art',
    artifact_date: '2016-08-17',
    status: 'Archived',
    username: 'paperTrailMod',
    vote_score: 307,
    is_mock: true,
  },
  {
    id: 'mock-5',
    user_id: null,
    title: 'Early social profile featuring "first meme format" claims',
    description:
      'Profile snapshots include timestamped posts allegedly predating a well-known meme format. Authenticity is disputed due to timezone and export inconsistencies.',
    category_name: 'Internet Culture',
    artifact_date: '2005-09-30',
    status: 'Under Investigation',
    username: 'epochWitness',
    vote_score: 154,
    is_mock: true,
  },
]

const archiveTags = [
  'lost media', 'internet', 'mystery', 'creatures',
  'disappearances', 'video', 'halloween', 'forum', 'folklore', 'ARG',
]

const socialLinks = [
  { label: 'Discord', href: '#', note: 'Live dispatches', icon: 'discord' },
  { label: 'Bluesky', href: '#', note: 'Short updates', icon: 'bluesky' },
  { label: 'Instagram', href: '#', note: 'Visual finds', icon: 'instagram' },
  { label: 'YouTube', href: '#', note: 'Longform dossiers', icon: 'youtube' },
]

function SocialGlyph({ name }) {
  switch (name) {
    case 'discord':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7.2 5.4c1.4-1 2.9-1.4 4.8-1.4s3.4.4 4.8 1.4c1.8 1.3 2.8 3.2 3.2 6.1-.2 3.2-1.3 5.7-3.1 7.3-1.3 1.2-2.8 1.8-4.9 1.8s-3.6-.6-4.9-1.8c-1.8-1.6-2.9-4.1-3.1-7.3.4-2.9 1.4-4.8 3.2-6.1Z" />
          <path d="M9.3 13.5h0" />
          <path d="M14.7 13.5h0" />
        </svg>
      )
    case 'bluesky':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 4.2c-2.2 1.9-4.6 4.7-5.8 7-.9 1.7-.8 3.8.4 5.3 1.4 1.7 3.8 1.9 5.4.4.6-.6 1.2-1.4 1.8-2.2.6.8 1.2 1.6 1.8 2.2 1.6 1.5 4 1.3 5.4-.4 1.2-1.5 1.3-3.6.4-5.3-1.2-2.3-3.6-5.1-5.8-7-.8-.7-2-.7-2.8 0Z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
          <circle cx="12" cy="12" r="3.4" />
          <circle cx="17.1" cy="6.9" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3.5" y="6.5" width="17" height="11" rx="3" />
          <path d="M10 9.5 15 12l-5 2.5Z" fill="currentColor" stroke="none" />
        </svg>
      )
    default:
      return null
  }
}

export function CatalogPage({ user }) {
  const [categories, setCategories] = useState([])
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [topPosts, setTopPosts] = useState([])
  const [archiveYears, setArchiveYears] = useState([])
  const [stamped, setStamped] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    status: '',
    from: '',
    to: '',
    sort: 'created_at.desc',
    page: 1,
  })

  const navigate = useNavigate()
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const featuredItem = rows.find((r) => !r.is_mock) ?? rows[0] ?? mockFeedRows[0]

  const sortOptions = useMemo(
    () => [
      { label: 'Newest', value: 'created_at.desc' },
      { label: 'Oldest', value: 'created_at.asc' },
      { label: 'Top rated', value: 'vote_score.desc' },
      { label: 'Title A–Z', value: 'title.asc' },
    ],
    [],
  )

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error: err } = await supabase.from('categories').select('id,name').order('name')
        if (err) throw err
        setCategories(data ?? [])
      } catch (e) {
        logError('CatalogPage: loadCategories', e)
      }
    }

    async function loadTopPosts() {
      try {
        const { data } = await supabase
          .from('artifacts_feed')
          .select('id,title,vote_score,category_name')
          .order('vote_score', { ascending: false })
          .limit(5)
        if (data?.length) setTopPosts(data)
      } catch (e) {
        logError('CatalogPage: loadTopPosts', e)
      }
    }

    async function loadArchiveYears() {
      try {
        const { data } = await supabase.from('artifacts').select('artifact_date').not('artifact_date', 'is', null)
        if (!data?.length) return
        const counts = {}
        data.forEach((r) => {
          const y = r.artifact_date?.slice(0, 4)
          if (y) counts[y] = (counts[y] || 0) + 1
        })
        const sorted = Object.entries(counts)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([year, count]) => ({ year: Number(year), count }))
        setArchiveYears(sorted)
      } catch (e) {
        logError('CatalogPage: loadArchiveYears', e)
      }
    }

    loadCategories()
    loadTopPosts()
    loadArchiveYears()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      try {
        let countQuery = supabase.from('artifacts_feed').select('*', { count: 'exact', head: true })
        let listQuery = supabase.from('artifacts_feed').select('*')

        if (filters.q.trim()) {
          const term = `%${filters.q.trim()}%`
          countQuery = countQuery.or(`title.ilike.${term},description.ilike.${term},username.ilike.${term}`)
          listQuery = listQuery.or(`title.ilike.${term},description.ilike.${term},username.ilike.${term}`)
        }
        if (filters.category) {
          countQuery = countQuery.eq('category_id', filters.category)
          listQuery = listQuery.eq('category_id', filters.category)
        }
        if (filters.status) {
          countQuery = countQuery.eq('status', filters.status)
          listQuery = listQuery.eq('status', filters.status)
        }
        if (filters.from) {
          countQuery = countQuery.gte('artifact_date', filters.from)
          listQuery = listQuery.gte('artifact_date', filters.from)
        }
        if (filters.to) {
          countQuery = countQuery.lte('artifact_date', filters.to)
          listQuery = listQuery.lte('artifact_date', filters.to)
        }

        const [sortField, sortDir] = filters.sort.split('.')
        listQuery = listQuery
          .order(sortField, { ascending: sortDir === 'asc' })
          .range((filters.page - 1) * pageSize, filters.page * pageSize - 1)

        const [countResult, listResult] = await Promise.all([countQuery, listQuery])

        if (countResult.error) throw countResult.error
        if (listResult.error) throw listResult.error

        const liveRows = (listResult.data ?? []).map((r) => ({ ...r, categories: { name: r.category_name }, is_mock: false }))
        const shouldUseMockRows =
          liveRows.length === 0 &&
          !filters.q.trim() &&
          !filters.category &&
          !filters.status &&
          !filters.from &&
          !filters.to &&
          filters.page === 1

        setRows(shouldUseMockRows ? mockFeedRows.map((r) => ({ ...r, categories: { name: r.category_name } })) : liveRows)
        setTotal(shouldUseMockRows ? mockFeedRows.length : (countResult.count ?? 0))
      } catch (e) {
        logError('CatalogPage: load', e)
        setError(formatError(e))
        setRows([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [filters])

  const refresh = () => setFilters((f) => ({ ...f }))

  const openRandomArtifact = () => {
    const liveRows = rows.filter((r) => !r.is_mock)
    const pool = liveRows.length ? liveRows : rows
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (pick && !String(pick.id).startsWith('mock-')) navigate(`/artifact/${pick.id}`)
  }

  const applyArchiveYear = (year) => {
    setFilters((f) => ({ ...f, from: `${year}-01-01`, to: `${year}-12-31`, page: 1 }))
  }

  const clearArchiveRange = () => {
    setFilters((f) => ({ ...f, from: '', to: '', page: 1 }))
  }

  const setTagSearch = (tag) => {
    setFilters((f) => ({ ...f, q: tag, page: 1 }))
  }

  const voteArtifact = async (artifactId, value) => {
    if (!user || user.is_banned) return
    setError('')
    try {
      const { error: err } = await supabase
        .from('artifact_votes')
        .upsert({ artifact_id: artifactId, user_id: user.id, value }, { onConflict: 'artifact_id,user_id' })
      if (err) throw err
      refresh()
    } catch (e) {
      logError('CatalogPage: voteArtifact', e)
      setError(formatError(e))
    }
  }

  const deleteArtifact = async (artifactId) => {
    if (!window.confirm('Delete this artifact and all related content?')) return
    setError('')
    try {
      const { error: err } = await supabase.from('artifacts').delete().eq('id', artifactId)
      if (err) throw err
      setStamped(true)
      setTimeout(() => setStamped(false), 1200)
      refresh()
    } catch (e) {
      logError('CatalogPage: deleteArtifact', e)
      setError(formatError(e))
    }
  }

  const canEditRow = (row) => Boolean(user && (user.id === row.user_id || user.is_admin))

  const displayTopPosts = topPosts.length ? topPosts : mockFeedRows.slice(0, 5)

  const statusClass = (status) =>
    `status-chip status-${(status || 'Unknown').replace(/\s+/g, '-').toLowerCase()}`

  return (
    <section className="homepage-shell stack-gap">
      {error && (
        <div className="notice-box error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Archive Catalog</h1>
          <p>Community-documented internet artifacts, lost media, and digital mysteries.</p>
        </div>
        <div className="page-header-actions">
          {user && !user.is_banned ? (
            <Link className="stamp-button" to="/post">+ Submit Case</Link>
          ) : null}
          <button type="button" className="stamp-button" onClick={openRandomArtifact}>
            Random Case
          </button>
        </div>
      </div>

      <button
        type="button"
        className="catalog-filter-toggle"
        onClick={() => setFiltersOpen((v) => !v)}
        aria-expanded={filtersOpen}
        aria-controls="catalog-filter-panel"
      >
        <span>Filter & Search</span>
        <span>{filtersOpen ? '▲' : '▼'}</span>
      </button>

      <div className="catalog-layout">
        <div className="catalog-main stack-gap">
          {featuredItem ? (
            <article className="card homepage-feature">
              <div className="home-kicker">Featured case</div>
              <h2>
                <button
                  type="button"
                  className="linkish"
                  style={{ fontSize: 'inherit', fontWeight: 'inherit', padding: 0, marginTop: 0 }}
                  onClick={() => !featuredItem.is_mock && navigate(`/artifact/${featuredItem.id}`)}
                >
                  {featuredItem.title}
                </button>
              </h2>
              <p className="meta-line">
                {featuredItem.category_name ?? featuredItem.categories?.name ?? '—'} ·{' '}
                {featuredItem.artifact_date} · filed by {featuredItem.username}
              </p>
              <p>{featuredItem.description?.slice(0, 300)}{featuredItem.description?.length > 300 ? '…' : ''}</p>
              <div className="post-box-actions">
                <span className={statusClass(featuredItem.status)}>{featuredItem.status}</span>
                {!featuredItem.is_mock ? (
                  <button type="button" onClick={() => navigate(`/artifact/${featuredItem.id}`)}>
                    Open Case
                  </button>
                ) : (
                  <span className="mock-tag">Sample entry — submit real cases to see them here</span>
                )}
              </div>
            </article>
          ) : null}

          <article id="browse" className="feed-shell card">
            <div className="feed-header-copy">
              <h3>Latest entries</h3>
              <p className="meta-line">
                {total > 0 ? `${total} total artifact${total !== 1 ? 's' : ''}` : 'Showing sample entries'}
              </p>
            </div>

            <div className="feed-sort-row">
              <span className="feed-sort-label">Sort:</span>
              {sortOptions.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={filters.sort === s.value ? 'feed-pill active' : 'feed-pill'}
                  onClick={() => setFilters((f) => ({ ...f, sort: s.value, page: 1 }))}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {loading ? <p className="meta-line" style={{ padding: '0.5rem 0' }}>Loading…</p> : null}

            <div className="post-card-grid reddit-feed">
              {rows.map((item) => (
                <article key={item.id} className={`post-box reddit-post${item.is_mock ? ' mock-row' : ''}`}>
                  <aside className="reddit-vote-rail">
                    <button
                      type="button"
                      title="Upvote"
                      aria-label="Upvote"
                      disabled={!user || user.is_banned || item.is_mock || user.id === item.user_id}
                      onClick={() => voteArtifact(item.id, 1)}
                    >
                      ▲
                    </button>
                    <span>{item.vote_score ?? 0}</span>
                    <button
                      type="button"
                      title="Downvote"
                      aria-label="Downvote"
                      disabled={!user || user.is_banned || item.is_mock || user.id === item.user_id}
                      onClick={() => voteArtifact(item.id, -1)}
                    >
                      ▼
                    </button>
                  </aside>

                  <div className="reddit-post-main">
                    <div className="post-box-top">
                      <span className="category-stamp">{item.categories?.name ?? item.category_name ?? '—'}</span>
                      <span className={statusClass(item.status)}>{item.status}</span>
                      {item.is_mock ? <span className="mock-tag">sample</span> : null}
                    </div>
                    <h3 style={{ margin: '0.2rem 0 0.1rem' }}>
                      {item.is_mock ? (
                        item.title
                      ) : (
                        <Link className="post-title-link" to={`/artifact/${item.id}`}>
                          {item.title}
                        </Link>
                      )}
                    </h3>
                    <p className="meta-line" style={{ margin: '0 0 0.25rem' }}>
                      by {item.username} · {item.artifact_date}
                    </p>
                    {item.description ? (
                      <p className="post-snippet" style={{ margin: 0 }}>
                        {item.description.slice(0, 120)}{item.description.length > 120 ? '…' : ''}
                      </p>
                    ) : null}
                    {canEditRow(item) && !item.is_mock ? (
                      <div style={{ marginTop: '0.45rem' }}>
                        <button
                          type="button"
                          className="danger"
                          style={{ fontSize: '0.78rem', padding: '0.1rem 0.38rem' }}
                          onClick={() => deleteArtifact(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
              {!rows.length && !loading ? (
                <p className="meta-line">No artifacts found matching your filters.</p>
              ) : null}
            </div>

            <div className="pagination">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                ← Previous
              </button>
              <span>Page {filters.page} of {pageCount}</span>
              <button
                type="button"
                disabled={filters.page >= pageCount}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Next →
              </button>
            </div>
          </article>
        </div>

        <aside id="catalog-filter-panel" className={`catalog-filters-rail blog-sidebar stack-gap${filtersOpen ? ' open' : ''}`}>
          <section id="search" className="sidebar-widget stack-gap-sm">
            <h3>Search & Filter</h3>
            <div className="catalog-filter-row">
              <div>
                <span className="catalog-filter-label">Search</span>
                <input
                  placeholder="Title, description, or username"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
                  aria-label="Search artifacts"
                />
              </div>
              <div>
                <span className="catalog-filter-label">Category</span>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <span className="catalog-filter-label">Status</span>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  <option>Unknown</option>
                  <option>Under Investigation</option>
                  <option>Explained</option>
                  <option>Archived</option>
                </select>
              </div>
              <div>
                <span className="catalog-filter-label">Date range</span>
                <div className="catalog-filter-dates">
                  <input
                    type="date"
                    value={filters.from}
                    aria-label="From date"
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
                  />
                  <input
                    type="date"
                    value={filters.to}
                    aria-label="To date"
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
                  />
                </div>
              </div>
            </div>

            <div className="catalog-filters-rail-actions">
              <button type="button" onClick={clearArchiveRange}>Clear date range</button>
              {user && !user.is_banned ? (
                <Link className="stamp-button" to="/post">Submit a Case</Link>
              ) : user?.is_banned ? (
                <small className="error-inline">Your account is read-only.</small>
              ) : (
                <Link className="stamp-button" to="/auth?intent=post">Sign in to post</Link>
              )}
            </div>
          </section>

          <section className="sidebar-widget stack-gap-sm">
            <h3>Top-rated cases</h3>
            <div className="popular-list">
              {displayTopPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="popular-item"
                  onClick={() => !String(post.id).startsWith('mock-') && navigate(`/artifact/${post.id}`)}
                  disabled={String(post.id).startsWith('mock-')}
                >
                  <strong>{post.title}</strong>
                  <span>{post.category_name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="sidebar-widget stack-gap-sm">
            <h3>Tags</h3>
            <div className="tag-cloud">
              {archiveTags.map((tag) => (
                <button key={tag} type="button" className="tag-chip" onClick={() => setTagSearch(tag)}>
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section className="sidebar-widget stack-gap-sm">
            <h3>Archives by year</h3>
            <button type="button" className="linkish archive-clear-link" onClick={clearArchiveRange}>
              All years
            </button>
            <div className="archive-links">
              {archiveYears.slice(0, 8).map((entry) => (
                <button
                  key={entry.year}
                  type="button"
                  className="archive-link"
                  onClick={() => applyArchiveYear(entry.year)}
                >
                  <span>{entry.year}</span>
                  <small>({entry.count})</small>
                </button>
              ))}
              {!archiveYears.length ? (
                <span className="meta-line">No dated entries yet.</span>
              ) : null}
            </div>
          </section>

        </aside>
      </div>

      {stamped ? <div className="stamp-overlay">CANCELLED</div> : null}
    </section>
  )
}
