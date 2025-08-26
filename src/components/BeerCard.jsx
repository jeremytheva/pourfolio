import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiStar } = FiIcons;

function BeerCard({ beer, index }) {
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

  return (
    <Link to="/beer-details">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -5 }}
        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 cursor-pointer"
      >
        <div className="aspect-square overflow-hidden">
          <img
            src={beer.image}
            alt={beer.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 mb-1 truncate">{beer.name}</h3>
          <p className="text-sm text-gray-600 mb-3 truncate">{beer.brewery}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {renderStars(beer.rating)}
            </div>
            <span className="text-sm font-medium text-gray-700">{beer.rating}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default BeerCard;