import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from '../components/BeerCard';

const { 
  FiArrowLeft, FiCalendar, FiMapPin, FiUsers, FiDollarSign, 
  FiClock, FiExternalLink, FiStar, FiHeart 
} = FiIcons;

function EventDetails() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [isAttending, setIsAttending] = useState(false);

  useEffect(() => {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const foundEvent = events.find(e => e.id === parseInt(eventId));
    setEvent(foundEvent);
  }, [eventId]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  const handleAttendanceToggle = () => {
    if (!event) return;
    
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const eventIndex = events.findIndex(e => e.id === event.id);
    
    if (eventIndex !== -1) {
      const updatedEvent = { ...events[eventIndex] };
      
      if (isAttending) {
        updatedEvent.currentAttendees = Math.max(0, updatedEvent.currentAttendees - 1);
      } else {
        updatedEvent.currentAttendees = Math.min(updatedEvent.maxAttendees, updatedEvent.currentAttendees + 1);
      }
      
      events[eventIndex] = updatedEvent;
      localStorage.setItem('events', JSON.stringify(events));
      setEvent(updatedEvent);
      setIsAttending(!isAttending);
    }
  };

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-500">Event not found</h3>
          <Link to="/events" className="text-amber-600 hover:text-amber-700">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const getEventStatus = () => {
    const today = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (today < startDate) return { status: 'upcoming', color: 'bg-blue-100 text-blue-800' };
    if (today >= startDate && today <= endDate) return { status: 'live', color: 'bg-green-100 text-green-800' };
    return { status: 'past', color: 'bg-gray-100 text-gray-800' };
  };

  const eventStatus = getEventStatus();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          to="/events"
          className="flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          <span>Back to Events</span>
        </Link>
      </motion.div>

      {/* Event Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8"
      >
        {/* Hero Image */}
        <div className="h-64 md:h-80 overflow-hidden relative">
          <img
            src={event.image}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${eventStatus.color}`}>
              {eventStatus.status.toUpperCase()}
            </span>
          </div>
          <div className="absolute top-4 right-4">
            <span className="bg-white bg-opacity-90 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
              {event.type}
            </span>
          </div>
        </div>

        {/* Event Info */}
        <div className="p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 mb-6 lg:mb-0">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">{event.name}</h1>
              
              {/* Date and Time */}
              <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={FiCalendar} className="w-5 h-5" />
                  <span>
                    {formatDate(event.startDate)}
                    {event.startDate !== event.endDate && ` - ${formatDate(event.endDate)}`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={FiClock} className="w-5 h-5" />
                  <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                </div>
              </div>

              {/* Venues */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <SafeIcon icon={FiMapPin} className="w-5 h-5" />
                  <span className="font-medium">Venue{event.venues.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2 pl-7">
                  {event.venues.map((venue, index) => (
                    <div key={venue.id || index}>
                      <div className="font-medium text-gray-800">{venue.name}</div>
                      <div className="text-sm text-gray-600">{venue.address}</div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">{event.description}</p>

              {/* Organizer */}
              <div className="text-sm text-gray-500">
                Organized by <span className="font-medium">{event.organizer}</span>
              </div>
            </div>

            {/* Event Stats & Actions */}
            <div className="lg:ml-8 lg:w-80">
              <div className="bg-gray-50 rounded-lg p-6">
                {/* Attendance */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiUsers} className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Attendance</span>
                  </div>
                  <span className="font-medium text-gray-800">
                    {event.currentAttendees}/{event.maxAttendees}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Ticket Price</span>
                  </div>
                  <span className="font-medium text-gray-800">${event.ticketPrice}</span>
                </div>

                {/* Attendance Button */}
                <button
                  onClick={handleAttendanceToggle}
                  disabled={!isAttending && event.currentAttendees >= event.maxAttendees}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                    isAttending
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : event.currentAttendees >= event.maxAttendees
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  <SafeIcon icon={isAttending ? FiX : FiHeart} className="w-5 h-5" />
                  <span>
                    {isAttending ? 'Cancel Attendance' : 
                     event.currentAttendees >= event.maxAttendees ? 'Event Full' : 'Mark Attending'}
                  </span>
                </button>

                {/* Website Link */}
                {event.website && (
                  <a
                    href={event.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-3 flex items-center justify-center space-x-2 border border-gray-300 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <SafeIcon icon={FiExternalLink} className="w-5 h-5" />
                    <span>Event Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Featured Beverages */}
      {event.featuredBeers && event.featuredBeers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Featured Beverages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {event.featuredBeers.map((beverage, index) => (
              <div key={beverage.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{beverage.name}</h3>
                <p className="text-gray-600 mb-2">{beverage.brewery}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{beverage.abv}% ABV</span>
                  <button className="text-amber-600 hover:text-amber-700 font-medium">
                    Rate This
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Event Tags</h2>
        <div className="flex flex-wrap gap-3">
          {event.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default EventDetails;