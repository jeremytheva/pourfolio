import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiSend, FiUser, FiCheck } = FiIcons;

function SendToFriendModal({ isOpen, onClose, beer }) {
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Dummy friends list
  const friends = [
    { id: 1, name: 'John Smith', avatar: '👨', status: 'online' },
    { id: 2, name: 'Sarah Wilson', avatar: '👩', status: 'offline' },
    { id: 3, name: 'Mike Johnson', avatar: '👱‍♂️', status: 'online' },
    { id: 4, name: 'Lisa Brown', avatar: '👩‍🦰', status: 'away' },
    { id: 5, name: 'Tom Davis', avatar: '🧔', status: 'online' },
    { id: 6, name: 'Emma White', avatar: '👱‍♀️', status: 'offline' }
  ];

  const defaultMessage = `Check out this beer I found: ${beer?.name} by ${beer?.brewery}! I think you'd love it. 🍺`;

  const handleFriendToggle = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSend = async () => {
    if (selectedFriends.length === 0) return;
    
    setIsSending(true);
    
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSending(false);
    setSent(true);
    
    // Auto close after success
    setTimeout(() => {
      setSent(false);
      setSelectedFriends([]);
      setCustomMessage('');
      onClose();
    }, 2000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
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
          className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {!sent ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Send to Friend</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <SafeIcon icon={FiX} className="w-6 h-6" />
                </button>
              </div>

              {/* Beer Info */}
              {beer && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-6">
                  <img
                    src={beer.image}
                    alt={beer.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-gray-800">{beer.name}</h4>
                    <p className="text-sm text-gray-600">{beer.brewery}</p>
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Select Friends</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleFriendToggle(friend.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        selectedFriends.includes(friend.id)
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {friend.avatar}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}></div>
                      </div>
                      
                      <div className="flex-1 text-left">
                        <h5 className="font-medium">{friend.name}</h5>
                        <p className="text-xs text-gray-500 capitalize">{friend.status}</p>
                      </div>
                      
                      {selectedFriends.includes(friend.id) && (
                        <SafeIcon icon={FiCheck} className="w-5 h-5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={defaultMessage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={selectedFriends.length === 0 || isSending}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <SafeIcon icon={FiSend} className="w-5 h-5" />
                    <span>Send to {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <SafeIcon icon={FiCheck} className="w-8 h-8 text-green-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Sent Successfully!</h3>
              <p className="text-gray-600">
                Your beer recommendation has been sent to {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SendToFriendModal;