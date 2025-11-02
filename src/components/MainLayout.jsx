import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import SideNavigation from './SideNavigation';
import UserSwitchModal from './UserSwitchModal';

function MainLayout({ user, onLogout, children }) {
  const [selectedBeverageCategory, setSelectedBeverageCategory] = useState('beer');
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserSwitch, setShowUserSwitch] = useState(false);

  // Load saved category preference or user's default
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage?.getItem('selectedBeverageCategory');
    if (saved && ['beer', 'wine', 'spirits', 'cider', 'mead', 'fermented'].includes(saved)) {
      setSelectedBeverageCategory(saved);
    } else if (user?.defaultBeverageCategory) {
      setSelectedBeverageCategory(user.defaultBeverageCategory);
    }
  }, [user]);

  // Save category preference
  const handleCategoryChange = (category) => {
    setSelectedBeverageCategory(category);
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('selectedBeverageCategory', category);
    }
  };

  const handleSideNavToggle = () => {
    setSideNavCollapsed(!sideNavCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when screen size changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Side Navigation - Always visible */}
      <SideNavigation
        selectedBeverageCategory={selectedBeverageCategory}
        onCategoryChange={handleCategoryChange}
        isCollapsed={sideNavCollapsed}
        onToggleCollapse={handleSideNavToggle}
        isMobileOpen={mobileMenuOpen}
        onMobileToggle={handleMobileMenuToggle}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sideNavCollapsed ? 'md:ml-16' : 'md:ml-64'
      } ml-0`}>
        {/* Top Navigation */}
        <Navbar
          user={user}
          onLogout={onLogout}
          selectedBeverageCategory={selectedBeverageCategory}
          onMobileMenuToggle={handleMobileMenuToggle}
          onUserSwitch={() => setShowUserSwitch(true)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Pass the selected category to children */}
            {React.isValidElement(children)
              ? React.cloneElement(children, {
                  selectedBeverageCategory,
                  onCategoryChange: handleCategoryChange
                })
              : children}
          </motion.div>
        </main>
      </div>

      {/* User Switch Modal */}
      <UserSwitchModal
        isOpen={showUserSwitch}
        onClose={() => setShowUserSwitch(false)}
        currentUser={user}
        onUserSelect={onLogout} // This will trigger login flow
      />
    </div>
  );
}

export default MainLayout;