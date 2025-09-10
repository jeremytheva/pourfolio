import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import RecommendationCard from './RecommendationCard';
import { getContextualRecommendations } from '../utils/recommendations';

const { FiCalendar, FiHeart, FiRefreshCw } = FiIcons;

function EventRecommendations({ event, userRatings = [], className = '' }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (event && event.featuredBeers) {
      setIsLoading(true);
      
      setTimeout(() => {
        const contextData = {
          event: event,
          featuredBeverages: event.featuredBeers.map(b => ({
            ...b,
            averageRating: b.averageRating || 4.0 + Math.random(),
            type: event.beverageCategory || 'beer',
            producer: b.brewery
          }))
        };
        
        const { recommendations: recs } = getContextualRecommendations(
          userRatings,
          'event',
          contextData
        );
        
        setRecommendations(recs);
        setIsLoading(false);
      }, 500);
    }
  }, [event, userRatings]);

  if (!event || !event.featuredBeers || event.featuredBeers.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-3">
        <SafeIcon icon={FiCalendar} className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-xl font-bold text-gray-800">Recommended at {event.name}</h3>
          <p className="text-sm text-gray-600">Featured beverages you might enjoy</p>
        </div>
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
              context="event"
              showReason={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <SafeIcon icon={FiHeart} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No recommendations available for this event</p>
        </div>
      )}
    </div>
  );
}

export default EventRecommendations;