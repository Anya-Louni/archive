import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatError, logError } from '../lib/errorUtils'
import { supabase } from '../lib/supabase'
import { BadgeDisplay } from '../components/BadgeDisplay'

export function DashboardPage({ user }) {
  const [stats, setStats] = useState({ artifacts: 0, analyses: 0, upvotes: 0 })
  const [artifacts, setArtifacts] = useState([])
  const [contributions, setContributions] = useState([])
  const [collections, setCollections] = useState([])
  const [newCollectionName, setNewCollectionName] = useState('')
  const [selectedCollection, setSelectedCollection] = useState('')
  const [selectedArtifactId, setSelectedArtifactId] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('info')
  const navigate = useNavigate()

  async function load() {
    setNotice('')
    try {
      const [artifactsResult, analysesResult, upvotesResult, collectionsResult] = await Promise.all([
        supabase
          .from('artifacts')
          .select('id,title,created_at,status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('analyses')
          .select('id,artifact_id,created_at,artifacts(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('artifact_votes')
          .select('artifact_id')
          .eq('value', 1)
          .eq('artifact_owner_id', user.id),
        supabase
          .from('collections')
          .select('id,name,description,collection_items(artifact_id,artifacts(title))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (artifactsResult.error) throw artifactsResult.error
      if (analysesResult.error) throw analysesResult.error
      if (upvotesResult.error) throw upvotesResult.error
      if (collectionsResult.error) throw collectionsResult.error

      setArtifacts(artifactsResult.data ?? [])
      setContributions((analysesResult.data ?? []).map((a) => ({
        id: a.id,
        artifact: a.artifacts?.title ?? `Artifact #${a.artifact_id}`,
        artifactId: a.artifact_id,
        type: 'Analysis',
        date: new Date(a.created_at).toLocaleDateString(),
      })))
      setStats({
        artifacts: artifactsResult.data?.length ?? 0,
        analyses: analysesResult.data?.length ?? 0,
        upvotes: upvotesResult.data?.length ?? 0,
      })
      setCollections(collectionsResult.data ?? [])
      if (!selectedCollection && collectionsResult.data?.length) {
        setSelectedCollection(String(collectionsResult.data[0].id))
      }
    } catch (e) {
      logError('DashboardPage: load', e)
      setNotice(formatError(e))
      setNoticeType('error')
    }
  }

  useEffect(() => {
    load()
  }, [user.id])

  const showNotice = (message, type = 'info') => {
    setNotice(message)
    setNoticeType(type)
  }

  const createCollection = async () => {
    if (!newCollectionName.trim()) {
      showNotice('Collection name is required.', 'error')
      return
    }
    setNotice('')
    try {
      const { error } = await supabase.from('collections').insert({
        user_id: user.id,
        name: newCollectionName.trim(),
        description: null,
      })
      if (error) throw error
      setNewCollectionName('')
      showNotice('Collection created.', 'success')
      await load()
    } catch (e) {
      logError('DashboardPage: createCollection', e)
      showNotice(formatError(e), 'error')
    }
  }

  const addArtifactToCollection = async () => {
    if (!selectedCollection || !selectedArtifactId) {
      showNotice('Select both a collection and an artifact.', 'error')
      return
    }
    setNotice('')
    try {
      const { error } = await supabase.from('collection_items').upsert({
        collection_id: Number(selectedCollection),
        artifact_id: Number(selectedArtifactId),
      })
      if (error) throw error
      showNotice('Artifact added to collection.', 'success')
      await load()
    } catch (e) {
      logError('DashboardPage: addArtifactToCollection', e)
      showNotice(formatError(e), 'error')
    }
  }

  const removeCollectionItem = async (collectionId, artifactId) => {
    setNotice('')
    try {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('artifact_id', artifactId)
      if (error) throw error
      await load()
    } catch (e) {
      logError('DashboardPage: removeCollectionItem', e)
      showNotice(formatError(e), 'error')
    }
  }

  return (
    <section className="community-layout">
      {/* Sidebar stats */}
      <aside className="card community-side">
        <h3 style={{ margin: '0 0 0.7rem' }}>Profile Snapshot</h3>
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          <div>
            <strong style={{ fontSize: '1.05rem' }}>{user.username}</strong>
            <p className="meta-line" style={{ margin: '0.1rem 0 0' }}>{user.email}</p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.55rem', display: 'grid', gap: '0.28rem' }}>
            <p className="meta-line" style={{ margin: 0 }}>
              <strong>{stats.artifacts}</strong> artifact{stats.artifacts !== 1 ? 's' : ''} posted
            </p>
            <p className="meta-line" style={{ margin: 0 }}>
              <strong>{stats.analyses}</strong> analys{stats.analyses !== 1 ? 'es' : 'is'} submitted
            </p>
            <p className="meta-line" style={{ margin: 0 }}>
              <strong>{stats.upvotes}</strong> upvotes received
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.55rem' }}>
            <p className="badge-section-label">Badges</p>
            <BadgeDisplay badges={user.badges} size="sm" showEmpty />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.55rem', display: 'grid', gap: '0.4rem' }}>
            <Link className="stamp-button" to="/post" style={{ justifyContent: 'center' }}>
              Submit a Case
            </Link>
            <Link className="stamp-button" to="/profile" style={{ justifyContent: 'center' }}>
              Profile Settings
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="stack-gap">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Manage your cases, collections, and contributions.</p>
          </div>
        </div>

        {notice ? (
          <div className={`notice-box ${noticeType}`} role="alert">{notice}</div>
        ) : null}

        {/* Your artifacts */}
        <article className="card">
          <h3>Your Posted Cases</h3>
          {artifacts.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Filed</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>
                        <span className={`status-chip status-${(item.status || 'Unknown').replace(/\s+/g, '-').toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td>
                        <button type="button" className="mini-btn" onClick={() => navigate(`/artifact/${item.id}`)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="meta-line">
              No cases posted yet.{' '}
              {!user.is_banned ? <Link to="/post">Submit your first case →</Link> : null}
            </p>
          )}
        </article>

        {/* Collections */}
        <article className="card">
          <h3>Curator Collections</h3>
          <p className="meta-line" style={{ marginBottom: '0.75rem' }}>
            Organize artifacts into themed collections. Curating 1+ collection earns the Curator badge.
          </p>

          <div className="inline-form" style={{ marginBottom: '0.8rem' }}>
            <input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="New collection name…"
              maxLength={200}
              onKeyDown={(e) => { if (e.key === 'Enter') createCollection() }}
            />
            <button type="button" onClick={createCollection}>Create</button>
          </div>

          {collections.length ? (
            <>
              <div className="grid-two" style={{ marginBottom: '0.55rem' }}>
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  aria-label="Select collection"
                >
                  <option value="">Choose collection</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
                <select
                  value={selectedArtifactId}
                  onChange={(e) => setSelectedArtifactId(e.target.value)}
                  aria-label="Select artifact to add"
                >
                  <option value="">Choose an artifact you posted</option>
                  {artifacts.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <button type="button" onClick={addArtifactToCollection}>Add to collection</button>
              </div>

              <div className="stack-gap-sm">
                {collections.map((col) => (
                  <div key={col.id} className="analysis-item">
                    <strong>{col.name}</strong>
                    <span className="meta-line" style={{ marginLeft: '0.5rem' }}>
                      ({(col.collection_items ?? []).length} item{(col.collection_items ?? []).length !== 1 ? 's' : ''})
                    </span>
                    <ul style={{ marginTop: '0.3rem', paddingLeft: '1rem' }}>
                      {(col.collection_items ?? []).map((ci) => (
                        <li key={`${col.id}-${ci.artifact_id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                          <span>{ci.artifacts?.title ?? `Artifact #${ci.artifact_id}`}</span>
                          <button
                            type="button"
                            className="mini-btn danger"
                            onClick={() => removeCollectionItem(col.id, ci.artifact_id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                      {!(col.collection_items ?? []).length ? (
                        <li className="meta-line">No artifacts in this collection yet.</li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="meta-line">No collections yet. Create one above.</p>
          )}
        </article>

        {/* Contributions */}
        {contributions.length ? (
          <article className="card">
            <h3>Your Contributions</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Artifact</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.id}>
                      <td>{c.artifact}</td>
                      <td>{c.type}</td>
                      <td>{c.date}</td>
                      <td>
                        <button type="button" className="mini-btn" onClick={() => navigate(`/artifact/${c.artifactId}`)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  )
}
