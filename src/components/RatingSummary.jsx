import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { ratingDescriptors, beverageTypes, attributeLabels } from '../utils/beverageTypes';
import { burpScale } from '../utils/ratingCalculator';

const { FiStar, FiImage, FiUser, FiMapPin, FiGlass } = FiIcons;

function RatingSummary({ 
  mainAttributes, 
  selectedBonusAttributes, 
  designRating,
  burpRating, 
  review, 
  photos, 
  purchasedFrom,
  servingStyle,
  taggedFriends,
  currentRating, 
  beverageType,
  beverage 
}) {
  const currentBeverage = beverageTypes[beverageType];

  const getScoreDescription = (attribute, score) => {
    return ratingDescriptors[attribute]?.[score] || `Score: ${score}`;
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <SafeIcon key={i} icon={FiStar} className="w-4 h-4 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <SafeIcon key="half" icon={FiStar} className="w-4 h-4 text-yellow-400 fill-current opacity-50" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <SafeIcon key={`empty-${i}`} icon={FiStar} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Rating Summary</h2>

      {/* Overall Rating */}
      <div className="bg-amber-50 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          {renderStars(currentRating.finalRating)}
        </div>
        <div className="text-3xl font-bold text-amber-600 mb-2">
          {currentRating.finalRating}/5
        </div>
        <div className="text-sm text-gray-600">
          Base: {currentRating.baseRating}/4.5 + Bonus: {currentRating.bonusPoints}
        </div>
      </div>

      {/* Main Attributes Scores */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Main Attributes</h3>
        <div className="space-y-3">
          {Object.entries(mainAttributes).map(([key, data]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-800 capitalize">
                  {attributeLabels[key] || key.replace('_', ' ')}
                </div>
                <div className="text-sm text-gray-600">
                  {getScoreDescription(key, data.score)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-amber-600">{data.score}/7</div>
                <div className="text-xs text-gray-500">Weight: {data.weight}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Design Rating */}
      {designRating > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Design Rating</h3>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-800">Package Design</div>
              <div className="text-sm text-gray-600">
                {getScoreDescription('appearance', designRating)}
              </div>
            </div>
            <div className="text-lg font-bold text-purple-600">{designRating}/7</div>
          </div>
        </div>
      )}

      {/* Bonus Attributes */}
      {selectedBonusAttributes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bonus Attributes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedBonusAttributes.map((attr) => (
              <div key={attr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-800">{attr.name}</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  attr.weight > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {attr.weight > 0 ? '+' : ''}{attr.weight}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Total Bonus Points: <span className="font-semibold">{currentRating.bonusPoints}</span>
            </div>
          </div>
        </div>
      )}

      {/* Burp Rating (for applicable beverages) */}
      {burpRating > 0 && (beverageType === 'beer' || beverageType === 'fermented' || beverageType === 'cider') && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Burp Rating</h3>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-800">{burpScale[burpRating]?.label}</div>
              <div className="text-sm text-gray-600">{burpScale[burpRating]?.description}</div>
            </div>
            <div className="text-lg font-bold text-blue-600">{burpRating}/3</div>
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <SafeIcon icon={FiImage} className="w-5 h-5" />
            <span>Photos ({photos.length})</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={photo.preview}
                  alt={`Beverage photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
        <div className="space-y-3">
          {(currentRating.purchase_price_per_point || currentRating.retail_price_per_point) && (
            <div className="p-3 bg-amber-50 rounded-lg">
              {currentRating.purchase_price_per_point && (
                <p className="text-sm text-amber-600">
                  💰 ${currentRating.purchase_price_per_point.toFixed(2)} per pt
                  {currentRating.purchase_price_per_point <= 0.5 && (
                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                      ⭐ Great Value
                    </span>
                  )}
                </p>
              )}
              {currentRating.retail_price_per_point && (
                <p className="text-xs text-gray-500 mt-1">
                  (Retail ${currentRating.retail_price_per_point.toFixed(2)} per pt)
                </p>
              )}
            </div>
          )}

          {purchasedFrom && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <SafeIcon icon={FiMapPin} className="w-5 h-5 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Purchased From</div>
                <div className="font-medium text-gray-800">{purchasedFrom}</div>
              </div>
            </div>
          )}
          
          {servingStyle && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <SafeIcon icon={FiGlass} className="w-5 h-5 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Serving Style</div>
                <div className="font-medium text-gray-800">{servingStyle}</div>
              </div>
            </div>
          )}

          {taggedFriends.length > 0 && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <SafeIcon icon={FiUser} className="w-5 h-5 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Tagged Friends</div>
                <div className="font-medium text-gray-800">
                  {taggedFriends.map(friend => friend.name).join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Written Review */}
      {review && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Written Review</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{review}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RatingSummary;