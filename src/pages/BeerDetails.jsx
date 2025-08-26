import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import SendToFriendModal from '../components/SendToFriendModal';

const { FiStar, FiArrowLeft, FiShare2 } = FiIcons;

function BeerDetails() {
  const [showSendModal, setShowSendModal] = useState(false);

  // Dummy beer data - in a real app, this would come from props or API
  const beer = {
    id: 1,
    name: 'IPA Delight',
    brewery: 'Brewery X',
    style: 'India Pale Ale',
    abv: '6.5%',
    ibu: '65',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=600&fit=crop',
    description: 'A bold and hoppy IPA with citrus notes and a crisp finish. Brewed with premium hops and malted barley for the perfect balance of bitterness and flavor.',
    averageRating: 4.5,
    totalReviews: 127
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <SafeIcon key={i} icon={FiStar} className="w-5 h-5 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <SafeIcon key="half" icon={FiStar} className="w-5 h-5 text-yellow-400 fill-current opacity-50" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <SafeIcon key={`empty-${i}`} icon={FiStar} className="w-5 h-5 text-gray-300" />
      );
    }

    return stars;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link 
          to="/home"
          className="flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          <span>Back to Beers</span>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Beer Image */}
        <div className="aspect-video md:aspect-square lg:aspect-video overflow-hidden">
          <img
            src={beer.image}
            alt={beer.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Beer Information */}
        <div className="p-8">
          {/* Beer Name and Share Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start justify-between mb-4"
          >
            <h1 className="text-4xl font-bold text-gray-800">{beer.name}</h1>
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <SafeIcon icon={FiShare2} className="w-4 h-4" />
              <span>Send to Friend</span>
            </button>
          </motion.div>

          {/* Beer Details Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Brewery</label>
                <div className="text-lg text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                  {beer.brewery}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Style</label>
                <div className="text-lg text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                  {beer.style}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">ABV (Alcohol by Volume)</label>
                <div className="text-lg text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                  {beer.abv}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">IBU (International Bitterness Units)</label>
                <div className="text-lg text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                  {beer.ibu}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{beer.description}</p>
          </motion.div>

          {/* User Reviews Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="border-t pt-8"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">User Reviews</h3>

            {/* Average Rating Display */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-1">
                {renderStars(beer.averageRating)}
              </div>
              <span className="text-2xl font-bold text-gray-800">{beer.averageRating}</span>
              <span className="text-gray-600">({beer.totalReviews} reviews)</span>
            </div>

            {/* Placeholder for reviews */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-gray-600 text-center">
                User reviews will be displayed here. Join the community and be the first to rate this beer!
              </p>
            </div>

            {/* Rate This Beer Button */}
            <Link
              to="/rate-beer"
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <SafeIcon icon={FiStar} className="w-5 h-5" />
              <span>Rate This Beer</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Send to Friend Modal */}
      <SendToFriendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        beer={beer}
      />
    </div>
  );
}

export default BeerDetails;