import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import EventModal from '../components/EventModal';

const { 
  FiCalendar, FiMapPin, FiUsers, FiSearch, FiFilter, FiPlus, 
  FiClock, FiDollarSign, FiStar, FiExternalLink 
} = FiIcons;

function Events({ selectedBeverageCategory = 'beer' }) {
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showEventModal, setShowEventModal] = useState(false);

  // Load events from localStorage or initialize with sample data
  useEffect(() => {
    const stored = localStorage.getItem('events');
    if (stored) {
      try {
        const parsedEvents = JSON.parse(stored);
        setEvents(parsedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      }
    } else {
      // Initialize with sample events
      const sampleEvents = [
        {
          id: 1,
          name: 'Portland Beer Festival',
          type: 'Festival',
          description: 'Annual celebration featuring 50+ local breweries with live music and food trucks.',
          startDate: '2024-06-15',
          endDate: '2024-06-17',
          startTime: '12:00',
          endTime: '22:00',
          venues: [
            { id: 1, name: 'Tom McCall Waterfront Park', address: '98 SE Naito Pkwy, Portland, OR' }
          ],
          organizer: 'Portland Beer Society',
          ticketPrice: 25,
          maxAttendees: 5000,
          currentAttendees: 3200,
          image: 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=600&h=300&fit=crop',
          website: 'https://portlandbeer.festival',
          beverageCategory: 'beer',
          featuredBeers: [
            { id: 1, name: 'Festival IPA', brewery: 'Local Brewing Co.', abv: 6.2 },
            { id: 2, name: 'Summer Wheat', brewery: 'Craft Beer Works', abv: 5.1 }
          ],
          tags: ['outdoor', 'family-friendly', 'food-trucks']
        },
        {
          id: 2,
          name: 'Wine Tasting Evening',
          type: 'Tasting',
          description: 'Intimate wine tasting featuring selections from Napa Valley wineries.',
          startDate: '2024-05-20',
          endDate: '2024-05-20',
          startTime: '18:00',
          endTime: '21:00',
          venues: [
            { id: 2, name: 'The Wine Bar', address: '123 Main St, San Francisco, CA' }
          ],
          organizer: 'Valley Vineyard Estate',
          ticketPrice: 75,
          maxAttendees: 40,
          currentAttendees: 32,
          image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=300&fit=crop',
          website: 'https://valleyvineyards.com/events',
          beverageCategory: 'wine',
          featuredBeers: [
            { id: 3, name: 'Reserve Chardonnay 2021', brewery: 'Valley Vineyard', abv: 13.5 },
            { id: 4, name: 'Cabernet Sauvignon 2019', brewery: 'Valley Vineyard', abv: 14.2 }
          ],
          tags: ['indoor', 'premium', 'educational']
        },
        {
          id: 3,
          name: 'Whiskey & Cigars Night',
          type: 'Pairing',
          description: 'Premium whiskey tasting paired with artisanal cigars in an exclusive setting.',
          startDate: '2024-06-08',
          endDate: '2024-06-08',
          startTime: '19:00',
          endTime: '23:00',
          venues: [
            { id: 3, name: 'The Gentleman\'s Club', address: '456 Oak Ave, Denver, CO' }
          ],
          organizer: 'Highland Distillery',
          ticketPrice: 150,
          maxAttendees: 25,
          currentAttendees: 18,
          image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&h=300&fit=crop',
          website: 'https://highland-distillery.com/events',
          beverageCategory: 'spirits',
          featuredBeers: [
            { id: 5, name: '18-Year Single Malt', brewery: 'Highland Distillery', abv: 43 },
            { id: 6, name: 'Cask Strength Reserve', brewery: 'Highland Distillery', abv: 57.2 }
          ],
          tags: ['premium', 'indoor', 'adults-only', 'limited']
        }
      ];
      setEvents(sampleEvents);
      localStorage.setItem('events', JSON.stringify(sampleEvents));
    }
  }, []);

  // Save events when they change
  useEffect(() => {
    localStorage.setItem('events', JSON.stringify(events));
  }, [events]);

  const eventTypes = ['Festival', 'Tasting', 'Pairing', 'Launch', 'Competition', 'Workshop', 'Tour', 'Other'];

  const dateFilters = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'upcoming', label: 'Upcoming' }
  ];

  // Filter events
  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.venues.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = selectedType === 'all' || event.type === selectedType;
      
      const matchesCategory = selectedBeverageCategory === 'all' || 
                             event.beverageCategory === selectedBeverageCategory;

      // Date filtering logic
      const eventDate = new Date(event.startDate);
      const today = new Date();
      const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      let matchesDate = true;
      switch (selectedDate) {
        case 'today':
          matchesDate = eventDate.toDateString() === today.toDateString();
          break;
        case 'week':
          matchesDate = eventDate >= today && eventDate <= oneWeek;
          break;
        case 'month':
          matchesDate = eventDate >= today && eventDate <= oneMonth;
          break;
        case 'upcoming':
          matchesDate = eventDate >= today;
          break;
      }

      return matchesSearch && matchesType && matchesCategory && matchesDate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.startDate) - new Date(b.startDate);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.ticketPrice - b.ticketPrice;
        case 'popularity':
          return b.currentAttendees - a.currentAttendees;
        default:
          return 0;
      }
    });

  const handleAddEvent = (newEvent) => {
    setEvents(prev => [...prev, { ...newEvent, id: Date.now() }]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEventStatus = (event) => {
    const today = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (today < startDate) return { status: 'upcoming', color: 'bg-blue-100 text-blue-800' };
    if (today >= startDate && today <= endDate) return { status: 'live', color: 'bg-green-100 text-green-800' };
    return { status: 'past', color: 'bg-gray-100 text-gray-800' };
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
          <SafeIcon icon={FiCalendar} className="w-8 h-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Events</h1>
        </div>
        <p className="text-lg text-gray-600">
          Discover beer festivals, tastings, and beverage events near you
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
            <div className="text-2xl font-bold text-amber-600">{events.length}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {events.filter(e => getEventStatus(e).status === 'upcoming').length}
            </div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {events.filter(e => getEventStatus(e).status === 'live').length}
            </div>
            <div className="text-sm text-gray-600">Live Now</div>
          </div>
        </div>
        
        <button
          onClick={() => setShowEventModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-5 h-5" />
          <span>Add Event</span>
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
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Event Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {dateFilters.map(filter => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="popularity">Sort by Popularity</option>
          </select>

          {/* Results Count */}
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-600">{filteredEvents.length}</div>
            <div className="text-sm text-amber-800">Found</div>
          </div>
        </div>
      </motion.div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEvents.map((event, index) => {
          const eventStatus = getEventStatus(event);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Event Image */}
              <div className="h-48 overflow-hidden relative">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventStatus.color}`}>
                    {eventStatus.status.toUpperCase()}
                  </span>
                </div>
                {/* Type Badge */}
                <div className="absolute top-4 right-4">
                  <span className="bg-white bg-opacity-90 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                    {event.type}
                  </span>
                </div>
              </div>

              {/* Event Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{event.name}</h3>
                
                {/* Date and Time */}
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                    <span>
                      {formatDate(event.startDate)}
                      {event.startDate !== event.endDate && ` - ${formatDate(event.endDate)}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiClock} className="w-4 h-4" />
                    <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                  </div>
                </div>

                {/* Venue */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                  <SafeIcon icon={FiMapPin} className="w-4 h-4" />
                  <span>{event.venues[0].name}</span>
                  {event.venues.length > 1 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      +{event.venues.length - 1} more
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>

                {/* Featured Beverages */}
                {event.featuredBeers && event.featuredBeers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Featured Beverages:</h4>
                    <div className="space-y-1">
                      {event.featuredBeers.slice(0, 2).map((beverage) => (
                        <div key={beverage.id} className="text-xs text-gray-600">
                          • {beverage.name} by {beverage.brewery} ({beverage.abv}% ABV)
                        </div>
                      ))}
                      {event.featuredBeers.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{event.featuredBeers.length - 2} more beverages
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats and Price */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiUsers} className="w-4 h-4" />
                      <span>{event.currentAttendees}/{event.maxAttendees}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiDollarSign} className="w-4 h-4" />
                      <span>${event.ticketPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Organizer */}
                <div className="text-xs text-gray-500 mb-4">
                  Organized by {event.organizer}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    to={`/events/${event.id}`}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    View Details
                  </Link>
                  {event.website && (
                    <a
                      href={event.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredEvents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiCalendar} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No events found</h3>
          <p className="text-gray-400 mb-6">
            {events.length === 0 
              ? "No events have been added yet. Be the first to create one!"
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {events.length === 0 && (
            <button
              onClick={() => setShowEventModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5" />
              <span>Create First Event</span>
            </button>
          )}
        </motion.div>
      )}

      {/* Add Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onAdd={handleAddEvent}
      />
    </div>
  );
}

export default Events;