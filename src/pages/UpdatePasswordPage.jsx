import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionValid, setSessionValid] = useState(false)
  const navigate = useNavigate()

  const passwordType = useMemo(() => (showPassword ? 'text' : 'password'), [showPassword])

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setSessionValid(true)
      } else {
        setError('Session expired. Please request a new password reset link.')
      }
    }
    checkSession()
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      if (!password.trim() || !confirmPassword.trim()) {
        throw new Error('Please fill in all fields.')
      }

      if (password !== confirmPassword) {
        throw new Error('Password confirmation does not match.')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.')
      }

      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setNotice('Password updated successfully! Redirecting to login...')
      setTimeout(() => navigate('/auth'), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionValid) {
    return (
      <section className="card auth-card">
        <h2>Update Password</h2>
        {error ? <p className="error-inline">{error}</p> : <p>Checking session...</p>}
        <button className="linkish" onClick={() => navigate('/auth')}>
          Back to login
        </button>
      </section>
    )
  }

  return (
    <section className="card auth-card">
      <h2>Update Password</h2>
      <form className="ledger-form" onSubmit={submit}>
        <label>
          New Password *
          <div className="password-field">
            <input required minLength={6} type={passwordType} value={password} onChange={(e) => setPassword(e.target.value)} />
            <span
              className="eye-toggle"
              onClick={() => setShowPassword((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowPassword((v) => !v)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                  <path d="M9.8 5.2A10.2 10.2 0 0112 5c5.5 0 9.4 4.8 10 6.9a16.4 16.4 0 01-3.1 4.5" />
                  <path d="M6.2 6.2A16.2 16.2 0 002 12c.5 1.8 3.5 5.6 8.2 6.7" />
                </svg>
              ) : (
                <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </span>
          </div>
        </label>

        <label>
          Confirm Password *
          <div className="password-field">
            <input required minLength={6} type={passwordType} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <span
              className="eye-toggle"
              onClick={() => setShowPassword((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowPassword((v) => !v)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                  <path d="M9.8 5.2A10.2 10.2 0 0112 5c5.5 0 9.4 4.8 10 6.9a16.4 16.4 0 01-3.1 4.5" />
                  <path d="M6.2 6.2A16.2 16.2 0 002 12c.5 1.8 3.5 5.6 8.2 6.7" />
                </svg>
              ) : (
                <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </span>
          </div>
        </label>

        {error ? <p className="error-inline">{error}</p> : null}
        {notice ? <p>{notice}</p> : null}

        <button className="stamp-button" disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      <button className="linkish" onClick={() => navigate('/auth')}>
        Cancel
      </button>
    </section>
  )
}
