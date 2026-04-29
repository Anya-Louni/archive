import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatError } from '../lib/errorUtils'

export function AuthPage() {
  const [searchParams] = useSearchParams()
  const requestedMode = searchParams.get('mode')
  const intent = searchParams.get('intent')
  const [mode, setMode] = useState(requestedMode === 'register' ? 'register' : requestedMode === 'reset' ? 'reset' : 'login')
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', username: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  useEffect(() => {
    let active = true

    const redirectIfSignedIn = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active || !data.session?.user) return

      navigate(intent === 'post' ? '/post' : '/dashboard', { replace: true })
    }

    redirectIfSignedIn()

    return () => {
      active = false
    }
  }, [intent, navigate])

  const startCooldown = (seconds = 60) => {
    setCooldown(seconds)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const passwordType = useMemo(() => (showPassword ? 'text' : 'password'), [showPassword])

  const update = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const email = form.email.trim().toLowerCase()
      const username = form.username.trim()

      if (mode === 'register') {
        if (!username) {
          throw new Error('Please choose a username.')
        }

        if (form.password !== form.confirmPassword) {
          throw new Error('Password confirmation does not match.')
        }

        const { error: signError } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: { data: { username } },
        })
        if (signError) throw signError

        startCooldown(60)
        setNotice('Registration successful. You can sign in right away.')
        setMode('login')
        setForm({ email: '', password: '', confirmPassword: '', username: '' })
      } else if (mode === 'reset') {
        if (!email) {
          throw new Error('Please enter your email address.')
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        })
        if (resetError) throw resetError

        startCooldown(60)
        setNotice('Password reset link sent to your email. Check your inbox and follow the link to create a new password.')
        setMode('login')
        setForm({ email: '', password: '', confirmPassword: '', username: '' })
      } else {
        if (!email || !form.password.trim()) {
          throw new Error('Please enter both email and password.')
        }

        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        })
        if (loginError) throw loginError

        navigate(intent === 'post' ? '/post' : '/')
      }
    } catch (e) {
      if (e.status === 429 || /rate.limit|too many/i.test(e.message)) {
        setError('Too many requests. Please wait a minute and try again.')
        startCooldown(60)
      } else {
        setError(formatError(e))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h2>
        {mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : 'Reset Password'}
      </h2>
      <form className="ledger-form" onSubmit={submit}>
        {mode === 'register' && (
          <label>
            Username *
            <input required autoComplete="username" value={form.username} onChange={(e) => update('username', e.target.value)} />
          </label>
        )}

        <label>
          Email *
          <input required autoComplete="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </label>

        {mode !== 'reset' && (
          <>
            <label>
              Password *
              <div className="password-field">
                <input required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} type={passwordType} value={form.password} onChange={(e) => update('password', e.target.value)} />
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

            {mode === 'register' && (
              <label>
                Confirm Password *
                <div className="password-field">
                  <input required autoComplete="new-password" minLength={6} type={passwordType} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
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
            )}
          </>
        )}

        {error ? <p className="error-inline">{error}</p> : null}
        {notice ? <p>{notice}</p> : null}

        <button className="stamp-button" disabled={loading || cooldown > 0}>
          {loading ? 'Processing...' : cooldown > 0 ? `Try again in ${cooldown}s` : mode === 'login' ? 'Login' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {mode === 'login' && (
          <>
            <button className="linkish" onClick={() => { setMode('register'); setForm({ email: '', password: '', confirmPassword: '', username: '' }); setError(''); setNotice(''); }}>
              Need an account? Register
            </button>
            <button className="linkish" onClick={() => { setMode('reset'); setForm({ email: '', password: '', confirmPassword: '', username: '' }); setError(''); setNotice(''); }}>
              Forgot password? Reset it
            </button>
          </>
        )}
        {mode !== 'login' && (
          <button className="linkish" onClick={() => { setMode('login'); setForm({ email: '', password: '', confirmPassword: '', username: '' }); setError(''); setNotice(''); }}>
            Back to login
          </button>
        )}
      </div>
    </section>
  )
}
