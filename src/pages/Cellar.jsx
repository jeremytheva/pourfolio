import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeverageTypeSelector from '../components/BeverageTypeSelector';
import ShareCellarItemModal from '../components/ShareCellarItemModal';
import { beverageTypes } from '../utils/beverageTypes';

const { FiSearch, FiFilter, FiPlus, FiEdit3, FiTrash2, FiCalendar, FiMapPin, FiDollarSign, FiPackage, FiEye, FiEyeOff, FiShare2 } = FiIcons;

function Cellar({ selectedBeverageCategory = 'beer' }) {
  const [cellarEntries, setCellarEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBeverageType, setSelectedBeverageType] = useState(selectedBeverageCategory);
  const [sortBy, setSortBy] = useState('addedDate');
  const [filterBy, setFilterBy] = useState('all');
  const [showHidden, setShowHidden] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Mock drinking buddies for sharing
  const drinkingBuddies = [
    { id: 'buddy1', name: 'John Smith', username: 'johnsmith', avatar: '👨' },
    { id: 'buddy2', name: 'Sarah Wilson', username: 'sarahw', avatar: '👩' },
    { id: 'buddy3', name: 'Mike Johnson', username: 'mikej', avatar: '👱‍♂️' }
  ];

  // Load cellar entries from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('cellarEntries');
    if (stored) {
      setCellarEntries(JSON.parse(stored));
    }
  }, []);

  // Save to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem('cellarEntries', JSON.stringify(cellarEntries));
  }, [cellarEntries]);

  const currentBeverage = beverageTypes[selectedBeverageType];

  // Filter and sort entries
  const filteredEntries = cellarEntries
    .filter(entry => {
      const matchesSearch = entry.beverageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.producer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.purchaseLocation.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedBeverageType === 'all' || 
                         entry.beverageType === selectedBeverageType;
      
      const matchesFilter = filterBy === 'all' ||
                           entry.source === filterBy ||
                           entry.containerType === filterBy;

      const matchesVisibility = showHidden || !entry.isHidden;
      
      return matchesSearch && matchesType && matchesFilter && matchesVisibility;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.beverageName.localeCompare(b.beverageName);
        case 'producer':
          return a.producer.localeCompare(b.producer);
        case 'purchaseDate':
          return new Date(b.purchaseDate) - new Date(a.purchaseDate);
        case 'addedDate':
        default:
          return new Date(b.addedDate) - new Date(a.addedDate);
      }
    });

  const handleDeleteEntry = (entryId) => {
    if (confirm('Are you sure you want to remove this item from your cellar?')) {
      setCellarEntries(prev => prev.filter(entry => entry.id !== entryId));
    }
  };

  const handleToggleVisibility = (entryId) => {
    setCellarEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, isHidden: !entry.isHidden }
        : entry
    ));
  };

  const handleShareItem = (item) => {
    setSelectedItem(item);
    setShowShareModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateValue = (entry) => {
    if (!entry.purchasePrice || !entry.retailPrice) return null;
    const savings = entry.retailPrice - entry.purchasePrice;
    const percentage = (savings / entry.retailPrice) * 100;
    return { savings, percentage };
  };

  const hiddenCount = cellarEntries.filter(entry => entry.isHidden).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <span className="text-4xl">🍷</span>
          <h1 className="text-4xl font-bold text-gray-800">My Cellar</h1>
        </div>
        <p className="text-lg text-gray-600">
          Your personal collection of beverages
        </p>
      </motion.div>

      {/* Beverage Type Selector */}
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
            <span className="font-medium">All Types</span>
          </motion.button>
          <BeverageTypeSelector
            selectedType={selectedBeverageType}
            onTypeChange={setSelectedBeverageType}
          />
        </div>
      </motion.div>

      {/* Search and Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cellar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="addedDate">Sort by Date Added</option>
            <option value="name">Sort by Name</option>
            <option value="producer">Sort by Producer</option>
            <option value="purchaseDate">Sort by Purchase Date</option>
          </select>

          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            <option value="Brewery">Brewery</option>
            <option value="Craft Beer Bottle Shop">Bottle Shop</option>
            <option value="Series">Series</option>
            <option value="Home Brew">Home Brew</option>
            <option value="Other">Other</option>
          </select>

          {/* Show Hidden Toggle */}
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border transition-colors ${
              showHidden
                ? 'bg-orange-100 border-orange-300 text-orange-800'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SafeIcon icon={showHidden ? FiEye : FiEyeOff} className="w-4 h-4" />
            <span className="text-sm font-medium">
              {showHidden ? 'Hide Private' : `Show Hidden (${hiddenCount})`}
            </span>
          </button>

          {/* Stats */}
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-600">{filteredEntries.length}</div>
            <div className="text-sm text-amber-800">Items</div>
          </div>
        </div>
      </motion.div>

      {/* Cellar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEntries.map((entry, index) => {
          const value = calculateValue(entry);
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                entry.isHidden ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
              }`}
            >
              {/* Entry Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{entry.beverageName}</h3>
                      {entry.isHidden && (
                        <SafeIcon icon={FiEyeOff} className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{entry.producer}</p>
                    <p className="text-xs text-gray-500">{entry.style}</p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => handleShareItem(entry)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Share item"
                    >
                      <SafeIcon icon={FiShare2} className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(entry.id)}
                      className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                      title={entry.isHidden ? 'Make visible' : 'Hide from others'}
                    >
                      <SafeIcon icon={entry.isHidden ? FiEyeOff : FiEye} className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {/* Handle edit */}}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Entry Details */}
              <div className="p-4 space-y-3">
                {/* Container Info */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <SafeIcon icon={FiPackage} className="w-4 h-4" />
                  <span>{entry.containerSize}{entry.unit} {entry.containerType}</span>
                </div>

                {/* Purchase Location */}
                {entry.purchaseLocation && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                    <span className="truncate">{entry.purchaseLocation}</span>
                  </div>
                )}

                {/* Purchase Date */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                  <span>{formatDate(entry.purchaseDate)}</span>
                </div>

                {/* Pricing */}
                {(entry.purchasePrice || entry.retailPrice) && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <SafeIcon icon={FiDollarSign} className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Pricing</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {entry.purchasePrice && (
                        <div>
                          <div className="text-gray-500">Paid</div>
                          <div className="font-semibold text-gray-800">${entry.purchasePrice}</div>
                        </div>
                      )}
                      {entry.retailPrice && (
                        <div>
                          <div className="text-gray-500">Retail</div>
                          <div className="font-semibold text-gray-800">${entry.retailPrice}</div>
                        </div>
                      )}
                    </div>

                    {/* Value Analysis */}
                    {value && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Savings:</span>
                          <span className={`font-medium ${value.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(value.savings).toFixed(2)} ({value.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Source & Series */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {entry.source}
                  </span>
                  {entry.series && entry.series !== 'Custom' && (
                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                      {entry.series}
                    </span>
                  )}
                  {entry.customSeries && (
                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                      {entry.customSeries}
                    </span>
                  )}
                  {entry.isHidden && (
                    <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      Private
                    </span>
                  )}
                </div>

                {/* Notes */}
                {entry.notes && (
                  <div className="text-sm text-gray-600 italic">
                    "{entry.notes}"
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredEntries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiSearch} className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-500 mb-2">No items found</h3>
          <p className="text-gray-400">
            {cellarEntries.length === 0 
              ? "Your cellar is empty. Start adding beverages to track your collection!"
              : "Try adjusting your search or filter criteria."
            }
          </p>
        </motion.div>
      )}

      {/* Summary Stats */}
      {cellarEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cellar Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(beverageTypes).map(([key, beverage]) => {
              const count = cellarEntries.filter(entry => entry.beverageType === key).length;
              return (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{count}</div>
                  <div className="text-sm text-gray-600">
                    {beverage.icon} {beverage.name}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Privacy Summary */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Privacy: {cellarEntries.length - hiddenCount} visible, {hiddenCount} hidden</span>
              <span>Total Value: ${cellarEntries.reduce((sum, entry) => sum + (parseFloat(entry.purchasePrice) || 0), 0).toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Share Modal */}
      <ShareCellarItemModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        cellarItem={selectedItem}
        drinkingBuddies={drinkingBuddies}
      />
    </div>
  );
}

export default Cellar;