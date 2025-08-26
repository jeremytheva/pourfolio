import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiSearch, FiMapPin, FiExternalLink, FiFilter } = FiIcons;

function BreweriesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Dummy breweries data - in a real app, this would come from API
  const breweries = [
    {
      id: 1,
      name: 'Brewery X',
      location: 'Portland, Oregon',
      description: 'Innovative craft brewery specializing in hop-forward ales and experimental brews.',
      founded: 2010,
      beerCount: 12,
      image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&h=300&fit=crop',
      website: 'https://brewery-x.com'
    },
    {
      id: 2,
      name: 'Sunset Brewing',
      location: 'San Diego, California',
      description: 'Family-owned brewery creating traditional and modern interpretations of classic styles.',
      founded: 2008,
      beerCount: 8,
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
      website: 'https://sunset-brewing.com'
    },
    {
      id: 3,
      name: 'Mountain Brewery',
      location: 'Denver, Colorado',
      description: 'High-altitude brewing with a focus on rich, complex dark beers and seasonal offerings.',
      founded: 2012,
      beerCount: 15,
      image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&h=300&fit=crop',
      website: 'https://mountain-brewery.com'
    },
    {
      id: 4,
      name: 'Coastal Craft',
      location: 'Seattle, Washington',
      description: 'Ocean-inspired brewery creating fresh, clean beers with locally-sourced ingredients.',
      founded: 2015,
      beerCount: 10,
      image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop',
      website: 'https://coastal-craft.com'
    },
    {
      id: 5,
      name: 'Valley Brews',
      location: 'Napa Valley, California',
      description: 'Artisanal brewery combining brewing expertise with wine country sophistication.',
      founded: 2009,
      beerCount: 6,
      image: 'https://images.unsplash.com/photo-1513309914637-65c20a5962e1?w=400&h=300&fit=crop',
      website: 'https://valley-brews.com'
    },
    {
      id: 6,
      name: 'Urban Hops',
      location: 'Austin, Texas',
      description: 'City brewery focusing on modern hop varieties and innovative brewing techniques.',
      founded: 2016,
      beerCount: 9,
      image: 'https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?w=400&h=300&fit=crop',
      website: 'https://urban-hops.com'
    }
  ];

  // Get unique locations
  const locations = [...new Set(breweries.map(brewery => {
    const parts = brewery.location.split(', ');
    return parts[parts.length - 1]; // Get state/country
  }))];

  // Filter breweries
  const filteredBreweries = breweries.filter(brewery => {
    const matchesSearch = brewery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brewery.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brewery.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === 'all' || brewery.location.includes(selectedLocation);
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Breweries</h1>
        <p className="text-lg text-gray-600">
          Discover amazing breweries and explore their unique beer collections
        </p>
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
              placeholder="Search breweries..."
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
        </div>
      </motion.div>

      {/* Breweries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBreweries.map((brewery, index) => (
          <motion.div
            key={brewery.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link to={`/brewery/${brewery.id}`}>
              {/* Brewery Image */}
              <div className="h-48 overflow-hidden">
                <img
                  src={brewery.image}
                  alt={brewery.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Brewery Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{brewery.name}</h3>
                
                <div className="flex items-center space-x-2 text-gray-600 mb-3">
                  <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                  <span className="text-sm">{brewery.location}</span>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {brewery.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Founded {brewery.founded}</span>
                  <span>{brewery.beerCount} beers</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                    View Profile
                  </span>
                  <a
                    href={brewery.website}
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
      {filteredBreweries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No breweries found</h3>
          <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}
    </div>
  );
}

export default BreweriesList;