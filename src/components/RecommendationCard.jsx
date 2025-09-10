import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from './BeerCard';

const { FiHeart, FiInfo, FiThumbsUp, FiMapPin, FiCalendar } = FiIcons;

function RecommendationCard({ beverage, index, context = 'general', showReason = true }) {
  const getContextIcon = () => {
    switch (context) {
      case 'venue': return FiMapPin;
      case 'event': return FiCalendar;
      case 'similar': return FiThumbsUp;
      default: return FiHeart;
    }
  };

  const getContextColor = () => {
    switch (context) {
      case 'venue': return 'bg-blue-500';
      case 'event': return 'bg-green-500';
      case 'similar': return 'bg-purple-500';
      default: return 'bg-pink-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      <BeerCard beer={beverage} index={index} />
      
      {/* Recommendation Badge */}
      <div className={`absolute -top-2 -right-2 ${getContextColor()} text-white rounded-full p-2 shadow-lg`}>
        <SafeIcon icon={getContextIcon()} className="w-4 h-4" />
      </div>

      {/* Similarity Score */}
      {beverage.similarityScore && (
        <div className="absolute -top-2 -left-2 bg-white border-2 border-gray-200 rounded-full px-2 py-1 text-xs font-bold text-gray-700">
          {Math.round(beverage.similarityScore * 100)}%
        </div>
      )}

      {/* Recommendation Reason */}
      {showReason && beverage.recommendationReason && (
        <div className="mt-2 p-3 bg-pink-50 rounded-lg border border-pink-200">
          <div className="flex items-center space-x-2 mb-2">
            <SafeIcon icon={FiInfo} className="w-4 h-4 text-pink-600" />
            <span className="text-xs font-medium text-pink-800">Why recommended:</span>
          </div>
          <ul className="text-xs text-pink-700 space-y-1">
            {beverage.recommendationReason.map((reason, idx) => (
              <li key={idx}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

export default RecommendationCard;