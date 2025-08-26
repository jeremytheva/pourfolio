import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import BeerDetails from './pages/BeerDetails';
import RateBeer from './pages/RateBeer';
import Profile from './pages/Profile';
import BreweriesList from './pages/BreweriesList';
import BreweryProfile from './pages/BreweryProfile';
import StyleGuide from './pages/StyleGuide';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';

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
              user ? <Navigate to="/home" replace /> : <LoginPage onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/home" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <HomePage />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/beer-details" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <BeerDetails />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/rate-beer" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <RateBeer />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/breweries" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <BreweriesList />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/brewery/:breweryId" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <BreweryProfile />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/styles" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <StyleGuide />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/chat" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <Chat />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/settings" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <Settings />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/profile" 
            element={
              user ? (
                <>
                  <Navbar user={user} onLogout={handleLogout} />
                  <Profile user={user} />
                </>
              ) : <Navigate to="/login" replace />
            } 
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;