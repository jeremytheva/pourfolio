import React from 'react';
import { motion } from 'framer-motion';
import { beverageTypes } from '../utils/beverageTypes';

function BeverageTypeSelector({ selectedType, onTypeChange, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {Object.entries(beverageTypes).map(([key, beverage]) => (
        <motion.button
          key={key}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onTypeChange(key)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
            selectedType === key
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
        >
          <span className="text-lg">{beverage.icon}</span>
          <span className="font-medium">{beverage.name}</span>
        </motion.button>
      ))}
    </div>
  );
}

export default BeverageTypeSelector;