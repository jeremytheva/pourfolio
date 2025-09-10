import React from 'react';
import { motion } from 'framer-motion';
import { ratingDescriptors } from '../utils/beverageTypes';

function SliderRating({ attribute, value, onChange, disabled = false }) {
  const descriptors = ratingDescriptors[attribute] || {};
  const currentDescriptor = descriptors[value] || '';

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="1"
          max="7"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className={`w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{
            background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((value - 1) / 6) * 100}%, #e5e7eb ${((value - 1) / 6) * 100}%, #e5e7eb 100%)`
          }}
        />
        
        {/* Scale markers */}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
            <span key={num} className={value === num ? 'text-amber-600 font-medium' : ''}>
              {num}
            </span>
          ))}
        </div>
      </div>

      {/* Current value and descriptor */}
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-2xl font-bold text-amber-600 mb-1">{value}</div>
        <div className="text-sm text-gray-600 font-medium">{currentDescriptor}</div>
      </motion.div>
    </div>
  );
}

export default SliderRating;