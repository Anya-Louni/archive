import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CardSwap, { Card } from '../components/CardSwap'
import { supabase } from '../lib/supabase'

const archiveFacts = [
  'The first website ever created is still accessible at info.cern.ch, hosted by CERN since 1991.',
  'GeoCities at its peak hosted over 38 million user-made pages and was the third most-visited site on the web before shutting down in 2009.',
  'The first emoticon — :-) — was typed by Scott Fahlman on September 19, 1982, on a Carnegie Mellon bulletin board.',
  'The Internet Archive\'s Wayback Machine has preserved over 800 billion web pages since its founding in 1996.',
  'AOL Instant Messenger (AIM) launched in 1997 and ran for 20 years before shutting down in December 2017.',
  'The world\'s first banner ad appeared on HotWired.com in October 1994 and had a 44% click-through rate.',
  'Flash games — once billions of files across the web — were largely erased when Adobe Flash was discontinued in December 2020.',
  'The Dancing Baby GIF, one of the earliest internet memes, was created in 1996 from a stock 3D animation sample.',
  'StumbleUpon, once the internet\'s most popular random-discovery tool, was shut down in 2018 after 16 years.',
  'Napster, the peer-to-peer file-sharing network that changed music distribution, peaked at 80 million registered users before shutting down in 2001.',
]

const anonAdjectives = [
  'amber', 'quiet', 'fuzzy', 'neon', 'dusty', 'noisy', 'sleepy', 'midnight', 'pixel', 'faded',
  'hidden', 'paper', 'crimson', 'echoing', 'glitchy', 'silver', 'velvet', 'distant', 'hollow', 'rainy',
]

const anonNouns = [
  'moth', 'owl', 'signal', 'modem', 'cassette', 'orb', 'archive', 'ghost', 'ribbon', 'lantern',
  'circuit', 'thread', 'satellite', 'comet', 'socket', 'vhs', 'echo', 'terminal', 'postcard', 'glyph',
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
        <svg className="home-social-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7.2 5.4c1.4-1 2.9-1.4 4.8-1.4s3.4.4 4.8 1.4c1.8 1.3 2.8 3.2 3.2 6.1-.2 3.2-1.3 5.7-3.1 7.3-1.3 1.2-2.8 1.8-4.9 1.8s-3.6-.6-4.9-1.8c-1.8-1.6-2.9-4.1-3.1-7.3.4-2.9 1.4-4.8 3.2-6.1Z" />
        </svg>
      )
    case 'bluesky':
      return (
        <svg className="home-social-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 4.2c-2.2 1.9-4.6 4.7-5.8 7-.9 1.7-.8 3.8.4 5.3 1.4 1.7 3.8 1.9 5.4.4.6-.6 1.2-1.4 1.8-2.2.6.8 1.2 1.6 1.8 2.2 1.6 1.5 4 1.3 5.4-.4 1.2-1.5 1.3-3.6.4-5.3-1.2-2.3-3.6-5.1-5.8-7-.8-.7-2-.7-2.8 0Z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg className="home-social-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
          <circle cx="12" cy="12" r="3.4" />
          <circle cx="17.1" cy="6.9" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'youtube':
      return (
        <svg className="home-social-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3.5" y="6.5" width="17" height="11" rx="3" />
          <path d="M10 9.5 15 12l-5 2.5Z" fill="currentColor" stroke="none" />
        </svg>
      )
    default:
      return null
  }
}

function generateAnonymousUsername(existingAliases = new Set()) {
  for (let i = 0; i < 12; i += 1) {
    const adjective = anonAdjectives[Math.floor(Math.random() * anonAdjectives.length)]
    const noun = anonNouns[Math.floor(Math.random() * anonNouns.length)]
    const suffix = Math.floor(100 + Math.random() * 900)
    const candidate = `anonymous${suffix}-${adjective}-${noun}`
    if (!existingAliases.has(candidate)) return candidate
  }
  return `anonymous${Math.floor(100 + Math.random() * 900)}`
}

function getDailyFact() {
  const daySeed = new Date().toISOString().slice(0, 10)
  const index = Array.from(daySeed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % archiveFacts.length
  return archiveFacts[index]
}

const fallbackItems = [
  {
    id: 'fallback-1',
    title: '2007 browser game with missing final level audio',
    artifact_date: '2007-11-09',
    username: 'analogArchivist',
    category_name: 'Lost Media',
    status: 'Under Investigation',
    vote_score: 231,
    description: 'Community reports mention a hidden final level track in an archived browser game build. Current mirrors include gameplay assets, but the audio channel is stripped in every known SWF dump.',
  },
  {
    id: 'fallback-2',
    title: 'Strange geocities backup page listing broken ARG clues',
    artifact_date: '2003-04-22',
    username: 'cacheGhoul',
    category_name: 'ARGs',
    status: 'Unknown',
    vote_score: 118,
    description: 'A preserved index page references clue files that now return 404 in every mirror. Two screenshot fragments and one dead domain entry recovered.',
  },
  {
    id: 'fallback-3',
    title: 'Forum thread documenting "vanishing mascot" campaign',
    artifact_date: '2011-02-02',
    username: 'splineIndex',
    category_name: 'Forums/Communities',
    status: 'Explained',
    vote_score: 89,
    description: 'Archived forum logs capture users tracking a promotional mascot account that posted cryptic updates for 13 days before all image links were scrubbed.',
  },
]

export function HomePage({ user }) {
  const WALL_VISIBLE_LIMIT = 180
  const navigate = useNavigate()
  const [previewItems, setPreviewItems] = useState(fallbackItems)
  const [wallPosts, setWallPosts] = useState([])
  const [wallText, setWallText] = useState('')
  const [replyToId, setReplyToId] = useState(null)
  const [wallError, setWallError] = useState('')
  const [deckSize, setDeckSize] = useState({ width: 560, height: 380 })

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth
      if (w < 600) {
        const mobileWidth = Math.max(240, Math.min(320, w - 56))
        const mobileHeight = Math.round(mobileWidth * 0.68)
        setDeckSize({ width: mobileWidth, height: mobileHeight })
      } else if (w < 800) {
        setDeckSize({ width: 440, height: 300 })
      } else {
        setDeckSize({ width: 560, height: 380 })
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const dailyFact = useMemo(() => getDailyFact(), [])
  const wallListRef = useRef(null)
  const [anonymousAlias] = useState(() => {
    if (user) return ''
    if (typeof window === 'undefined') return generateAnonymousUsername()

    const storageKey = 'echo-chamber-anonymous-alias'
    const existingAlias = window.sessionStorage.getItem(storageKey)
    if (existingAlias) return existingAlias

    const nextAlias = generateAnonymousUsername()
    window.sessionStorage.setItem(storageKey, nextAlias)
    return nextAlias
  })

  const userCheers = useMemo(() => new Set(wallPosts.filter((p) => p.cheered_by_user).map((p) => p.id)), [wallPosts])

  const loadWallPosts = useCallback(async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('wall_posts_with_cheers')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(WALL_VISIBLE_LIMIT)
    if (data) setWallPosts(data)
  }, [])

  useEffect(() => {
    async function loadHomeData() {
      const { data: recent } = await supabase
        .from('artifacts_feed')
        .select('id,title,artifact_date,username,description,category_name,status,vote_score')
        .order('created_at', { ascending: false })
        .limit(12)
      if (recent?.length) setPreviewItems(recent)
    }

    loadHomeData()
    loadWallPosts()
  }, [loadWallPosts])

  const openArtifact = useCallback((id) => {
    window.scrollTo(0, 0)
    if (!id || String(id).startsWith('fallback-')) { navigate('/catalog'); return }
    navigate(`/artifact/${id}`)
  }, [navigate])

  const cardItems = useMemo(() => {
    const pool = [...previewItems]
    const picks = []
    while (picks.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length)
      picks.push(pool.splice(idx, 1)[0])
    }
    return picks
  }, [previewItems.length])

  const quickJumpItems = useMemo(() => {
    const pool = [...previewItems]
    const picks = []
    while (picks.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length)
      picks.push(pool.splice(idx, 1)[0])
    }
    return picks
  }, [previewItems.length])

  const recentEntries = useMemo(() => (
    [...previewItems].slice(0, 3).reverse()
  ), [previewItems])

  const openRandomCase = () => {
    const pool = previewItems.filter((i) => !String(i.id).startsWith('fallback-'))
    if (!pool.length) { navigate('/catalog'); return }
    openArtifact(pool[Math.floor(Math.random() * pool.length)].id)
  }

  const submitWallPost = async () => {
    const nextText = wallText.trim()
    if (!nextText) return
    setWallError('')
    const { error } = await supabase
      .from('wall_posts')
      .insert({
        user_id: user?.id ?? null,
        alias: user?.username ?? anonymousAlias,
        text: nextText.slice(0, 280),
        reply_to: replyToId,
      })
      .select().single()
    if (error) { console.error('Wall post error:', error); setWallError(error.message); return }
    setWallText('')
    setReplyToId(null)
    await loadWallPosts()
  }

  const cheerPost = async (postId) => {
    if (!user) return
    if (userCheers.has(postId)) {
      await supabase.from('wall_post_cheers').delete().match({ post_id: postId, user_id: user.id })
    } else {
      await supabase.from('wall_post_cheers').insert({ post_id: postId, user_id: user.id })
    }
    await loadWallPosts()
  }

  const startReply = (post) => {
    setReplyToId(post.id)
    setWallText((current) => (current.trim() ? current : `@${post.alias} `))
  }

  const cancelReply = () => setReplyToId(null)

  useEffect(() => {
    const refreshWallPosts = async () => {
      try {
        await loadWallPosts()
      } catch (error) {
        console.warn('Wall feed refresh failed:', error)
      }
    }

    const intervalId = window.setInterval(refreshWallPosts, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadWallPosts])

  useEffect(() => {
    const el = wallListRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [wallPosts.length])

  const wallPostsVisible = useMemo(() => wallPosts.slice(-WALL_VISIBLE_LIMIT), [wallPosts])
  const replyLookup = useMemo(() => new Map(wallPosts.map((p) => [p.id, p])), [wallPosts])
  const repliedToIds = useMemo(() => new Set(wallPosts.map((p) => p.reply_to ?? p.replyTo).filter(Boolean)), [wallPosts])
  const activeReplyTarget = replyToId ? replyLookup.get(replyToId) : null

  const statusClass = (status) =>
    `status-chip status-${(status || 'Unknown').replace(/\s+/g, '-').toLowerCase()}`

  return (
    <section className="new-homepage" aria-label="Homepage">

      {/* ── Blog masthead (self-contained, no AppShell header on this page) ── */}
      <div className="home-masthead">
        <p className="home-hero-eyebrow">· CASE STATUS: ONGOING ·</p>
        <span className="archive-logo-stamp home-hero-stamp" aria-label="Internet Artifact Archive">
          Internet Artifact Archive
        </span>
        <p className="home-hero-tagline">
          Documents vanish. Forums die. Digital history disappears.<br />
          We catalog what the internet forgets.
        </p>
        <nav className="home-masthead-nav" aria-label="Site navigation">
          <Link className="home-cta-link" to="/catalog" onClick={() => window.scrollTo(0, 0)}>Browse Archive</Link>
          {!user ? (
            <Link className="home-cta-link" to="/auth?mode=register" onClick={() => window.scrollTo(0, 0)}>Join the Investigation</Link>
          ) : (
            <Link className="home-cta-link" to="/dashboard" onClick={() => window.scrollTo(0, 0)}>My Files</Link>
          )}
          <Link className="home-cta-link" to={user ? '/post' : '/auth?intent=post'} onClick={() => window.scrollTo(0, 0)}>File a Case</Link>
          <Link className="home-cta-link" to="/catalog" onClick={(e) => { e.preventDefault(); openRandomCase() }}>
            Random Case
          </Link>
        </nav>
      </div>

      {/* ── Active case signal bar ── */}
      {previewItems.length > 0 && (
        <div className="home-signal-bar" aria-label="Currently active case">
          <span className="home-signal-label">Active Case</span>
          <Link
            className="home-signal-text"
            to={String(previewItems[0]?.id).startsWith('fallback-') ? '/catalog' : `/artifact/${previewItems[0]?.id}`}
            onClick={() => window.scrollTo(0, 0)}
          >
            {previewItems[0]?.title ?? '...'}
          </Link>
        </div>
      )}

      {/* ── Main two-column blog layout ── */}
      <div className="home-blog-layout">

        {/* Left: card deck + blog post list */}
        <section className="home-blog-main stack-gap" id="browse">
          <div className="home-section-head">
            <h3>Case Files</h3>
            <Link to="/catalog" onClick={() => window.scrollTo(0, 0)}>Full archive →</Link>
          </div>

          {/* GSAP card swap deck */}
          {cardItems.length > 0 && (
            <div className="case-deck-wrapper">
              <div className="case-deck-tilt">
                <CardSwap
                  width={deckSize.width}
                  height={deckSize.height}
                  cardDistance={deckSize.width < 360 ? 6 : deckSize.width < 500 ? 8 : 14}
                  verticalDistance={0}
                  delay={3000}
                  pauseOnHover
                  skewAmount={0}
                  easing="elastic"
                  onCardClick={(i) => openArtifact(cardItems[i % cardItems.length]?.id)}
                >
                  {cardItems.map((item) => (
                    <Card key={item.id} customClass="case-file-card" onClick={() => openArtifact(item.id)}>
                      <div className="case-file-folder">
                        <div className="case-folder-tab">
                          <span className="case-folder-label">{item.category_name || 'Unsorted'}</span>
                        </div>
                        <div className="case-file-inner">
                          <div className="case-file-header">
                            <span className="case-featured-label">Featured Case</span>
                            <span className={`status-chip status-${(item.status || 'Unknown').replace(/\s+/g, '-').toLowerCase()}`}>
                              {item.status || 'Unknown'}
                            </span>
                          </div>
                          <h3 className="case-file-title">{item.title}</h3>
                          <p className="case-file-author">by {item.username || 'unknown'}</p>
                          <p className="case-file-desc">
                            {item.description?.slice(0, 130) || 'No summary yet.'}
                          </p>
                          <div className="case-file-footer">
                            <span className="case-file-hint">click to open →</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </CardSwap>
              </div>
            </div>
          )}

          {/* Blog-style recent entries */}
          <div className="home-section-head">
            <h3>Recent Entries</h3>
          </div>
          <div className="home-blog-posts">
            {recentEntries.map((entry) => (
              <article key={entry.id} className="home-blog-post">
                <div className="home-blog-post-header">
                  <span className="category-stamp">{entry.category_name || 'Unsorted'}</span>
                  <div className="home-blog-post-rightmeta">
                    <span className={statusClass(entry.status)}>{entry.status || 'Unknown'}</span>
                    <span className="meta-line">{entry.artifact_date || '—'}</span>
                  </div>
                </div>
                <h2 className="home-blog-post-title">
                  <button type="button" className="home-blog-title-link" onClick={() => openArtifact(entry.id)}>
                    {entry.title}
                  </button>
                </h2>
                <p className="meta-line" style={{ margin: '0.15rem 0 0.45rem' }}>by {entry.username || 'unknown'} · {entry.vote_score ?? 0} votes</p>
                <p className="home-blog-post-excerpt">
                  {entry.description?.slice(0, 220) || 'No summary yet.'}
                  {(entry.description?.length ?? 0) > 220 ? '…' : ''}
                </p>
                <button type="button" className="home-cta-link home-blog-read-more" onClick={() => openArtifact(entry.id)}>
                  Read more →
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Right sidebar */}
        <aside className="home-blog-sidebar stack-gap">

          {/* Did You Know */}
          <section className="card home-box stack-gap-sm home-did-you-know">
            <h3>Did you know?</h3>
            <p className="home-fact-copy">{dailyFact}</p>
            <small className="meta-line">Rotates daily · Internet history facts</small>
          </section>

          {/* Find Us */}
          <section className="card home-box stack-gap-sm">
            <h3>Find Us</h3>
            <div className="home-social-links">
              {socialLinks.map((link) => (
                <a key={link.label} href={link.href} className="home-social-link" rel="noreferrer">
                  <SocialGlyph name={link.icon} />
                  <span>{link.label}</span>
                  <span className="home-social-link-note">{link.note}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Quick Jump */}
          <section id="quick-jump" className="card home-box stack-gap-sm">
            <div className="home-section-head">
              <h3>Quick Jump</h3>
            </div>
            <p className="meta-line">Recently filed cases.</p>
            <div className="home-mini-feed">
              {quickJumpItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="archive-link"
                  onClick={() => openArtifact(item.id)}
                >
                  <span>{item.title}</span>
                  <small>{item.artifact_date || '—'}</small>
                </button>
              ))}
            </div>
            <Link className="stamp-button" to="/catalog" style={{ justifyContent: 'center', marginTop: '0.3rem' }}>
              Open Full Archive
            </Link>
          </section>

        </aside>
      </div>

      {/* ── Community wall — full width ── */}
      <section id="wall" className="card home-box stack-gap-sm community-wall home-community-lead">
        <div className="home-section-head">
          <h3>Community Wall</h3>
          <small className="meta-line">Off-topic chatter welcome</small>
        </div>

        <article className="card home-random-question">
          <strong>Today's icebreaker:</strong>
          <p>What weird old website still lives rent-free in your head?</p>
        </article>

        <div className="community-wall-list">
          <div ref={wallListRef} className="community-wall-stream" role="log" aria-live="polite" aria-label="Community wall posts">
            <div className="community-wall-intro meta-line">
              Drop random thoughts, jokes, vibes, or late-night internet memories.
            </div>
            {!wallPostsVisible.length ? (
              <div className="community-wall-empty meta-line">
                No posts yet — be the first to leave a breadcrumb.
              </div>
            ) : null}
            {wallPostsVisible.map((post) => {
              const parentReplyId = post.reply_to ?? post.replyTo
              const replyTarget = parentReplyId ? replyLookup.get(parentReplyId) : null
              return (
                <article
                  key={post.id}
                  className={`community-wall-item${repliedToIds.has(post.id) ? ' has-replies' : ''}${replyToId === post.id ? ' is-reply-target' : ''}`}
                >
                  {replyTarget ? (
                    <div className="wall-reply-preview">
                      ↪ replying to @{replyTarget.alias}: {replyTarget.text.slice(0, 64)}{replyTarget.text.length > 64 ? '…' : ''}
                    </div>
                  ) : null}
                  <p>{post.text}</p>
                  <div className="community-wall-meta">
                    <span className="meta-line">@{post.alias}</span>
                    <div className="wall-actions-inline">
                      {user ? (
                        <button type="button" className="feed-pill" onClick={() => startReply(post)}>Reply</button>
                      ) : null}
                      <button
                        type="button"
                        className="feed-pill"
                        onClick={() => cheerPost(post.id)}
                        disabled={!user}
                        aria-pressed={userCheers.has(post.id)}
                        title={user ? 'Cheer this post' : 'Sign in to cheer'}
                      >
                        ♡ {post.cheer_count ?? 0}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className="community-wall-form">
          {activeReplyTarget ? (
            <div className="wall-active-reply">
              Replying to <strong>@{activeReplyTarget.alias}</strong>
              <button type="button" className="linkish" onClick={cancelReply}>cancel</button>
            </div>
          ) : null}
          {wallError ? <p className="error-inline" style={{ margin: '0 0 0.3rem' }}>{wallError}</p> : null}
          <textarea
            rows={3}
            value={wallText}
            onChange={(e) => setWallText(e.target.value)}
            maxLength={280}
            placeholder={user ? 'Say anything unrelated to cases…' : `Post as ${anonymousAlias || 'anonymous'}`}
            aria-label="Write a wall post"
          />
          <div className="post-box-actions">
            <button type="button" disabled={!wallText.trim()} onClick={submitWallPost}>
              Post to wall
            </button>
            <small className="meta-line">{wallText.length}/280</small>
            {!user ? <small className="meta-line" style={{ marginLeft: 'auto' }}>Posting as @{anonymousAlias || 'anonymous'}</small> : null}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="card home-footer-columns home-footer-section">
        <section>
          <h4>About the Archive</h4>
          <ul>
            <li><Link to="/about" onClick={() => window.scrollTo(0, 0)}>Mission</Link></li>
            <li><Link to="/catalog" onClick={() => window.scrollTo(0, 0)}>Browse all cases</Link></li>
            <li><Link to="/auth" onClick={() => window.scrollTo(0, 0)}>Join community</Link></li>
          </ul>
        </section>
        <section>
          <h4>Support</h4>
          <ul>
            <li><Link to="/auth" onClick={() => window.scrollTo(0, 0)}>Account access</Link></li>
            <li><Link to="/catalog" onClick={() => window.scrollTo(0, 0)}>Search the archive</Link></li>
            <li><Link to="/post" onClick={() => window.scrollTo(0, 0)}>Submit a case</Link></li>
          </ul>
        </section>
        <section>
          <h4>Internet Artifact Archive</h4>
          <ul>
            <li>Open community archive project</li>
            <li>Built for shared digital memory</li>
            <li>All content is community contributed</li>
          </ul>
        </section>
      </footer>
    </section>
  )
}
