import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { styleGuidance } from '../utils/beverageTypes';

const { FiInfo, FiX } = FiIcons;

function StyleGuidanceCard({ beverageStyle, attribute, beverageType = 'beer' }) {
  const [isVisible, setIsVisible] = useState(false);
  
  const guidance = styleGuidance[beverageStyle];
  const attributeGuidance = guidance?.[attribute];

  if (!attributeGuidance) return null;

  return (
    <>
      {/* Info button */}
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        className="ml-2 p-1 text-blue-500 hover:text-blue-700 transition-colors"
        title={`Style guidance for ${attribute}`}
      >
        <SafeIcon icon={FiInfo} className="w-4 h-4" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsVisible(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 capitalize">
                  {attribute.replace('_', ' ')} - {beverageStyle}
                </h3>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <SafeIcon icon={FiX} className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-blue-800 text-sm leading-relaxed">
                  {attributeGuidance}
                </p>
              </div>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsVisible(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default StyleGuidanceCard;