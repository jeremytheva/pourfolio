// Venue ownership and management utilities

export const venueRoles = {
  OWNER: {
    name: 'Owner',
    permissions: ['manage_venue', 'manage_staff', 'manage_beverages', 'reply_to_reviews', 'create_events', 'view_analytics']
  },
  MANAGER: {
    name: 'Manager', 
    permissions: ['manage_beverages', 'reply_to_reviews', 'create_events', 'view_analytics']
  },
  STAFF: {
    name: 'Staff',
    permissions: ['manage_beverages', 'reply_to_reviews']
  },
  EVENT_COORDINATOR: {
    name: 'Event Coordinator',
    permissions: ['create_events', 'manage_beverages']
  }
};

// Check if user has permission for a venue
export const hasVenuePermission = (user, venue, permission) => {
  if (user?.type === 'Admin User') return true;
  
  const userVenueRole = venue?.staff?.find(staff => staff.userId === user?.id);
  if (!userVenueRole) return false;
  
  const role = venueRoles[userVenueRole.role];
  return role?.permissions.includes(permission) || false;
};

// Get user's owned/managed venues
export const getUserVenues = (user) => {
  const allVenues = JSON.parse(localStorage.getItem('venues') || '[]');
  
  if (user?.type === 'Admin User') {
    return allVenues; // Admin can see all venues
  }
  
  return allVenues.filter(venue => 
    venue.staff?.some(staff => 
      staff.userId === user?.id && 
      ['OWNER', 'MANAGER'].includes(staff.role)
    )
  );
};

// Add beverage to venue
export const addBeverageToVenue = (venueId, beverage, user) => {
  const venues = JSON.parse(localStorage.getItem('venues') || '[]');
  const venueIndex = venues.findIndex(v => v.id === venueId);
  
  if (venueIndex === -1) return false;
  
  const venue = venues[venueIndex];
  
  // Check permissions
  if (!hasVenuePermission(user, venue, 'manage_beverages')) {
    return false;
  }
  
  // Add beverage
  if (!venue.beverages) venue.beverages = [];
  venue.beverages.push({
    ...beverage,
    id: Date.now(),
    addedBy: user.id,
    addedDate: new Date().toISOString(),
    status: 'active' // active, discontinued, seasonal
  });
  
  venue.beverageCount = venue.beverages.length;
  venues[venueIndex] = venue;
  
  localStorage.setItem('venues', JSON.stringify(venues));
  return true;
};

// Reply to review as venue
export const addVenueReplyToReview = (reviewId, reply, user, venue) => {
  if (!hasVenuePermission(user, venue, 'reply_to_reviews')) {
    return false;
  }
  
  const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
  const reviewIndex = reviews.findIndex(r => r.id === reviewId);
  
  if (reviewIndex === -1) return false;
  
  reviews[reviewIndex].venueReply = {
    message: reply,
    repliedBy: user.id,
    repliedAt: new Date().toISOString(),
    venueName: venue.name
  };
  
  localStorage.setItem('reviews', JSON.stringify(reviews));
  return true;
};

// Manage venue staff
export const addVenueStaff = (venueId, staffData, user) => {
  const venues = JSON.parse(localStorage.getItem('venues') || '[]');
  const venueIndex = venues.findIndex(v => v.id === venueId);
  
  if (venueIndex === -1) return false;
  
  const venue = venues[venueIndex];
  
  // Only owners can manage staff
  if (!hasVenuePermission(user, venue, 'manage_staff')) {
    return false;
  }
  
  if (!venue.staff) venue.staff = [];
  venue.staff.push({
    ...staffData,
    addedBy: user.id,
    addedDate: new Date().toISOString(),
    status: 'active'
  });
  
  venues[venueIndex] = venue;
  localStorage.setItem('venues', JSON.stringify(venues));
  return true;
};

// Create event for venue
export const createVenueEvent = (venueId, eventData, user) => {
  const venues = JSON.parse(localStorage.getItem('venues') || '[]');
  const venue = venues.find(v => v.id === venueId);
  
  if (!venue || !hasVenuePermission(user, venue, 'create_events')) {
    return false;
  }
  
  const events = JSON.parse(localStorage.getItem('events') || '[]');
  const newEvent = {
    ...eventData,
    id: Date.now(),
    createdBy: user.id,
    createdDate: new Date().toISOString(),
    venues: [{ id: venue.id, name: venue.name, address: `${venue.city}, ${venue.state}` }],
    organizer: venue.name,
    status: 'active'
  };
  
  events.push(newEvent);
  localStorage.setItem('events', JSON.stringify(events));
  
  return newEvent;
};

// Get venue analytics
export const getVenueAnalytics = (venueId, user) => {
  const venues = JSON.parse(localStorage.getItem('venues') || '[]');
  const venue = venues.find(v => v.id === venueId);
  
  if (!venue || !hasVenuePermission(user, venue, 'view_analytics')) {
    return null;
  }
  
  // Mock analytics data
  return {
    totalVisits: 1247,
    averageRating: venue.averageRating || 0,
    totalRatings: venue.totalRatings || 0,
    beveragesSold: venue.beverageCount || 0,
    topRatedBeverages: venue.beverages?.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 5) || [],
    monthlyTrends: [
      { month: 'Jan', visits: 98, ratings: 23 },
      { month: 'Feb', visits: 112, ratings: 28 },
      { month: 'Mar', visits: 134, ratings: 31 }
    ],
    popularTimes: {
      monday: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 12, 15, 18, 22, 25, 20, 15, 10, 5, 2, 0],
      friday: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 8, 15, 25, 35, 45, 55, 65, 70, 60, 40, 20, 8, 2]
    }
  };
};

// Update beverage status (active, discontinued, seasonal)
export const updateBeverageStatus = (venueId, beverageId, status, user) => {
  const venues = JSON.parse(localStorage.getItem('venues') || '[]');
  const venueIndex = venues.findIndex(v => v.id === venueId);
  
  if (venueIndex === -1) return false;
  
  const venue = venues[venueIndex];
  
  if (!hasVenuePermission(user, venue, 'manage_beverages')) {
    return false;
  }
  
  if (venue.beverages) {
    const beverageIndex = venue.beverages.findIndex(b => b.id === beverageId);
    if (beverageIndex !== -1) {
      venue.beverages[beverageIndex].status = status;
      venue.beverages[beverageIndex].statusUpdatedBy = user.id;
      venue.beverages[beverageIndex].statusUpdatedAt = new Date().toISOString();
      
      venues[venueIndex] = venue;
      localStorage.setItem('venues', JSON.stringify(venues));
      return true;
    }
  }
  
  return false;
};

// Take ownership of venue (for brewery owners)
export const takeVenueOwnership = (venueId, user, verificationData) => {
  if (user?.type !== 'Brewery Login') return false;
  
  const venues = JSON.parse(localStorage.getItem('venues') || '[]');
  const venueIndex = venues.findIndex(v => v.id === venueId);
  
  if (venueIndex === -1) return false;
  
  const venue = venues[venueIndex];
  
  // Add user as owner
  if (!venue.staff) venue.staff = [];
  
  // Remove any existing ownership claims by this user
  venue.staff = venue.staff.filter(staff => staff.userId !== user.id);
  
  venue.staff.push({
    userId: user.id,
    role: 'OWNER',
    addedDate: new Date().toISOString(),
    verificationData, // Business license, etc.
    status: 'pending_verification' // Admin needs to approve
  });
  
  venues[venueIndex] = venue;
  localStorage.setItem('venues', JSON.stringify(venues));
  
  return true;
};