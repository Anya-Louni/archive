import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatError, logError } from '../lib/errorUtils'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = ['Unknown', 'Under Investigation', 'Explained', 'Archived']

const MOCK_COMMENTS = [
  {
    id: 'mock-c1',
    user_id: null,
    content: 'Has anyone checked the Wayback Machine snapshots from that period? There might be captured versions that still have the original content intact.',
    created_at: '2026-03-15T14:22:00Z',
    profiles: { username: 'archiveHound' },
  },
  {
    id: 'mock-c2',
    user_id: null,
    content: "I found a similar case in the German internet archive from 2008. The timestamp correlates with what's described here. Worth cross-referencing the metadata.",
    created_at: '2026-03-16T09:11:00Z',
    profiles: { username: 'analogArchivist' },
  },
  {
    id: 'mock-c3',
    user_id: null,
    content: '↑ Sample comments — sign in and submit the first real discussion post to start the investigation thread.',
    created_at: '2026-03-17T18:44:00Z',
    profiles: { username: 'archiveMod' },
  },
]

const MOCK_ANALYSES = [
  {
    id: 'mock-a1',
    user_id: null,
    content: 'Based on the metadata timestamps and CDN logs recovered by WaybackBot, this appears to be a deliberate removal rather than a technical failure. The redirect was set approximately 14 hours before the content became inaccessible.',
    vote_score: 47,
    created_at: '2026-03-14T20:30:00Z',
    profiles: { username: 'cacheGhoul' },
  },
  {
    id: 'mock-a2',
    user_id: null,
    content: "Cross-referencing with domain registration data: the registrant changed 6 weeks before disappearance. Combined with the scrubbed image hosts, this points to a coordinated takedown rather than link rot.",
    vote_score: 31,
    created_at: '2026-03-15T11:05:00Z',
    profiles: { username: 'splineIndex' },
  },
]

function avatarInitials(username) {
  return (username || 'A').slice(0, 2).toUpperCase()
}

export function ArtifactPage({ user }) {
  const { artifactId } = useParams()
  const [artifact, setArtifact] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [comments, setComments] = useState([])
  const [reportCount, setReportCount] = useState(0)
  const [analysisText, setAnalysisText] = useState('')
  const [commentText, setCommentText] = useState('')
  const [timelineText, setTimelineText] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('discussion')
  const [solvedStamp, setSolvedStamp] = useState(false)
  const navigate = useNavigate()

  const canContribute = useMemo(() => Boolean(user && !user.is_banned), [user])
  const isOwner = useMemo(() => Boolean(user && artifact && user.id === artifact.user_id), [user, artifact])
  const isAdmin = useMemo(() => Boolean(user?.is_admin), [user])
  const canModerate = useMemo(() => Boolean((isOwner || isAdmin) && !user?.is_banned), [isOwner, isAdmin, user])

  async function load() {
    setNotice('')
    try {
      const [oneResult, tResult, aResult, cResult, rResult] = await Promise.all([
        supabase
          .from('artifacts')
          .select('id,user_id,title,description,source_link,media_url,artifact_date,status,vote_score,categories(name),profiles!user_id(username)')
          .eq('id', artifactId)
          .single(),
        supabase
          .from('timeline_entries')
          .select('id,user_id,entry,created_at,profiles!user_id(username)')
          .eq('artifact_id', artifactId)
          .order('created_at', { ascending: true }),
        supabase
          .from('analyses')
          .select('id,user_id,content,vote_score,created_at,profiles!user_id(username)')
          .eq('artifact_id', artifactId)
          .order('vote_score', { ascending: false }),
        supabase
          .from('comments')
          .select('id,user_id,content,created_at,profiles!user_id(username)')
          .eq('artifact_id', artifactId)
          .order('created_at', { ascending: true }),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('artifact_id', artifactId)
          .eq('status', 'Open'),
      ])

      if (oneResult.error) throw oneResult.error
      if (tResult.error) throw tResult.error
      if (aResult.error) throw aResult.error
      if (cResult.error) throw cResult.error

      setArtifact(oneResult.data)
      setTimeline(tResult.data ?? [])
      setAnalyses(aResult.data ?? [])
      setComments(cResult.data ?? [])
      setReportCount(rResult.count ?? 0)
    } catch (e) {
      logError('ArtifactPage: load', e)
      setNotice(formatError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [artifactId])

  const voteArtifact = async (value) => {
    if (!user || user.is_banned) return
    setNotice('')
    try {
      const { error } = await supabase
        .from('artifact_votes')
        .upsert({ artifact_id: Number(artifactId), user_id: user.id, value }, { onConflict: 'artifact_id,user_id' })
      if (error) throw error
      await load()
    } catch (e) {
      logError('ArtifactPage: voteArtifact', e)
      setNotice(formatError(e))
    }
  }

  const addTimeline = async () => {
    if (!timelineText.trim() || !user) return
    setNotice('')
    try {
      const { error } = await supabase
        .from('timeline_entries')
        .insert({ artifact_id: artifactId, user_id: user.id, entry: timelineText.trim() })
      if (error) throw error
      setTimelineText('')
      await load()
    } catch (e) {
      logError('ArtifactPage: addTimeline', e)
      setNotice(formatError(e))
    }
  }

  const addAnalysis = async () => {
    if (!analysisText.trim() || !user) return
    setNotice('')
    try {
      const { error } = await supabase
        .from('analyses')
        .insert({ artifact_id: artifactId, user_id: user.id, content: analysisText.trim() })
      if (error) throw error
      setAnalysisText('')
      await load()
    } catch (e) {
      logError('ArtifactPage: addAnalysis', e)
      setNotice(formatError(e))
    }
  }

  const addComment = async () => {
    if (!commentText.trim() || !user) return
    setNotice('')
    try {
      const { error } = await supabase
        .from('comments')
        .insert({ artifact_id: artifactId, user_id: user.id, content: commentText.trim() })
      if (error) throw error
      setCommentText('')
      await load()
    } catch (e) {
      logError('ArtifactPage: addComment', e)
      setNotice(formatError(e))
    }
  }

  const voteAnalysis = async (analysisId, value) => {
    if (!user || user.is_banned) return
    setNotice('')
    try {
      const { error } = await supabase
        .from('analysis_votes')
        .upsert({ analysis_id: analysisId, user_id: user.id, value }, { onConflict: 'analysis_id,user_id' })
      if (error) throw error
      await load()
    } catch (e) {
      logError('ArtifactPage: voteAnalysis', e)
      setNotice(formatError(e))
    }
  }

  const reportArtifact = async () => {
    if (!user) return
    setNotice('')
    try {
      const { error } = await supabase
        .from('reports')
        .insert({ artifact_id: artifactId, user_id: user.id, reason: 'Needs moderation review' })
      if (error) throw error
      setNotice('Report submitted. Moderators will review this case.')
    } catch (e) {
      logError('ArtifactPage: reportArtifact', e)
      setNotice(formatError(e))
    }
  }

  const setStatus = async (nextStatus) => {
    if (!canModerate) return
    setNotice('')
    try {
      const { error } = await supabase.from('artifacts').update({ status: nextStatus }).eq('id', artifactId)
      if (error) throw error
      if (nextStatus === 'Explained') {
        setSolvedStamp(true)
        setTimeout(() => setSolvedStamp(false), 1400)
      }
      await load()
    } catch (e) {
      logError('ArtifactPage: setStatus', e)
      setNotice(formatError(e))
    }
  }

  const deletePost = async () => {
    if (!canModerate) return
    if (!window.confirm('Delete this post and all related content? This cannot be undone.')) return
    setNotice('')
    try {
      const { error } = await supabase.from('artifacts').delete().eq('id', artifactId)
      if (error) throw error
      navigate('/catalog')
    } catch (e) {
      logError('ArtifactPage: deletePost', e)
      setNotice(formatError(e))
    }
  }

  const clearReports = async () => {
    if (!isAdmin) return
    setNotice('')
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'Resolved' })
        .eq('artifact_id', artifactId)
        .eq('status', 'Open')
      if (error) throw error
      setNotice('All open reports cleared.')
      await load()
    } catch (e) {
      logError('ArtifactPage: clearReports', e)
      setNotice(formatError(e))
    }
  }

  const removeTimelineEntry = async (id) => {
    setNotice('')
    try {
      const { error } = await supabase.from('timeline_entries').delete().eq('id', id)
      if (error) throw error
      await load()
    } catch (e) {
      logError('ArtifactPage: removeTimelineEntry', e)
      setNotice(formatError(e))
    }
  }

  const removeAnalysis = async (id) => {
    setNotice('')
    try {
      const { error } = await supabase.from('analyses').delete().eq('id', id)
      if (error) throw error
      await load()
    } catch (e) {
      logError('ArtifactPage: removeAnalysis', e)
      setNotice(formatError(e))
    }
  }

  const removeComment = async (id) => {
    setNotice('')
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id)
      if (error) throw error
      await load()
    } catch (e) {
      logError('ArtifactPage: removeComment', e)
      setNotice(formatError(e))
    }
  }

  if (loading) {
    return (
      <section className="stack-gap">
        <div className="breadcrumb">
          <Link to="/catalog">Browse Archive</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Loading…</span>
        </div>
        <p className="card loading-note">Loading case file…</p>
      </section>
    )
  }

  if (!artifact) {
    return (
      <section className="stack-gap">
        <div className="breadcrumb">
          <Link to="/catalog">Browse Archive</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Not found</span>
        </div>
        <div className="card notice-box error">
          {notice || 'This artifact was not found. It may have been deleted or the link is incorrect.'}
        </div>
        <div><Link className="stamp-button" to="/catalog">Return to Catalog</Link></div>
      </section>
    )
  }

  const statusSlug = (artifact.status || 'Unknown').replace(/\s+/g, '-').toLowerCase()

  return (
    <section className="stack-gap">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/catalog">Browse Archive</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="category-stamp">{artifact.categories?.name ?? 'Uncategorized'}</span>
        <span className="breadcrumb-sep">›</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
          {artifact.title}
        </span>
      </div>

      <div className="artifact-detail-layout">
        {/* Main content */}
        <div className="artifact-main">

          {/* Post header */}
          <article className="card">
            <div className="artifact-card-toprow">
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="category-stamp">{artifact.categories?.name ?? 'Uncategorized'}</span>
                <span className={`status-badge status-${statusSlug}`}>{artifact.status}</span>
              </div>
              <div className="artifact-score-badge">
                <button
                  type="button"
                  title="Upvote"
                  aria-label="Upvote this artifact"
                  disabled={!user || user.is_banned || user.id === artifact.user_id}
                  onClick={() => voteArtifact(1)}
                >▲</button>
                <span className="artifact-score-number">{artifact.vote_score ?? 0}</span>
                <button
                  type="button"
                  title="Downvote"
                  aria-label="Downvote this artifact"
                  disabled={!user || user.is_banned || user.id === artifact.user_id}
                  onClick={() => voteArtifact(-1)}
                >▼</button>
              </div>
            </div>

            <h1 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.75rem)', margin: '0 0 0.35rem' }}>
              {artifact.title}
            </h1>

            <p className="meta-line" style={{ marginBottom: '0.8rem' }}>
              Filed {artifact.artifact_date} · by{' '}
              <strong>{artifact.profiles?.username ?? 'unknown'}</strong>
            </p>

            {!user ? <p className="meta-line" style={{ marginBottom: '0.8rem', fontSize: '0.82rem' }}>Sign in to vote</p> : null}
            {user && user.id === artifact.user_id ? <p className="meta-line" style={{ marginBottom: '0.8rem', fontSize: '0.82rem' }}>You cannot vote on your own post</p> : null}

            <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{artifact.description}</p>

            {artifact.source_link ? (
              <p style={{ marginTop: '0.7rem' }}>
                <strong>Source:</strong>{' '}
                <a href={artifact.source_link} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                  {artifact.source_link}
                </a>
              </p>
            ) : null}
            {artifact.media_url ? (
              <p style={{ marginTop: '0.5rem' }}>
                <strong>Media:</strong>{' '}
                <a href={artifact.media_url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                  {artifact.media_url}
                </a>
              </p>
            ) : null}

            {/* Report button */}
            {canContribute && !isOwner && !isAdmin ? (
              <div style={{ marginTop: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
                <button type="button" className="danger" onClick={reportArtifact} style={{ fontSize: '0.82rem' }}>
                  Report this case
                </button>
              </div>
            ) : null}
          </article>

          {/* ── Moderator Controls (admin only) ── */}
          {isAdmin ? (
            <article className="card mod-controls-bar">
              <div className="mod-bar-row">
                <div className="mod-bar-left">
                  <span className="mod-bar-badge">◆ ADMIN</span>
                  {reportCount > 0 ? (
                    <span className="report-count-tag">{reportCount} open report{reportCount !== 1 ? 's' : ''}</span>
                  ) : null}
                </div>
                <div className="mod-bar-right">
                  <button type="button" onClick={clearReports} disabled={reportCount === 0} style={{ fontSize: '0.78rem' }}>
                    Clear Reports ({reportCount})
                  </button>
                  <button type="button" className="danger" onClick={deletePost} style={{ fontSize: '0.78rem' }}>
                    Delete Post
                  </button>
                </div>
              </div>
              <div className="mod-status-row">
                <span className="mod-bar-label">Status:</span>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`mod-status-btn${artifact.status === s ? ' mod-status-active' : ''}`}
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mod-bar-info">
                Filed by <strong>{artifact.profiles?.username ?? 'unknown'}</strong>
                {' · '}ID: <code style={{ fontSize: '0.75rem' }}>{artifact.id}</code>
              </p>
            </article>
          ) : null}

          {/* ── Post Controls (owner only) ── */}
          {isOwner && !isAdmin ? (
            <article className="card mod-controls-bar owner-mod-bar">
              <div className="mod-bar-row">
                <div className="mod-bar-left">
                  <span className="mod-bar-badge owner-badge">YOUR POST</span>
                </div>
                <div className="mod-bar-right">
                  <button type="button" className="danger" onClick={deletePost} style={{ fontSize: '0.78rem' }}>
                    Delete Post
                  </button>
                </div>
              </div>
              <div className="mod-status-row">
                <span className="mod-bar-label">Status:</span>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`mod-status-btn${artifact.status === s ? ' mod-status-active' : ''}`}
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </article>
          ) : null}

          {/* Section tabs */}
          <div>
            <div className="section-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'timeline'}
                className={`section-tab${activeTab === 'timeline' ? ' active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                Timeline ({timeline.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'analysis'}
                className={`section-tab${activeTab === 'analysis' ? ' active' : ''}`}
                onClick={() => setActiveTab('analysis')}
              >
                Analysis ({analyses.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'discussion'}
                className={`section-tab${activeTab === 'discussion' ? ' active' : ''}`}
                onClick={() => setActiveTab('discussion')}
              >
                Discussion ({comments.length})
              </button>
            </div>

            {/* Timeline */}
            {activeTab === 'timeline' ? (
              <article className="card" role="tabpanel">
                <p className="meta-line" style={{ marginBottom: '0.75rem' }}>
                  Chronological contributions to this case. Add an entry to fill in timeline gaps.
                </p>
                <ul className="timeline-list">
                  {timeline.map((e) => (
                    <li key={e.id} style={{ marginBottom: '0.6rem' }}>
                      <strong>{new Date(e.created_at).toLocaleDateString()}</strong>
                      {' — '}
                      {e.entry}
                      <span className="meta-line"> ({e.profiles?.username ?? 'unknown'})</span>
                      {(canModerate || user?.id === e.user_id) ? (
                        <button type="button" className="mini-btn danger" onClick={() => removeTimelineEntry(e.id)}>
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                  {!timeline.length ? (
                    <li className="meta-line">No timeline entries yet. Be the first to add context.</li>
                  ) : null}
                </ul>
                {canContribute ? (
                  <div className="inline-form" style={{ marginTop: '0.8rem' }}>
                    <input
                      value={timelineText}
                      onChange={(e) => setTimelineText(e.target.value)}
                      placeholder="Add a timeline entry (date or event context)…"
                      maxLength={2000}
                    />
                    <button type="button" onClick={addTimeline} disabled={!timelineText.trim()}>Add</button>
                  </div>
                ) : (
                  <p className="meta-line" style={{ marginTop: '0.8rem' }}>
                    <Link to="/auth">Sign in</Link> to contribute to this timeline.
                  </p>
                )}
              </article>
            ) : null}

            {/* Analysis */}
            {activeTab === 'analysis' ? (
              <article className="card" role="tabpanel">
                <p className="meta-line" style={{ marginBottom: '0.75rem' }}>
                  Theories and interpretations from the community, ranked by votes.
                </p>

                {(analyses.length ? analyses : MOCK_ANALYSES).map((a) => (
                  <div key={a.id} className="analysis-item">
                    <p style={{ lineHeight: 1.55 }}>{a.content}</p>
                    <div className="comment-meta" style={{ marginTop: '0.35rem' }}>
                      <div className="artifact-vote-row">
                        {canContribute ? (
                          <>
                            <button type="button" title="Upvote" aria-label="Upvote analysis" onClick={() => voteAnalysis(a.id, 1)}>▲</button>
                            <span className="vote-score">{a.vote_score ?? 0}</span>
                            <button type="button" title="Downvote" aria-label="Downvote analysis" onClick={() => voteAnalysis(a.id, -1)}>▼</button>
                          </>
                        ) : (
                          <span className="vote-score">{a.vote_score ?? 0} pts</span>
                        )}
                      </div>
                      <span className="comment-author">{a.profiles?.username ?? 'unknown'}</span>
                      <span className="comment-date">{new Date(a.created_at).toLocaleDateString()}</span>
                      {(canModerate || user?.id === a.user_id) ? (
                        <button type="button" className="mini-btn danger" onClick={() => removeAnalysis(a.id)}>Remove</button>
                      ) : null}
                    </div>
                  </div>
                ))}

                {!analyses.length ? (
                  <p className="meta-line" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Showing sample analyses — submit yours below to start the real record.</p>
                ) : null}

                {canContribute ? (
                  <div className="stack-gap-sm" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.8rem' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Submit your analysis</p>
                    <textarea
                      rows={5}
                      value={analysisText}
                      onChange={(e) => setAnalysisText(e.target.value)}
                      placeholder="What do you think happened? Provide evidence-based reasoning…"
                      maxLength={5000}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="stamp-button"
                        onClick={addAnalysis}
                        disabled={!analysisText.trim()}
                      >
                        Submit Analysis
                      </button>
                      <small className="meta-line">{analysisText.length}/5000</small>
                    </div>
                  </div>
                ) : (
                  <p className="meta-line" style={{ marginTop: '0.8rem' }}>
                    <Link to="/auth">Sign in</Link> to submit an analysis.
                  </p>
                )}
              </article>
            ) : null}

            {/* Discussion */}
            {activeTab === 'discussion' ? (
              <article className="card" role="tabpanel">
                <div className="comments-section-header">
                  <h3>Discussion</h3>
                  <span className="meta-line">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
                </div>

                {!comments.length ? (
                  <p className="meta-line" style={{ marginBottom: '0.5rem', fontStyle: 'italic' }}>
                    Showing sample discussion — sign in to open the real thread.
                  </p>
                ) : null}

                <div>
                  {(comments.length ? comments : MOCK_COMMENTS).map((c) => (
                    <div key={c.id} className="comment-card-v2">
                      <div className="comment-avatar-circle" aria-hidden="true">
                        {avatarInitials(c.profiles?.username)}
                      </div>
                      <div className="comment-body-v2">
                        <div className="comment-meta-v2">
                          <span className="comment-author">{c.profiles?.username ?? 'unknown'}</span>
                          <span className="comment-date">{new Date(c.created_at).toLocaleDateString()}</span>
                          {(canModerate || user?.id === c.user_id) ? (
                            <button
                              type="button"
                              className="mini-btn danger"
                              style={{ marginLeft: 'auto' }}
                              onClick={() => removeComment(c.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <p className="comment-text-v2">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {canContribute ? (
                  <div className="comment-compose-area">
                    <div className="comment-compose-avatar" aria-hidden="true">
                      {avatarInitials(user.username)}
                    </div>
                    <div className="comment-compose-body">
                      <textarea
                        rows={3}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add your thoughts to the investigation…"
                        maxLength={1000}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                      />
                      <div className="comment-compose-actions">
                        <button
                          type="button"
                          className="stamp-button"
                          onClick={addComment}
                          disabled={!commentText.trim()}
                        >
                          Post Comment
                        </button>
                        <small className="meta-line">{commentText.length}/1000 · Enter to submit</small>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '2px solid var(--border)', textAlign: 'center' }}>
                    <p className="meta-line">
                      <Link to="/auth">Sign in</Link> to join the discussion.
                    </p>
                  </div>
                )}
              </article>
            ) : null}
          </div>

          {/* Notice / error */}
          {notice ? (
            <div className={`notice-box ${notice.includes('Report submitted') || notice.includes('cleared') ? 'success' : 'error'}`} role="alert">
              {notice}
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="artifact-sidebar">
          <div className="artifact-meta-card">
            <h3 style={{ margin: 0, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              Case File
            </h3>
            <dl className="artifact-meta-dl">
              <dt>Status</dt>
              <dd><span className={`status-badge status-${statusSlug}`}>{artifact.status}</span></dd>
              <dt>Category</dt>
              <dd>{artifact.categories?.name ?? '—'}</dd>
              <dt>Artifact date</dt>
              <dd>{artifact.artifact_date || '—'}</dd>
              <dt>Filed by</dt>
              <dd>{artifact.profiles?.username ?? '—'}</dd>
              <dt>Vote score</dt>
              <dd>{artifact.vote_score ?? 0}</dd>
              <dt>Timeline entries</dt>
              <dd>{timeline.length}</dd>
              <dt>Analyses</dt>
              <dd>{analyses.length}</dd>
              <dt>Comments</dt>
              <dd>{comments.length}</dd>
              {isAdmin && reportCount > 0 ? (
                <>
                  <dt>Open reports</dt>
                  <dd><span className="report-count-tag">{reportCount}</span></dd>
                </>
              ) : null}
            </dl>
          </div>

          <div className="artifact-meta-card">
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              Navigation
            </h3>
            <div className="stack-gap-sm">
              <Link to="/catalog" className="archive-link" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>← Back to Catalog</span>
              </Link>
              {user && !user.is_banned ? (
                <Link to="/post" className="stamp-button" style={{ justifyContent: 'center' }}>
                  Submit New Case
                </Link>
              ) : null}
            </div>
          </div>

          {/* Admin quick-nav */}
          {isAdmin ? (
            <div className="artifact-meta-card" style={{ borderColor: '#8a2824' }}>
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#7a2520' }}>
                Admin Quick Links
              </h3>
              <div className="stack-gap-sm">
                <Link to="/admin" className="archive-link" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Admin Panel</span>
                </Link>
                <Link to="/catalog" className="archive-link" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Browse All Cases</span>
                </Link>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {solvedStamp ? <div className="stamp-overlay solved-overlay">SOLVED</div> : null}
    </section>
  )
}
