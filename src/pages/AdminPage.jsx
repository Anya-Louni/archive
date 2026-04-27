import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BADGE_DEFINITIONS, getBadgeDef } from '../lib/badges'

function BarChart({ data, color = '#7a5c3e', height = 90 }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const n = data.length
  const W = 480
  const slotW = W / n
  const barW = Math.floor(slotW * 0.68)
  const gap = slotW - barW

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height + 30}`} className="admin-chart" aria-label="Bar chart">
      <line x1={0} y1={height} x2={W} y2={height} stroke="#b09070" strokeWidth="1" />
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d.value / max) * height), d.value > 0 ? 2 : 0)
        const x = i * slotW + gap / 2
        const y = height - barH
        return (
          <g key={d.key}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} opacity={d.value ? 0.9 : 0.15} />
            {i % 2 === 0 ? (
              <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="9" fill="#5a3a25">
                {d.label}
              </text>
            ) : null}
            {d.value > 0 ? (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="#3a2418" fontWeight="600">
                {d.value}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function HBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="hbar-chart">
      {data.map((d) => (
        <div key={d.label} className="hbar-row">
          <span className="hbar-label">{d.label}</span>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{ width: `${Math.round((d.value / max) * 100)}%`, background: d.color || '#7a5c3e' }}
            />
          </div>
          <span className="hbar-value">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function buildDailyData(rows, days = 14) {
  const today = new Date()
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
    result.push({ key, label, value: 0 })
  }
  ;(rows ?? []).forEach((row) => {
    const key = (row.created_at ?? '').slice(0, 10)
    const slot = result.find((r) => r.key === key)
    if (slot) slot.value += 1
  })
  return result
}

const STATUS_COLORS = {
  Unknown: '#6d5a45',
  'Under Investigation': '#55697a',
  Explained: '#4d6b53',
  Archived: '#7a4f4b',
}

export function AdminPage() {
  const [stats, setStats] = useState({ totalUsers: 0, totalArtifacts: 0 })
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [flaggedArtifacts, setFlaggedArtifacts] = useState([])
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [badgeEditUserId, setBadgeEditUserId] = useState(null)
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('info')
  const [loading, setLoading] = useState(false)
  const [artifactsByDay, setArtifactsByDay] = useState([])
  const [membersByDay, setMembersByDay] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState([])

  async function load() {
    setLoading(true)
    setNotice('')
    try {
      const cutoff14 = new Date()
      cutoff14.setDate(cutoff14.getDate() - 13)
      const cutoffStr = cutoff14.toISOString().slice(0, 10) + 'T00:00:00'

      const [
        userCountResult, artifactCountResult, userRowsResult, reportRowsResult,
        categoryRowsResult, flaggedRowsResult, artifactDailyResult, memberDailyResult,
        artifactStatusResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('artifacts').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('id,username,is_banned,is_admin,badges,created_at').order('created_at', { ascending: false }),
        supabase.from('reports').select('id,reason,status,created_at,artifacts(title),profiles!user_id(username)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id,name').order('name'),
        supabase.from('reports').select('id,artifact_id,reason,artifacts(id,title,status)').eq('status', 'Open').order('created_at', { ascending: false }),
        supabase.from('artifacts').select('created_at').gte('created_at', cutoffStr),
        supabase.from('profiles').select('created_at').gte('created_at', cutoffStr),
        supabase.from('artifacts').select('status'),
      ])

      if (userCountResult.error) throw userCountResult.error
      if (artifactCountResult.error) throw artifactCountResult.error
      if (userRowsResult.error) throw userRowsResult.error
      if (reportRowsResult.error) throw reportRowsResult.error
      if (categoryRowsResult.error) throw categoryRowsResult.error
      if (flaggedRowsResult.error) throw flaggedRowsResult.error

      setStats({ totalUsers: userCountResult.count ?? 0, totalArtifacts: artifactCountResult.count ?? 0 })
      setUsers(userRowsResult.data ?? [])
      setReports(reportRowsResult.data ?? [])
      setCategories(categoryRowsResult.data ?? [])

      setArtifactsByDay(buildDailyData(artifactDailyResult.data, 14))
      setMembersByDay(buildDailyData(memberDailyResult.data, 14))

      const statusCounts = {}
      ;(artifactStatusResult.data ?? []).forEach((r) => {
        const s = r.status || 'Unknown'
        statusCounts[s] = (statusCounts[s] || 0) + 1
      })
      setStatusBreakdown(
        Object.entries(statusCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || '#7a5c3e' })),
      )

      const unique = new Map()
      ;(flaggedRowsResult.data ?? []).forEach((r) => {
        if (r.artifacts?.id && !unique.has(r.artifacts.id)) {
          unique.set(r.artifacts.id, {
            id: r.artifacts.id,
            title: r.artifacts.title,
            status: r.artifacts.status,
            reason: r.reason,
          })
        }
      })
      setFlaggedArtifacts(Array.from(unique.values()))
    } catch (e) {
      setNotice(`Error loading admin data: ${e.message}`)
      setNoticeType('error')
      console.error('Admin load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const showNotice = (msg, type = 'info') => {
    setNotice(msg)
    setNoticeType(type)
  }

  const toggleBan = async (id, current) => {
    setNotice('')
    try {
      const { error } = await supabase.from('profiles').update({ is_banned: !current }).eq('id', id)
      if (error) throw error
      showNotice(`User ${current ? 'unbanned' : 'banned'} successfully.`, 'success')
      await load()
    } catch (e) {
      showNotice(`Error updating user: ${e.message}`, 'error')
    }
  }

  const resolveReport = async (id) => {
    setNotice('')
    try {
      const { error } = await supabase.from('reports').update({ status: 'Resolved' }).eq('id', id)
      if (error) throw error
      showNotice('Report resolved.', 'success')
      await load()
    } catch (e) {
      showNotice(`Error resolving report: ${e.message}`, 'error')
    }
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return
    setNotice('')
    const { error } = await supabase.from('categories').insert({ name: newCategory.trim() })
    if (error) {
      showNotice(error.message, 'error')
      return
    }
    setNewCategory('')
    showNotice('Category added.', 'success')
    load()
  }

  const startEditCategory = (category) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
  }

  const saveCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return
    setNotice('')
    const { error } = await supabase
      .from('categories')
      .update({ name: editingCategoryName.trim() })
      .eq('id', editingCategoryId)
    if (error) {
      showNotice(error.message, 'error')
      return
    }
    setEditingCategoryId(null)
    setEditingCategoryName('')
    showNotice('Category updated.', 'success')
    load()
  }

  const removeCategory = async (id) => {
    if (!window.confirm('Delete this category? This will fail if artifacts still reference it.')) return
    setNotice('')
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      showNotice(error.message, 'error')
      return
    }
    showNotice('Category removed.', 'success')
    load()
  }

  const deleteFlaggedArtifact = async (artifactId) => {
    if (!window.confirm('Delete this flagged artifact and all its related content?')) return
    setNotice('')
    const { error } = await supabase.from('artifacts').delete().eq('id', artifactId)
    if (error) {
      showNotice(error.message, 'error')
      return
    }
    showNotice('Artifact deleted.', 'success')
    load()
  }

  const awardBadge = async (userId, badgeId) => {
    const target = users.find((u) => u.id === userId)
    if (!target) return
    const current = target.badges ?? []
    if (current.includes(badgeId)) return
    const next = [...current, badgeId]
    const { error } = await supabase.from('profiles').update({ badges: next }).eq('id', userId)
    if (error) { showNotice(error.message, 'error'); return }
    showNotice(`Badge "${badgeId}" awarded.`, 'success')
    load()
  }

  const removeBadge = async (userId, badgeId) => {
    const target = users.find((u) => u.id === userId)
    if (!target) return
    const next = (target.badges ?? []).filter((b) => b !== badgeId)
    const { error } = await supabase.from('profiles').update({ badges: next }).eq('id', userId)
    if (error) { showNotice(error.message, 'error'); return }
    showNotice(`Badge "${badgeId}" removed.`, 'success')
    load()
  }

  return (
    <section className="stack-gap">
      <div className="page-header">
        <div>
          <h1>Admin Panel</h1>
          <p>
            {stats.totalUsers} registered member{stats.totalUsers !== 1 ? 's' : ''} ·{' '}
            {stats.totalArtifacts} artifact{stats.totalArtifacts !== 1 ? 's' : ''} in archive ·{' '}
            {reports.filter((r) => r.status === 'Open').length} open report{reports.filter((r) => r.status === 'Open').length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {notice ? <div className={`notice-box ${noticeType}`} role="alert">{notice}</div> : null}
      {loading ? <p className="meta-line">Loading admin data…</p> : null}

      {/* Activity Overview */}
      {artifactsByDay.length ? (
        <article className="card">
          <h3>Activity Overview — last 14 days</h3>
          <div className="admin-charts-grid">
            <div className="admin-chart-wrap">
              <h4>New Cases Filed</h4>
              <BarChart data={artifactsByDay} color="#7a5c3e" />
            </div>
            <div className="admin-chart-wrap">
              <h4>New Members Joined</h4>
              <BarChart data={membersByDay} color="#a12a23" />
            </div>
          </div>
          {statusBreakdown.length ? (
            <div style={{ marginTop: '1.1rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--rust-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                Cases by Status
              </p>
              <HBarChart data={statusBreakdown} />
            </div>
          ) : null}
        </article>
      ) : null}

      {/* Users */}
      <article className="card">
        <h3>User Management</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Badges</th>
                <th>Admin</th>
                <th>Banned</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <>
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', alignItems: 'center' }}>
                        {(u.badges ?? []).map((b) => {
                          const def = getBadgeDef(b)
                          return (
                            <span
                              key={b}
                              className="badge-chip badge-row--sm"
                              style={def ? { color: def.color, background: def.bg, borderColor: def.border } : undefined}
                            >
                              {b}
                            </span>
                          )
                        })}
                        {!(u.badges?.length) ? <span className="meta-line">—</span> : null}
                      </div>
                    </td>
                    <td>{u.is_admin ? 'Yes' : '—'}</td>
                    <td>{u.is_banned ? <span style={{ color: '#a12a23', fontWeight: 600 }}>Banned</span> : '—'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        onClick={() => setBadgeEditUserId(badgeEditUserId === u.id ? null : u.id)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        {badgeEditUserId === u.id ? 'Close' : 'Badges'}
                      </button>
                      {!u.is_admin ? (
                        <button
                          type="button"
                          className={u.is_banned ? '' : 'danger'}
                          onClick={() => toggleBan(u.id, u.is_banned)}
                        >
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      ) : (
                        <span className="meta-line">Admin</span>
                      )}
                    </td>
                  </tr>
                  {badgeEditUserId === u.id ? (
                    <tr key={`${u.id}-badges`}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div className="badge-manage-row">
                          <p className="meta-line" style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Manage badges for <strong>{u.username}</strong>
                          </p>

                          {(u.badges ?? []).length ? (
                            <div style={{ marginBottom: '0.55rem' }}>
                              <p className="badge-section-label">Current badges</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem' }}>
                                {(u.badges ?? []).map((b) => {
                                  const def = getBadgeDef(b)
                                  return (
                                    <span
                                      key={b}
                                      className="badge-chip badge-row--sm"
                                      style={def ? { color: def.color, background: def.bg, borderColor: def.border } : undefined}
                                    >
                                      {b}
                                      <button
                                        type="button"
                                        className="badge-remove-btn"
                                        title={`Remove ${b}`}
                                        onClick={() => removeBadge(u.id, b)}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="meta-line" style={{ marginBottom: '0.4rem', fontSize: '0.82rem' }}>No badges yet.</p>
                          )}

                          <p className="badge-section-label">Award badge</p>
                          <div className="badge-available-grid">
                            {BADGE_DEFINITIONS.filter((def) => !(u.badges ?? []).includes(def.id)).map((def) => (
                              <button
                                key={def.id}
                                type="button"
                                className="badge-chip badge-add-chip badge-row--sm"
                                style={{ color: def.color, background: def.bg, borderColor: def.border }}
                                title={def.description}
                                onClick={() => awardBadge(u.id, def.id)}
                              >
                                + {def.id}
                              </button>
                            ))}
                            {BADGE_DEFINITIONS.every((def) => (u.badges ?? []).includes(def.id)) ? (
                              <span className="meta-line" style={{ fontSize: '0.82rem' }}>All badges awarded.</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </>
              ))}
              {!users.length ? (
                <tr><td colSpan={6} className="meta-line">No users found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      {/* Reports queue */}
      <article className="card">
        <h3>Reports Queue</h3>
        {reports.filter((r) => r.status === 'Open').length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Reporter</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.filter((r) => r.status === 'Open').map((r) => (
                  <tr key={r.id}>
                    <td>{r.artifacts?.title ?? '—'}</td>
                    <td>{r.profiles?.username ?? '—'}</td>
                    <td>{r.reason}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <button type="button" onClick={() => resolveReport(r.id)}>Resolve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="meta-line">No open reports.</p>
        )}
      </article>

      {/* Flagged content */}
      {flaggedArtifacts.length ? (
        <article className="card">
          <h3>Flagged Content</h3>
          <p className="meta-line" style={{ marginBottom: '0.65rem' }}>
            Artifacts with open reports. Review before deleting.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Status</th>
                  <th>Report reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {flaggedArtifacts.map((f) => (
                  <tr key={f.id}>
                    <td>{f.title}</td>
                    <td>{f.status}</td>
                    <td>{f.reason}</td>
                    <td>
                      <button type="button" className="danger" onClick={() => deleteFlaggedArtifact(f.id)}>
                        Delete post
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {/* Category management */}
      <article className="card">
        <h3>Manage Categories</h3>
        <div className="inline-form" style={{ marginBottom: '0.85rem' }}>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name…"
            maxLength={100}
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory() }}
          />
          <button type="button" onClick={addCategory}>Add Category</button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
          {categories.map((c) => (
            <li key={c.id} className="category-item">
              {editingCategoryId === c.id ? (
                <>
                  <input
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    maxLength={100}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={saveCategory}>Save</button>
                  <button type="button" onClick={() => { setEditingCategoryId(null); setEditingCategoryName('') }}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <button type="button" onClick={() => startEditCategory(c)}>Edit</button>
                  <button type="button" className="danger" onClick={() => removeCategory(c.id)}>Remove</button>
                </>
              )}
            </li>
          ))}
          {!categories.length ? <li className="meta-line">No categories found.</li> : null}
        </ul>
      </article>
    </section>
  )
}
