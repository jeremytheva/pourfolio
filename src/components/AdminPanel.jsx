import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { beverageTypes } from '../utils/beverageTypes';

const { 
  FiUsers, FiSettings, FiDatabase, FiActivity, FiShield, 
  FiTrendingUp, FiAlertTriangle, FiCheck, FiX 
} = FiIcons;

function AdminPanel({ adminMode }) {
  const [activeSection, setActiveSection] = useState('overview');

  if (!adminMode) {
    return (
      <div className="text-center py-12">
        <SafeIcon icon={FiShield} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">Admin Mode Disabled</h3>
        <p className="text-gray-400">Enable Admin Mode to access administrative features</p>
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: FiTrendingUp },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'content', label: 'Content', icon: FiDatabase },
    { id: 'settings', label: 'Global Settings', icon: FiSettings },
    { id: 'moderation', label: 'Moderation', icon: FiShield }
  ];

  // Mock admin data
  const adminStats = {
    totalUsers: 1247,
    activeUsers: 892,
    totalRatings: 15643,
    totalVenues: 324,
    pendingReports: 7,
    systemHealth: 98.5
  };

  const recentActivity = [
    { type: 'user_signup', user: 'jane.doe@email.com', time: '2 minutes ago' },
    { type: 'venue_added', venue: 'Craft Beer Corner', user: 'brewery_owner', time: '15 minutes ago' },
    { type: 'rating_reported', rating: 'IPA Delight Review', reporter: 'user123', time: '1 hour ago' },
    { type: 'admin_login', user: 'admin@pourfolio.com', time: '2 hours ago' }
  ];

  const pendingReports = [
    { id: 1, type: 'Inappropriate Review', content: 'Beer review contains offensive language', reporter: 'user456', status: 'pending' },
    { id: 2, type: 'Spam Venue', content: 'Duplicate venue listing', reporter: 'user789', status: 'pending' },
    { id: 3, type: 'Fake Rating', content: 'Suspicious rating pattern', reporter: 'system', status: 'investigating' }
  ];

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiShield} className="w-5 h-5 text-red-600" />
          <h2 className="text-xl font-bold text-red-800">Admin Panel</h2>
          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">ADMIN MODE</span>
        </div>
        <p className="text-red-700 text-sm mt-1">You have full administrative access to the platform</p>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeSection === section.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <SafeIcon icon={section.icon} className="w-4 h-4" />
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Section Content */}
      <div>
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{adminStats.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-blue-800">Total Users</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{adminStats.activeUsers.toLocaleString()}</div>
                <div className="text-sm text-green-800">Active Users</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{adminStats.totalRatings.toLocaleString()}</div>
                <div className="text-sm text-purple-800">Total Ratings</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{adminStats.totalVenues.toLocaleString()}</div>
                <div className="text-sm text-amber-800">Venues</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{adminStats.pendingReports}</div>
                <div className="text-sm text-red-800">Pending Reports</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{adminStats.systemHealth}%</div>
                <div className="text-sm text-green-800">System Health</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <SafeIcon icon={FiActivity} className="w-4 h-4 text-gray-500" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-800">
                        {activity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: {activity.user || activity.venue}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Section */}
        {activeSection === 'users' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600">User management features would be implemented here, including:</p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
                <li>View and search all users</li>
                <li>Suspend or ban users</li>
                <li>View user activity and ratings</li>
                <li>Manage user roles and permissions</li>
                <li>Export user data</li>
              </ul>
            </div>
          </div>
        )}

        {/* Content Section */}
        {activeSection === 'content' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Content Management</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600">Content management features:</p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
                <li>Manage beverage database</li>
                <li>Approve new venues</li>
                <li>Moderate reviews and ratings</li>
                <li>Update style guidelines</li>
                <li>Manage featured content</li>
              </ul>
            </div>
          </div>
        )}

        {/* Global Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Global Settings</h3>
            
            {/* Platform Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-medium text-gray-800 mb-4">Platform Configuration</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <div>
                    <div className="font-medium">User Registration</div>
                    <div className="text-sm text-gray-600">Allow new user signups</div>
                  </div>
                  <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">Enabled</button>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <div>
                    <div className="font-medium">Content Moderation</div>
                    <div className="text-sm text-gray-600">Require approval for new content</div>
                  </div>
                  <button className="bg-amber-600 text-white px-3 py-1 rounded text-sm">Auto-Approve</button>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <div>
                    <div className="font-medium">Rating System</div>
                    <div className="text-sm text-gray-600">Global rating algorithm version</div>
                  </div>
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">v2.1</button>
                </div>
              </div>
            </div>

            {/* Default Beverage Weights */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-medium text-gray-800 mb-4">Default Rating Weights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(beverageTypes).map(([key, beverage]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-lg">{beverage.icon}</span>
                      <h5 className="font-medium text-gray-800">{beverage.name}</h5>
                    </div>
                    <div className="space-y-2 text-sm">
                      {Object.entries(beverage.defaultWeights).map(([attr, weight]) => (
                        <div key={attr} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{attr.replace('_', ' ')}:</span>
                          <span className="font-medium">{weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Moderation Section */}
        {activeSection === 'moderation' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Content Moderation</h3>
            
            {/* Pending Reports */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-medium text-gray-800 mb-4">Pending Reports ({pendingReports.length})</h4>
              <div className="space-y-4">
                {pendingReports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-gray-800">{report.type}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{report.content}</p>
                        <p className="text-xs text-gray-500">Reported by: {report.reporter}</p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                          <SafeIcon icon={FiCheck} className="w-4 h-4" />
                        </button>
                        <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                          <SafeIcon icon={FiX} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;