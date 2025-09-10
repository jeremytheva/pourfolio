import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/home" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />

          {/* Protected routes with MainLayout */}
          <Route
            path="/home"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <HomePage />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/search"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Search />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/events"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Events />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/events/:eventId"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <EventDetails />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/venue-management"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <VenueManagement user={user} />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/beer-details"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <BeerDetails />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/rate-beer"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <RateBeer />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/producers"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <ProducersList />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/producer/:producerId"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <BreweryProfile />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/styles"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <StyleGuide />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/cellar"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Cellar />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/drinking-buddies"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <DrinkingBuddies />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/venues"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Venues />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/chat"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Chat />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/profile"
            element={
              user ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Profile user={user} />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;