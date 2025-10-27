import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeverageTypeSelector from '../components/BeverageTypeSelector';
import ShareCellarItemModal from '../components/ShareCellarItemModal';
import { beverageTypes } from '../utils/beverageTypes';
import { getCellarEntries, saveCellarEntries } from '../utils/api/mockApi';

const { FiSearch, FiPlus, FiTrash2, FiCalendar, FiMapPin, FiDollarSign, FiPackage, FiEye, FiEyeOff, FiShare2 } = FiIcons;

function Cellar({ selectedBeverageCategory = 'beer' }) {
  const [cellarEntries, setCellarEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBeverageType, setSelectedBeverageType] = useState(selectedBeverageCategory);
  const [sortBy, setSortBy] = useState('addedDate');
  const [filterBy, setFilterBy] = useState('all');
  const [showHidden, setShowHidden] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [initialized, setInitialized] = useState(false);

  const drinkingBuddies = [
    { id: 'buddy1', name: 'John Smith', username: 'johnsmith', avatar: '👨' },
    { id: 'buddy2', name: 'Sarah Wilson', username: 'sarahw', avatar: '👩' },
    { id: 'buddy3', name: 'Mike Johnson', username: 'mikej', avatar: '👱‍♂️' }
  ];

  useEffect(() => {
    let isMounted = true;

    const loadEntries = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await getCellarEntries();
        if (isMounted) {
          setCellarEntries(data);
        }
      } catch (error) {
        console.error('Failed to load cellar entries', error);
        if (isMounted) {
          setLoadError('We could not load your cellar entries. Refresh to try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    loadEntries();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    saveCellarEntries(cellarEntries).catch((error) => {
      console.error('Failed to persist cellar entries', error);
    });
  }, [cellarEntries, initialized]);

  useEffect(() => {
    setSelectedBeverageType(selectedBeverageCategory);
  }, [selectedBeverageCategory]);

  const currentBeverage = beverageTypes[selectedBeverageType];

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

      {loadError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6"
        >
          {loadError}
        </motion.div>
      )}

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cellar..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="addedDate">Sort by Date Added</option>
            <option value="name">Sort by Name</option>
            <option value="producer">Sort by Producer</option>
            <option value="purchaseDate">Sort by Purchase Date</option>
          </select>

          <select
            value={filterBy}
            onChange={(event) => setFilterBy(event.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            <option value="Brewery">Brewery</option>
            <option value="Craft Beer Bottle Shop">Bottle Shop</option>
            <option value="Series">Series</option>
            <option value="Home Brew">Home Brew</option>
            <option value="Other">Other</option>
          </select>

          <button
            onClick={() => alert('Cellar entry creation is available from individual beverage pages.')}
            className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            <span>Add Entry</span>
          </button>

          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border font-medium transition-colors ${
              showHidden
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SafeIcon icon={showHidden ? FiEye : FiEyeOff} className="w-5 h-5" />
            <span>{showHidden ? 'Hide Hidden Items' : `Show Hidden (${hiddenCount})`}</span>
          </button>
        </div>
      </motion.div>

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 bg-gray-100 animate-pulse rounded-xl border border-gray-200" />
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredEntries.map((entry, index) => {
            const valueInfo = calculateValue(entry);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl shadow-sm border ${entry.isHidden ? 'border-dashed border-gray-300 opacity-75' : 'border-gray-200'} overflow-hidden`}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">{entry.beverageName}</h3>
                      <p className="text-sm text-gray-500">{entry.producer}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                      <span>{formatDate(entry.addedDate)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiMapPin} className="w-4 h-4 text-amber-600" />
                      <span>{entry.purchaseLocation}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiPackage} className="w-4 h-4 text-amber-600" />
                      <span>{entry.containerType}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiDollarSign} className="w-4 h-4 text-amber-600" />
                      <span>${entry.purchasePrice?.toFixed(2) || '—'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4 text-amber-600" />
                      <span>{formatDate(entry.purchaseDate)}</span>
                    </div>
                  </div>

                  {valueInfo && (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
                      Saved ${valueInfo.savings.toFixed(2)} ({valueInfo.percentage.toFixed(0)}% below retail)
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleShareItem(entry)}
                      className="flex items-center space-x-1 text-amber-600 hover:text-amber-700"
                    >
                      <SafeIcon icon={FiShare2} className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(entry.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-amber-600"
                    >
                      <SafeIcon icon={entry.isHidden ? FiEye : FiEyeOff} className="w-4 h-4" />
                      <span>{entry.isHidden ? 'Unhide' : 'Hide'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="flex items-center space-x-1 text-red-500 hover:text-red-600"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {!loading && filteredEntries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No cellar entries found</h3>
          <p className="text-gray-400">Try adjusting your filters or add new beverages from the details page.</p>
        </motion.div>
      )}

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
