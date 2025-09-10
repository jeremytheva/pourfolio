import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { beverageTypes } from '../utils/beverageTypes';

const { 
  FiChevronLeft, FiChevronRight, FiX, FiBook, FiUsers, FiMapPin, 
  FiPackage, FiMessageCircle, FiSettings, FiShield, FiLogOut 
} = FiIcons;

function SideNavigation({ 
  selectedBeverageCategory, 
  onCategoryChange, 
  isCollapsed, 
  onToggleCollapse, 
  isMobileOpen, 
  onMobileToggle,
  user,
  onLogout 
}) {
  const location = useLocation();
  const beverageCategories = Object.entries(beverageTypes).map(([key, beverage]) => ({ key, ...beverage }));

  // Navigation items moved from top nav
  const navigationItems = [
    { path: '/styles', label: 'Style Guides', icon: FiBook, description: 'Beverage style guidelines' },
    { path: '/producers', label: 'Producers', icon: FiMapPin, description: 'Breweries, wineries, distilleries' },
    { path: '/venues', label: 'Venues', icon: FiMapPin, description: 'Places to buy beverages' },
    { path: '/cellar', label: 'My Cellar', icon: FiPackage, description: 'Your beverage collection' },
    { path: '/drinking-buddies', label: 'Buddies', icon: FiUsers, description: 'Your drinking buddies' },
    { path: '/chat', label: 'Community', icon: FiMessageCircle, description: 'Chat with enthusiasts' }
  ];

  // Admin-specific items
  const adminItems = user?.type === 'Admin User' ? [
    { path: '/admin', label: 'Admin Panel', icon: FiSettings, description: 'System administration' },
    { path: '/admin/global-settings', label: 'Global Settings', icon: FiShield, description: 'Platform settings' }
  ] : [];

  // Venue owner items
  const venueOwnerItems = user?.type === 'Brewery Login' ? [
    { path: '/venue-management', label: 'My Venues', icon: FiMapPin, description: 'Manage your venues' }
  ] : [];

  const handleCategorySelect = (categoryKey) => {
    onCategoryChange(categoryKey);
    // Close mobile menu after selection
    if (isMobileOpen) {
      onMobileToggle();
    }
  };

  const allItems = [...navigationItems, ...adminItems, ...venueOwnerItems];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Side Navigation */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? '4rem' : '16rem' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed left-0 top-0 h-full bg-white shadow-lg border-r border-gray-200 z-50 md:relative ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-2"
            >
              <span className="text-xl font-bold text-gray-800">Menu</span>
            </motion.div>
          )}

          {/* Toggle buttons */}
          <div className="flex items-center space-x-2">
            {/* Mobile close button */}
            <button
              onClick={onMobileToggle}
              className="md:hidden p-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:block p-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <SafeIcon icon={isCollapsed ? FiChevronRight : FiChevronLeft} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Beverage Categories */}
          {!isCollapsed && (
            <div className="mb-6">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Beverage Types
              </div>
              <div className="space-y-1">
                {beverageCategories.map((category) => (
                  <motion.button
                    key={category.key}
                    onClick={() => handleCategorySelect(category.key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left text-sm ${
                      selectedBeverageCategory === category.key
                        ? 'bg-amber-100 border border-amber-300 text-amber-800'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{category.icon}</span>
                    <span className="font-medium truncate">{category.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Navigation
              </div>
            )}
            {allItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  location.pathname === item.path
                    ? 'bg-amber-100 border border-amber-300 text-amber-800'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <SafeIcon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer - Logout */}
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm text-red-600 hover:bg-red-50"
            title={isCollapsed ? 'Logout' : ''}
          >
            <SafeIcon icon={FiLogOut} className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

export default SideNavigation;