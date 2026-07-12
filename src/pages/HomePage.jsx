import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import OptimizedBeerCard from '../components/OptimizedBeerCard'
import BeverageTypeSelector from '../components/BeverageTypeSelector'
import AddBeverageModal from '../components/AddBeverageModal'
import { useOptimizedSearch } from '../hooks/useOptimizedSearch'
import { usePagination } from '../hooks/usePagination'
import { beverageTypes } from '../utils/beverageTypes'
import { PAGINATION } from '../utils/constants'

const { FiSearch, FiPlus, FiChevronLeft, FiChevronRight } = FiIcons

function HomePage({ selectedBeverageCategory = 'beer' }) {
  const [selectedBeverageType, setSelectedBeverageType] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Update filter when category changes
  useEffect(() => {
    setSelectedBeverageType(selectedBeverageCategory)
  }, [selectedBeverageCategory])

  // Memoized beverages data
  const beverages = useMemo(() => [
    // Beers
    {
      id: 1,
      name: 'IPA Delight',
      producer: 'Brewery X',
      type: 'beer',
      category: 'IPA',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'Golden Wheat',
      producer: 'Sunset Brewing',
      type: 'beer',
      category: 'Wheat Beer',
      rating: 4.2,
      image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Dark Stout',
      producer: 'Mountain Brewery',
      type: 'beer',
      category: 'Stout',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop'
    },
    // Wines
    {
      id: 11,
      name: 'Chardonnay Reserve',
      producer: 'Valley Vineyard',
      type: 'wine',
      category: 'White Wine',
      rating: 4.3,
      image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300&h=300&fit=crop'
    },
    {
      id: 12,
      name: 'Cabernet Sauvignon',
      producer: 'Hill Estate',
      type: 'wine',
      category: 'Red Wine',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=300&fit=crop'
    },
    {
      id: 13,
      name: 'Rosé Selection',
      producer: 'Coastal Winery',
      type: 'wine',
      category: 'Rosé',
      rating: 4.1,
      image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=300&h=300&fit=crop'
    },
    // Spirits
    {
      id: 21,
      name: 'Single Malt 18yr',
      producer: 'Highland Distillery',
      type: 'spirits',
      category: 'Whiskey',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop'
    },
    {
      id: 22,
      name: 'Artisan Gin',
      producer: 'Botanical Co.',
      type: 'spirits',
      category: 'Gin',
      rating: 4.4,
      image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=300&h=300&fit=crop'
    },
    // Ciders
    {
      id: 31,
      name: 'Dry Apple Cider',
      producer: 'Orchard House',
      type: 'cider',
      category: 'Traditional Cider',
      rating: 4.2,
      image: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=300&h=300&fit=crop'
    },
    {
      id: 32,
      name: 'Pear & Ginger',
      producer: 'Craft Cidery',
      type: 'cider',
      category: 'Fruit Cider',
      rating: 4.0,
      image: 'https://images.unsplash.com/photo-1596328546171-77e37b5e8b3d?w=300&h=300&fit=crop'
    },
    // Meads
    {
      id: 41,
      name: 'Wildflower Honey',
      producer: 'Ancient Meadery',
      type: 'mead',
      category: 'Traditional Mead',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&h=300&fit=crop'
    },
    // Fermented Beverages
    {
      id: 51,
      name: 'Ginger Kombucha',
      producer: 'Living Cultures',
      type: 'fermented',
      category: 'Kombucha',
      rating: 4.1,
      image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop'
    },
    {
      id: 52,
      name: 'Pineapple Tepache',
      producer: 'Ferment Co.',
      type: 'fermented',
      category: 'Tepache',
      rating: 4.3,
      image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&h=300&fit=crop'
    }
  ], [])

  // Optimized search with debouncing
  const { searchTerm, setSearchTerm, searchResults, isSearching } = useOptimizedSearch(
    beverages,
    ['name', 'producer', 'category'],
    2
  )

  // Filter by beverage type
  const filteredBeverages = useMemo(() => {
    return searchResults.filter(beverage => 
      selectedBeverageType === 'all' || beverage.type === selectedBeverageType
    )
  }, [searchResults, selectedBeverageType])

  // Pagination
  const {
    currentItems,
    currentPage,
    totalPages,
    totalItems,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage
  } = usePagination(filteredBeverages, PAGINATION.DEFAULT_PAGE_SIZE)

  const currentBeverage = beverageTypes[selectedBeverageCategory] || beverageTypes.beer

  const handleAddBeverage = (beverageData) => {
    console.log('New beverage added:', beverageData)
    alert('Beverage added successfully! It will be reviewed before being published.')
  }

  const beverageStats = useMemo(() => {
    const stats = {}
    Object.keys(beverageTypes).forEach(type => {
      stats[type] = beverages.filter(b => b.type === type).length
    })
    return stats
  }, [beverages])

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
            <SafeIcon
              icon={FiSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
            />
            <input
              type="text"
              placeholder="Search beverages, producers, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            <span>Add a Beverage</span>
          </button>
        </div>

        {/* Results summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {currentItems.length} of {totalItems} beverages
          {searchTerm && (
            <span> matching "{searchTerm}"</span>
          )}
        </div>
      </motion.div>

      {/* Beverages Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentItems.map((beverage, index) => (
            <OptimizedBeerCard
              key={beverage.id}
              beer={beverage}
              index={index}
            />
          ))}
        </div>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-6 py-4">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevPage}
              disabled={!hasPrevPage}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <SafeIcon icon={FiChevronLeft} className="w-4 h-4" />
              <span>Previous</span>
            </button>
            
            {/* Page numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === page
                        ? 'bg-amber-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>

            <button
              onClick={nextPage}
              disabled={!hasNextPage}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <span>Next</span>
              <SafeIcon icon={FiChevronRight} className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredBeverages.length === 0 && (
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
          {Object.entries(beverageTypes).map(([type, typeInfo]) => (
            <div key={type} className="text-center">
              <div className="text-2xl font-bold text-amber-600">{beverageStats[type]}</div>
              <div className="text-sm text-gray-600">{typeInfo.icon} {typeInfo.name}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Add Beverage Modal */}
      <AddBeverageModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddBeverage}
      />
    </div>
  )
}

export default HomePage