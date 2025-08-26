import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiUser, FiSettings, FiShield, FiStar, FiCalendar } = FiIcons;

function Profile({ user }) {
  const getProfileIcon = (userType) => {
    switch (userType) {
      case 'Brewery Login':
        return FiSettings;
      case 'Admin User':
        return FiShield;
      default:
        return FiUser;
    }
  };

  const getProfileColor = (userType) => {
    switch (userType) {
      case 'Brewery Login':
        return 'bg-amber-500';
      case 'Admin User':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Dummy rating data - in a real app, this would come from an API
  const userRatings = [
    {
      id: 1,
      beerName: 'IPA Delight',
      brewery: 'Brewery X',
      rating: 4.5,
      review: 'Excellent hop character with a perfect balance of citrus and pine notes.',
      date: '2024-01-15',
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=100&h=100&fit=crop'
    },
    {
      id: 2,
      beerName: 'Golden Wheat',
      brewery: 'Sunset Brewing',
      rating: 4.0,
      review: 'Smooth and refreshing, perfect for summer drinking.',
      date: '2024-01-10',
      image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop'
    },
    {
      id: 3,
      beerName: 'Dark Stout',
      brewery: 'Mountain Brewery',
      rating: 5.0,
      review: 'Rich, creamy, and full of chocolate and coffee flavors. Outstanding!',
      date: '2024-01-05',
      image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=100&h=100&fit=crop'
    }
  ];

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
      >
        {/* Profile Header */}
        <div className="flex items-center space-x-6 mb-8">
          <div className={`${getProfileColor(user?.type)} rounded-full p-4 text-white`}>
            <SafeIcon icon={getProfileIcon(user?.type)} className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.name}!</h1>
            <p className="text-lg text-gray-600">{user?.type}</p>
            <p className="text-sm text-gray-500 mt-1">{user?.description}</p>
          </div>
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-amber-50 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-amber-600 mb-2">{userRatings.length}</div>
            <div className="text-gray-600">Beers Rated</div>
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
        </motion.div>

        {/* My Ratings Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">My Ratings</h2>
          
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
                      alt={rating.beerName}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{rating.beerName}</h3>
                          <p className="text-gray-600">{rating.brewery}</p>
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
              <p className="text-gray-400">Start rating beers to see your reviews here!</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Profile;