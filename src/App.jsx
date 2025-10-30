import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import BeerDetails from './pages/BeerDetails';
import RateBeer from './pages/RateBeer';
import Profile from './pages/Profile';
import ProducersList from './pages/ProducersList';
import BreweryProfile from './pages/BreweryProfile';
import StyleGuide from './pages/StyleGuide';
import Chat from './pages/Chat';
import Cellar from './pages/Cellar';
import DrinkingBuddies from './pages/DrinkingBuddies';
import Venues from './pages/Venues';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Search from './pages/Search';
import VenueManagement from './pages/VenueManagement';
import MainLayout from './components/MainLayout';

function ProtectedRoute({ user, onLogout, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout user={user} onLogout={onLogout}>
      {children}
    </MainLayout>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedUser = window.localStorage.getItem('pourfolio:user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (user) {
      window.localStorage.setItem('pourfolio:user', JSON.stringify(user));
    } else {
      window.localStorage.removeItem('pourfolio:user');
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const protectedRoutes = [
    { path: '/home', component: HomePage },
    { path: '/search', component: Search },
    { path: '/events', component: Events },
    { path: '/events/:eventId', component: EventDetails },
    { path: '/venue-management', component: VenueManagement, getProps: (currentUser) => ({ user: currentUser }) },
    { path: '/beer-details', component: BeerDetails },
    { path: '/rate-beer', component: RateBeer },
    { path: '/producers', component: ProducersList },
    { path: '/producer/:producerId', component: BreweryProfile },
    { path: '/styles', component: StyleGuide },
    { path: '/cellar', component: Cellar },
    { path: '/drinking-buddies', component: DrinkingBuddies },
    { path: '/venues', component: Venues },
    { path: '/chat', component: Chat },
    { path: '/profile', component: Profile, getProps: (currentUser) => ({ user: currentUser }) }
  ];

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/home" replace /> : <LoginPage onLogin={handleLogin} />
            }
          />

          {protectedRoutes.map(({ path, component: Component, getProps }) => (
            <Route
              key={path}
              path={path}
              element={(
                <ProtectedRoute user={user} onLogout={handleLogout}>
                  <Component {...(getProps ? getProps(user) : {})} />
                </ProtectedRoute>
              )}
            />
          ))}

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
