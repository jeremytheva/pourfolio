import React from 'react';
import { motion } from 'framer-motion';

function ColorRangeDisplay({ 
  styleColors = [], 
  beverageColor = '#DAA520', 
  label = 'Expected Color Range',
  className = '' 
}) {
  if (!styleColors.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">{label}</h4>
      
      {/* Color gradient bar */}
      <div className="relative h-8 rounded-lg overflow-hidden border border-gray-300">
        {/* Gradient background */}
        <div 
          className="w-full h-full"
          style={{
            background: `linear-gradient(to right, ${styleColors.join(', ')})`
          }}
        />
        
        {/* Beverage color marker */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white rounded-full shadow-lg"
          style={{ backgroundColor: beverageColor }}
        />
      </div>
      
      {/* Color swatches */}
      <div className="flex items-center justify-between">
        {styleColors.map((color, index) => (
          <div key={index} className="flex items-center space-x-1">
            <div 
              className="w-3 h-3 rounded-full border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-500">
              {index === 0 ? 'Light' : index === styleColors.length - 1 ? 'Dark' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ColorRangeDisplay;