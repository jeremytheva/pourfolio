import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiUser, FiSettings, FiShield } = FiIcons;

function UserSwitchModal({ isOpen, onClose, currentUser, onUserSelect }) {
  const profiles = [
    {
      id: 'jane',
      name: 'Jane',
      type: 'General User',
      icon: FiUser,
      color: 'bg-blue-500',
      description: 'Beer enthusiast and casual drinker'
    },
    {
      id: 'john',
      name: 'John',
      type: 'General User',
      icon: FiUser,
      color: 'bg-green-500',
      description: 'Craft beer lover and reviewer'
    },
    {
      id: 'brewmasters',
      name: 'BrewMasters',
      type: 'Brewery Login',
      icon: FiSettings,
      color: 'bg-amber-500',
      description: 'Brewery management account'
    },
    {
      id: 'admin',
      name: 'Admin',
      type: 'Admin User',
      icon: FiShield,
      color: 'bg-red-500',
      description: 'System administrator'
    }
  ];

  const handleProfileSelect = (profile) => {
    onUserSelect(profile);
    onClose();
    // This will trigger the login flow in App.jsx
    setTimeout(() => {
      window.location.href = '#/login';
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Switch User (Testing)</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          {/* Current User */}
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Currently logged in as:</h4>
            <div className="flex items-center space-x-3">
              <div className={`${currentUser?.type === 'Admin User' ? 'bg-red-500' : 
                currentUser?.type === 'Brewery Login' ? 'bg-amber-500' : 'bg-blue-500'} rounded-full p-2 text-white`}>
                <SafeIcon icon={currentUser?.type === 'Admin User' ? FiShield : 
                  currentUser?.type === 'Brewery Login' ? FiSettings : FiUser} className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium text-amber-800">{currentUser?.name}</div>
                <div className="text-sm text-amber-600">{currentUser?.type}</div>
              </div>
            </div>
          </div>

          {/* Profile Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((profile) => (
              <motion.button
                key={profile.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleProfileSelect(profile)}
                disabled={currentUser?.id === profile.id}
                className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                  currentUser?.id === profile.id
                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-200 hover:shadow-md hover:border-amber-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`${profile.color} rounded-full p-2 text-white`}>
                    <SafeIcon icon={profile.icon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{profile.name}</h3>
                    <p className="text-sm text-gray-600">{profile.type}</p>
                    <p className="text-xs text-gray-500 mt-1">{profile.description}</p>
                  </div>
                </div>
                {currentUser?.id === profile.id && (
                  <div className="mt-2 text-xs text-gray-500 font-medium">Currently Active</div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Note */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> This is a testing feature. In production, users would log in through proper authentication.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default UserSwitchModal;