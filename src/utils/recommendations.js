// Beer recommendation engine based on user preferences and ratings
import { beverageTypes } from './beverageTypes';

// Calculate user preference profile based on their ratings
export const calculateUserPreferences = (userRatings) => {
  if (!userRatings || userRatings.length === 0) {
    return getDefaultPreferences();
  }

  const preferences = {
    beverageTypes: {},
    styles: {},
    producers: {},
    attributes: {
      hop_intensity: 0,
      maltiness: 0,
      bitterness: 0,
      sweetness: 0,
      alcohol_strength: 0,
      complexity: 0
    },
    abvRange: { min: 0, max: 15 },
    priceRange: { min: 0, max: 100 }
  };

  let totalRatings = 0;
  let weightedAttributeSum = {
    hop_intensity: 0,
    maltiness: 0,
    bitterness: 0,
    sweetness: 0,
    alcohol_strength: 0,
    complexity: 0
  };

  userRatings.forEach(rating => {
    if (rating.rating >= 4.0) { // Only consider well-liked beverages
      totalRatings++;
      
      // Track beverage type preferences
      preferences.beverageTypes[rating.type] = (preferences.beverageTypes[rating.type] || 0) + rating.rating;
      
      // Track style preferences
      preferences.styles[rating.style] = (preferences.styles[rating.style] || 0) + rating.rating;
      
      // Track producer preferences
      preferences.producers[rating.producer] = (preferences.producers[rating.producer] || 0) + rating.rating;
      
      // Aggregate attribute preferences (if available)
      if (rating.attributes) {
        Object.keys(weightedAttributeSum).forEach(attr => {
          if (rating.attributes[attr] !== undefined) {
            weightedAttributeSum[attr] += rating.attributes[attr] * rating.rating;
          }
        });
      }
      
      // Track ABV preferences
      if (rating.abv) {
        preferences.abvRange.min = Math.min(preferences.abvRange.min, rating.abv - 1);
        preferences.abvRange.max = Math.max(preferences.abvRange.max, rating.abv + 1);
      }
    }
  });

  // Normalize preferences
  if (totalRatings > 0) {
    Object.keys(preferences.beverageTypes).forEach(type => {
      preferences.beverageTypes[type] /= totalRatings;
    });
    
    Object.keys(preferences.styles).forEach(style => {
      preferences.styles[style] /= totalRatings;
    });
    
    Object.keys(preferences.producers).forEach(producer => {
      preferences.producers[producer] /= totalRatings;
    });
    
    Object.keys(weightedAttributeSum).forEach(attr => {
      preferences.attributes[attr] = weightedAttributeSum[attr] / totalRatings;
    });
  }

  return preferences;
};

// Get default preferences for new users
export const getDefaultPreferences = () => ({
  beverageTypes: { beer: 1.0 },
  styles: {},
  producers: {},
  attributes: {
    hop_intensity: 5,
    maltiness: 5,
    bitterness: 5,
    sweetness: 5,
    alcohol_strength: 5,
    complexity: 5
  },
  abvRange: { min: 3, max: 10 },
  priceRange: { min: 0, max: 50 }
});

// Calculate similarity between user preferences and a beverage
export const calculateBeverageSimilarity = (userPreferences, beverage) => {
  let similarity = 0;
  let factors = 0;

  // Beverage type match
  const typePreference = userPreferences.beverageTypes[beverage.type] || 0;
  similarity += typePreference * 0.3;
  factors += 0.3;

  // Style match
  const stylePreference = userPreferences.styles[beverage.style] || 0;
  similarity += stylePreference * 0.25;
  factors += 0.25;

  // Producer match
  const producerPreference = userPreferences.producers[beverage.producer] || 0;
  similarity += producerPreference * 0.15;
  factors += 0.15;

  // ABV range match
  if (beverage.abv >= userPreferences.abvRange.min && beverage.abv <= userPreferences.abvRange.max) {
    similarity += 0.2;
  }
  factors += 0.2;

  // Attribute similarity (if available)
  if (beverage.attributes && userPreferences.attributes) {
    let attributeSimilarity = 0;
    let attributeFactors = 0;
    
    Object.keys(userPreferences.attributes).forEach(attr => {
      if (beverage.attributes[attr] !== undefined) {
        const difference = Math.abs(userPreferences.attributes[attr] - beverage.attributes[attr]);
        const normalizedSimilarity = 1 - (difference / 10); // Assuming 0-10 scale
        attributeSimilarity += Math.max(0, normalizedSimilarity);
        attributeFactors++;
      }
    });
    
    if (attributeFactors > 0) {
      similarity += (attributeSimilarity / attributeFactors) * 0.1;
      factors += 0.1;
    }
  }

  return factors > 0 ? similarity / factors : 0;
};

// Generate recommendations for a user
export const generateRecommendations = (userRatings, availableBeverages, options = {}) => {
  const {
    count = 10,
    beverageType = null,
    venue = null,
    event = null,
    excludeRated = true
  } = options;

  const userPreferences = calculateUserPreferences(userRatings);
  
  // Get user's rated beverage IDs for exclusion
  const ratedBeverageIds = new Set(userRatings.map(r => r.beverageId));
  
  // Filter beverages based on options
  let candidateBeverages = availableBeverages.filter(beverage => {
    // Exclude already rated beverages if specified
    if (excludeRated && ratedBeverageIds.has(beverage.id)) {
      return false;
    }
    
    // Filter by beverage type if specified
    if (beverageType && beverage.type !== beverageType) {
      return false;
    }
    
    // Filter by venue if specified
    if (venue && !beverage.availableAt?.includes(venue.id)) {
      return false;
    }
    
    // Filter by event if specified
    if (event && !event.featuredBeers?.some(fb => fb.id === beverage.id)) {
      return false;
    }
    
    return true;
  });

  // Calculate similarity scores and sort
  const recommendations = candidateBeverages
    .map(beverage => ({
      ...beverage,
      similarityScore: calculateBeverageSimilarity(userPreferences, beverage),
      recommendationReason: getRecommendationReason(userPreferences, beverage)
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, count);

  return {
    recommendations,
    userPreferences,
    totalCandidates: candidateBeverages.length
  };
};

// Generate explanation for why a beverage was recommended
export const getRecommendationReason = (userPreferences, beverage) => {
  const reasons = [];

  // Check top beverage type preference
  const topBeverageType = Object.entries(userPreferences.beverageTypes)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (topBeverageType && beverage.type === topBeverageType[0]) {
    const beverageTypeInfo = beverageTypes[beverage.type];
    reasons.push(`You enjoy ${beverageTypeInfo.name.toLowerCase()}s`);
  }

  // Check style preference
  if (userPreferences.styles[beverage.style] > 4.0) {
    reasons.push(`You've rated ${beverage.style} highly before`);
  }

  // Check producer preference
  if (userPreferences.producers[beverage.producer] > 4.0) {
    reasons.push(`You've enjoyed ${beverage.producer} beverages`);
  }

  // Check ABV preference
  if (beverage.abv >= userPreferences.abvRange.min && beverage.abv <= userPreferences.abvRange.max) {
    reasons.push(`ABV (${beverage.abv}%) matches your preference`);
  }

  // Check high rating
  if (beverage.averageRating >= 4.5) {
    reasons.push(`Highly rated by community (${beverage.averageRating}/5)`);
  }

  // Default reason if no specific matches
  if (reasons.length === 0) {
    reasons.push('Popular choice among users with similar tastes');
  }

  return reasons.slice(0, 2); // Return top 2 reasons
};

// Get recommendations for a specific context (venue, event, etc.)
export const getContextualRecommendations = (userRatings, context, contextData) => {
  const baseOptions = {
    count: 5,
    excludeRated: false // Show rated items in context for comparison
  };

  switch (context) {
    case 'venue':
      return generateRecommendations(userRatings, contextData.availableBeverages, {
        ...baseOptions,
        venue: contextData.venue
      });
      
    case 'event':
      return generateRecommendations(userRatings, contextData.featuredBeverages, {
        ...baseOptions,
        event: contextData.event
      });
      
    case 'similar_style':
      return generateRecommendations(userRatings, contextData.beverages, {
        ...baseOptions,
        beverageType: contextData.beverageType
      });
      
    case 'discovery':
    default:
      return generateRecommendations(userRatings, contextData.beverages, baseOptions);
  }
};

// Get trending beverages based on recent ratings
export const getTrendingBeverages = (allRatings, timeframe = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframe);

  const recentRatings = allRatings.filter(rating => 
    new Date(rating.date) >= cutoffDate
  );

  const beverageStats = {};
  
  recentRatings.forEach(rating => {
    if (!beverageStats[rating.beverageId]) {
      beverageStats[rating.beverageId] = {
        totalRating: 0,
        ratingCount: 0,
        beverage: rating.beverage
      };
    }
    
    beverageStats[rating.beverageId].totalRating += rating.rating;
    beverageStats[rating.beverageId].ratingCount++;
  });

  return Object.values(beverageStats)
    .map(stats => ({
      ...stats.beverage,
      trendingScore: (stats.totalRating / stats.ratingCount) * Math.log(stats.ratingCount + 1),
      recentRatings: stats.ratingCount
    }))
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 10);
};