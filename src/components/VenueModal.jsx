import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiMapPin, FiPhone, FiGlobe, FiClock, FiStar, FiPlus, FiCheck } = FiIcons;

function VenueModal({ isOpen, onClose, onAdd, existingVenues = [] }) {
  const [venueData, setVenueData] = useState({
    name: '',
    type: 'Brewery',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    phone: '',
    website: '',
    hours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '21:00', closed: false },
      saturday: { open: '10:00', close: '22:00', closed: false },
      sunday: { open: '12:00', close: '18:00', closed: false }
    },
    specialties: [],
    description: '',
    priceRange: '$$'
  });

  const [showExisting, setShowExisting] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState(null);

  const venueTypes = [
    'Brewery', 'Winery', 'Distillery', 'Cidery', 'Meadery',
    'Bottle Shop', 'Liquor Store', 'Restaurant', 'Bar', 'Pub',
    'Taproom', 'Tasting Room', 'Wine Bar', 'Cocktail Lounge',
    'Grocery Store', 'Online Store', 'Festival', 'Other'
  ];

  const priceRanges = [
    { value: '$', label: '$ - Budget Friendly' },
    { value: '$$', label: '$$ - Moderate' },
    { value: '$$$', label: '$$$ - Upscale' },
    { value: '$$$$', label: '$$$$ - Premium' }
  ];

  const specialtyOptions = [
    'Craft Beer', 'Local Brews', 'Rare Bottles', 'Barrel-Aged',
    'Sour Beers', 'IPAs', 'Stouts', 'Import Beers',
    'Wine Selection', 'Spirits', 'Cocktails', 'Food Pairing',
    'Live Music', 'Outdoor Seating', 'Dog Friendly', 'Family Friendly'
  ];

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedExisting) {
      onAdd(selectedExisting);
    } else {
      const newVenue = {
        ...venueData,
        id: Date.now(),
        addedDate: new Date().toISOString(),
        totalRatings: 0,
        averageRating: 0,
        beverageCount: 0
      };
      onAdd(newVenue);
    }

    // Reset form
    setVenueData({
      name: '',
      type: 'Brewery',
      address: '',
      city: '',
      state: '',
      country: 'USA',
      phone: '',
      website: '',
      hours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '21:00', closed: false },
        saturday: { open: '10:00', close: '22:00', closed: false },
        sunday: { open: '12:00', close: '18:00', closed: false }
      },
      specialties: [],
      description: '',
      priceRange: '$$'
    });
    setSelectedExisting(null);
    setShowExisting(false);
    onClose();
  };

  const handleSpecialtyToggle = (specialty) => {
    setVenueData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setVenueData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value
        }
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Add Purchase Venue</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          {/* Toggle between new venue and existing */}
          <div className="mb-6">
            <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setShowExisting(false)}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  !showExisting 
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Add New Venue
              </button>
              <button
                onClick={() => setShowExisting(true)}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  showExisting 
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Select Existing ({existingVenues.length})
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {showExisting ? (
              /* Existing Venues List */
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {existingVenues.length > 0 ? (
                  existingVenues.map((venue) => (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => setSelectedExisting(venue)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        selectedExisting?.id === venue.id
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{venue.name}</h4>
                          <p className="text-sm text-gray-600">{venue.type}</p>
                          <p className="text-sm text-gray-500">
                            {venue.city}, {venue.state}
                          </p>
                          {venue.averageRating > 0 && (
                            <div className="flex items-center space-x-1 mt-1">
                              <SafeIcon icon={FiStar} className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-gray-600">
                                {venue.averageRating.toFixed(1)} ({venue.totalRatings} ratings)
                              </span>
                            </div>
                          )}
                        </div>
                        {selectedExisting?.id === venue.id && (
                          <SafeIcon icon={FiCheck} className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <SafeIcon icon={FiMapPin} className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No venues added yet</p>
                    <p className="text-sm">Switch to "Add New Venue" to create your first venue</p>
                  </div>
                )}
              </div>
            ) : (
              /* New Venue Form */
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={venueData.name}
                      onChange={(e) => setVenueData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="e.g., The Crafty Pint"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Type *
                    </label>
                    <select
                      required
                      value={venueData.type}
                      onChange={(e) => setVenueData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {venueTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={venueData.address}
                      onChange={(e) => setVenueData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={venueData.city}
                        onChange={(e) => setVenueData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Portland"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Province *
                      </label>
                      <input
                        type="text"
                        required
                        value={venueData.state}
                        onChange={(e) => setVenueData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="OR"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={venueData.country}
                        onChange={(e) => setVenueData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="USA"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <SafeIcon icon={FiPhone} className="w-4 h-4 inline mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={venueData.phone}
                      onChange={(e) => setVenueData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <SafeIcon icon={FiGlobe} className="w-4 h-4 inline mr-1" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={venueData.website}
                      onChange={(e) => setVenueData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <select
                    value={venueData.priceRange}
                    onChange={(e) => setVenueData(prev => ({ ...prev, priceRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {priceRanges.map(range => (
                      <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                  </select>
                </div>

                {/* Specialties */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialties & Features
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {specialtyOptions.map(specialty => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => handleSpecialtyToggle(specialty)}
                        className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                          venueData.specialties.includes(specialty)
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    <SafeIcon icon={FiClock} className="w-4 h-4 inline mr-1" />
                    Operating Hours
                  </label>
                  <div className="space-y-3">
                    {Object.entries(venueData.hours).map(([day, hours]) => (
                      <div key={day} className="flex items-center space-x-4">
                        <div className="w-20 text-sm font-medium text-gray-700 capitalize">
                          {dayNames[day]}
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={hours.closed}
                            onChange={(e) => handleHoursChange(day, 'closed', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">Closed</span>
                        </label>
                        {!hours.closed && (
                          <>
                            <input
                              type="time"
                              value={hours.open}
                              onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={hours.close}
                              onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={venueData.description}
                    onChange={(e) => setVenueData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    placeholder="Describe the venue, atmosphere, or any special notes..."
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={showExisting ? !selectedExisting : !venueData.name || !venueData.city || !venueData.state}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>{showExisting ? 'Select Venue' : 'Add Venue'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default VenueModal;