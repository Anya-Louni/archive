import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BadgeDisplay } from './BadgeDisplay'

export function AppShell({ user, badgeLabels, onLogout, children }) {
  const location = useLocation()
  const initials = (user?.username || 'A').slice(0, 2).toUpperCase()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setUserMenuOpen(false)
  }, [location.pathname])

  const isHomepage = location.pathname === '/homepage'

  return (
    <div className="app-shell">
      {!isHomepage && (
        <>
          <header className="site-header">
            {/* Banner zone: archive stamp + user account */}
            <div className="site-banner">
              <div className="site-banner-inner">
                <Link className="site-logo-link" to="/homepage" aria-label="Internet Artifact Archive — Home">
                  <span className="archive-logo-stamp site-logo-stamp">Internet Artifact Archive</span>
                </Link>

                <div className="site-header-right" ref={menuRef}>
                  {user ? (
                    <div className="user-menu-shell">
                      <button
                        type="button"
                        className="user-menu-trigger"
                        onClick={() => setUserMenuOpen((v) => !v)}
                        aria-expanded={userMenuOpen}
                        aria-haspopup="menu"
                        aria-label={`${user.username} — account menu`}
                      >
                        <span className="user-avatar-sm" aria-hidden="true">
                          {user.avatar_url
                            ? <img src={user.avatar_url} alt="" className="user-avatar-img" />
                            : initials
                          }
                        </span>
                        <span className="user-menu-name">{user.username}</span>
                        <span className="user-menu-caret" aria-hidden="true">▾</span>
                      </button>

                      {userMenuOpen ? (
                        <div className="user-menu-dropdown" role="menu">
                          <div className="user-menu-info">
                            <strong>{user.username}</strong>
                            <small className="meta-line">{user.email}</small>
                            {user.is_banned ? (
                              <small className="error-inline">Account restricted — read only</small>
                            ) : null}
                          </div>

                          {badgeLabels?.length ? (
                            <div className="user-menu-badges">
                              <BadgeDisplay badges={badgeLabels} max={4} size="sm" />
                            </div>
                          ) : null}

                          <nav className="user-menu-nav" aria-label="Account navigation">
                            <NavLink role="menuitem" to="/dashboard">Dashboard</NavLink>
                            <NavLink role="menuitem" to="/profile">Profile Settings</NavLink>
                            {user.is_admin ? (
                              <NavLink role="menuitem" to="/admin">Admin Panel</NavLink>
                            ) : null}
                            {!user.is_banned ? (
                              <NavLink role="menuitem" to="/post">Submit a Case</NavLink>
                            ) : null}
                          </nav>

                          <div className="user-menu-footer">
                            <button type="button" onClick={onLogout}>Sign Out</button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="auth-nav">
                      <Link className="auth-link" to="/auth">Sign In</Link>
                      <Link className="nav-join-btn" to="/auth?mode=register">Register</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation tab strip — classic forum nav bar */}
            <nav className="site-nav-strip" aria-label="Primary navigation">
              <div className="site-nav-inner">
                <NavLink
                  className={({ isActive }) => `site-nav-tab${isActive ? ' active' : ''}`}
                  to="/homepage"
                  end
                >
                  Home
                </NavLink>
                <NavLink
                  className={({ isActive }) => `site-nav-tab${isActive ? ' active' : ''}`}
                  to="/catalog"
                >
                  Browse Archive
                </NavLink>
                {user && !user.is_banned ? (
                  <NavLink
                    className={({ isActive }) => `site-nav-tab nav-tab-submit${isActive ? ' active' : ''}`}
                    to="/post"
                  >
                    + Submit Case
                  </NavLink>
                ) : null}
                {user?.is_admin ? (
                  <NavLink
                    className={({ isActive }) => `site-nav-tab${isActive ? ' active' : ''}`}
                    to="/admin"
                  >
                    ◆ Admin
                  </NavLink>
                ) : null}
              </div>
            </nav>
          </header>

          <div className="header-divider" aria-hidden="true" />
        </>
      )}

      <div className={`archive-app${isHomepage ? ' archive-app--no-header' : ''}`}>
        <main className="site-main">{children}</main>
      </div>
    </div>
  )
}
