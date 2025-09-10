import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { beverageTypes } from '../utils/beverageTypes';

const { FiSearch, FiMapPin, FiExternalLink, FiFilter, FiStar, FiTrendingUp } = FiIcons;

function ProducersList({ selectedBeverageCategory = 'beer' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const currentBeverage = beverageTypes[selectedBeverageCategory] || beverageTypes.beer;

  // Get producer type labels
  const getProducerType = () => {
    switch (selectedBeverageCategory) {
      case 'beer': return { single: 'Brewery', plural: 'Breweries' };
      case 'wine': return { single: 'Winery', plural: 'Wineries' };
      case 'spirits': return { single: 'Distillery', plural: 'Distilleries' };
      case 'cider': return { single: 'Cidery', plural: 'Cideries' };
      case 'mead': return { single: 'Meadery', plural: 'Meaderies' };
      case 'fermented': return { single: 'Producer', plural: 'Producers' };
      default: return { single: 'Producer', plural: 'Producers' };
    }
  };

  const producerType = getProducerType();

  // Dynamic producer data based on beverage category with ratings
  const getProducers = () => {
    const baseProducers = {
      beer: [
        {
          id: 1,
          name: 'Craft Beer Co.',
          location: 'Portland, Oregon',
          description: 'Innovative craft brewery specializing in hop-forward ales and experimental brews.',
          founded: 2010,
          productCount: 12,
          image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=300&fit=crop',
          website: 'https://craftbeer-co.com',
          averageRating: 4.3,
          totalRatings: 156,
          topRatedBeer: 'Double IPA Supreme'
        },
        {
          id: 2,
          name: 'Sunset Brewing',
          location: 'San Diego, California',
          description: 'Family-owned brewery creating traditional and modern interpretations of classic styles.',
          founded: 2008,
          productCount: 8,
          image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
          website: 'https://sunset-brewing.com',
          averageRating: 4.1,
          totalRatings: 89,
          topRatedBeer: 'Golden Sunset Lager'
        },
        {
          id: 3,
          name: 'Mountain Peak Brewery',
          location: 'Denver, Colorado',
          description: 'High-altitude brewing with focus on rich, complex flavors and traditional methods.',
          founded: 2012,
          productCount: 15,
          image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&h=300&fit=crop',
          website: 'https://mountain-peak.com',
          averageRating: 4.6,
          totalRatings: 203,
          topRatedBeer: 'Alpine Stout'
        }
      ],
      wine: [
        {
          id: 1,
          name: 'Valley Vineyard Estate',
          location: 'Napa Valley, California',
          description: 'Premium winery crafting exceptional wines from estate-grown grapes.',
          founded: 1995,
          productCount: 15,
          image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=300&fit=crop',
          website: 'https://valley-vineyard.com',
          averageRating: 4.4,
          totalRatings: 127,
          topRatedBeer: 'Reserve Cabernet Sauvignon'
        },
        {
          id: 2,
          name: 'Coastal Wines',
          location: 'Sonoma County, California',
          description: 'Sustainable winery focusing on terroir-driven wines with minimal intervention.',
          founded: 2003,
          productCount: 10,
          image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
          website: 'https://coastal-wines.com',
          averageRating: 4.2,
          totalRatings: 94,
          topRatedBeer: 'Estate Chardonnay'
        }
      ],
      spirits: [
        {
          id: 1,
          name: 'Highland Distillery',
          location: 'Kentucky, USA',
          description: 'Traditional bourbon distillery with over 200 years of craftsmanship.',
          founded: 1820,
          productCount: 6,
          image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&h=300&fit=crop',
          website: 'https://highland-distillery.com',
          averageRating: 4.7,
          totalRatings: 312,
          topRatedBeer: '18-Year Single Barrel'
        },
        {
          id: 2,
          name: 'Artisan Spirits Co.',
          location: 'Colorado, USA',
          description: 'Small-batch distillery creating unique gin and whiskey expressions.',
          founded: 2015,
          productCount: 8,
          image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
          website: 'https://artisan-spirits.com',
          averageRating: 4.5,
          totalRatings: 78,
          topRatedBeer: 'Botanical Gin Reserve'
        }
      ],
      cider: [
        {
          id: 1,
          name: 'Orchard House Cidery',
          location: 'Vermont, USA',
          description: 'Traditional cidery using heritage apples from our own orchards.',
          founded: 2012,
          productCount: 7,
          image: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=400&h=300&fit=crop',
          website: 'https://orchard-house.com',
          averageRating: 4.3,
          totalRatings: 64,
          topRatedBeer: 'Heritage Blend Dry'
        }
      ],
      mead: [
        {
          id: 1,
          name: 'Ancient Meadery',
          location: 'Oregon, USA',
          description: 'Reviving ancient mead-making traditions with modern techniques.',
          founded: 2018,
          productCount: 5,
          image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=400&h=300&fit=crop',
          website: 'https://ancient-meadery.com',
          averageRating: 4.4,
          totalRatings: 42,
          topRatedBeer: 'Wildflower Traditional'
        }
      ],
      fermented: [
        {
          id: 1,
          name: 'Living Cultures Co.',
          location: 'California, USA',
          description: 'Artisanal fermented beverages with live probiotics and unique flavors.',
          founded: 2020,
          productCount: 12,
          image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=300&fit=crop',
          website: 'https://living-cultures.com',
          averageRating: 4.1,
          totalRatings: 38,
          topRatedBeer: 'Ginger Turmeric Kombucha'
        }
      ]
    };

    return baseProducers[selectedBeverageCategory] || baseProducers.beer;
  };

  const producers = getProducers();

  // Get unique locations
  const locations = [...new Set(producers.map(producer => {
    const parts = producer.location.split(', ');
    return parts[parts.length - 1]; // Get state/country
  }))];

  // Filter and sort producers
  const filteredProducers = producers
    .filter(producer => {
      const matchesSearch = producer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           producer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           producer.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = selectedLocation === 'all' || producer.location.includes(selectedLocation);
      
      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'totalRatings':
          return b.totalRatings - a.totalRatings;
        case 'productCount':
          return b.productCount - a.productCount;
        case 'founded':
          return a.founded - b.founded;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <span className="text-4xl">{currentBeverage.icon}</span>
          <h1 className="text-4xl font-bold text-gray-800">{producerType.plural}</h1>
        </div>
        <p className="text-lg text-gray-600">
          Discover amazing {producerType.plural.toLowerCase()} and explore their unique {currentBeverage.name.toLowerCase()} collections
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-amber-600">{producers.length}</div>
          <div className="text-sm text-gray-600">{producerType.plural}</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {producers.reduce((sum, p) => sum + p.productCount, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Products</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {producers.length > 0 ? (producers.reduce((sum, p) => sum + p.averageRating, 0) / producers.length).toFixed(1) : '0.0'}
          </div>
          <div className="text-sm text-gray-600">Avg Rating</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">
            {producers.reduce((sum, p) => sum + p.totalRatings, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Reviews</div>
        </div>
      </motion.div>

      {/* Search and Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${producerType.plural.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Location Filter */}
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiFilter} className="w-5 h-5 text-gray-400" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="rating">Sort by Rating</option>
            <option value="totalRatings">Sort by Review Count</option>
            <option value="productCount">Sort by Product Count</option>
            <option value="founded">Sort by Founded Date</option>
          </select>
        </div>
      </motion.div>

      {/* Producers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducers.map((producer, index) => (
          <motion.div
            key={producer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link to={`/producer/${producer.id}?type=${selectedBeverageCategory}`}>
              {/* Producer Image */}
              <div className="h-48 overflow-hidden">
                <img
                  src={producer.image}
                  alt={producer.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Producer Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{producer.name}</h3>
                
                {/* Rating */}
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex items-center space-x-1">
                    {renderStars(producer.averageRating)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {producer.averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({producer.totalRatings} reviews)
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center space-x-2 text-gray-600 mb-3">
                  <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                  <span className="text-sm">{producer.location}</span>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                  {producer.description}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{producer.productCount}</div>
                    <div className="text-xs text-gray-600">Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">{producer.founded}</div>
                    <div className="text-xs text-gray-600">Founded</div>
                  </div>
                </div>

                {/* Top Rated Product */}
                {producer.topRatedBeer && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiTrendingUp} className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Top Rated:</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">{producer.topRatedBeer}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                    View Profile
                  </span>
                  <a
                    href={producer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* No Results */}
      {filteredProducers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No {producerType.plural.toLowerCase()} found</h3>
          <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}
    </div>
  );
}

export default ProducersList;