import beveragesSeed from '../../data/beverages.json';
import venuesSeed from '../../data/venues.json';
import eventsSeed from '../../data/events.json';

const STORAGE_KEYS = {
  venues: 'pourfolio_mock_venues',
  events: 'pourfolio_mock_events',
  cellar: 'pourfolio_mock_cellar'
};

const cache = {
  beverages: [...beveragesSeed],
  venues: null,
  events: null,
  cellar: null
};

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = (data) => JSON.parse(JSON.stringify(data));

const getStorage = () => {
  if (typeof window !== 'undefined' && window?.localStorage) {
    return window.localStorage;
  }
  return null;
};

const ensureCollection = (key, seed) => {
  if (cache[key]) {
    return cache[key];
  }

  let data = clone(seed);
  const storage = getStorage();

  if (storage) {
    const stored = storage.getItem(STORAGE_KEYS[key]);
    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch (error) {
        console.warn(`Failed to parse stored ${key}`, error);
      }
    } else {
      storage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    }
  }

  cache[key] = data;
  return cache[key];
};

const persistCollection = (key, data) => {
  cache[key] = clone(data);
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEYS[key], JSON.stringify(cache[key]));
  }
};

export async function getBeverages() {
  await delay();
  return clone(cache.beverages);
}

export async function getVenues() {
  await delay();
  const venues = ensureCollection('venues', venuesSeed);
  return clone(venues);
}

export async function addVenue(newVenue) {
  const venues = ensureCollection('venues', venuesSeed);
  const venue = { ...newVenue, id: newVenue.id ?? Date.now() };
  const updated = [...venues, venue];
  persistCollection('venues', updated);
  await delay();
  return clone(venue);
}

export async function deleteVenue(venueId) {
  const venues = ensureCollection('venues', venuesSeed);
  const updated = venues.filter((venue) => venue.id !== venueId);
  persistCollection('venues', updated);
  await delay();
  return clone(updated);
}

export async function getEvents() {
  await delay();
  const events = ensureCollection('events', eventsSeed);
  return clone(events);
}

export async function addEvent(newEvent) {
  const events = ensureCollection('events', eventsSeed);
  const event = { ...newEvent, id: newEvent.id ?? Date.now() };
  const updated = [...events, event];
  persistCollection('events', updated);
  await delay();
  return clone(event);
}

export async function updateEvents(events) {
  persistCollection('events', events);
  await delay();
  return clone(events);
}

export async function findEventById(eventId) {
  const events = ensureCollection('events', eventsSeed);
  await delay();
  return clone(events.find((event) => event.id === Number(eventId) || event.id === eventId) || null);
}

export async function getCellarEntries() {
  await delay();
  const entries = ensureCollection('cellar', []);
  return clone(entries);
}

export async function saveCellarEntries(entries) {
  persistCollection('cellar', entries);
  await delay();
  return clone(entries);
}

export function resetMockData() {
  cache.venues = clone(venuesSeed);
  cache.events = clone(eventsSeed);
  cache.cellar = [];
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEYS.venues, JSON.stringify(cache.venues));
    storage.setItem(STORAGE_KEYS.events, JSON.stringify(cache.events));
    storage.removeItem(STORAGE_KEYS.cellar);
  }
}
