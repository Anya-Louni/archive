import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function PostPage({ user }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [postType, setPostType] = useState('text')
  const [form, setForm] = useState({
    category_id: '',
    title: '',
    description: '',
    source_link: '',
    media_url: '',
    artifact_date: new Date().toISOString().slice(0, 10),
    status: 'Unknown',
  })
  const navigate = useNavigate()

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.category_id)),
    [categories, form.category_id],
  )

  useEffect(() => {
    supabase
      .from('categories')
      .select('id,name')
      .order('name')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  const updateField = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const submitArtifact = async () => {
    if (!user || user.is_banned) return

    if (!form.title.trim()) {
      setNotice('Title is required.')
      return
    }
    if (!form.description.trim()) {
      setNotice('Body / description is required.')
      return
    }
    if (!form.category_id) {
      setNotice('Please select a category.')
      return
    }
    if (!form.artifact_date) {
      setNotice('Artifact date is required.')
      return
    }

    setNotice('')
    setLoading(true)

    const { data, error } = await supabase
      .from('artifacts')
      .insert({
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        source_link: form.source_link.trim() || null,
        media_url: form.media_url.trim() || null,
        artifact_date: form.artifact_date,
        status: form.status,
        user_id: user.id,
      })
      .select('id')
      .single()

    setLoading(false)

    if (error) {
      setNotice(error.message)
      return
    }

    navigate(`/artifact/${data.id}`)
  }

  return (
    <section style={{ paddingBottom: '2rem' }}>
      <div className="breadcrumb" style={{ marginBottom: '0.75rem' }}>
        <Link to="/catalog">Browse Archive</Link>
        <span className="breadcrumb-sep">›</span>
        <span>Submit a Case</span>
      </div>

      <div className="reddit-compose-layout">
        {/* Form */}
        <article className="card post-form-card">
          <div className="post-form-header">
            <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 2vw, 1.55rem)' }}>Submit a Case</h2>
            <p className="meta-line" style={{ margin: '0.25rem 0 0' }}>
              Share a digital artifact, lost media, or internet mystery with the community.
            </p>
          </div>

          {/* Post type tabs */}
          <div className="reddit-tabs" style={{ marginBottom: '0.85rem' }}>
            <button
              type="button"
              className={postType === 'text' ? 'active' : ''}
              onClick={() => setPostType('text')}
            >
              Text
            </button>
            <button
              type="button"
              className={postType === 'link' ? 'active' : ''}
              onClick={() => setPostType('link')}
            >
              Link / Source
            </button>
            <button
              type="button"
              className={postType === 'media' ? 'active' : ''}
              onClick={() => setPostType('media')}
            >
              Media URL
            </button>
          </div>

          <div className="ledger-form">
            <label htmlFor="post-category">
              Category *
              <select
                id="post-category"
                value={form.category_id}
                onChange={(e) => updateField('category_id', e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label htmlFor="post-title">
              Title *
              <input
                id="post-title"
                value={form.title}
                maxLength={300}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Describe the artifact in a clear, specific title"
              />
              <small className="meta-line">{form.title.length}/300 characters</small>
            </label>

            <label htmlFor="post-body">
              Body *
              <textarea
                id="post-body"
                rows={8}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="What did you find? Add context, timeline clues, source details, and your interpretation…"
                maxLength={5000}
              />
              <small className="meta-line">{form.description.length}/5000 characters</small>
            </label>

            {postType === 'link' ? (
              <label htmlFor="post-source">
                Source link
                <input
                  id="post-source"
                  value={form.source_link}
                  onChange={(e) => updateField('source_link', e.target.value)}
                  placeholder="https://…"
                  maxLength={2000}
                />
                <small className="meta-line">Link to the original source, mirror, or archive.org page.</small>
              </label>
            ) : null}

            {postType === 'media' ? (
              <label htmlFor="post-media">
                Media URL
                <input
                  id="post-media"
                  value={form.media_url}
                  onChange={(e) => updateField('media_url', e.target.value)}
                  placeholder="https://… (image, video, or audio link)"
                  maxLength={2000}
                />
              </label>
            ) : null}

            <div className="grid-two">
              <label htmlFor="post-date">
                Artifact date *
                <input
                  id="post-date"
                  type="date"
                  value={form.artifact_date}
                  onChange={(e) => updateField('artifact_date', e.target.value)}
                />
                <small className="meta-line">When the artifact originated or was first observed.</small>
              </label>
              <label htmlFor="post-status">
                Initial status
                <select
                  id="post-status"
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  <option>Unknown</option>
                  <option>Under Investigation</option>
                  <option>Explained</option>
                  <option>Archived</option>
                </select>
              </label>
            </div>

            {user?.is_banned ? (
              <p className="notice-box error">Your account is restricted. Posting is disabled.</p>
            ) : null}

            {notice ? <p className="notice-box error">{notice}</p> : null}

            <div className="inline-form">
              <button
                type="button"
                className="stamp-button"
                disabled={loading || user?.is_banned}
                onClick={submitArtifact}
              >
                {loading ? 'Submitting…' : 'Submit Case'}
              </button>
              <button type="button" onClick={() => navigate('/catalog')}>Cancel</button>
            </div>
          </div>
        </article>

        {/* Preview + rules sidebar */}
        <div className="stack-gap">
          <article className="card post-preview-panel">
            <h3 style={{ margin: '0 0 0.5rem' }}>Preview</h3>
            <p className="meta-line">
              {selectedCategory ? selectedCategory.name : 'No category selected'} · by {user?.username}
            </p>
            <h4 style={{ margin: '0.45rem 0 0.25rem' }}>{form.title || 'Your title will appear here'}</h4>
            <p style={{ margin: 0, color: form.description ? 'inherit' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {form.description?.slice(0, 200) || 'Your description preview will appear here…'}
              {form.description?.length > 200 ? '…' : ''}
            </p>
            {form.artifact_date ? (
              <p className="meta-line" style={{ marginTop: '0.4rem' }}>
                Artifact date: {form.artifact_date} · Status: {form.status}
              </p>
            ) : null}
          </article>

          <article className="card post-sidebar">
            <h3 style={{ margin: '0 0 0.6rem' }}>Submission rules</h3>
            <ul>
              <li>Use a descriptive, specific title.</li>
              <li>Include evidence, source links, or mirror URLs when available.</li>
              <li>Provide timeline context if you know when events occurred.</li>
              <li>Keep discussion focused on the artifact — no personal attacks.</li>
              <li>Set an appropriate status (Unknown if unsure).</li>
              <li>Duplicate submissions may be removed by moderators.</li>
            </ul>
            <p className="meta-line" style={{ marginTop: '0.6rem' }}>
              By submitting you agree to keep your content factual and community-appropriate.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
