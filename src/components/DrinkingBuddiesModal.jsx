import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiSearch, FiUserPlus, FiCheck, FiUser, FiUsers } = FiIcons;

function DrinkingBuddiesModal({ isOpen, onClose, currentBuddies = [], onAddBuddy }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());

  // Mock users for search (in real app, this would be an API call)
  const mockUsers = [
    { id: 'user1', name: 'Alex Chen', username: 'alexc', avatar: '👨‍💼', location: 'San Francisco, CA', mutualBuddies: 3 },
    { id: 'user2', name: 'Sarah Johnson', username: 'sarahj', avatar: '👩‍💼', location: 'Portland, OR', mutualBuddies: 1 },
    { id: 'user3', name: 'Mike Rodriguez', username: 'miker', avatar: '👨‍🔧', location: 'Austin, TX', mutualBuddies: 0 },
    { id: 'user4', name: 'Emily Davis', username: 'emilyd', avatar: '👩‍🎨', location: 'Denver, CO', mutualBuddies: 2 },
    { id: 'user5', name: 'Chris Wilson', username: 'chrisw', avatar: '👨‍🚀', location: 'Seattle, WA', mutualBuddies: 1 },
    { id: 'user6', name: 'Lisa Brown', username: 'lisab', avatar: '👩‍🔬', location: 'Chicago, IL', mutualBuddies: 0 }
  ];

  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API search
    setTimeout(() => {
      const results = mockUsers.filter(user => 
        !currentBuddies.some(buddy => buddy.id === user.id) &&
        (user.name.toLowerCase().includes(term.toLowerCase()) ||
         user.username.toLowerCase().includes(term.toLowerCase()) ||
         user.location.toLowerCase().includes(term.toLowerCase()))
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleSendRequest = (user) => {
    setSentRequests(prev => new Set([...prev, user.id]));
    
    // In real app, send friend request via API
    console.log('Sending buddy request to:', user.name);
    
    // Simulate adding to pending requests
    setTimeout(() => {
      // Could show success message or move to pending state
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiUsers} className="w-6 h-6 text-amber-600" />
              <h3 className="text-xl font-bold text-gray-800">Find Drinking Buddies</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, username, or location..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Current Buddies Count */}
          <div className="mb-6 p-4 bg-amber-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-amber-800">Current Drinking Buddies</h4>
                <p className="text-sm text-amber-600">{currentBuddies.length} connected</p>
              </div>
              <div className="text-2xl font-bold text-amber-600">{currentBuddies.length}</div>
            </div>
          </div>

          {/* Search Results */}
          <div>
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Search Results</h4>
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                      {user.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-gray-800">{user.name}</h5>
                        <span className="text-sm text-gray-500">@{user.username}</span>
                      </div>
                      <p className="text-sm text-gray-600">{user.location}</p>
                      {user.mutualBuddies > 0 && (
                        <p className="text-xs text-blue-600">
                          {user.mutualBuddies} mutual drinking buddy{user.mutualBuddies !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSendRequest(user)}
                      disabled={sentRequests.has(user.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                        sentRequests.has(user.id)
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <SafeIcon icon={sentRequests.has(user.id) ? FiCheck : FiUserPlus} className="w-4 h-4" />
                      <span>{sentRequests.has(user.id) ? 'Request Sent' : 'Add Buddy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : searchTerm.length >= 2 ? (
              <div className="text-center py-8">
                <SafeIcon icon={FiSearch} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-500 mb-2">No users found</h4>
                <p className="text-gray-400">Try searching with different keywords</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <SafeIcon icon={FiUser} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-500 mb-2">Find New Drinking Buddies</h4>
                <p className="text-gray-400">Search by name, username, or location to connect with other beer enthusiasts</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Tips for Finding Buddies</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Search by location to find local beer enthusiasts</li>
              <li>• Look for users with mutual drinking buddies</li>
              <li>• Check out brewery check-ins and ratings for common interests</li>
              <li>• Join local beer events and meetups</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DrinkingBuddiesModal;