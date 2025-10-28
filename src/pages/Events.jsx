import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import EventModal from '../components/EventModal';
import { getEvents, addEvent } from '../utils/api/mockApi';

const {
  FiCalendar, FiMapPin, FiUsers, FiSearch, FiFilter, FiPlus,
  FiClock, FiStar, FiExternalLink
} = FiIcons;

function Events({ selectedBeverageCategory = 'beer' }) {
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await getEvents();
        if (isMounted) {
          setEvents(data);
        }
      } catch (error) {
        console.error('Failed to load events', error);
        if (isMounted) {
          setLoadError('We could not load events. Refresh to try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const eventTypes = ['Festival', 'Tasting', 'Pairing', 'Launch', 'Competition', 'Workshop', 'Tour', 'Other'];

  const dateFilters = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'upcoming', label: 'Upcoming' }
  ];

  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.venues.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === 'all' || event.type === selectedType;

      const matchesCategory = selectedBeverageCategory === 'all' ||
                             event.beverageCategory === selectedBeverageCategory;

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

  const handleAddEvent = async (newEvent) => {
    try {
      const created = await addEvent(newEvent);
      setEvents(prev => [...prev, created]);
    } catch (error) {
      console.error('Unable to add event', error);
      alert('We could not create the event. Please try again.');
    }
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
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          Discover upcoming tastings, releases, and festivals for your favourite beverages.
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search events..."
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
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {dateFilters.map(filter => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="popularity">Sort by Popularity</option>
          </select>

          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            <span>Create Event</span>
          </button>
        </div>
      </motion.div>

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-80 bg-gray-100 animate-pulse rounded-xl border border-gray-200" />
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="relative h-48 bg-gray-100">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-amber-600 text-white px-3 py-1 rounded-full text-sm">
                  {event.type}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{event.name}</h3>
                    <p className="text-sm text-gray-500">Hosted by {event.organizer}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-amber-600">${event.ticketPrice}</div>
                    <div className="text-xs text-gray-500">Per ticket</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiCalendar} className="w-4 h-4 text-amber-600" />
                    <span>{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiClock} className="w-4 h-4 text-amber-600" />
                    <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiMapPin} className="w-4 h-4 text-amber-600" />
                    <span>{event.venues.map(v => v.name).join(', ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiUsers} className="w-4 h-4 text-amber-600" />
                    <span>{event.currentAttendees}/{event.maxAttendees} attending</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600">{event.description}</p>

                <div className="flex flex-wrap gap-2">
                  {event.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <Link
                    to={`/events/${event.id}`}
                    className="flex items-center space-x-1 text-amber-600 hover:text-amber-700"
                  >
                    <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                    <span>View details</span>
                  </Link>
                  <a
                    href={event.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-gray-600 hover:text-amber-600"
                  >
                    <SafeIcon icon={FiStar} className="w-4 h-4" />
                    <span>Official site</span>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && filteredEvents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No events match your filters</h3>
          <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}

      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onAdd={handleAddEvent}
      />
    </div>
  );
}

export default Events;
