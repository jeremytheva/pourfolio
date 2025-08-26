import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from '../components/BeerCard';

const { FiSearch, FiPlus } = FiIcons;

function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Dummy beer data
  const beers = [
    { id: 1, name: 'IPA Delight', brewery: 'Brewery X', rating: 4.5, image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop' },
    { id: 2, name: 'Golden Wheat', brewery: 'Sunset Brewing', rating: 4.2, image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300&h=300&fit=crop' },
    { id: 3, name: 'Dark Stout', brewery: 'Mountain Brewery', rating: 4.7, image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop' },
    { id: 4, name: 'Citrus Ale', brewery: 'Coastal Craft', rating: 4.1, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&h=300&fit=crop' },
    { id: 5, name: 'Amber Lager', brewery: 'Valley Brews', rating: 4.4, image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=300&fit=crop' },
    { id: 6, name: 'Hoppy Pilsner', brewery: 'Urban Hops', rating: 4.3, image: 'https://images.unsplash.com/photo-1513309914637-65c20a5962e1?w=300&h=300&fit=crop' },
    { id: 7, name: 'Belgian White', brewery: 'Heritage Brewing', rating: 4.6, image: 'https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?w=300&h=300&fit=crop' },
    { id: 8, name: 'Porter Classic', brewery: 'Old Town Brewery', rating: 4.0, image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=300&h=300&fit=crop' },
    { id: 9, name: 'Summer Saison', brewery: 'Garden Brewing', rating: 4.5, image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop' },
    { id: 10, name: 'Red Ale', brewery: 'Copper Creek', rating: 4.2, image: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=300&h=300&fit=crop' },
    { id: 11, name: 'Triple Hop', brewery: 'Artisan Ales', rating: 4.8, image: 'https://images.unsplash.com/photo-1596328546171-77e37b5e8b3d?w=300&h=300&fit=crop' },
    { id: 12, name: 'Vanilla Stout', brewery: 'Craft Masters', rating: 4.4, image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&h=300&fit=crop' }
  ];

  const filteredBeers = beers.filter(beer =>
    beer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beer.brewery.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Discover Great Beers</h1>
        <p className="text-gray-600">Explore our curated collection of craft beers</p>
      </motion.div>

      {/* Beer Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
      >
        {filteredBeers.map((beer, index) => (
          <BeerCard key={beer.id} beer={beer} index={index} />
        ))}
      </motion.div>

      {/* Search and Add Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search beers or breweries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <button className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2">
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            <span>Add a Beer</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default HomePage;