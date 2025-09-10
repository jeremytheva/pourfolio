import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import ProfileSettings from '../components/ProfileSettings';
import PrivacySettings from '../components/PrivacySettings';
import AdminPanel from '../components/AdminPanel';

const { FiUser, FiSettings, FiShield, FiStar, FiCalendar, FiToggleLeft, FiToggleRight } = FiIcons;

function Profile({ user }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [adminMode, setAdminMode] = useState(false);

  const getProfileIcon = (userType) => {
    switch (userType) {
      case 'Brewery Login': return FiSettings;
      case 'Admin User': return FiShield;
      default: return FiUser;
    }
  };

  const getProfileColor = (userType) => {
    switch (userType) {
      case 'Brewery Login': return 'bg-amber-500';
      case 'Admin User': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  // Dummy rating data
  const userRatings = [
    {
      id: 1,
      beverageName: 'IPA Delight',
      producer: 'Brewery X',
      rating: 4.5,
      review: 'Excellent hop character with a perfect balance of citrus and pine notes.',
      date: '2024-01-15',
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=100&h=100&fit=crop'
    },
    {
      id: 2,
      beverageName: 'Golden Wheat',
      producer: 'Sunset Brewing',
      rating: 4.0,
      review: 'Smooth and refreshing, perfect for summer drinking.',
      date: '2024-01-10',
      image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop'
    }
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'privacy', label: 'Privacy', icon: FiShield }
  ];

  // Add admin tab if user is admin
  if (user?.type === 'Admin User') {
    tabs.push({ id: 'admin', label: 'Admin', icon: FiShield });
  }

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <SafeIcon key={i} icon={FiStar} className="w-4 h-4 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <SafeIcon key="half" icon={FiStar} className="w-4 h-4 text-yellow-400 fill-current opacity-50" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <SafeIcon key={`empty-${i}`} icon={FiStar} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200"
      >
        {/* Profile Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className={`${getProfileColor(user?.type)} rounded-full p-4 text-white`}>
                <SafeIcon icon={getProfileIcon(user?.type)} className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{user?.name}</h1>
                <p className="text-lg text-gray-600">{user?.type}</p>
                <p className="text-sm text-gray-500 mt-1">{user?.description}</p>
              </div>
            </div>

            {/* Admin Mode Toggle */}
            {user?.type === 'Admin User' && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Normal Mode</span>
                <button
                  onClick={() => setAdminMode(!adminMode)}
                  className={`p-1 rounded-full transition-colors ${
                    adminMode ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  <SafeIcon icon={adminMode ? FiToggleRight : FiToggleLeft} className="w-6 h-6" />
                </button>
                <span className="text-sm text-gray-600">Admin Mode</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <SafeIcon icon={tab.icon} className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-amber-50 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold text-amber-600 mb-2">{userRatings.length}</div>
                  <div className="text-gray-600">Beverages Rated</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {(userRatings.reduce((sum, rating) => sum + rating.rating, 0) / userRatings.length).toFixed(1)}
                  </div>
                  <div className="text-gray-600">Average Rating</div>
                </div>
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {userRatings.filter(r => r.rating >= 4.5).length}
                  </div>
                  <div className="text-gray-600">5-Star Reviews</div>
                </div>
              </div>

              {/* Recent Ratings */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Ratings</h2>
                {userRatings.length > 0 ? (
                  <div className="space-y-4">
                    {userRatings.map((rating, index) => (
                      <motion.div
                        key={rating.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start space-x-4">
                          <img
                            src={rating.image}
                            alt={rating.beverageName}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">{rating.beverageName}</h3>
                                <p className="text-gray-600">{rating.producer}</p>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <SafeIcon icon={FiCalendar} className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500">{formatDate(rating.date)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mt-2 mb-3">
                              <div className="flex items-center space-x-1">
                                {renderStars(rating.rating)}
                              </div>
                              <span className="text-sm font-medium text-gray-700">{rating.rating}</span>
                            </div>
                            {rating.review && (
                              <p className="text-gray-600 text-sm leading-relaxed">{rating.review}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <SafeIcon icon={FiStar} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">No ratings yet</h3>
                    <p className="text-gray-400">Start rating beverages to see your reviews here!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <ProfileSettings user={user} />
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <PrivacySettings />
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && user?.type === 'Admin User' && (
            <AdminPanel adminMode={adminMode} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default Profile;