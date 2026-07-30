import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from './lib/router.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MainLayout from './components/MainLayout.jsx'
import { useAuth } from './hooks/useAuth.js'

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const BeerDetails = lazy(() => import('./pages/BeerDetails.jsx'))
const RateBeer = lazy(() => import('./pages/RateBeer.jsx'))
const Cellar = lazy(() => import('./pages/Cellar.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const BrewDoneIt = lazy(() => import('./pages/BrewDoneIt.jsx'))

const LoadingState = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50" role="status" aria-live="polite">
    <div className="text-center">
      <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-b-amber-600" />
      <p className="text-gray-600">Loading Pourfolio…</p>
    </div>
  </div>
)

function ProtectedRoute({ user, onLogout, children }) {
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <MainLayout user={user} onLogout={onLogout}>{children}</MainLayout>
}

function App() {
  const { user, loading, signOut } = useAuth()
  if (loading) return <LoadingState />

  const protect = (element) => (
    <ProtectedRoute user={user} onLogout={signOut}>
      {element}
    </ProtectedRoute>
  )

  return (
    <ErrorBoundary fallbackMessage="Pourfolio encountered an unexpected error. Refresh the page to try again.">
      <BrowserRouter>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
            <Route path="/home" element={protect(<HomePage />)} />
            <Route path="/search" element={protect(<HomePage searchMode />)} />
            <Route path="/products/:productId" element={protect(<BeerDetails />)} />
            <Route path="/products/:productId/rate" element={protect(<RateBeer />)} />
            <Route path="/cellar" element={protect(<Cellar />)} />
            <Route path="/profile" element={protect(<Profile />)} />
            <Route path="/brew-done-it" element={protect(<BrewDoneIt user={user} />)} />
            <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
            <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
