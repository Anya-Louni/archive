import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AppShell } from './components/AppShell'
import { AuthPage } from './pages/AuthPage'
import { UpdatePasswordPage } from './pages/UpdatePasswordPage'
import { ArtifactPage } from './pages/ArtifactPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminPage } from './pages/AdminPage'
import { ProfilePage } from './pages/ProfilePage'
import { PostPage } from './pages/PostPage'
import { HomePage } from './pages/HomePage'
import { CatalogPage } from './pages/CatalogPage'

const INIT_TIMEOUT_MS = 12000
const INIT_RETRIES = 1

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/auth" replace />
  if (!user.email_confirmed_at) {
    return (
      <div className="card" style={{ margin: '2rem', padding: '2rem' }}>
        <h2>Email Verification Required</h2>
        <p className="meta-line">
          Please verify your email address before accessing this feature.
        </p>
        <p className="meta-line">Check your email for a verification link.</p>
      </div>
    )
  }
  return children
}

function AdminRoute({ user, children }) {
  if (!user) return <Navigate to="/auth" replace />
  if (!user.is_admin) return <Navigate to="/homepage" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState('')
  const [dismissedInitNotice, setDismissedInitNotice] = useState(false)
  const navigate = useNavigate()

  const user = useMemo(() => {
    if (!session?.user) return null
    const fallbackUsername = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'archivist'
    return {
      id: session.user.id,
      email: session.user.email,
      email_confirmed_at: session.user.email_confirmed_at,
      username: profile?.username ?? fallbackUsername,
      avatar_url: session.user.user_metadata?.avatar_url || null,
      is_admin: profile?.is_admin ?? false,
      is_banned: profile?.is_banned ?? false,
      badges: profile?.badges || [],
    }
  }, [session, profile])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id,username,is_admin,is_banned,badges')
      .eq('id', userId)
      .single()

    setProfile(data ?? null)
  }

  async function withTimeout(promise, message) {
    let timeoutId
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), INIT_TIMEOUT_MS)
    })

    try {
      return await Promise.race([promise, timeout])
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async function withRetry(task, retries = INIT_RETRIES) {
    let lastError

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await task()
      } catch (error) {
        lastError = error
        if (attempt === retries) break
      }
    }

    throw lastError
  }

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const { data, error } = await withRetry(() => withTimeout(
          supabase.auth.getSession(),
          'Session request timed out. Please check your network/Supabase settings.',
        ))
        if (!mounted) return
        if (error) throw error

        setSession(data.session)
        if (data.session?.user) {
          try {
            await withTimeout(
              fetchProfile(data.session.user.id),
              'Profile request timed out. Limited mode enabled.',
            )
          } catch (profileError) {
            console.warn('Profile load failed at bootstrap:', profileError)
            setInitError('Profile sync is temporarily unavailable. You can keep browsing.')
            setDismissedInitNotice(false)
          }
        }
      } catch (e) {
        console.error('Session bootstrap failed:', e)
        if (mounted) {
          setInitError('Sign-in service is temporarily unavailable. Retrying usually resolves this in a moment. Browsing mode is still on.')
          setDismissedInitNotice(false)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_, nextSession) => {
      try {
        setSession(nextSession)
        if (nextSession?.user) {
          await withTimeout(
            fetchProfile(nextSession.user.id),
            'Profile refresh timed out. Limited mode enabled.',
          )
        } else {
          setProfile(null)
        }
      } catch (e) {
        console.warn('Profile refresh failed on auth state change:', e)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const onLogout = async () => {
    await supabase.auth.signOut()
    navigate('/homepage')
  }

  if (loading) return <div className="loading-note">Loading archive index...</div>

  return (
    <AppShell user={user} badgeLabels={user?.badges} onLogout={onLogout}>
      {initError && !dismissedInitNotice ? (
        <div className="init-status-note" role="status" aria-live="polite">
          <span>{initError}</span>
          <button type="button" onClick={() => setDismissedInitNotice(true)}>Dismiss</button>
        </div>
      ) : null}
      <Routes>
        <Route path="/" element={<Navigate to="/homepage" replace />} />
        <Route path="/homepage" element={<HomePage user={user} />} />
        <Route path="/catalog" element={<CatalogPage user={user} />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
        <Route path="/artifact/:artifactId" element={<ArtifactPage user={user} />} />
        <Route
          path="/post"
          element={
            <ProtectedRoute user={user}>
              <PostPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <DashboardPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <ProfilePage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute user={user}>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Routes>
    </AppShell>
  )
}
