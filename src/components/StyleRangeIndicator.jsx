import React from 'react';
import { motion } from 'framer-motion';

function StyleRangeIndicator({ 
  label, 
  beverageValue, 
  styleMin, 
  styleMax, 
  globalMin = 0, 
  globalMax = 20, 
  unit = '%',
  className = '' 
}) {
  // Calculate positions as percentages
  const range = globalMax - globalMin;
  const styleMinPos = ((styleMin - globalMin) / range) * 100;
  const styleMaxPos = ((styleMax - globalMin) / range) * 100;
  const beveragePos = ((beverageValue - globalMin) / range) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-600">{beverageValue}{unit}</span>
      </div>
      
      {/* Scale bar */}
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        {/* Style range background */}
        <div
          className="absolute top-0 h-full bg-amber-100 border-2 border-amber-300"
          style={{
            left: `${styleMinPos}%`,
            width: `${styleMaxPos - styleMinPos}%`
          }}
        />
        
        {/* Beverage marker */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-amber-600 border-2 border-white rounded-full shadow-md"
          style={{ left: `${beveragePos}%`, marginLeft: '-6px' }}
        />
        
        {/* Scale markers */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center">
          {/* Global min marker */}
          <div className="absolute left-0 top-0 h-full w-px bg-gray-400" />
          {/* Global max marker */}
          <div className="absolute right-0 top-0 h-full w-px bg-gray-400" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{globalMin}{unit}</span>
        <span className="text-amber-700 font-medium">
          Style: {styleMin}{unit} - {styleMax}{unit}
        </span>
        <span>{globalMax}{unit}</span>
      </div>
    </div>
  );
}

export default StyleRangeIndicator;