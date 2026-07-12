import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AnalyticsChart from './AnalyticsChart';
import { beverageTypes } from '../utils/beverageTypes';
import { generateAnalyticsData } from '../utils/analyticsData';

const { 
  FiTrendingUp, 
  FiBarChart3, 
  FiPieChart, 
  FiActivity,
  FiCalendar,
  FiUsers,
  FiStar,
  FiDownload,
  FiRefreshCw
} = FiIcons;

function AnalyticsDashboard({ userRatings = [], selectedBeverageCategory = 'beer' }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('ratings');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Simulate data loading
    setTimeout(() => {
      const data = generateAnalyticsData(userRatings, selectedBeverageCategory, selectedTimeframe);
      setAnalyticsData(data);
      setIsLoading(false);
    }, 500);
  }, [userRatings, selectedBeverageCategory, selectedTimeframe]);

  const timeframes = [
    { value: '1month', label: 'Last Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: '1year', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ];

  const metrics = [
    { value: 'ratings', label: 'Ratings', icon: FiStar },
    { value: 'activity', label: 'Activity', icon: FiActivity },
    { value: 'trends', label: 'Trends', icon: FiTrendingUp },
    { value: 'comparison', label: 'Comparison', icon: FiBarChart3 }
  ];

  const handleExportData = () => {
    if (!analyticsData) return;
    
    const exportData = {
      summary: analyticsData.summary,
      timeframe: selectedTimeframe,
      generatedAt: new Date().toISOString(),
      beverageCategory: selectedBeverageCategory
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pourfolio-analytics-${selectedTimeframe}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      const data = generateAnalyticsData(userRatings, selectedBeverageCategory, selectedTimeframe);
      setAnalyticsData(data);
      setIsLoading(false);
    }, 800);
  };

  if (isLoading || !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mr-4"></div>
          <span className="text-gray-600">Generating analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
          <p className="text-gray-600">Insights into your beverage preferences and rating patterns</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Timeframe Selector */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {timeframes.map((timeframe) => (
              <option key={timeframe.value} value={timeframe.value}>
                {timeframe.label}
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={handleRefreshData}
            className="p-2 text-gray-600 hover:text-amber-600 transition-colors"
            title="Refresh Data"
          >
            <SafeIcon icon={FiRefreshCw} className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleExportData}
            className="p-2 text-gray-600 hover:text-amber-600 transition-colors"
            title="Export Data"
          >
            <SafeIcon icon={FiDownload} className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(analyticsData.summary).map(([key, stat], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <SafeIcon icon={stat.icon} className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
                {stat.change && (
                  <div className={`text-xs flex items-center space-x-1 mt-1 ${
                    stat.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <SafeIcon 
                      icon={stat.change > 0 ? FiTrendingUp : FiActivity} 
                      className="w-3 h-3" 
                    />
                    <span>{Math.abs(stat.change)}% vs last period</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Metric Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex space-x-2">
          {metrics.map((metric) => (
            <button
              key={metric.value}
              onClick={() => setSelectedMetric(metric.value)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                selectedMetric === metric.value
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SafeIcon icon={metric.icon} className="w-4 h-4" />
              <span className="font-medium">{metric.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ratings Over Time */}
        {selectedMetric === 'ratings' && (
          <>
            <AnalyticsChart
              type="line"
              title="Ratings Over Time"
              data={analyticsData.ratingsOverTime}
            />
            
            <AnalyticsChart
              type="bar"
              title="Average Rating by Style"
              data={analyticsData.ratingsByStyle}
            />
            
            <AnalyticsChart
              type="pie"
              title="Beverage Type Distribution"
              data={analyticsData.beverageTypeDistribution}
            />
            
            <AnalyticsChart
              type="heatmap"
              title="Rating Patterns by Day/Hour"
              data={analyticsData.ratingHeatmap}
            />
          </>
        )}

        {/* Activity Analysis */}
        {selectedMetric === 'activity' && (
          <>
            <AnalyticsChart
              type="bar"
              title="Activity by Month"
              data={analyticsData.activityByMonth}
            />
            
            <AnalyticsChart
              type="line"
              title="Cumulative Ratings"
              data={analyticsData.cumulativeRatings}
            />
            
            <AnalyticsChart
              type="pie"
              title="Activity Sources"
              data={analyticsData.activitySources}
            />
            
            <AnalyticsChart
              type="bar"
              title="Ratings by Day of Week"
              data={analyticsData.ratingsByDayOfWeek}
            />
          </>
        )}

        {/* Trends Analysis */}
        {selectedMetric === 'trends' && (
          <>
            <AnalyticsChart
              type="line"
              title="Taste Evolution"
              data={analyticsData.tasteEvolution}
            />
            
            <AnalyticsChart
              type="scatter"
              title="ABV vs Rating Preference"
              data={analyticsData.abvVsRating}
            />
            
            <AnalyticsChart
              type="bar"
              title="Producer Preferences"
              data={analyticsData.producerPreferences}
            />
            
            <AnalyticsChart
              type="line"
              title="Seasonal Trends"
              data={analyticsData.seasonalTrends}
            />
          </>
        )}

        {/* Comparison Analysis */}
        {selectedMetric === 'comparison' && (
          <>
            <AnalyticsChart
              type="bar"
              title="Your Ratings vs Community Average"
              data={analyticsData.userVsCommunity}
            />
            
            <AnalyticsChart
              type="scatter"
              title="Price vs Quality Perception"
              data={analyticsData.priceVsQuality}
            />
            
            <AnalyticsChart
              type="pie"
              title="Rating Distribution"
              data={analyticsData.ratingDistribution}
            />
            
            <AnalyticsChart
              type="heatmap"
              title="Attribute Preference Matrix"
              data={analyticsData.attributeMatrix}
            />
          </>
        )}
      </div>

      {/* Insights Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-6"
      >
        <h3 className="text-lg font-semibold text-amber-800 mb-4">
          Key Insights & Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyticsData.insights.map((insight, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="flex items-start space-x-3">
                <SafeIcon icon={insight.icon} className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800 mb-1">{insight.title}</h4>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                  {insight.action && (
                    <button className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-2">
                      {insight.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default AnalyticsDashboard;