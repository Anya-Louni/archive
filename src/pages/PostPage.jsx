import { useEffect, useMemo, useRef, useState } from 'react'
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
  const mediaFileRef = useRef(null)
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaPreviews, setMediaPreviews] = useState([])
  const [sourceLinks, setSourceLinks] = useState([''])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.category_id)),
    [categories, form.category_id],
  )

  useEffect(() => {
    supabase
      .from('categories')
      .select('id,name')
      .order('name')
      .then(({ data, error }) => {
        if (error) setNotice(`Could not load categories: ${error.message}`)
        setCategories(data ?? [])
      })
  }, [])

  const updateField = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const handleMediaSelect = (e) => {
    const newFiles = Array.from(e.target.files || [])
    if (!newFiles.length) return
    const combined = [...mediaFiles, ...newFiles]
    if (combined.some((f) => !f.type.startsWith('image/'))) {
      setNotice('Only image files are allowed.')
      if (mediaFileRef.current) mediaFileRef.current.value = ''
      return
    }
    if (combined.some((f) => f.size > 5 * 1024 * 1024)) {
      setNotice('Each image must be under 5 MB.')
      if (mediaFileRef.current) mediaFileRef.current.value = ''
      return
    }
    if (combined.length > 30) {
      setNotice('You can upload at most 30 images.')
      if (mediaFileRef.current) mediaFileRef.current.value = ''
      return
    }
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f))
    setMediaFiles(combined)
    setMediaPreviews((prev) => [...prev, ...newPreviews])
    if (mediaFileRef.current) mediaFileRef.current.value = ''
  }

  const removeMediaFile = (idx) => {
    URL.revokeObjectURL(mediaPreviews[idx])
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx))
    setMediaPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateSourceLink = (idx, value) =>
    setSourceLinks((prev) => prev.map((l, i) => (i === idx ? value : l)))

  const addSourceLink = () => setSourceLinks((prev) => [...prev, ''])

  const removeSourceLink = (idx) =>
    setSourceLinks((prev) => prev.filter((_, i) => i !== idx))

  const createCategory = async () => {
    const name = newCategoryName.trim()
    if (!name || creatingCategory) return
    setCreatingCategory(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({ name })
      .select('id,name')
      .single()
    setCreatingCategory(false)
    if (error) {
      setNotice(error.message)
      return
    }
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    updateField('category_id', String(data.id))
    setNewCategoryName('')
  }

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
    setNotice('')
    setLoading(true)

    let mediaUrlValue = null
    if (mediaFiles.length > 0) {
      const folder = `${user.id}/${Date.now()}`
      const uploadedUrls = []
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i]
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${folder}/${i}_${safeName}`
        const { error: uploadErr } = await supabase.storage
          .from('media')
          .upload(path, file, { contentType: file.type })
        if (uploadErr) {
          setNotice(`Image upload failed: ${uploadErr.message}`)
          setLoading(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
        uploadedUrls.push(publicUrl)
      }
      mediaUrlValue = JSON.stringify(uploadedUrls)
    }

    const validLinks = sourceLinks.map((l) => l.trim()).filter(Boolean)
    const sourceLinkValue = validLinks.length === 0
      ? null
      : validLinks.length === 1
      ? validLinks[0]
      : JSON.stringify(validLinks)

    const { data, error } = await supabase
      .from('artifacts')
      .insert({
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        source_link: sourceLinkValue,
        media_url: mediaUrlValue,
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
            <div>
              <label htmlFor="post-category">
                Category *
                <select
                  id="post-category"
                  value={form.category_id}
                  onChange={(e) => updateField('category_id', e.target.value)}
                >
                  <option value="">
                    {categories.length === 0 ? '— no categories yet, create one below —' : 'Select a category'}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ margin: '0 0 0.28rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Or create a new one:
                </p>
                <div className="inline-form">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name…"
                    maxLength={100}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory() } }}
                  />
                  <button
                    type="button"
                    disabled={!newCategoryName.trim() || creatingCategory}
                    onClick={createCategory}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {creatingCategory ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </div>

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
              <div>
                <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: '0.88rem' }}>Source Links</p>
                <div className="stack-gap-sm">
                  {sourceLinks.map((link, idx) => (
                    <div key={idx} className="inline-form">
                      <input
                        value={link}
                        onChange={(e) => updateSourceLink(idx, e.target.value)}
                        placeholder="https://…"
                        maxLength={2000}
                      />
                      {sourceLinks.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSourceLink(idx)}
                          aria-label="Remove link"
                          style={{ padding: '0 0.55rem', minHeight: '2.1rem', flexShrink: 0 }}
                        >×</button>
                      ) : null}
                    </div>
                  ))}
                  {sourceLinks.length < 20 ? (
                    <button
                      type="button"
                      onClick={addSourceLink}
                      style={{ alignSelf: 'start', fontSize: '0.82rem' }}
                    >
                      + Add link
                    </button>
                  ) : null}
                </div>
                <small className="meta-line" style={{ marginTop: '0.25rem', display: 'block' }}>
                  Links to original sources, mirrors, or archive.org pages.
                </small>
              </div>
            ) : null}

            {postType === 'media' ? (
              <div>
                <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: '0.88rem' }}>
                  Upload Images{' '}
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(up to 30)</span>
                </p>
                <div
                  className="media-upload-zone"
                  onClick={() => mediaFileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') mediaFileRef.current?.click() }}
                >
                  {mediaPreviews.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <div>Click to select images</div>
                      <small className="meta-line">JPG, PNG, WebP, GIF · max 30 files · max 5 MB each</small>
                    </div>
                  ) : (
                    <div className="media-preview-grid" onClick={(e) => e.stopPropagation()}>
                      {mediaPreviews.map((src, i) => (
                        <div key={i} className="media-preview-item">
                          <img src={src} alt={`Preview ${i + 1}`} />
                          <button
                            type="button"
                            className="media-preview-remove"
                            onClick={(e) => { e.stopPropagation(); removeMediaFile(i) }}
                            aria-label="Remove image"
                          >×</button>
                        </div>
                      ))}
                      {mediaFiles.length < 30 ? (
                        <div
                          className="media-preview-add"
                          onClick={(e) => { e.stopPropagation(); mediaFileRef.current?.click() }}
                          role="button"
                          tabIndex={0}
                        >
                          + Add
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                <input
                  ref={mediaFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleMediaSelect}
                />
                {mediaFiles.length > 0 ? (
                  <small className="meta-line">
                    {mediaFiles.length}/30 image{mediaFiles.length !== 1 ? 's' : ''} selected
                  </small>
                ) : null}
              </div>
            ) : null}

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
            <p className="meta-line" style={{ marginTop: '0.4rem' }}>
              Status: {form.status} · submitted {new Date().toLocaleDateString()}
            </p>
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
