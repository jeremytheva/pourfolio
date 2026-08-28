import React, { useMemo, useState } from 'react'
import { FiHome, FiLogOut, FiSearch, FiUser } from 'react-icons/fi'
import { Link, NavLink, useLocation } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import PublicDocumentLinks from './PublicDocumentLinks.jsx'

const navigation = [
  { to: '/home', label: 'Discover', icon: FiHome },
  { to: '/search', label: 'Search', icon: FiSearch },
  { to: '/cellar', label: 'Cellar', icon: FiUser }
]

const routeLabel = (pathname) => {
  if (pathname === '/home') return 'Discover'
  if (pathname === '/search') return 'Search'
  if (pathname === '/cellar') return 'Cellar'
  if (pathname === '/profile') return 'Profile and rating history'
  if (/^\/products\/[^/]+\/rate$/.test(pathname)) return 'Rate beer'
  if (/^\/products\/[^/]+$/.test(pathname)) return 'Product details'
  return 'Pourfolio'
}

function MainLayout({ children, user, onLogout }) {
  const { pathname } = useLocation()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const currentRouteLabel = useMemo(() => routeLabel(pathname), [pathname])

  const handleLogout = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await onLogout?.()
    } finally {
      setIsSigningOut(false)
    }
  }

  const focusRing = 'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2'

  return (
    <div className="min-h-screen bg-gray-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{currentRouteLabel}</p>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/home" className={`rounded-md text-2xl font-bold text-amber-700 ${focusRing}`}>Pourfolio</Link>
          <nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium sm:flex-none ${focusRing} ${
                  isActive ? 'bg-amber-100 text-amber-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <SafeIcon icon={item.icon} className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/profile" className={`max-w-32 truncate rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 ${focusRing}`}>
              {user?.name || 'Profile'}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              aria-busy={isSigningOut ? 'true' : undefined}
              className={`rounded-lg p-2 text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
              aria-label={isSigningOut ? 'Signing out' : 'Sign out'}
            >
              <SafeIcon icon={FiLogOut} className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <PublicDocumentLinks className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm text-gray-700 sm:px-6 lg:px-8" />
      </footer>
    </div>
  )
}

export default MainLayout