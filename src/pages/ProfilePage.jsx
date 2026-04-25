import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BadgeDisplay } from '../components/BadgeDisplay'

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 102.8 2.8" />
        <path d="M9.8 5.2A10.2 10.2 0 0112 5c5.5 0 9.4 4.8 10 6.9a16.4 16.4 0 01-3.1 4.5" />
        <path d="M6.2 6.2A16.2 16.2 0 002 12c.5 1.8 3.5 5.6 8.2 6.7" />
      </svg>
    )
  }
  return (
    <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PasswordField({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="password-field">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minLength={6}
      />
      <span
        className="eye-toggle"
        onClick={() => setShow((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setShow((v) => !v)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <EyeIcon visible={show} />
      </span>
    </div>
  )
}

export function ProfilePage({ user }) {
  const [profileForm, setProfileForm] = useState({ username: '', bio: '' })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('info')
  const navigate = useNavigate()

  const setField = (field, value) => setProfileForm((old) => ({ ...old, [field]: value }))

  const showNotice = (msg, type = 'info') => {
    setNotice(msg)
    setNoticeType(type)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('username,bio')
        .eq('id', user.id)
        .single()
      setProfileForm({
        username: data?.username ?? '',
        bio: data?.bio ?? '',
      })
    }
    load()
  }, [user.id])

  const saveProfile = async () => {
    setNotice('')
    const nextUsername = profileForm.username.trim()
    if (!nextUsername) {
      showNotice('Username is required.', 'error')
      return
    }
    if (nextUsername.length < 2 || nextUsername.length > 50) {
      showNotice('Username must be 2–50 characters.', 'error')
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ username: nextUsername, bio: profileForm.bio.trim() || null })
      .eq('id', user.id)

    showNotice(error ? error.message : 'Profile updated successfully.', error ? 'error' : 'success')
  }

  const updatePassword = async () => {
    setNotice('')
    if (newPassword.length < 6) {
      showNotice('Password must be at least 6 characters.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showNotice('Passwords do not match.', 'error')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    showNotice(error ? error.message : 'Password updated successfully.', error ? 'error' : 'success')
    if (!error) {
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm('This permanently deletes your account and all your contributions. This cannot be undone. Continue?')) return

    const { error } = await supabase.rpc('delete_own_user')
    if (error) {
      showNotice(error.message, 'error')
      return
    }

    await supabase.auth.signOut()
    navigate('/homepage')
  }

  return (
    <section className="community-layout">
      {/* Sidebar identity card */}
      <aside className="card community-side">
        <h3 style={{ margin: '0 0 0.7rem' }}>Identity Card</h3>
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          <div>
            <strong style={{ fontSize: '1.05rem' }}>{profileForm.username || user.username}</strong>
            <p className="meta-line" style={{ margin: '0.1rem 0 0' }}>{user.email}</p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
            <p className="badge-section-label">Badges</p>
            <BadgeDisplay badges={user.badges} size="sm" showEmpty />
            {!user.badges?.length ? (
              <p className="meta-line" style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>
                Submit cases and analyses to earn badges.
              </p>
            ) : null}
          </div>

          {profileForm.bio ? (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.45 }}>{profileForm.bio}</p>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main content */}
      <div className="stack-gap">
        <div className="page-header">
          <div>
            <h1>Profile Settings</h1>
            <p>Update your username, bio, and account credentials.</p>
          </div>
        </div>

        {notice ? (
          <div className={`notice-box ${noticeType}`} role="alert">{notice}</div>
        ) : null}

        {/* Profile info */}
        <article className="card">
          <h3>Public Profile</h3>
          <div className="ledger-form">
            <label htmlFor="profile-username">
              Username *
              <input
                id="profile-username"
                value={profileForm.username}
                onChange={(e) => setField('username', e.target.value)}
                maxLength={50}
                placeholder="2–50 characters"
              />
              <small className="meta-line">{profileForm.username.length}/50 characters</small>
            </label>
            <label htmlFor="profile-bio">
              Bio
              <textarea
                id="profile-bio"
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setField('bio', e.target.value)}
                maxLength={500}
                placeholder="Optional. Up to 500 characters."
              />
              <small className="meta-line">{profileForm.bio.length}/500 characters</small>
            </label>
            <button type="button" className="stamp-button" onClick={saveProfile}>Save Profile</button>
          </div>
        </article>

        {/* Password update */}
        <article className="card">
          <h3>Change Password</h3>
          <div className="ledger-form">
            <label htmlFor="new-password">
              New password (min 6 characters)
              <PasswordField
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
            </label>
            <label htmlFor="confirm-password">
              Confirm new password
              <PasswordField
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </label>
            <button type="button" className="stamp-button" onClick={updatePassword}>Update Password</button>
          </div>
        </article>

        {/* Danger zone */}
        <article className="card danger-zone">
          <h3>Danger Zone</h3>
          <p>
            Permanently removes your profile, all posted artifacts, analyses, votes, comments,
            and related records. <strong>This cannot be undone.</strong>
          </p>
          <button type="button" className="danger" onClick={deleteAccount}>Delete My Account</button>
        </article>
      </div>
    </section>
  )
}
