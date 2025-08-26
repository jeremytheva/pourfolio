import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from '../components/BeerCard';

const { FiArrowLeft, FiMapPin, FiExternalLink, FiFilter } = FiIcons;

function BreweryProfile() {
  const { breweryId } = useParams();
  const [filterStyle, setFilterStyle] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Dummy brewery data - in a real app, this would come from API
  const brewery = {
    id: 1,
    name: 'Brewery X',
    location: 'Portland, Oregon, USA',
    description: 'Founded in 2010, Brewery X has been crafting exceptional ales and lagers with a focus on innovation and tradition. Our commitment to quality ingredients and sustainable brewing practices has made us a favorite among craft beer enthusiasts.',
    founded: '2010',
    website: 'https://brewery-x.com',
    image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=800&h=400&fit=crop',
    taprooms: [
      { name: 'Main Taproom', address: '123 Brew Street, Portland, OR' },
      { name: 'Downtown Location', address: '456 City Ave, Portland, OR' }
    ]
  };

  // Dummy beers from this brewery
  const breweryBeers = [
    {
      id: 1,
      name: 'IPA Delight',
      style: 'India Pale Ale',
      abv: '6.5%',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'Amber Sunset',
      style: 'Amber Ale',
      abv: '5.2%',
      rating: 4.2,
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Dark Porter',
      style: 'Porter',
      abv: '6.8%',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop'
    },
    {
      id: 4,
      name: 'Wheat Wonder',
      style: 'Wheat Beer',
      abv: '4.8%',
      rating: 4.1,
      image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300&h=300&fit=crop'
    },
    {
      id: 5,
      name: 'Seasonal Saison',
      style: 'Saison',
      abv: '5.5%',
      rating: 4.4,
      image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop'
    },
    {
      id: 6,
      name: 'Imperial Stout',
      style: 'Imperial Stout',
      abv: '9.2%',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&h=300&fit=crop'
    }
  ];

  // Get unique styles for filtering
  const uniqueStyles = [...new Set(breweryBeers.map(beer => beer.style))];

  // Filter and sort beers
  const filteredBeers = breweryBeers
    .filter(beer => filterStyle === 'all' || beer.style === filterStyle)
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'abv':
          return parseFloat(b.abv) - parseFloat(a.abv);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link 
          to="/breweries"
          className="flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          <span>Back to Breweries</span>
        </Link>
      </motion.div>

      {/* Brewery Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8"
      >
        {/* Hero Image */}
        <div className="h-64 md:h-80 overflow-hidden">
          <img
            src={brewery.image}
            alt={brewery.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Brewery Info */}
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{brewery.name}</h1>
              
              <div className="flex items-center space-x-2 text-gray-600 mb-4">
                <SafeIcon icon={FiMapPin} className="w-5 h-5" />
                <span>{brewery.location}</span>
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">{brewery.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Founded</h3>
                  <p className="text-gray-600">{brewery.founded}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Website</h3>
                  <a
                    href={brewery.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 flex items-center space-x-1"
                  >
                    <span>Visit Website</span>
                    <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Taproom Locations */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Taproom Locations</h3>
                <div className="space-y-2">
                  {brewery.taprooms.map((taproom, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-800">{taproom.name}</div>
                      <div className="text-sm text-gray-600">{taproom.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Beers Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
            Our Beers ({filteredBeers.length})
          </h2>

          {/* Filters and Sorting */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiFilter} className="w-5 h-5 text-gray-400" />
              <select
                value={filterStyle}
                onChange={(e) => setFilterStyle(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">All Styles</option>
                {uniqueStyles.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="abv">Sort by ABV</option>
            </select>
          </div>
        </div>

        {/* Beer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBeers.map((beer, index) => (
            <motion.div
              key={beer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <BeerCard beer={beer} index={index} />
            </motion.div>
          ))}
        </div>

        {filteredBeers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No beers found matching your filters.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default BreweryProfile;