import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import SliderRating from './SliderRating';
import { styleGuidance } from '../utils/beverageTypes';

const { FiInfo, FiChevronDown, FiChevronUp } = FiIcons;

function AttributeRatingCard({ 
  attribute, 
  attributeData, 
  onChange, 
  beverageStyle, 
  beverageType, 
  attributeLabel 
}) {
  const [showGuidance, setShowGuidance] = useState(false);
  
  const guidance = styleGuidance[beverageStyle];
  const attributeGuidance = guidance?.[attribute];

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-800 capitalize">
            {attributeLabel}
          </h3>
          {attributeGuidance && (
            <button
              type="button"
              onClick={() => setShowGuidance(!showGuidance)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
              title={`Style guidance for ${attributeLabel}`}
            >
              <SafeIcon icon={FiInfo} className="w-4 h-4" />
              <SafeIcon icon={showGuidance ? FiChevronUp : FiChevronDown} className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Weight: {attributeData.weight}</span>
        </div>
      </div>

      {/* Style Guidance */}
      <AnimatePresence>
        {showGuidance && attributeGuidance && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="text-sm text-blue-800">
              <strong>{beverageStyle} - {attributeLabel}:</strong>
              <p className="mt-1 leading-relaxed">{attributeGuidance}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SliderRating
        attribute={attribute}
        value={attributeData.score}
        onChange={onChange}
      />
    </div>
  );
}

export default AttributeRatingCard;