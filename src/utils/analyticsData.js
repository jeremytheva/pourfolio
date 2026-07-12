import * as FiIcons from 'react-icons/fi';
import { beverageTypes } from './beverageTypes';

const { 
  FiStar, 
  FiTrendingUp, 
  FiUsers, 
  FiCalendar, 
  FiTarget,
  FiHeart,
  FiMapPin,
  FiCoffee,
  FiGift
} = FiIcons;

// Generate mock analytics data based on user ratings and preferences
export const generateAnalyticsData = (userRatings = [], beverageCategory = 'beer', timeframe = '6months') => {
  const now = new Date();
  const getTimeframeDate = (timeframe) => {
    const date = new Date(now);
    switch (timeframe) {
      case '1month':
        date.setMonth(date.getMonth() - 1);
        break;
      case '3months':
        date.setMonth(date.getMonth() - 3);
        break;
      case '6months':
        date.setMonth(date.getMonth() - 6);
        break;
      case '1year':
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setFullYear(2020); // All time
    }
    return date;
  };

  const startDate = getTimeframeDate(timeframe);
  
  // Filter ratings by timeframe
  const filteredRatings = userRatings.filter(rating => 
    new Date(rating.date || now) >= startDate
  );

  // Generate summary statistics
  const summary = {
    totalRatings: {
      value: filteredRatings.length || 47,
      label: 'Total Ratings',
      icon: FiStar,
      color: 'bg-amber-500',
      change: 12
    },
    averageRating: {
      value: filteredRatings.length > 0 
        ? (filteredRatings.reduce((sum, r) => sum + r.rating, 0) / filteredRatings.length).toFixed(1)
        : '4.2',
      label: 'Average Rating',
      icon: FiTrendingUp,
      color: 'bg-blue-500',
      change: 5
    },
    uniqueProducers: {
      value: new Set(filteredRatings.map(r => r.producer)).size || 23,
      label: 'Unique Producers',
      icon: FiUsers,
      color: 'bg-green-500',
      change: 8
    },
    activeDays: {
      value: Math.min(30, filteredRatings.length * 2) || 18,
      label: 'Active Days',
      icon: FiCalendar,
      color: 'bg-purple-500',
      change: -3
    }
  };

  // Generate time series data
  const generateTimeSeriesData = (months = 6) => {
    const categories = [];
    const values = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      categories.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      
      // Generate realistic rating data
      const baseValue = 3 + Math.random() * 2;
      const trend = (months - i) * 0.1; // Slight upward trend
      values.push(Math.round((baseValue + trend) * 10) / 10);
    }
    
    return { categories, values };
  };

  const timeSeriesData = generateTimeSeriesData(timeframe === '1year' ? 12 : 6);

  // Ratings over time chart
  const ratingsOverTime = {
    categories: timeSeriesData.categories,
    series: [
      {
        name: 'Average Rating',
        type: 'line',
        data: timeSeriesData.values,
        smooth: true,
        itemStyle: { color: '#F59E0B' },
        areaStyle: { 
          color: 'rgba(245, 158, 11, 0.3)'
        }
      },
      {
        name: 'Rating Count',
        type: 'bar',
        data: timeSeriesData.categories.map(() => Math.floor(Math.random() * 10) + 2),
        itemStyle: { color: '#3B82F6', opacity: 0.7 },
        yAxisIndex: 1
      }
    ]
  };

  // Beverage styles analysis
  const styles = ['IPA', 'Stout', 'Pilsner', 'Wheat Beer', 'Porter', 'Lager', 'Saison'];
  const ratingsByStyle = {
    categories: styles,
    values: styles.map(() => (3.5 + Math.random() * 1.5).toFixed(1))
  };

  // Beverage type distribution
  const beverageTypeDistribution = {
    values: Object.entries(beverageTypes).map(([key, type]) => ({
      name: type.name,
      value: Math.floor(Math.random() * 30) + 5,
      itemStyle: { 
        color: key === beverageCategory ? '#F59E0B' : `hsl(${Math.random() * 360}, 60%, 60%)`
      }
    }))
  };

  // Rating heatmap (day of week vs hour)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const ratingHeatmap = {
    xAxis: hours.map(h => `${h}:00`),
    yAxis: days,
    values: days.flatMap((day, dayIndex) => 
      hours.map((hour, hourIndex) => [
        hourIndex, 
        dayIndex, 
        Math.random() * 5
      ])
    ),
    min: 0,
    max: 5
  };

  // Activity by month
  const activityByMonth = {
    categories: timeSeriesData.categories,
    values: timeSeriesData.categories.map(() => Math.floor(Math.random() * 15) + 3)
  };

  // Cumulative ratings
  const cumulativeRatings = {
    categories: timeSeriesData.categories,
    series: [{
      name: 'Cumulative Ratings',
      type: 'line',
      data: timeSeriesData.categories.map((_, i) => (i + 1) * 8 + Math.floor(Math.random() * 5)),
      smooth: true,
      itemStyle: { color: '#10B981' }
    }]
  };

  // Activity sources
  const activitySources = {
    values: [
      { name: 'Home Tastings', value: 45, itemStyle: { color: '#F59E0B' } },
      { name: 'Brewery Visits', value: 30, itemStyle: { color: '#3B82F6' } },
      { name: 'Events', value: 15, itemStyle: { color: '#10B981' } },
      { name: 'Restaurants', value: 10, itemStyle: { color: '#8B5CF6' } }
    ]
  };

  // Ratings by day of week
  const ratingsByDayOfWeek = {
    categories: days,
    values: days.map(() => Math.floor(Math.random() * 10) + 2)
  };

  // Taste evolution (attribute preferences over time)
  const tasteEvolution = {
    categories: timeSeriesData.categories,
    series: [
      {
        name: 'Hop Preference',
        type: 'line',
        data: timeSeriesData.categories.map(() => (Math.random() * 3) + 5),
        smooth: true,
        itemStyle: { color: '#22C55E' }
      },
      {
        name: 'Malt Preference',
        type: 'line',
        data: timeSeriesData.categories.map(() => (Math.random() * 2) + 4),
        smooth: true,
        itemStyle: { color: '#A855F7' }
      },
      {
        name: 'Sweetness Tolerance',
        type: 'line',
        data: timeSeriesData.categories.map(() => (Math.random() * 2) + 3),
        smooth: true,
        itemStyle: { color: '#F97316' }
      }
    ]
  };

  // ABV vs Rating scatter plot
  const abvVsRating = {
    values: Array.from({ length: 50 }, () => [
      (Math.random() * 10) + 2, // ABV 2-12%
      (Math.random() * 2) + 3   // Rating 3-5
    ]),
    xLabel: 'ABV (%)',
    yLabel: 'Rating'
  };

  // Producer preferences
  const producers = ['Brewery A', 'Brewery B', 'Brewery C', 'Brewery D', 'Brewery E'];
  const producerPreferences = {
    categories: producers,
    values: producers.map(() => (Math.random() * 1.5) + 3.5)
  };

  // Seasonal trends
  const seasonalTrends = {
    categories: ['Spring', 'Summer', 'Fall', 'Winter'],
    series: [
      {
        name: 'Light Beers',
        type: 'line',
        data: [4.2, 4.8, 3.9, 3.2],
        itemStyle: { color: '#FCD34D' }
      },
      {
        name: 'Dark Beers',
        type: 'line',
        data: [3.8, 3.2, 4.5, 4.8],
        itemStyle: { color: '#92400E' }
      },
      {
        name: 'Hoppy Beers',
        type: 'line',
        data: [4.1, 4.3, 4.2, 3.9],
        itemStyle: { color: '#059669' }
      }
    ]
  };

  // User vs Community comparison
  const userVsCommunity = {
    categories: styles.slice(0, 5),
    series: [
      {
        name: 'Your Ratings',
        type: 'bar',
        data: styles.slice(0, 5).map(() => (Math.random() * 1.5) + 3.5),
        itemStyle: { color: '#F59E0B' }
      },
      {
        name: 'Community Average',
        type: 'bar',
        data: styles.slice(0, 5).map(() => (Math.random() * 1) + 4),
        itemStyle: { color: '#6B7280' }
      }
    ]
  };

  // Price vs Quality perception
  const priceVsQuality = {
    values: Array.from({ length: 30 }, () => [
      Math.random() * 50 + 5,  // Price $5-55
      (Math.random() * 2) + 3  // Quality rating 3-5
    ]),
    xLabel: 'Price ($)',
    yLabel: 'Quality Rating'
  };

  // Rating distribution
  const ratingDistribution = {
    values: [
      { name: '5 Stars', value: 18, itemStyle: { color: '#10B981' } },
      { name: '4-4.9 Stars', value: 32, itemStyle: { color: '#F59E0B' } },
      { name: '3-3.9 Stars', value: 28, itemStyle: { color: '#3B82F6' } },
      { name: '2-2.9 Stars', value: 15, itemStyle: { color: '#F97316' } },
      { name: '1-1.9 Stars', value: 7, itemStyle: { color: '#EF4444' } }
    ]
  };

  // Attribute preference matrix
  const attributes = ['Aroma', 'Appearance', 'Flavor', 'Mouthfeel', 'Finish'];
  const attributeMatrix = {
    xAxis: styles.slice(0, 5),
    yAxis: attributes,
    values: styles.slice(0, 5).flatMap((style, styleIndex) =>
      attributes.map((attr, attrIndex) => [
        styleIndex,
        attrIndex,
        (Math.random() * 2) + 3
      ])
    ),
    min: 0,
    max: 5
  };

  // Generate insights based on data
  const insights = [
    {
      title: 'Taste Preference Evolution',
      description: 'Your preference for hoppy beers has increased by 23% over the past 6 months.',
      icon: FiTrendingUp,
      action: 'Explore more IPA styles'
    },
    {
      title: 'Discovery Opportunity',
      description: 'You haven\'t tried any Belgian styles yet. These might align with your taste profile.',
      icon: FiTarget,
      action: 'Browse Belgian beers'
    },
    {
      title: 'Social Drinking Pattern',
      description: 'You rate beers 0.3 points higher when drinking with friends.',
      icon: FiUsers,
      action: 'Plan more brewery visits'
    },
    {
      title: 'Seasonal Preference',
      description: 'Your ratings are consistently higher during fall months.',
      icon: FiCalendar,
      action: 'Stock up on seasonal favorites'
    },
    {
      title: 'Value Sweet Spot',
      description: 'Your highest-rated beers average $12-18. Focus on this price range.',
      icon: FiHeart,
      action: 'Set price alerts'
    },
    {
      title: 'Local Brewery Support',
      description: '68% of your ratings are from local breweries. Great for supporting community!',
      icon: FiMapPin,
      action: 'Discover more local spots'
    }
  ];

  return {
    summary,
    ratingsOverTime,
    ratingsByStyle,
    beverageTypeDistribution,
    ratingHeatmap,
    activityByMonth,
    cumulativeRatings,
    activitySources,
    ratingsByDayOfWeek,
    tasteEvolution,
    abvVsRating,
    producerPreferences,
    seasonalTrends,
    userVsCommunity,
    priceVsQuality,
    ratingDistribution,
    attributeMatrix,
    insights
  };
};

// Generate comparative analytics between users
export const generateComparativeAnalytics = (userA, userB) => {
  return {
    compatibility: Math.floor(Math.random() * 30) + 70, // 70-100% compatibility
    sharedPreferences: [
      'Both prefer IPAs',
      'Similar rating patterns for stouts',
      'Both enjoy local breweries'
    ],
    differences: [
      'User A prefers higher ABV',
      'User B rates dark beers higher',
      'Different seasonal preferences'
    ],
    recommendations: [
      'Try Brewery X IPA (both might enjoy)',
      'Visit Local Taproom together',
      'Share ratings for Porter styles'
    ]
  };
};

// Generate venue analytics for business owners
export const generateVenueAnalytics = (venueId, timeframe = '3months') => {
  return {
    customerMetrics: {
      totalVisits: 1247,
      uniqueCustomers: 892,
      returnRate: 68,
      averageRating: 4.3
    },
    beveragePerformance: {
      topRated: [
        { name: 'House IPA', rating: 4.7, orders: 245 },
        { name: 'Seasonal Porter', rating: 4.5, orders: 189 },
        { name: 'Wheat Beer', rating: 4.3, orders: 156 }
      ],
      trending: [
        { name: 'New England IPA', growth: 45 },
        { name: 'Sour Ale', growth: 32 },
        { name: 'Local Lager', growth: 28 }
      ]
    },
    customerSegments: {
      casual: 45,
      enthusiast: 35,
      expert: 20
    },
    peakTimes: {
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        customers: Math.max(0, Math.floor(Math.random() * 50) - 10)
      })),
      daily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        customers: Math.floor(Math.random() * 100) + 20
      }))
    }
  };
};