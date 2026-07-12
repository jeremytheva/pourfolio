// Application constants
export const API_ENDPOINTS = {
  BEVERAGES: '/api/beverages',
  PRODUCERS: '/api/producers',
  VENUES: '/api/venues',
  EVENTS: '/api/events',
  RATINGS: '/api/ratings',
  CLAIMS: '/api/claims'
}

export const CACHE_KEYS = {
  USER_RATINGS: 'userRatings',
  CELLAR_ENTRIES: 'cellarEntries',
  VENUES: 'venues',
  EVENTS: 'events',
  SETTINGS: 'brewBudsSettings',
  PRIVACY_SETTINGS: 'privacySettings'
}

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 50,
  SEARCH_PAGE_SIZE: 20
}

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_REVIEW_LENGTH: 1000,
  MIN_SEARCH_LENGTH: 2,
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024 // 5MB
}

export const TIMEFRAMES = {
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  THREE_MONTHS: 90 * 24 * 60 * 60 * 1000,
  SIX_MONTHS: 180 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000
}

export const RATING_SCALES = {
  MIN_RATING: 1,
  MAX_RATING: 7,
  MIN_FINAL_RATING: 0,
  MAX_FINAL_RATING: 5,
  MIN_BONUS: -0.5,
  MAX_BONUS: 0.5
}

export const USER_TYPES = {
  GENERAL: 'General User',
  BREWERY: 'Brewery Login',
  ADMIN: 'Admin User'
}

export const VENUE_ROLES = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  EVENT_COORDINATOR: 'EVENT_COORDINATOR'
}

export const CLAIM_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  UNDER_REVIEW: 'under_review'
}