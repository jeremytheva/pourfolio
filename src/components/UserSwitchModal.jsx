import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiLogOut, FiUser } = FiIcons;

function UserSwitchModal({ isOpen, onClose, currentUser, onUserSelect }) {
  if (!isOpen) return null;

  const handleSwitch = () => {
    onUserSelect(currentUser);
    onClose();
  };

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
          className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Switch Account</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-amber-500 rounded-full p-3 text-white">
                <SafeIcon icon={FiUser} className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-amber-800">Currently signed in as</div>
                <div className="font-semibold text-amber-900">{currentUser?.name || currentUser?.email}</div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            To switch accounts, we&apos;ll sign you out and redirect you to the login screen. You can sign back in with another account there.
          </p>

          <button
            onClick={handleSwitch}
            className="w-full flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            <SafeIcon icon={FiLogOut} className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default UserSwitchModal;
