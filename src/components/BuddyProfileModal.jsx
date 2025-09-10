import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiStar, FiMapPin, FiCalendar, FiEye, FiEyeOff, FiUser, FiPackage } = FiIcons;

function BuddyProfileModal({ isOpen, onClose, buddy }) {
  const [activeTab, setActiveTab] = useState('ratings');

  // Mock data for buddy's profile
  const buddyData = {
    ...buddy,
    joinDate: '2023-06-15',
    totalRatings: 89,
    averageRating: 4.2,
    favoriteStyle: 'IPA',
    totalCellarItems: 45,
    recentRatings: [
      {
        id: 1,
        beverageName: 'Hazy Little Thing',
        brewery: 'Sierra Nevada',
        rating: 4.5,
        review: 'Perfect balance of hops and citrus. Creamy mouthfeel.',
        date: '2024-01-20',
        image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=100&h=100&fit=crop'
      },
      {
        id: 2,
        beverageName: 'Pliny the Elder',
        brewery: 'Russian River',
        rating: 5.0,
        review: 'The holy grail of IPAs. Perfectly balanced.',
        date: '2024-01-18',
        image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop'
      },
      {
        id: 3,
        beverageName: 'Founders Porter',
        brewery: 'Founders Brewing',
        rating: 4.0,
        review: 'Rich chocolate notes with smooth finish.',
        date: '2024-01-15',
        image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=100&h=100&fit=crop'
      }
    ],
    recentCheckins: [
      {
        id: 1,
        venueName: 'The Crafty Pint',
        location: 'Portland, OR',
        beverageName: 'Local IPA',
        date: '2024-01-22',
        rating: 4.2
      },
      {
        id: 2,
        venueName: 'Brewery X Taproom',
        location: 'San Francisco, CA',
        beverageName: 'IPA Delight',
        date: '2024-01-20',
        rating: 4.5
      },
      {
        id: 3,
        venueName: 'Beer Garden',
        location: 'Seattle, WA',
        beverageName: 'Wheat Wonder',
        date: '2024-01-18',
        rating: 3.8
      }
    ],
    cellarItems: [
      {
        id: 1,
        beverageName: 'Aged Imperial Stout',
        producer: 'Founders',
        style: 'Imperial Stout',
        vintage: '2022',
        isVisible: true,
        notes: 'Aging beautifully, perfect for winter'
      },
      {
        id: 2,
        beverageName: 'Rare Barrel-Aged Barleywine',
        producer: 'Deschutes',
        style: 'Barleywine',
        vintage: '2021',
        isVisible: true,
        notes: 'Special occasion beer'
      },
      {
        id: 3,
        beverageName: 'Limited Edition Sour',
        producer: 'Cascade',
        style: 'Sour Ale',
        vintage: '2023',
        isVisible: false, // Hidden item
        notes: 'Experimenting with wild fermentation'
      }
    ]
  };

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const visibleCellarItems = buddyData.cellarItems.filter(item => item.isVisible);

  if (!isOpen || !buddy) return null;

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
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
                  {buddyData.avatar}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{buddyData.name}</h3>
                  <p className="text-amber-100">@{buddyData.username}</p>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-amber-100">
                    {buddyData.location && (
                      <div className="flex items-center space-x-1">
                        <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                        <span>{buddyData.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                      <span>Joined {formatDate(buddyData.joinDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-amber-200 transition-colors"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{buddyData.totalRatings}</div>
                <div className="text-sm text-amber-100">Ratings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{buddyData.averageRating}</div>
                <div className="text-sm text-amber-100">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{visibleCellarItems.length}</div>
                <div className="text-sm text-amber-100">Cellar Items</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{buddyData.favoriteStyle}</div>
                <div className="text-sm text-amber-100">Favorite Style</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('ratings')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'ratings'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent Ratings
              </button>
              <button
                onClick={() => setActiveTab('checkins')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'checkins'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Venue Check-ins
              </button>
              <button
                onClick={() => setActiveTab('cellar')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'cellar'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Cellar Collection
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'ratings' && (
              <div className="space-y-4">
                {buddyData.recentRatings.map((rating) => (
                  <div key={rating.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                    <img
                      src={rating.image}
                      alt={rating.beverageName}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">{rating.beverageName}</h4>
                          <p className="text-gray-600">{rating.brewery}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            {renderStars(rating.rating)}
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(rating.date)}</span>
                        </div>
                      </div>
                      {rating.review && (
                        <p className="text-gray-600 text-sm mt-2 italic">"{rating.review}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'checkins' && (
              <div className="space-y-4">
                {buddyData.recentCheckins.map((checkin) => (
                  <div key={checkin.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <SafeIcon icon={FiMapPin} className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">{checkin.venueName}</h4>
                          <p className="text-gray-600 text-sm">{checkin.location}</p>
                          <p className="text-gray-500 text-sm">Had: {checkin.beverageName}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            {renderStars(checkin.rating)}
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(checkin.date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cellar' && (
              <div className="space-y-4">
                {visibleCellarItems.length > 0 ? (
                  visibleCellarItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <SafeIcon icon={FiPackage} className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{item.beverageName}</h4>
                            <p className="text-gray-600">{item.producer}</p>
                            <p className="text-gray-500 text-sm">{item.style} • {item.vintage}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiEye} className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600">Visible</span>
                          </div>
                        </div>
                        {item.notes && (
                          <p className="text-gray-600 text-sm mt-1 italic">"{item.notes}"</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <SafeIcon icon={FiEyeOff} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-500 mb-2">No visible cellar items</h4>
                    <p className="text-gray-400">This buddy hasn't shared any cellar items publicly</p>
                  </div>
                )}
                
                {buddyData.cellarItems.some(item => !item.isVisible) && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">
                      {buddyData.cellarItems.filter(item => !item.isVisible).length} items are private
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BuddyProfileModal;