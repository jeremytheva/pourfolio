import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiSearch, FiUser, FiX, FiPlus, FiCheck } = FiIcons;

function TagFriends({ taggedFriends, onTaggedFriendsChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFriendsList, setShowFriendsList] = useState(false);

  // Dummy friends list
  const allFriends = [
    { id: 1, name: 'John Smith', avatar: '👨', username: 'johnsmith' },
    { id: 2, name: 'Sarah Wilson', avatar: '👩', username: 'sarahw' },
    { id: 3, name: 'Mike Johnson', avatar: '👱‍♂️', username: 'mikej' },
    { id: 4, name: 'Lisa Brown', avatar: '👩‍🦰', username: 'lisab' },
    { id: 5, name: 'Tom Davis', avatar: '🧔', username: 'tomd' },
    { id: 6, name: 'Emma White', avatar: '👱‍♀️', username: 'emmaw' },
    { id: 7, name: 'Alex Chen', avatar: '👨‍💼', username: 'alexc' },
    { id: 8, name: 'Maya Patel', avatar: '👩‍💼', username: 'mayap' }
  ];

  const filteredFriends = allFriends.filter(friend =>
    !taggedFriends.some(tagged => tagged.id === friend.id) &&
    (friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     friend.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTagFriend = (friend) => {
    onTaggedFriendsChange([...taggedFriends, friend]);
    setSearchTerm('');
    setShowFriendsList(false);
  };

  const handleUntagFriend = (friendId) => {
    onTaggedFriendsChange(taggedFriends.filter(friend => friend.id !== friendId));
  };

  return (
    <div className="space-y-4">
      {/* Tagged Friends Display */}
      {taggedFriends.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {taggedFriends.map((friend) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center space-x-2 bg-amber-100 text-amber-800 px-3 py-2 rounded-full"
            >
              <span className="text-lg">{friend.avatar}</span>
              <span className="text-sm font-medium">{friend.name}</span>
              <button
                onClick={() => handleUntagFriend(friend.id)}
                className="text-amber-600 hover:text-amber-800 ml-1"
              >
                <SafeIcon icon={FiX} className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Friends Section */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search friends to tag..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowFriendsList(e.target.value.length > 0);
              }}
              onFocus={() => setShowFriendsList(searchTerm.length > 0)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFriendsList(!showFriendsList)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Tag Friends</span>
          </button>
        </div>

        {/* Friends Dropdown */}
        <AnimatePresence>
          {showFriendsList && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto"
            >
              {filteredFriends.length > 0 ? (
                <div className="p-2">
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleTagFriend(friend)}
                      className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <span className="text-lg">{friend.avatar}</span>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-800">{friend.name}</div>
                        <div className="text-sm text-gray-500">@{friend.username}</div>
                      </div>
                      <SafeIcon icon={FiPlus} className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No friends found' : 'Start typing to search friends'}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close */}
      {showFriendsList && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowFriendsList(false)}
        />
      )}
    </div>
  );
}

export default TagFriends;