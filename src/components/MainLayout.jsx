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

  const isBrowser = typeof window !== 'undefined';

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const saved = window.localStorage.getItem('selectedBeverageCategory');
    if (saved && ['beer', 'wine', 'spirits', 'cider', 'mead', 'fermented'].includes(saved)) {
      setSelectedBeverageCategory(saved);
    } else if (user?.defaultBeverageCategory) {
      setSelectedBeverageCategory(user.defaultBeverageCategory);
    }
  }, [user, isBrowser]);

  const handleCategoryChange = (category) => {
    setSelectedBeverageCategory(category);
    if (isBrowser) {
      window.localStorage.setItem('selectedBeverageCategory', category);
    }
  };

  const handleSideNavToggle = () => {
    setSideNavCollapsed(!sideNavCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isBrowser]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
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

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sideNavCollapsed ? 'md:ml-16' : 'md:ml-64'
        } ml-0`}
      >
        <Navbar
          user={user}
          onLogout={onLogout}
          selectedBeverageCategory={selectedBeverageCategory}
          onMobileMenuToggle={handleMobileMenuToggle}
          onUserSwitch={() => setShowUserSwitch(true)}
        />

        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {React.cloneElement(children, {
              selectedBeverageCategory,
              onCategoryChange: handleCategoryChange
            })}
          </motion.div>
        </main>
      </div>

      <UserSwitchModal
        isOpen={showUserSwitch}
        onClose={() => setShowUserSwitch(false)}
        currentUser={user}
        onUserSelect={onLogout}
      />
    </div>
  );
}

export default MainLayout;
