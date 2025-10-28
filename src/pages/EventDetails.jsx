import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeerCard from '../components/BeerCard';
import { findEventById, getEvents, updateEvents } from '../utils/api/mockApi';

const {
  FiArrowLeft, FiCalendar, FiMapPin, FiUsers, FiDollarSign,
  FiClock, FiExternalLink, FiStar, FiHeart, FiX
} = FiIcons;

function EventDetails() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadEvent = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await findEventById(eventId);
        if (isMounted) {
          setEvent(data);
        }
      } catch (loadError) {
        console.error('Failed to load event', loadError);
        if (isMounted) {
          setError('We could not load this event. Please return to the events list and try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      isMounted = false;
    };
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
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleAttendanceToggle = async () => {
    if (!event) return;

    try {
      const events = await getEvents();
      const updatedEvents = events.map((existingEvent) => {
        if (existingEvent.id !== event.id) {
          return existingEvent;
        }
        const updatedEvent = { ...existingEvent };
        if (isAttending) {
          updatedEvent.currentAttendees = Math.max(0, updatedEvent.currentAttendees - 1);
        } else {
          updatedEvent.currentAttendees = Math.min(updatedEvent.maxAttendees, updatedEvent.currentAttendees + 1);
        }
        return updatedEvent;
      });

      await updateEvents(updatedEvents);
      const refreshed = updatedEvents.find((updatedEvent) => updatedEvent.id === event.id);
      setEvent(refreshed);
      setIsAttending(!isAttending);
    } catch (updateError) {
      console.error('Failed to update attendance', updateError);
      alert('We could not update your attendance. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-64 bg-gray-100 animate-pulse rounded-xl border border-gray-200" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-500">{error || 'Event not found'}</h3>
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8"
      >
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

        <div className="p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 mb-6 lg:mb-0">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">{event.name}</h1>

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

              <div className="text-sm text-gray-500">
                Organized by <span className="font-medium">{event.organizer}</span>
              </div>
            </div>

            <div className="lg:ml-8 lg:w-80">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiUsers} className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Attendance</span>
                  </div>
                  <span className="font-medium text-gray-800">
                    {event.currentAttendees}/{event.maxAttendees}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Ticket Price</span>
                  </div>
                  <span className="font-medium text-gray-800">${event.ticketPrice}</span>
                </div>

                <button
                  onClick={handleAttendanceToggle}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isAttending
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  <SafeIcon icon={isAttending ? FiX : FiHeart} className="w-5 h-5" />
                  <span>{isAttending ? 'Cancel RSVP' : 'I want to attend'}</span>
                </button>

                <a
                  href={event.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center space-x-2 text-amber-600 hover:text-amber-700"
                >
                  <SafeIcon icon={FiExternalLink} className="w-5 h-5" />
                  <span>Visit event site</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {event.featuredBeers && event.featuredBeers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Featured Beverages</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <SafeIcon icon={FiStar} className="w-4 h-4 text-amber-500" />
              <span>Curated selection</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {event.featuredBeers.map((beer, index) => (
              <BeerCard
                key={beer.id || index}
                beer={{
                  id: beer.id || index,
                  name: beer.name,
                  producer: beer.brewery,
                  rating: beer.rating || 4,
                  type: 'beer',
                  category: event.type,
                  image: event.image,
                  abv: beer.abv
                }}
                index={index}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default EventDetails;
