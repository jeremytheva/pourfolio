import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from '../components/BeerCard';
import RecommendationCard from '../components/RecommendationCard';
import { generateRecommendations } from '../utils/recommendations';
import { beverageTypes } from '../utils/beverageTypes';

const { FiSearch, FiFilter, FiTrendingUp, FiHeart, FiMapPin, FiCalendar, FiStar } = FiIcons;

function Search({ selectedBeverageCategory = 'beer' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('beverages');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Enhanced mock data for search
  const mockBeverages = [
    {
      id: 1, name: 'IPA Delight', producer: 'Brewery X', type: 'beer', 
      category: 'IPA', rating: 4.5, abv: 6.5, style: 'American IPA',
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop',
      attributes: { hop_intensity: 8, maltiness: 4, bitterness: 7, sweetness: 3 }
    },
    {
      id: 2, name: 'Chardonnay Reserve', producer: 'Valley Vineyard', type: 'wine',
      category: 'White Wine', rating: 4.3, abv: 13.5, style: 'Chardonnay',
      image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300&h=300&fit=crop',
      attributes: { tannins: 2, acidity: 6, sweetness: 4, fruitiness: 7 }
    },
    {
      id: 3, name: 'Single Malt 18yr', producer: 'Highland Distillery', type: 'spirits',
      category: 'Whiskey', rating: 4.8, abv: 43, style: 'Single Malt Scotch',
      image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop',
      attributes: { alcohol_heat: 6, sweetness: 5, oak_vanilla: 8, smoothness: 9 }
    }
  ];

  const mockVenues = [
    {
      id: 1, name: 'The Crafty Pint', type: 'Brewery', city: 'Portland', state: 'OR',
      averageRating: 4.3, beverageCount: 12, specialties: ['Craft Beer', 'IPAs'],
      beverages: mockBeverages.filter(b => b.type === 'beer')
    },
    {
      id: 2, name: 'Wine & Dine', type: 'Wine Bar', city: 'San Francisco', state: 'CA',
      averageRating: 4.6, beverageCount: 25, specialties: ['Wine Selection', 'Food Pairing'],
      beverages: mockBeverages.filter(b => b.type === 'wine')
    }
  ];

  const mockEvents = [
    {
      id: 1, name: 'Portland Beer Festival', type: 'Festival', startDate: '2024-06-15',
      venue: 'Tom McCall Waterfront Park', ticketPrice: 25, beverageCategory: 'beer',
      featuredBeers: mockBeverages.filter(b => b.type === 'beer')
    }
  ];

  const mockUserRatings = [
    { beverageId: 1, rating: 4.5, type: 'beer', style: 'American IPA', producer: 'Brewery X', abv: 6.5 },
    { beverageId: 2, rating: 4.2, type: 'wine', style: 'Chardonnay', producer: 'Valley Vineyard', abv: 13.5 }
  ];

  // Generate recommendations on component mount
  useEffect(() => {
    const { recommendations: recs } = generateRecommendations(
      mockUserRatings, 
      mockBeverages,
      { count: 6, beverageType: selectedBeverageCategory === 'all' ? null : selectedBeverageCategory }
    );
    setRecommendations(recs);
  }, [selectedBeverageCategory]);

  // Perform search
  useEffect(() => {
    if (searchTerm.length >= 2) {
      setIsSearching(true);
      
      setTimeout(() => {
        let searchResults = [];
        
        switch (searchType) {
          case 'beverages':
            searchResults = mockBeverages.filter(beverage =>
              beverage.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              beverage.producer.toLowerCase().includes(searchTerm.toLowerCase()) ||
              beverage.style.toLowerCase().includes(searchTerm.toLowerCase())
            );
            break;
            
          case 'venues':
            searchResults = mockVenues.filter(venue =>
              venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
              venue.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            break;
            
          case 'events':
            searchResults = mockEvents.filter(event =>
              event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
              event.venue.toLowerCase().includes(searchTerm.toLowerCase())
            );
            break;
        }
        
        setResults(searchResults);
        setIsSearching(false);
      }, 300);
    } else {
      setResults([]);
    }
  }, [searchTerm, searchType]);

  const searchTypes = [
    { value: 'beverages', label: 'Beverages', icon: '🍺' },
    { value: 'venues', label: 'Venues', icon: '🏪' },
    { value: 'events', label: 'Events', icon: '📅' }
  ];

  const renderVenueCard = (venue, index) => (
    <motion.div
      key={venue.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{venue.name}</h3>
          <p className="text-gray-600">{venue.type}</p>
          <p className="text-sm text-gray-500">{venue.city}, {venue.state}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <SafeIcon
                key={i}
                icon={FiStar}
                className={`w-4 h-4 ${
                  i < Math.floor(venue.averageRating) 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">{venue.averageRating}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">Specialties:</div>
        <div className="flex flex-wrap gap-2">
          {venue.specialties.map((specialty, idx) => (
            <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {specialty}
            </span>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {venue.beverageCount} beverages available
      </div>
    </motion.div>
  );

  const renderEventCard = (event, index) => (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{event.name}</h3>
          <p className="text-gray-600">{event.type}</p>
          <p className="text-sm text-gray-500">{event.venue}</p>
        </div>
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
          {event.beverageCategory}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{new Date(event.startDate).toLocaleDateString()}</span>
        <span>${event.ticketPrice}</span>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <SafeIcon icon={FiSearch} className="w-8 h-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Search & Discover</h1>
        </div>
        <p className="text-lg text-gray-600">
          Find beverages, venues, and events tailored to your taste
        </p>
      </motion.div>

      {/* Search Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      >
        {/* Search Type Selector */}
        <div className="flex space-x-2 mb-4">
          {searchTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSearchType(type.value)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                searchType === type.value
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span>{type.icon}</span>
              <span className="font-medium">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${searchType}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
          />
        </div>
      </motion.div>

      {/* Search Results */}
      {searchTerm.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Search Results ({results.length})
          </h2>
          
          {isSearching ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result, index) => {
                if (searchType === 'beverages') {
                  return <BeerCard key={result.id} beer={result} index={index} />;
                } else if (searchType === 'venues') {
                  return renderVenueCard(result, index);
                } else {
                  return renderEventCard(result, index);
                }
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No results found</h3>
              <p className="text-gray-400">Try different search terms or filters</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: searchTerm.length >= 2 ? 0.3 : 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-2 mb-6">
          <SafeIcon icon={FiHeart} className="w-6 h-6 text-pink-500" />
          <h2 className="text-2xl font-bold text-gray-800">Recommended For You</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.slice(0, 6).map((beverage, index) => (
            <RecommendationCard
              key={beverage.id}
              beverage={beverage}
              index={index}
              context="general"
              showReason={true}
            />
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center hover:shadow-md transition-shadow cursor-pointer">
          <SafeIcon icon={FiTrendingUp} className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-2">Trending Now</h3>
          <p className="text-gray-600 text-sm mb-4">Discover what's popular this week</p>
          <div className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            View Trending
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center hover:shadow-md transition-shadow cursor-pointer">
          <SafeIcon icon={FiMapPin} className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-2">Nearby Venues</h3>
          <p className="text-gray-600 text-sm mb-4">Find places to buy beverages near you</p>
          <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Find Nearby
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center hover:shadow-md transition-shadow cursor-pointer">
          <SafeIcon icon={FiCalendar} className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-2">Upcoming Events</h3>
          <p className="text-gray-600 text-sm mb-4">Beer festivals and tastings</p>
          <div className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            View Events
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Search;