import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { calculatePriceValue, getScoreDescriptor } from '../utils/priceCalculator';
import { calculatePricePerPoint } from '../utils/ratingCalculator';

const { FiInfo, FiChevronDown, FiChevronUp, FiDollarSign, FiTrendingUp } = FiIcons;

function ScoreBreakdown({ 
  currentRating, 
  showAdminScore = false,
  adminScore = null,
  purchasePrice = 0,
  retailPrice = 0,
  volumeML = 375,
  className = '' 
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  const scoreDescriptor = getScoreDescriptor(currentRating.finalRating);

  const { purchasePPP, retailPPP } = calculatePricePerPoint({
    purchasePrice,
    retailPrice,
    finalScore: currentRating.finalRating
  });

  const purchasePricePerPoint =
    currentRating.purchase_price_per_point ?? purchasePPP;
  const retailPricePerPoint =
    currentRating.retail_price_per_point ?? retailPPP;
  
  // Calculate price value if pricing data is available
  const priceValue = (purchasePrice > 0 || retailPrice > 0) ? 
    calculatePriceValue(purchasePrice, retailPrice, volumeML, currentRating.finalRating) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Score Display */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-amber-600 mb-2">
            {currentRating.finalRating}/5
          </div>
          <div className="text-lg font-semibold text-gray-800 mb-1">
            {scoreDescriptor}
          </div>
          <div className="text-sm text-gray-600">
            Base: {currentRating.baseRating}/4.5
            {!currentRating.hideBonus && ` + Bonus: ${currentRating.bonusPoints}`}
          </div>
          {(purchasePricePerPoint || retailPricePerPoint) && (
            <div className="mt-3">
              {purchasePricePerPoint && (
                <p className="text-sm text-amber-600">
                  💰 ${purchasePricePerPoint.toFixed(2)} per pt
                  {purchasePricePerPoint <= 0.5 && (
                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                      ⭐ Great Value
                    </span>
                  )}
                </p>
              )}
              {retailPricePerPoint && (
                <p className="text-xs text-gray-500 mt-1">
                  (Retail ${retailPricePerPoint.toFixed(2)} per pt)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Show Admin Score Toggle */}
        {showAdminScore && adminScore && (
          <div className="text-center border-t border-amber-200 pt-4">
            <div className="text-sm text-gray-600 mb-2">Admin Default Score</div>
            <div className="text-2xl font-bold text-blue-600">
              {adminScore}/5
            </div>
            <div className="text-xs text-gray-500">
              Using default weightings
            </div>
          </div>
        )}
      </div>

      {/* Price Value Analysis */}
      {priceValue && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-800">Price Value Analysis</span>
            </div>
            <SafeIcon 
              icon={showPriceBreakdown ? FiChevronUp : FiChevronDown} 
              className="w-5 h-5 text-gray-400" 
            />
          </button>

          <AnimatePresence>
            {showPriceBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3"
              >
                {/* Price Value Score */}
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {priceValue.PurchasePriceScore.toFixed(0)}
                  </div>
                  <div className="text-sm text-green-800 font-medium">
                    {priceValue.Descriptor}
                  </div>
                </div>

                {/* Price Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-sm text-gray-500">Purchase (375ml)</div>
                    <div className="font-semibold text-gray-800">
                      ${priceValue.PurchasePrice375.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-sm text-gray-500">Retail (375ml)</div>
                    <div className="font-semibold text-gray-800">
                      ${priceValue.RetailPrice375.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded p-3 text-center">
                    <div className="text-sm text-blue-600">Value Multiplier</div>
                    <div className="font-semibold text-blue-800">
                      {priceValue.ValueMultiplier.toFixed(2)}x
                    </div>
                  </div>
                  <div className="bg-green-50 rounded p-3 text-center">
                    <div className="text-sm text-green-600">Savings</div>
                    <div className="font-semibold text-green-800">
                      {priceValue.SavingsPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Composite Score */}
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-600">Composite Value</span>
                    <span className="font-semibold text-purple-800">
                      {priceValue.NormalizedComposite.toFixed(0)}/100
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${priceValue.NormalizedComposite}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Score Details Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiInfo} className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Score Breakdown</span>
          </div>
          <SafeIcon 
            icon={showDetails ? FiChevronUp : FiChevronDown} 
            className="w-5 h-5 text-gray-400" 
          />
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-3"
            >
              {/* Rating Scale Reference */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Rating Scale</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>5.0 = 7 Out of 7</div>
                  <div>4.70-4.99 = Amazing Starts Here</div>
                  <div>4.20-4.69 = Highest Commendment</div>
                  <div>3.70-4.19 = Well Impressed</div>
                  <div>3.20-3.69 = Not Bad</div>
                  <div>2.50-3.19 = Drinkable</div>
                  <div>1.80-2.49 = Must Be Commercial Lager</div>
                  <div>&lt; 1.80 = Sink Pour</div>
                </div>
              </div>

              {/* Calculation Method */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-blue-700 mb-2">Calculation Method</h4>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>• Main attributes weighted and converted to /4.5 scale</div>
                  <div>• Bonus attributes add ±0.5 points maximum</div>
                  <div>• Final score capped at 5.0</div>
                  {showAdminScore && <div>• Admin score uses default weightings</div>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ScoreBreakdown;