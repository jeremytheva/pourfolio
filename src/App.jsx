import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from './lib/router.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MainLayout from './components/MainLayout.jsx'
import { useAuth } from './hooks/useAuth.js'
import { publicDocuments } from './data/publicDocuments.js'

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const BeerDetails = lazy(() => import('./pages/BeerDetails.jsx'))
const RateBeer = lazy(() => import('./pages/RateBeer.jsx'))
const Cellar = lazy(() => import('./pages/Cellar.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const PublicDocumentPage = lazy(() => import('./pages/PublicDocumentPage.jsx'))

const LoadingState = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50" role="status" aria-live="polite" aria-atomic="true">
    <div className="text-center">
      <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-b-amber-600" aria-hidden="true" />
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
  const publicDocumentPath = window.location.pathname.replace(/^\//, '')
  const isPublicDocument = Object.hasOwn(publicDocuments, publicDocumentPath)
  if (loading && !isPublicDocument) return <LoadingState />

  const protect = (element) => (
    <ProtectedRoute user={user} onLogout={signOut}>
      {element}
    </ProtectedRoute>
  )

  return (
    <ErrorBoundary fallbackMessage="Pourfolio encountered an unexpected error. Try again, or return home.">
      <BrowserRouter>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            {Object.entries(publicDocuments).map(([path, document]) => (
              <Route key={path} path={`/${path}`} element={<PublicDocumentPage document={document} />} />
            ))}
            <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
            <Route path="/home" element={protect(<HomePage />)} />
            <Route path="/search" element={protect(<HomePage searchMode />)} />
            <Route path="/products/:productId" element={protect(<BeerDetails />)} />
            <Route path="/products/:productId/rate" element={protect(<RateBeer />)} />
            <Route path="/cellar" element={protect(<Cellar />)} />
            <Route path="/profile" element={protect(<Profile />)} />
            <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
            <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
