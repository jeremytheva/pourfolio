import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import VenueModal from '../components/VenueModal';

const { FiMapPin, FiSearch, FiFilter, FiStar, FiPlus, FiPhone, FiGlobe, FiClock, FiEdit3, FiTrash2 } = FiIcons;

function Venues() {
  const [venues, setVenues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showVenueModal, setShowVenueModal] = useState(false);

  // Load venues from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('venues');
    if (stored) {
      try {
        const parsedVenues = JSON.parse(stored);
        setVenues(parsedVenues);
      } catch (error) {
        console.error('Error loading venues:', error);
      }
    } else {
      // Initialize with some sample venues
      const sampleVenues = [
        {
          id: 1,
          name: 'The Crafty Pint',
          type: 'Brewery',
          address: '123 Brew Street',
          city: 'Portland',
          state: 'OR',
          country: 'USA',
          phone: '(503) 555-0123',
          website: 'https://craftypint.com',
          priceRange: '$$',
          specialties: ['Craft Beer', 'Local Brews', 'IPAs', 'Live Music'],
          description: 'Local brewery with rotating taps and live music on weekends.',
          hours: {
            monday: { open: '15:00', close: '22:00', closed: false },
            tuesday: { open: '15:00', close: '22:00', closed: false },
            wednesday: { open: '15:00', close: '22:00', closed: false },
            thursday: { open: '15:00', close: '23:00', closed: false },
            friday: { open: '12:00', close: '00:00', closed: false },
            saturday: { open: '12:00', close: '00:00', closed: false },
            sunday: { open: '12:00', close: '21:00', closed: false }
          },
          totalRatings: 24,
          averageRating: 4.3,
          beverageCount: 12,
          addedDate: '2024-01-15'
        },
        {
          id: 2,
          name: 'Bottle & Cork',
          type: 'Bottle Shop',
          address: '456 Wine Ave',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          phone: '(415) 555-0456',
          website: 'https://bottleandcork.com',
          priceRange: '$$$',
          specialties: ['Rare Bottles', 'Wine Selection', 'Craft Beer', 'Import Beers'],
          description: 'Premium bottle shop with rare finds and knowledgeable staff.',
          hours: {
            monday: { open: '10:00', close: '20:00', closed: false },
            tuesday: { open: '10:00', close: '20:00', closed: false },
            wednesday: { open: '10:00', close: '20:00', closed: false },
            thursday: { open: '10:00', close: '21:00', closed: false },
            friday: { open: '10:00', close: '22:00', closed: false },
            saturday: { open: '09:00', close: '22:00', closed: false },
            sunday: { open: '11:00', close: '19:00', closed: false }
          },
          totalRatings: 18,
          averageRating: 4.6,
          beverageCount: 8,
          addedDate: '2024-01-10'
        }
      ];
      setVenues(sampleVenues);
      localStorage.setItem('venues', JSON.stringify(sampleVenues));
    }
  }, []);

  // Save venues to localStorage whenever venues change
  useEffect(() => {
    localStorage.setItem('venues', JSON.stringify(venues));
  }, [venues]);

  const venueTypes = [
    'Brewery', 'Winery', 'Distillery', 'Cidery', 'Meadery',
    'Bottle Shop', 'Liquor Store', 'Restaurant', 'Bar', 'Pub',
    'Taproom', 'Tasting Room', 'Wine Bar', 'Cocktail Lounge',
    'Grocery Store', 'Online Store', 'Festival', 'Other'
  ];

  const priceRanges = ['$', '$$', '$$$', '$$$$'];

  // Filter and sort venues
  const filteredVenues = venues
    .filter(venue => {
      const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           venue.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           venue.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = selectedType === 'all' || venue.type === selectedType;
      const matchesPrice = selectedPriceRange === 'all' || venue.priceRange === selectedPriceRange;
      
      return matchesSearch && matchesType && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'beverageCount':
          return b.beverageCount - a.beverageCount;
        case 'addedDate':
          return new Date(b.addedDate) - new Date(a.addedDate);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleAddVenue = (newVenue) => {
    setVenues(prev => [...prev, newVenue]);
  };

  const handleDeleteVenue = (venueId) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      setVenues(prev => prev.filter(venue => venue.id !== venueId));
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTodayHours = (venue) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = venue.hours[today];
    
    if (!todayHours || todayHours.closed) {
      return 'Closed Today';
    }
    
    return `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <SafeIcon icon={FiMapPin} className="w-8 h-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Venues</h1>
        </div>
        <p className="text-lg text-gray-600">
          Discover and manage places where you've purchased beverages
        </p>
      </motion.div>

      {/* Stats and Add Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{venues.length}</div>
            <div className="text-sm text-gray-600">Total Venues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {venues.reduce((sum, venue) => sum + venue.beverageCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Beverages Purchased</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {venues.length > 0 ? (venues.reduce((sum, venue) => sum + venue.averageRating, 0) / venues.length).toFixed(1) : '0.0'}
            </div>
            <div className="text-sm text-gray-600">Avg Rating</div>
          </div>
        </div>
        
        <button
          onClick={() => setShowVenueModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-5 h-5" />
          <span>Add Venue</span>
        </button>
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
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {venueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Price Range Filter */}
          <select
            value={selectedPriceRange}
            onChange={(e) => setSelectedPriceRange(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Price Ranges</option>
            {priceRanges.map(range => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="rating">Sort by Rating</option>
            <option value="beverageCount">Sort by Beverage Count</option>
            <option value="addedDate">Sort by Date Added</option>
          </select>

          {/* Stats */}
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-600">{filteredVenues.length}</div>
            <div className="text-sm text-amber-800">Found</div>
          </div>
        </div>
      </motion.div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredVenues.map((venue, index) => (
          <motion.div
            key={venue.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Venue Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-800">{venue.name}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {venue.type}
                  </span>
                  <span className="text-gray-500">{venue.priceRange}</span>
                </div>
                
                {/* Rating */}
                {venue.averageRating > 0 && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1">
                      {renderStars(venue.averageRating)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {venue.averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({venue.totalRatings} ratings)
                    </span>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                  <span className="text-sm">
                    {venue.address && `${venue.address}, `}
                    {venue.city}, {venue.state}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => {/* Handle edit */}}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit venue"
                >
                  <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteVenue(venue.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete venue"
                >
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            {venue.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {venue.description}
              </p>
            )}

            {/* Specialties */}
            <div className="flex flex-wrap gap-2 mb-4">
              {venue.specialties.slice(0, 4).map((specialty, idx) => (
                <span
                  key={idx}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                >
                  {specialty}
                </span>
              ))}
              {venue.specialties.length > 4 && (
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                  +{venue.specialties.length - 4} more
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{venue.beverageCount}</div>
                <div className="text-xs text-gray-600">Beverages</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{venue.totalRatings}</div>
                <div className="text-xs text-gray-600">Ratings</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">
                  {venue.averageRating > 0 ? venue.averageRating.toFixed(1) : '--'}
                </div>
                <div className="text-xs text-gray-600">Avg Rating</div>
              </div>
            </div>

            {/* Contact & Hours */}
            <div className="space-y-2 text-sm">
              {/* Hours */}
              <div className="flex items-center space-x-2 text-gray-600">
                <SafeIcon icon={FiClock} className="w-4 h-4" />
                <span>{getTodayHours(venue)}</span>
              </div>

              {/* Contact */}
              <div className="flex items-center space-x-4">
                {venue.phone && (
                  <a
                    href={`tel:${venue.phone}`}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                  >
                    <SafeIcon icon={FiPhone} className="w-4 h-4" />
                    <span className="text-sm">{venue.phone}</span>
                  </a>
                )}
                {venue.website && (
                  <a
                    href={venue.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                  >
                    <SafeIcon icon={FiGlobe} className="w-4 h-4" />
                    <span className="text-sm">Website</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* No Results */}
      {filteredVenues.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiMapPin} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No venues found</h3>
          <p className="text-gray-400 mb-6">
            {venues.length === 0 
              ? "You haven't added any venues yet. Start by adding your first venue!"
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {venues.length === 0 && (
            <button
              onClick={() => setShowVenueModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5" />
              <span>Add Your First Venue</span>
            </button>
          )}
        </motion.div>
      )}

      {/* Add Venue Modal */}
      <VenueModal
        isOpen={showVenueModal}
        onClose={() => setShowVenueModal(false)}
        onAdd={handleAddVenue}
        existingVenues={venues}
      />
    </div>
  );
}

export default Venues;