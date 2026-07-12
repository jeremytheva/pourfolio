import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import MainLayout from './components/MainLayout'
import { useAuth } from './hooks/useAuth'

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const BeerDetails = lazy(() => import('./pages/BeerDetails'))
const RateBeer = lazy(() => import('./pages/RateBeer'))
const Profile = lazy(() => import('./pages/Profile'))
const ProducersList = lazy(() => import('./pages/ProducersList'))
const BreweryProfile = lazy(() => import('./pages/BreweryProfile'))
const StyleGuide = lazy(() => import('./pages/StyleGuide'))
const Chat = lazy(() => import('./pages/Chat'))
const Cellar = lazy(() => import('./pages/Cellar'))
const DrinkingBuddies = lazy(() => import('./pages/DrinkingBuddies'))
const Venues = lazy(() => import('./pages/Venues'))
const Events = lazy(() => import('./pages/Events'))
const EventDetails = lazy(() => import('./pages/EventDetails'))
const Search = lazy(() => import('./pages/Search'))
const Analytics = lazy(() => import('./pages/Analytics'))
const VenueManagement = lazy(() => import('./pages/VenueManagement'))

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

// Protected Route component
const ProtectedRoute = ({ children, user, onLogout }) => {
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return (
    <MainLayout user={user} onLogout={onLogout}>
      {children}
    </MainLayout>
  )
}

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <ErrorBoundary fallbackMessage="The application encountered an error. Please refresh the page.">
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route
                path="/login"
                element={user ? <Navigate to="/home" replace /> : <LoginPage />}
              />

              {/* Protected routes */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <HomePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/search"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <Search />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/events"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <Events />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/events/:eventId"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <EventDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/venue-management"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <VenueManagement user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/beer-details"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <BeerDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/rate-beer"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <RateBeer />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/producers"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <ProducersList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/producer/:producerId"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <BreweryProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/styles"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <StyleGuide />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cellar"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <Cellar />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/drinking-buddies"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <DrinkingBuddies />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/venues"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <Venues />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/chat"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <Chat />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute user={user} onLogout={signOut}>
                    <Profile user={user} />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App