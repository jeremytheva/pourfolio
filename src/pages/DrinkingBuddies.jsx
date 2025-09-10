import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import DrinkingBuddiesModal from '../components/DrinkingBuddiesModal';
import BuddyProfileModal from '../components/BuddyProfileModal';

const { FiUsers, FiUserPlus, FiSearch, FiMessageCircle, FiMoreVertical, FiUserMinus, FiEye } = FiIcons;

function DrinkingBuddies() {
  const [buddies, setBuddies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Load buddies and pending requests
  useEffect(() => {
    // Mock data - in real app, load from API
    const mockBuddies = [
      {
        id: 'buddy1',
        name: 'John Smith',
        username: 'johnsmith',
        avatar: '👨',
        location: 'Portland, OR',
        status: 'online',
        mutualBuddies: 5,
        recentActivity: 'Rated Pliny the Elder 5 stars',
        joinDate: '2023-03-15'
      },
      {
        id: 'buddy2',
        name: 'Sarah Wilson',
        username: 'sarahw',
        avatar: '👩',
        location: 'San Francisco, CA',
        status: 'offline',
        mutualBuddies: 3,
        recentActivity: 'Checked in at The Crafty Pint',
        joinDate: '2023-05-22'
      },
      {
        id: 'buddy3',
        name: 'Mike Johnson',
        username: 'mikej',
        avatar: '👱‍♂️',
        location: 'Seattle, WA',
        status: 'away',
        mutualBuddies: 2,
        recentActivity: 'Added Stone IPA to cellar',
        joinDate: '2023-07-10'
      },
      {
        id: 'buddy4',
        name: 'Emily Chen',
        username: 'emilyc',
        avatar: '👩‍💼',
        location: 'Denver, CO',
        status: 'online',
        mutualBuddies: 4,
        recentActivity: 'Shared a cellar item with you',
        joinDate: '2023-02-08'
      }
    ];

    const mockPendingRequests = [
      {
        id: 'req1',
        name: 'Alex Rodriguez',
        username: 'alexr',
        avatar: '👨‍🔧',
        location: 'Austin, TX',
        mutualBuddies: 1,
        sentDate: '2024-01-20'
      },
      {
        id: 'req2',
        name: 'Lisa Davis',
        username: 'lisad',
        avatar: '👩‍🎨',
        location: 'Chicago, IL',
        mutualBuddies: 0,
        sentDate: '2024-01-18'
      }
    ];

    setBuddies(mockBuddies);
    setPendingRequests(mockPendingRequests);
  }, []);

  const filteredBuddies = buddies.filter(buddy =>
    buddy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buddy.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buddy.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const handleViewProfile = (buddy) => {
    setSelectedBuddy(buddy);
    setShowProfileModal(true);
  };

  const handleAcceptRequest = (requestId) => {
    const request = pendingRequests.find(req => req.id === requestId);
    if (request) {
      setBuddies(prev => [...prev, {
        ...request,
        id: `buddy_${request.id}`,
        status: 'offline',
        recentActivity: 'Just became drinking buddies!'
      }]);
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const handleDeclineRequest = (requestId) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const handleRemoveBuddy = (buddyId) => {
    if (confirm('Are you sure you want to remove this drinking buddy?')) {
      setBuddies(prev => prev.filter(buddy => buddy.id !== buddyId));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <SafeIcon icon={FiUsers} className="w-8 h-8 text-amber-600" />
          <h1 className="text-4xl font-bold text-gray-800">Drinking Buddies</h1>
        </div>
        <p className="text-lg text-gray-600">
          Connect with fellow beer enthusiasts and share your passion
        </p>
      </motion.div>

      {/* Stats and Add Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{buddies.length}</div>
            <div className="text-sm text-gray-600">Drinking Buddies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pendingRequests.length}</div>
            <div className="text-sm text-gray-600">Pending Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {buddies.filter(b => b.status === 'online').length}
            </div>
            <div className="text-sm text-gray-600">Online Now</div>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiUserPlus} className="w-5 h-5" />
          <span>Find Buddies</span>
        </button>
      </motion.div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Requests</h2>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                    {request.avatar}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-800">{request.name}</h3>
                      <span className="text-sm text-gray-500">@{request.username}</span>
                    </div>
                    <p className="text-sm text-gray-600">{request.location}</p>
                    {request.mutualBuddies > 0 && (
                      <p className="text-xs text-blue-600">
                        {request.mutualBuddies} mutual buddy{request.mutualBuddies !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(request.id)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="relative">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your drinking buddies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Buddies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBuddies.map((buddy, index) => (
          <motion.div
            key={buddy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Buddy Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                    {buddy.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(buddy.status)}`}></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{buddy.name}</h3>
                  <p className="text-sm text-gray-500">@{buddy.username}</p>
                </div>
              </div>
              
              {/* Actions Menu */}
              <div className="relative group">
                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <SafeIcon icon={FiMoreVertical} className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleViewProfile(buddy)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <SafeIcon icon={FiEye} className="w-4 h-4" />
                    <span>View Profile</span>
                  </button>
                  <button
                    onClick={() => {/* Handle message */}}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <SafeIcon icon={FiMessageCircle} className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                  <button
                    onClick={() => handleRemoveBuddy(buddy.id)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <SafeIcon icon={FiUserMinus} className="w-4 h-4" />
                    <span>Remove Buddy</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 flex items-center space-x-1">
                <SafeIcon icon={FiUsers} className="w-4 h-4" />
                <span>{buddy.location}</span>
              </p>
              {buddy.mutualBuddies > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {buddy.mutualBuddies} mutual buddy{buddy.mutualBuddies !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="text-xs font-medium text-gray-500 mb-1">Recent Activity</h4>
              <p className="text-sm text-gray-700">{buddy.recentActivity}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleViewProfile(buddy)}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                View Profile
              </button>
              <button
                onClick={() => {/* Handle message */}}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Message
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* No Results */}
      {filteredBuddies.length === 0 && buddies.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No buddies found</h3>
          <p className="text-gray-400">Try adjusting your search criteria.</p>
        </motion.div>
      )}

      {/* Empty State */}
      {buddies.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiUsers} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No drinking buddies yet</h3>
          <p className="text-gray-400 mb-6">
            Start building your network of beer enthusiasts!
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
          >
            <SafeIcon icon={FiUserPlus} className="w-5 h-5" />
            <span>Find Your First Buddy</span>
          </button>
        </motion.div>
      )}

      {/* Modals */}
      <DrinkingBuddiesModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        currentBuddies={buddies}
        onAddBuddy={(buddy) => setBuddies(prev => [...prev, buddy])}
      />

      <BuddyProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        buddy={selectedBuddy}
      />
    </div>
  );
}

export default DrinkingBuddies;