import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import BeverageTypeSelector from '../components/BeverageTypeSelector';

const { FiBarChart3, FiTrendingUp, FiUsers, FiTarget } = FiIcons;

function Analytics({ selectedBeverageCategory = 'beer' }) {
  const [selectedBeverageType, setSelectedBeverageType] = useState(selectedBeverageCategory);
  const [userRatings, setUserRatings] = useState([]);

  // Load user ratings from localStorage or generate mock data
  useEffect(() => {
    const stored = localStorage.getItem('userRatings');
    if (stored) {
      try {
        setUserRatings(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading user ratings:', error);
        setUserRatings(generateMockRatings());
      }
    } else {
      setUserRatings(generateMockRatings());
    }
  }, []);

  const generateMockRatings = () => {
    const mockRatings = [];
    const producers = ['Brewery A', 'Brewery B', 'Brewery C', 'Winery X', 'Distillery Y'];
    const styles = ['IPA', 'Stout', 'Pilsner', 'Chardonnay', 'Bourbon'];
    const types = ['beer', 'wine', 'spirits'];

    for (let i = 0; i < 50; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 180)); // Last 6 months
      
      mockRatings.push({
        id: i + 1,
        beverageId: i + 1,
        rating: (Math.random() * 2) + 3, // 3-5 rating
        date: date.toISOString(),
        producer: producers[Math.floor(Math.random() * producers.length)],
        style: styles[Math.floor(Math.random() * styles.length)],
        type: types[Math.floor(Math.random() * types.length)],
        abv: (Math.random() * 8) + 3, // 3-11% ABV
        attributes: {
          hop_intensity: Math.floor(Math.random() * 10) + 1,
          maltiness: Math.floor(Math.random() * 10) + 1,
          bitterness: Math.floor(Math.random() * 10) + 1,
          sweetness: Math.floor(Math.random() * 10) + 1
        }
      });
    }

    return mockRatings;
  };

  // Update selected type when category changes
  useEffect(() => {
    setSelectedBeverageType(selectedBeverageCategory);
  }, [selectedBeverageCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <SafeIcon icon={FiBarChart3} className="w-8 h-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Analytics & Insights</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Discover patterns in your beverage preferences, track your rating journey, 
          and get personalized recommendations based on your taste profile.
        </p>
      </motion.div>

      {/* Beverage Type Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Analyze by Beverage Type</h3>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedBeverageType('all')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              selectedBeverageType === 'all'
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-lg">📊</span>
            <span className="font-medium">All Types</span>
          </motion.button>
          <BeverageTypeSelector
            selectedType={selectedBeverageType}
            onTypeChange={setSelectedBeverageType}
          />
        </div>
      </motion.div>

      {/* Quick Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 text-center">
          <SafeIcon icon={FiBarChart3} className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-800">{userRatings.length}</div>
          <div className="text-sm text-blue-600">Total Ratings</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 text-center">
          <SafeIcon icon={FiTrendingUp} className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-800">
            {userRatings.length > 0 
              ? (userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length).toFixed(1)
              : '0.0'
            }
          </div>
          <div className="text-sm text-green-600">Avg Rating</div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 text-center">
          <SafeIcon icon={FiUsers} className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-800">
            {new Set(userRatings.map(r => r.producer)).size}
          </div>
          <div className="text-sm text-purple-600">Unique Producers</div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 text-center">
          <SafeIcon icon={FiTarget} className="w-8 h-8 text-orange-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-orange-800">
            {userRatings.filter(r => r.rating >= 4.5).length}
          </div>
          <div className="text-sm text-orange-600">5-Star Favorites</div>
        </div>
      </motion.div>

      {/* Main Analytics Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <AnalyticsDashboard
          userRatings={userRatings}
          selectedBeverageCategory={selectedBeverageType}
        />
      </motion.div>

      {/* Tips for Better Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12 bg-blue-50 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          💡 Tips for Better Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-700">Rate More Beverages</h4>
            <p className="text-sm text-blue-600">
              The more you rate, the better our insights become. Aim for at least 20 ratings for meaningful patterns.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-700">Be Consistent</h4>
            <p className="text-sm text-blue-600">
              Try to rate beverages regularly and use the full rating scale to get accurate preference mapping.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-700">Add Context</h4>
            <p className="text-sm text-blue-600">
              Include purchase locations and tasting notes to unlock venue and social drinking analytics.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-700">Explore New Styles</h4>
            <p className="text-sm text-blue-600">
              Try different beverage styles to discover new preferences and improve recommendation accuracy.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Analytics;