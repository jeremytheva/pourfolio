import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from '../components/BeerCard';
import BeverageTypeSelector from '../components/BeverageTypeSelector';
import { beverageTypes } from '../utils/beverageTypes';
import { useBeverages } from '../hooks/useBeverages';

const { FiSearch, FiPlus, FiAlertCircle, FiRefreshCw } = FiIcons;

function HomePage({ selectedBeverageCategory = 'beer' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBeverageType, setSelectedBeverageType] = useState('all');
  const {
    beverages,
    isLoading,
    error,
    refetch
  } = useBeverages();

  useEffect(() => {
    setSelectedBeverageType(selectedBeverageCategory);
  }, [selectedBeverageCategory]);

  const filteredBeverages = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return beverages.filter((beverage) => {
      const matchesSearch =
        query.length === 0 ||
        beverage.name.toLowerCase().includes(query) ||
        beverage.producer.toLowerCase().includes(query) ||
        beverage.category.toLowerCase().includes(query);
      const matchesType = selectedBeverageType === 'all' || beverage.type === selectedBeverageType;
      return matchesSearch && matchesType;
    });
  }, [beverages, searchTerm, selectedBeverageType]);

  const beverageCounts = useMemo(() => {
    const counts = Object.keys(beverageTypes).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    beverages.forEach((beverage) => {
      counts[beverage.type] = (counts[beverage.type] || 0) + 1;
    });

    return counts;
  }, [beverages]);

  const currentBeverage = beverageTypes[selectedBeverageCategory] || beverageTypes.beer;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-4xl">{currentBeverage.icon}</span>
          <h1 className="text-3xl font-bold text-gray-800">Discover Your Happy Place</h1>
        </div>
        <p className="text-gray-600">Explore our curated collection of amazing beverages</p>
      </motion.div>

      {/* Beverage Type Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter by Type</h3>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedBeverageType('all')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              selectedBeverageType === 'all'
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-lg">🥂</span>
            <span className="font-medium">All Beverages</span>
          </motion.button>
          <BeverageTypeSelector
            selectedType={selectedBeverageType}
            onTypeChange={setSelectedBeverageType}
          />
        </div>
      </motion.div>

      {/* Search and Add Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search beverages, producers, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <button className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2">
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            <span>Add a Beverage</span>
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between"
        >
          <div className="flex items-start space-x-3">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">We couldn&apos;t load your beverages.</p>
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md transition-colors"
            type="button"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
            <span>Try again</span>
          </button>
        </motion.div>
      )}

      {/* Beverages Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
      >
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-full"
            >
              <div className="aspect-square bg-gray-200 rounded-lg mb-4" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : (
          filteredBeverages.map((beverage, index) => (
            <BeerCard key={beverage.id} beer={beverage} index={index} />
          ))
        )}
      </motion.div>

      {/* No Results */}
      {!isLoading && filteredBeverages.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No beverages found</h3>
          <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Collection Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{beverageCounts.beer || 0}</div>
            <div className="text-sm text-gray-600">🍺 Beers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{beverageCounts.wine || 0}</div>
            <div className="text-sm text-gray-600">🍷 Wines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{beverageCounts.spirits || 0}</div>
            <div className="text-sm text-gray-600">🥃 Spirits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{beverageCounts.cider || 0}</div>
            <div className="text-sm text-gray-600">🍎 Ciders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{beverageCounts.mead || 0}</div>
            <div className="text-sm text-gray-600">🍯 Meads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">{beverageCounts.fermented || 0}</div>
            <div className="text-sm text-gray-600">🫖 Fermented</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default HomePage;
