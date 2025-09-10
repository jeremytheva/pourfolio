import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { styleGuidance } from '../utils/beverageTypes';

const { FiInfo, FiChevronDown, FiChevronUp, FiBook } = FiIcons;

function StyleGuideCard({ beverageStyle, beverageType = 'beer', isCollapsible = false }) {
  const [isExpanded, setIsExpanded] = useState(!isCollapsible);
  
  const guidance = styleGuidance[beverageStyle];

  if (!guidance) return null;

  const renderContent = () => (
    <div className="space-y-4">
      {Object.entries(guidance).map(([attribute, description]) => (
        <div key={attribute} className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-medium text-blue-800 capitalize mb-1">
            {attribute.replace('_', ' ')}
          </h4>
          <p className="text-blue-700 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      ))}
    </div>
  );

  if (isCollapsible) {
    return (
      <div className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiBook} className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">
              {beverageStyle} Style Guide
            </span>
          </div>
          <SafeIcon 
            icon={isExpanded ? FiChevronUp : FiChevronDown} 
            className="w-5 h-5 text-blue-600" 
          />
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-blue-200"
            >
              <div className="p-4">
                {renderContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center space-x-2 mb-3">
        <SafeIcon icon={FiBook} className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-blue-800">
          {beverageStyle} Style Guide
        </h3>
      </div>
      {renderContent()}
    </div>
  );
}

export default StyleGuideCard;