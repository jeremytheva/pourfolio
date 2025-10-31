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
    <Router>
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
