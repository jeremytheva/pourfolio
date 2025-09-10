import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiUser, FiSettings, FiShield } = FiIcons;

function LoginPage({ onLogin }) {
  const navigate = useNavigate();

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
    onLogin(profile);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Pourfolio</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Choose a Profile</h2>
          <p className="text-gray-600">Select your profile to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.map((profile, index) => (
            <motion.button
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleProfileSelect(profile)}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 text-left border border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <div className={`${profile.color} rounded-full p-3 text-white`}>
                  <SafeIcon icon={profile.icon} className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800">{profile.name}</h3>
                  <p className="text-sm text-gray-600 font-medium">{profile.type}</p>
                  <p className="text-xs text-gray-500 mt-1">{profile.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Full password-based login coming soon
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;