import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const BeerDetails = lazy(() => import('./pages/BeerDetails'));
const RateBeer = lazy(() => import('./pages/RateBeer'));
const Profile = lazy(() => import('./pages/Profile'));
const ProducersList = lazy(() => import('./pages/ProducersList'));
const BreweryProfile = lazy(() => import('./pages/BreweryProfile'));
const StyleGuide = lazy(() => import('./pages/StyleGuide'));
const Chat = lazy(() => import('./pages/Chat'));
const Cellar = lazy(() => import('./pages/Cellar'));
const DrinkingBuddies = lazy(() => import('./pages/DrinkingBuddies'));
const Venues = lazy(() => import('./pages/Venues'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Search = lazy(() => import('./pages/Search'));
const VenueManagement = lazy(() => import('./pages/VenueManagement'));

function App() {
  const [user, setUser] = useState(null);
  const [basename] = useState(() => {
    if (typeof document !== 'undefined') {
      const baseElement = document.querySelector('base');

      if (baseElement) {
        const href = baseElement.getAttribute('href');

        if (href) {
          try {
            const baseURL = new URL(href, window.location.origin).pathname;

            return baseURL.endsWith('/') && baseURL.length > 1
              ? baseURL.slice(0, -1)
              : baseURL;
          } catch (error) {
            console.warn('Failed to resolve base href for router basename:', error);
          }
        }
      }
    }

    const envBase = import.meta.env.BASE_URL || '/';

    if (envBase === './') {
      if (typeof window !== 'undefined') {
        return window.location.pathname.replace(/\/index\.html$/, '') || '/';
      }

      return '/';
    }

    return envBase.endsWith('/') && envBase.length > 1 ? envBase.slice(0, -1) : envBase;
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const renderProtectedPage = (page) => (
    user ? (
      <MainLayout user={user} onLogout={handleLogout}>
        {page}
      </MainLayout>
    ) : (
      <Navigate to="/login" replace />
    )
  );

  return (
    <Router basename={basename}>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-600">Loading...</div>}>
          <Routes>
            <Route
              path="/login"
              element={
                user ? <Navigate to="/home" replace /> : <LoginPage onLogin={handleLogin} />
              }
            />

            {/* Protected routes with MainLayout */}
            <Route path="/home" element={renderProtectedPage(<HomePage />)} />
            <Route path="/search" element={renderProtectedPage(<Search />)} />
            <Route path="/events" element={renderProtectedPage(<Events />)} />
            <Route path="/events/:eventId" element={renderProtectedPage(<EventDetails />)} />
            <Route
              path="/venue-management"
              element={renderProtectedPage(<VenueManagement user={user} />)}
            />
            <Route path="/beer-details" element={renderProtectedPage(<BeerDetails />)} />
            <Route path="/rate-beer" element={renderProtectedPage(<RateBeer />)} />
            <Route path="/producers" element={renderProtectedPage(<ProducersList />)} />
            <Route path="/producer/:producerId" element={renderProtectedPage(<BreweryProfile />)} />
            <Route path="/styles" element={renderProtectedPage(<StyleGuide />)} />
            <Route path="/cellar" element={renderProtectedPage(<Cellar />)} />
            <Route path="/drinking-buddies" element={renderProtectedPage(<DrinkingBuddies />)} />
            <Route path="/venues" element={renderProtectedPage(<Venues />)} />
            <Route path="/chat" element={renderProtectedPage(<Chat />)} />
            <Route path="/profile" element={renderProtectedPage(<Profile user={user} />)} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
