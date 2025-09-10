import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeverageTypeSelector from './BeverageTypeSelector';

const { FiX, FiPlus, FiCalendar, FiMapPin, FiUsers, FiDollarSign, FiImage } = FiIcons;

function EventModal({ isOpen, onClose, onAdd }) {
  const [eventData, setEventData] = useState({
    name: '',
    type: 'Festival',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '10:00',
    endTime: '18:00',
    venues: [],
    organizer: '',
    ticketPrice: 0,
    maxAttendees: 100,
    image: '',
    website: '',
    beverageCategory: 'beer',
    featuredBeers: [],
    tags: []
  });

  const [newVenue, setNewVenue] = useState({ name: '', address: '' });
  const [newBeverage, setNewBeverage] = useState({ name: '', brewery: '', abv: '' });
  const [newTag, setNewTag] = useState('');

  const eventTypes = ['Festival', 'Tasting', 'Pairing', 'Launch', 'Competition', 'Workshop', 'Tour', 'Other'];
  
  const predefinedTags = [
    'outdoor', 'indoor', 'family-friendly', 'adults-only', 'food-trucks', 
    'live-music', 'educational', 'premium', 'limited', 'free'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newEvent = {
      ...eventData,
      currentAttendees: 0,
      id: Date.now()
    };

    onAdd(newEvent);
    
    // Reset form
    setEventData({
      name: '',
      type: 'Festival',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '10:00',
      endTime: '18:00',
      venues: [],
      organizer: '',
      ticketPrice: 0,
      maxAttendees: 100,
      image: '',
      website: '',
      beverageCategory: 'beer',
      featuredBeers: [],
      tags: []
    });
    
    onClose();
  };

  const addVenue = () => {
    if (newVenue.name && newVenue.address) {
      setEventData(prev => ({
        ...prev,
        venues: [...prev.venues, { ...newVenue, id: Date.now() }]
      }));
      setNewVenue({ name: '', address: '' });
    }
  };

  const removeVenue = (venueId) => {
    setEventData(prev => ({
      ...prev,
      venues: prev.venues.filter(v => v.id !== venueId)
    }));
  };

  const addBeverage = () => {
    if (newBeverage.name && newBeverage.brewery) {
      setEventData(prev => ({
        ...prev,
        featuredBeers: [...prev.featuredBeers, { ...newBeverage, id: Date.now() }]
      }));
      setNewBeverage({ name: '', brewery: '', abv: '' });
    }
  };

  const removeBeverage = (beverageId) => {
    setEventData(prev => ({
      ...prev,
      featuredBeers: prev.featuredBeers.filter(b => b.id !== beverageId)
    }));
  };

  const addTag = (tag) => {
    if (tag && !eventData.tags.includes(tag)) {
      setEventData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag) => {
    setEventData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
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
            <h3 className="text-xl font-bold text-gray-800">Create New Event</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={eventData.name}
                  onChange={(e) => setEventData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Portland Beer Festival"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type *
                </label>
                <select
                  required
                  value={eventData.type}
                  onChange={(e) => setEventData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={eventData.description}
                onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Describe your event..."
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventData.startDate}
                  onChange={(e) => setEventData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventData.endDate}
                  onChange={(e) => setEventData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={eventData.startTime}
                  onChange={(e) => setEventData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={eventData.endTime}
                  onChange={(e) => setEventData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Venues */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venues *
              </label>
              
              {/* Add Venue Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Venue name"
                  value={newVenue.name}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={newVenue.address}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, address: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addVenue}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <SafeIcon icon={FiPlus} className="w-4 h-4" />
                  <span>Add Venue</span>
                </button>
              </div>

              {/* Venue List */}
              <div className="space-y-2">
                {eventData.venues.map((venue) => (
                  <div key={venue.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">{venue.name}</div>
                      <div className="text-sm text-gray-600">{venue.address}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVenue(venue.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <SafeIcon icon={FiX} className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Beverage Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Beverage Category
              </label>
              <BeverageTypeSelector
                selectedType={eventData.beverageCategory}
                onTypeChange={(type) => setEventData(prev => ({ ...prev, beverageCategory: type }))}
              />
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organizer *
                </label>
                <input
                  type="text"
                  required
                  value={eventData.organizer}
                  onChange={(e) => setEventData(prev => ({ ...prev, organizer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Organization or person"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={eventData.ticketPrice}
                  onChange={(e) => setEventData(prev => ({ ...prev, ticketPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Attendees
                </label>
                <input
                  type="number"
                  min="1"
                  value={eventData.maxAttendees}
                  onChange={(e) => setEventData(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) || 100 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Image and Website */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Image URL
                </label>
                <input
                  type="url"
                  value={eventData.image}
                  onChange={(e) => setEventData(prev => ({ ...prev, image: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={eventData.website}
                  onChange={(e) => setEventData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              
              {/* Predefined Tags */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                {predefinedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    disabled={eventData.tags.includes(tag)}
                    className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                      eventData.tags.includes(tag)
                        ? 'bg-blue-100 border-blue-300 text-blue-800 cursor-not-allowed'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Custom Tag Input */}
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Add custom tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(newTag);
                      setNewTag('');
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(newTag);
                    setNewTag('');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Selected Tags */}
              <div className="flex flex-wrap gap-2">
                {eventData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <SafeIcon icon={FiX} className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

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
                disabled={!eventData.name || !eventData.description || eventData.venues.length === 0}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Create Event</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default EventModal;