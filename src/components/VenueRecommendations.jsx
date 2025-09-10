import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import RecommendationCard from './RecommendationCard';
import { getContextualRecommendations } from '../utils/recommendations';

const { FiMapPin, FiHeart, FiRefreshCw } = FiIcons;

function VenueRecommendations({ venue, userRatings = [], className = '' }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (venue && venue.beverages) {
      setIsLoading(true);
      
      // Simulate API delay
      setTimeout(() => {
        const contextData = {
          venue: venue,
          availableBeverages: venue.beverages.map(b => ({
            ...b,
            averageRating: b.averageRating || 4.0 + Math.random(),
            type: b.type || 'beer'
          }))
        };
        
        const { recommendations: recs } = getContextualRecommendations(
          userRatings,
          'venue',
          contextData
        );
        
        setRecommendations(recs);
        setIsLoading(false);
      }, 500);
    }
  }, [venue, userRatings]);

  const refreshRecommendations = () => {
    if (venue && venue.beverages) {
      setIsLoading(true);
      
      setTimeout(() => {
        // Shuffle and get different recommendations
        const shuffled = [...venue.beverages].sort(() => Math.random() - 0.5);
        const contextData = {
          venue: venue,
          availableBeverages: shuffled.map(b => ({
            ...b,
            averageRating: b.averageRating || 4.0 + Math.random(),
            type: b.type || 'beer'
          }))
        };
        
        const { recommendations: recs } = getContextualRecommendations(
          userRatings,
          'venue',
          contextData
        );
        
        setRecommendations(recs);
        setIsLoading(false);
      }, 500);
    }
  };

  if (!venue || !venue.beverages || venue.beverages.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiMapPin} className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-bold text-gray-800">Recommended at {venue.name}</h3>
            <p className="text-sm text-gray-600">Based on your taste preferences</p>
          </div>
        </div>
        
        <button
          onClick={refreshRecommendations}
          disabled={isLoading}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
        >
          <SafeIcon 
            icon={FiRefreshCw} 
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
          />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((beverage, index) => (
            <RecommendationCard
              key={beverage.id}
              beverage={beverage}
              index={index}
              context="venue"
              showReason={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <SafeIcon icon={FiHeart} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No recommendations available for this venue</p>
          <p className="text-sm text-gray-400">Rate more beverages to improve recommendations</p>
        </div>
      )}
    </div>
  );
}

export default VenueRecommendations;