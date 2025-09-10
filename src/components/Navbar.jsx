import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { beverageTypes } from '../utils/beverageTypes';

const { FiHome, FiSearch, FiCalendar, FiMenu, FiRefreshCw } = FiIcons;

function Navbar({ user, onLogout, selectedBeverageCategory = 'beer', onMobileMenuToggle, onUserSwitch }) {
  const location = useLocation();

  // Get current beverage type info
  const currentBeverage = beverageTypes[selectedBeverageCategory] || beverageTypes.beer;

  // Simplified navigation items - only core features
  const navItems = [
    { path: '/home', label: 'Discover', icon: FiHome, description: 'Browse beverages' },
    { path: '/search', label: 'Search', icon: FiSearch, description: 'Find beverages & venues' },
    { path: '/events', label: 'Events', icon: FiCalendar, description: 'Beer events & festivals' }
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white shadow-sm border-b border-gray-200 relative z-30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Mobile menu + Brand */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 text-gray-600 hover:text-amber-600 transition-colors"
            >
              <SafeIcon icon={FiMenu} className="w-5 h-5" />
            </button>

            {/* Brand with current beverage context */}
            <Link
              to="/home"
              className="flex items-center space-x-2 text-2xl font-bold text-amber-600 hover:text-amber-700 transition-colors"
            >
              <span className="text-2xl">{currentBeverage.icon}</span>
              <span className="hidden sm:block">Pourfolio</span>
            </Link>

            {/* Current category indicator - Desktop only */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-amber-50 rounded-full">
              <span className="text-sm font-medium text-amber-800">
                {currentBeverage.name} Mode
              </span>
            </div>
          </div>

          {/* Center - Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors relative group ${
                  location.pathname === item.path
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <SafeIcon icon={item.icon} className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {item.description}
                </div>
              </Link>
            ))}
          </div>

          {/* Right side - User Menu */}
          <div className="flex items-center space-x-3">
            {/* Welcome message - Hidden on small screens */}
            <span className="text-gray-600 text-sm hidden lg:block">
              Welcome, {user?.name}
            </span>

            {/* Test User Switch Button */}
            <button
              onClick={onUserSwitch}
              className="p-2 text-gray-600 hover:text-amber-600 transition-colors"
              title="Switch User (Testing)"
            >
              <SafeIcon icon={FiRefreshCw} className="w-5 h-5" />
            </button>

            {/* Profile Link */}
            <Link
              to="/profile"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith('/profile') ? 'text-amber-600 bg-amber-50' : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                user?.type === 'Admin User' ? 'bg-red-500' : 
                user?.type === 'Brewery Login' ? 'bg-amber-500' : 'bg-blue-500'
              }`}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:block font-medium">Profile</span>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 px-2 py-2">
          <div className="flex space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center space-y-1 px-3 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-600 hover:text-amber-600'
                }`}
              >
                <SafeIcon icon={item.icon} className="w-5 h-5" />
                <span className="text-xs font-medium text-center">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

export default Navbar;