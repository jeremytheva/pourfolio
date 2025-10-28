import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import VenueModal from '../components/VenueModal';
import { getVenues, addVenue, deleteVenue } from '../utils/api/mockApi';

const { FiMapPin, FiSearch, FiStar, FiPlus, FiPhone, FiGlobe, FiClock, FiEdit3, FiTrash2 } = FiIcons;

function Venues() {
  const [venues, setVenues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadVenues = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await getVenues();
        if (isMounted) {
          setVenues(data);
        }
      } catch (error) {
        console.error('Failed to load venues', error);
        if (isMounted) {
          setLoadError('We could not load your venues. Refresh to try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadVenues();

    return () => {
      isMounted = false;
    };
  }, []);

  const venueTypes = [
    'Brewery', 'Winery', 'Distillery', 'Cidery', 'Meadery',
    'Bottle Shop', 'Liquor Store', 'Restaurant', 'Bar', 'Pub',
    'Taproom', 'Tasting Room', 'Wine Bar', 'Cocktail Lounge',
    'Grocery Store', 'Online Store', 'Festival', 'Other'
  ];

  const priceRanges = ['$', '$$', '$$$', '$$$$'];

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

  const handleAddVenue = async (newVenue) => {
    try {
      const created = await addVenue(newVenue);
      setVenues(prev => [...prev, created]);
    } catch (error) {
      console.error('Unable to add venue', error);
      alert('We could not add this venue. Please try again.');
    }
  };

  const handleDeleteVenue = async (venueId) => {
    if (!confirm('Are you sure you want to delete this venue?')) {
      return;
    }

    try {
      await deleteVenue(venueId);
      setVenues(prev => prev.filter(venue => venue.id !== venueId));
    } catch (error) {
      console.error('Unable to delete venue', error);
      alert('We could not delete this venue. Please try again.');
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
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
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {venueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={selectedPriceRange}
            onChange={(event) => setSelectedPriceRange(event.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Prices</option>
            {priceRanges.map(range => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="rating">Sort by Rating</option>
            <option value="beverageCount">Sort by Beverage Count</option>
            <option value="addedDate">Sort by Date Added</option>
          </select>

          <button
            onClick={() => setShowVenueModal(true)}
            className="flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            <span>Add Venue</span>
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
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredVenues.map((venue, index) => (
            <motion.div
              key={venue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{venue.name}</h3>
                    <p className="text-sm text-gray-500">{venue.type}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {renderStars(venue.averageRating)}
                    <span className="text-sm text-gray-500">({venue.totalRatings})</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiMapPin} className="w-4 h-4 text-amber-600" />
                    <span>{venue.address}, {venue.city}, {venue.state}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiPhone} className="w-4 h-4 text-amber-600" />
                    <span>{venue.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiGlobe} className="w-4 h-4 text-amber-600" />
                    <a href={venue.website} target="_blank" rel="noreferrer" className="hover:text-amber-600">
                      {venue.website.replace('https://', '')}
                    </a>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiClock} className="w-4 h-4 text-amber-600" />
                    <span>{getTodayHours(venue)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Specialties</h4>
                  <div className="flex flex-wrap gap-2">
                    {venue.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-gray-600">{venue.description}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Price Range: {venue.priceRange}</span>
                  <span>Beverages: {venue.beverageCount}</span>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => alert('Editing venues will be available once the backend is connected.')}
                    className="flex items-center space-x-1 text-amber-600 hover:text-amber-700"
                  >
                    <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteVenue(venue.id)}
                    className="flex items-center space-x-1 text-red-500 hover:text-red-600"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && filteredVenues.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No venues match your filters</h3>
          <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}

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
