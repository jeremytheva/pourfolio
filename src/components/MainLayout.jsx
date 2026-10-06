import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiBookOpen, FiClock, FiCompass, FiHome, FiLayers, FiLogOut, FiMapPin, FiPlusCircle, FiSearch, FiSettings, FiUser } from 'react-icons/fi'
import { Link, NavLink, useLocation } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import PublicDocumentLinks from './PublicDocumentLinks.jsx'

const primaryNavigation = [
  { to: '/home', label: 'Discover', icon: FiHome },
  { to: '/places', label: 'Breweries & Venues', icon: FiMapPin },
  { to: '/search', label: 'Search', icon: FiSearch },
  { to: '/cellar', label: 'Cellar', icon: FiUser }
]

const exploreNavigation = [
  { to: '/styles', label: 'Styles', icon: FiBookOpen },
  { to: '/taste-map', label: 'Beer Passport', icon: FiCompass },
  { to: '/history', label: 'Historical Feed', icon: FiClock },
  { to: '/products/propose', label: 'Add Beer', icon: FiPlusCircle },
  { to: '/features', label: "What's next", icon: FiLayers }
]

const routeLabel = (pathname) => {
  if (pathname === '/home') return 'Discover'
  if (pathname === '/styles') return 'Beer styles'
  if (/^\/styles\/[^/]+$/.test(pathname)) return 'Beer style details'
  if (pathname === '/taste-map') return 'Taste Map and Beer Passport'
  if (pathname === '/features') return 'Feature roadmap'
  if (pathname === '/brew-done-it') return 'Brew Done It'
  if (pathname === '/places') return 'Breweries and venues'
  if (pathname === '/search') return 'Search'
  if (pathname === '/products/propose') return 'Add beer proposal'
  if (pathname === '/cellar') return 'Cellar'
  if (pathname === '/history') return 'Historical Feed'
  if (pathname === '/profile') return 'Profile and rating history'
  if (pathname === '/settings') return 'Rating settings'
  if (/^\/products\/[^/]+\/rate$/.test(pathname)) return 'Rate beer'
  if (/^\/products\/[^/]+$/.test(pathname)) return 'Product details'
  if (/^\/breweries\/[^/]+$/.test(pathname)) return 'Brewery details'
  return 'Pourfolio'
}

function MainLayout({ children, user, onLogout }) {
  const { pathname } = useLocation()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const signOutErrorRef = useRef(null)
  const mainContentRef = useRef(null)
  const previousPathnameRef = useRef(pathname)
  const currentRouteLabel = useMemo(() => routeLabel(pathname), [pathname])

  useEffect(() => {
    if (signOutError) signOutErrorRef.current?.focus()
  }, [signOutError])

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname
    const mainContent = mainContentRef.current
    if (!mainContent || mainContent.contains(document.activeElement)) return
    mainContent.focus()
  }, [pathname])

  const handleLogout = async () => {
    if (isSigningOut) return
    setSignOutError('')
    setIsSigningOut(true)
    try {
      const result = await onLogout?.()
      if (result?.error) setSignOutError(result.error.message || 'Sign out failed. Please try again.')
    } catch {
      setSignOutError('Sign out failed. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  const focusRing = 'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2'

  return (
    <div className="min-h-screen bg-gray-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{currentRouteLabel}</p>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/home" className={`rounded-md text-2xl font-bold text-amber-700 ${focusRing}`}>Pourfolio</Link>
          <nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {primaryNavigation.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium sm:flex-none ${focusRing} ${isActive ? 'bg-amber-100 text-amber-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                <SafeIcon icon={item.icon} className="h-4 w-4" />{item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/profile" className={`max-w-32 truncate rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 ${focusRing}`}>{user?.name || 'Profile'}</Link>
            <Link to="/settings" aria-label="Rating settings" className={`rounded-lg p-2 text-gray-600 hover:bg-amber-50 hover:text-amber-800 ${focusRing}`}>
              <SafeIcon icon={FiSettings} className="h-5 w-5" />
            </Link>
            <button type="button" onClick={handleLogout} disabled={isSigningOut} aria-busy={isSigningOut ? 'true' : undefined} className={`rounded-lg p-2 text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-60 ${focusRing}`} aria-label={isSigningOut ? 'Signing out' : 'Sign out'}>
              <SafeIcon icon={FiLogOut} className="h-5 w-5" />
            </button>
          </div>
        </div>
        {signOutError && <div ref={signOutErrorRef} tabIndex={-1} role="alert" className="mx-auto max-w-7xl px-4 pb-3 text-sm font-medium text-red-700 outline-none focus:ring-2 focus:ring-red-300 sm:px-6 lg:px-8">{signOutError}</div>}
        <div className="border-t border-gray-100 bg-gray-50/80">
          <nav aria-label="Explore navigation" className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            <span className="mr-2 min-w-max text-xs font-semibold uppercase tracking-wide text-gray-500">Explore</span>
            {exploreNavigation.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${focusRing} ${isActive ? 'bg-white text-amber-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}>
                <SafeIcon icon={item.icon} className="h-4 w-4" />{item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main ref={mainContentRef} id="main-content" tabIndex={-1} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <PublicDocumentLinks className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm text-gray-700 sm:px-6 lg:px-8" />
      </footer>
    </div>
  )
}

export default MainLayout
