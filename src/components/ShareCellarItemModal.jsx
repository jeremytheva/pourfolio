import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiShare2, FiUser, FiCheck, FiSend, FiEye, FiEyeOff } = FiIcons;

function ShareCellarItemModal({ isOpen, onClose, cellarItem, drinkingBuddies = [] }) {
  const [selectedBuddies, setSelectedBuddies] = useState([]);
  const [message, setMessage] = useState('');
  const [shareType, setShareType] = useState('view'); // 'view', 'add-to-cellar', 'rate'
  const [includeMyRating, setIncludeMyRating] = useState(false);
  const [makeVisible, setMakeVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const defaultMessage = `Check out this ${cellarItem?.beverageName} from my cellar! I got it from ${cellarItem?.purchaseLocation || 'a great place'}.`;

  const handleBuddyToggle = (buddyId) => {
    setSelectedBuddies(prev => 
      prev.includes(buddyId) 
        ? prev.filter(id => id !== buddyId)
        : [...prev, buddyId]
    );
  };

  const handleShare = async () => {
    if (selectedBuddies.length === 0) return;

    setIsSending(true);

    // If item is hidden, make it visible when shared
    if (cellarItem.isHidden && makeVisible) {
      // Update cellar item visibility
      const cellarEntries = JSON.parse(localStorage.getItem('cellarEntries') || '[]');
      const updatedEntries = cellarEntries.map(entry => 
        entry.id === cellarItem.id ? { ...entry, isHidden: false } : entry
      );
      localStorage.setItem('cellarEntries', JSON.stringify(updatedEntries));
    }

    // Simulate sharing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create share notification for each buddy
    const shareData = {
      id: Date.now(),
      type: 'cellar_share',
      from: 'Current User', // In real app, get from user context
      cellarItem,
      shareType,
      message: message || defaultMessage,
      includeMyRating,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Store notifications (in real app, this would be sent via API)
    selectedBuddies.forEach(buddyId => {
      const notifications = JSON.parse(localStorage.getItem(`notifications_${buddyId}`) || '[]');
      notifications.unshift({ ...shareData, to: buddyId });
      localStorage.setItem(`notifications_${buddyId}`, JSON.stringify(notifications));
    });

    setIsSending(false);
    setSent(true);

    setTimeout(() => {
      setSent(false);
      setSelectedBuddies([]);
      setMessage('');
      setShareType('view');
      setIncludeMyRating(false);
      setMakeVisible(false);
      onClose();
    }, 2000);
  };

  if (!isOpen || !cellarItem) return null;

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
          className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {!sent ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Share Cellar Item</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <SafeIcon icon={FiX} className="w-6 h-6" />
                </button>
              </div>

              {/* Item Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🍺</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{cellarItem.beverageName}</h4>
                    <p className="text-sm text-gray-600">{cellarItem.producer}</p>
                    <p className="text-xs text-gray-500">{cellarItem.style}</p>
                  </div>
                  {cellarItem.isHidden && (
                    <div className="flex items-center space-x-1 text-orange-600">
                      <SafeIcon icon={FiEyeOff} className="w-4 h-4" />
                      <span className="text-xs">Hidden</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Type */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Share Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shareType"
                      value="view"
                      checked={shareType === 'view'}
                      onChange={(e) => setShareType(e.target.value)}
                      className="text-amber-600"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Share for Viewing</div>
                      <div className="text-sm text-gray-600">Let them see details about this item</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shareType"
                      value="add-to-cellar"
                      checked={shareType === 'add-to-cellar'}
                      onChange={(e) => setShareType(e.target.value)}
                      className="text-amber-600"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Share for Adding to Cellar</div>
                      <div className="text-sm text-gray-600">Pre-populate their cellar form with this info</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shareType"
                      value="rate"
                      checked={shareType === 'rate'}
                      onChange={(e) => setShareType(e.target.value)}
                      className="text-amber-600"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Share for Rating</div>
                      <div className="text-sm text-gray-600">Let them rate this beverage with pre-filled details</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Additional Options */}
              <div className="mb-6 space-y-3">
                {/* Include Rating */}
                <label className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={includeMyRating}
                    onChange={(e) => setIncludeMyRating(e.target.checked)}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-blue-800">Include My Rating</div>
                    <div className="text-xs text-blue-600">Share your rating and review if available</div>
                  </div>
                </label>

                {/* Make Visible */}
                {cellarItem.isHidden && (
                  <label className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={makeVisible}
                      onChange={(e) => setMakeVisible(e.target.checked)}
                      className="text-orange-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-orange-800">Make Item Visible</div>
                      <div className="text-xs text-orange-600">Unhide this item when sharing</div>
                    </div>
                  </label>
                )}
              </div>

              {/* Select Drinking Buddies */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Select Drinking Buddies ({selectedBuddies.length} selected)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {drinkingBuddies.map((buddy) => (
                    <button
                      key={buddy.id}
                      onClick={() => handleBuddyToggle(buddy.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        selectedBuddies.includes(buddy.id)
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {buddy.avatar}
                      </div>
                      <div className="flex-1 text-left">
                        <h5 className="font-medium">{buddy.name}</h5>
                        <p className="text-xs text-gray-500">{buddy.username}</p>
                      </div>
                      {selectedBuddies.includes(buddy.id) && (
                        <SafeIcon icon={FiCheck} className="w-5 h-5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
                
                {drinkingBuddies.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <SafeIcon icon={FiUser} className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No drinking buddies yet</p>
                    <p className="text-sm">Add some friends to share with!</p>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={defaultMessage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                disabled={selectedBuddies.length === 0 || isSending}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <SafeIcon icon={FiSend} className="w-5 h-5" />
                    <span>Share with {selectedBuddies.length} friend{selectedBuddies.length !== 1 ? 's' : ''}</span>
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
              <h3 className="text-xl font-bold text-gray-800 mb-2">Shared Successfully!</h3>
              <p className="text-gray-600">
                Your cellar item has been shared with {selectedBuddies.length} drinking buddy{selectedBuddies.length !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ShareCellarItemModal;