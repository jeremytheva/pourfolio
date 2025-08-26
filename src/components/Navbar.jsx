import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiUser, FiLogOut, FiHome, FiBook, FiMap, FiMessageCircle, FiSettings } = FiIcons;

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/home', label: 'Beers', icon: FiHome },
    { path: '/breweries', label: 'Breweries', icon: FiMap },
    { path: '/styles', label: 'Styles', icon: FiBook },
    { path: '/chat', label: 'Chat', icon: FiMessageCircle }
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white shadow-sm border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link 
            to="/home" 
            className="text-2xl font-bold text-amber-600 hover:text-amber-700 transition-colors"
          >
            Brew Buds
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <SafeIcon icon={item.icon} className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 text-sm hidden sm:block">
              Welcome, {user?.name}
            </span>
            <Link 
              to="/settings" 
              className={`p-2 transition-colors ${
                location.pathname === '/settings'
                  ? 'text-amber-600'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              <SafeIcon icon={FiSettings} className="w-5 h-5" />
            </Link>
            <Link 
              to="/profile" 
              className={`p-2 transition-colors ${
                location.pathname === '/profile'
                  ? 'text-amber-600'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              <SafeIcon icon={FiUser} className="w-5 h-5" />
            </Link>
            <button 
              onClick={onLogout}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <SafeIcon icon={FiLogOut} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              <SafeIcon icon={item.icon} className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}

export default Navbar;