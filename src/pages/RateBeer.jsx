import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AttributeRatingCard from '../components/AttributeRatingCard';
import StyleGuideCard from '../components/StyleGuideCard';
import PhotoUpload from '../components/PhotoUpload';
import TagFriends from '../components/TagFriends';
import RatingSummary from '../components/RatingSummary';
import ScoreBreakdown from '../components/ScoreBreakdown';
import {
  calculateFinalRating,
  calculateFinalScore,
  bonusAttributeCategories,
  burpScale,
  calculatePricePerPoint
} from '../utils/ratingCalculator';
import { getSettings } from '../utils/settingsManager';
import { beverageTypes, attributeLabels } from '../utils/beverageTypes';

const { FiArrowLeft, FiCheck, FiPlus, FiX, FiEyeOff, FiEye, FiChevronLeft, FiChevronRight } = FiIcons;

function RateBeer({ selectedBeverageCategory = 'beer' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const beverageType = searchParams.get('type') || selectedBeverageCategory;
  const [settings, setSettings] = useState(getSettings(beverageType));

  // Rating step management
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4; // Main Attributes, Bonus Attributes, Additional Info, Summary

  // Initialize attributes based on beverage type
  const initializeAttributes = (type) => {
    const beverage = beverageTypes[type];
    const typeSettings = getSettings(type);
    const attrs = {};
    
    beverage.attributes.forEach(attr => {
      attrs[attr] = {
        score: 1,
        weight: typeSettings.ratingWeights[attr] || beverage.defaultWeights[attr]
      };
    });
    
    return attrs;
  };

  const [mainAttributes, setMainAttributes] = useState(initializeAttributes(beverageType));

  // Bonus attributes
  const [selectedBonusAttributes, setSelectedBonusAttributes] = useState([]);
  const [customBonusAttribute, setCustomBonusAttribute] = useState({
    name: '',
    category: 'emotionalImpact',
    weight: 0.1,
    isPositive: true
  });

  // Other rating components
  const [burpRating, setBurpRating] = useState(0);
  const [review, setReview] = useState('');
  const [userBonusOverride, setUserBonusOverride] = useState(null);
  const [hideBonus, setHideBonus] = useState(settings.hideBonus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New fields
  const [photos, setPhotos] = useState([]);
  const [purchasedFrom, setPurchasedFrom] = useState('');
  const [servingStyle, setServingStyle] = useState('');
  const [taggedFriends, setTaggedFriends] = useState([]);

  // UI state
  const [showCustomAttribute, setShowCustomAttribute] = useState(false);

  // Dummy beverage data
  const beverage = {
    name: beverageType === 'beer' ? 'IPA Delight' : 
          beverageType === 'wine' ? 'Chardonnay Reserve' : 
          beverageType === 'spirits' ? 'Single Malt Scotch' : 
          beverageType === 'cider' ? 'Traditional Dry Cider' : 
          beverageType === 'mead' ? 'Traditional Honey Mead' : 
          'Ginger Kombucha',
    producer: beverageType === 'beer' ? 'Brewery X' : 
              beverageType === 'wine' ? 'Vineyard Estate' : 
              beverageType === 'spirits' ? 'Distillery Co.' : 
              beverageType === 'cider' ? 'Orchard Cidery' : 
              beverageType === 'mead' ? 'Meadery Guild' : 
              'Fermentation Co.',
    style: beverageType === 'beer' ? 'American IPA' : 
           beverageType === 'wine' ? 'Chardonnay' : 
           beverageType === 'spirits' ? 'Single Malt Scotch' : 
           beverageType === 'cider' ? 'Traditional Cider' : 
           beverageType === 'mead' ? 'Traditional Mead' : 
           'Kombucha',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=400&fit=crop'
  };

  // Update when beverage type changes
  useEffect(() => {
    const newSettings = getSettings(beverageType);
    setSettings(newSettings);
    setHideBonus(newSettings.hideBonus);
    setMainAttributes(initializeAttributes(beverageType));
    setSelectedBonusAttributes([]);
    setUserBonusOverride(null);
  }, [beverageType]);

  const handleMainAttributeChange = (attribute, value) => {
    setMainAttributes(prev => ({
      ...prev,
      [attribute]: {
        ...prev[attribute],
        score: value
      }
    }));
  };

  const handleBonusAttributeToggle = (categoryKey, attribute, isPositive) => {
    const attributeId = `${categoryKey}-${attribute.id}`;
    const exists = selectedBonusAttributes.find(attr => attr.id === attributeId);
    
    if (exists) {
      setSelectedBonusAttributes(prev => prev.filter(attr => attr.id !== attributeId));
    } else {
      setSelectedBonusAttributes(prev => [...prev, {
        id: attributeId,
        name: attribute.name,
        weight: attribute.weight,
        category: categoryKey,
        isPositive
      }]);
    }
  };

  const handleCustomAttributeAdd = () => {
    if (customBonusAttribute.name.trim()) {
      const weight = customBonusAttribute.isPositive 
        ? Math.abs(customBonusAttribute.weight)
        : -Math.abs(customBonusAttribute.weight);
        
      const newAttribute = {
        id: `custom-${Date.now()}`,
        name: customBonusAttribute.name,
        weight: weight,
        category: customBonusAttribute.category,
        isPositive: customBonusAttribute.isPositive,
        isCustom: true
      };
      
      setSelectedBonusAttributes(prev => [...prev, newAttribute]);
      setCustomBonusAttribute({
        name: '',
        category: 'emotionalImpact',
        weight: 0.1,
        isPositive: true
      });
      setShowCustomAttribute(false);
    }
  };

  const removeCustomAttribute = (attributeId) => {
    setSelectedBonusAttributes(prev => prev.filter(attr => attr.id !== attributeId));
  };

  const calculateCurrentRating = () => {
    const rating = calculateFinalRating(
      mainAttributes,
      selectedBonusAttributes,
      userBonusOverride,
      hideBonus,
      beverageType
    );

    const { purchasePPP, retailPPP } = calculatePricePerPoint({
      purchasePrice: null,
      retailPrice: beverage.retailPrice,
      finalScore: rating.finalRating
    });

    return {
      ...rating,
      purchase_price_per_point: purchasePPP,
      retail_price_per_point: retailPPP
    };
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const hasValidRatings = Object.values(mainAttributes).some(attr => attr.score > 1);

    if (!hasValidRatings) {
      alert('Please provide ratings for the main attributes');
      return;
    }

    setIsSubmitting(true);
    const ratingInput = {
      mainAttributes,
      selectedBonusAttributes,
      userBonusOverride,
      hideBonus,
      beverageType
    };

    const finalScore = calculateFinalScore(ratingInput);
    const { purchasePPP, retailPPP } = calculatePricePerPoint({
      purchasePrice: null,
      retailPrice: beverage.retailPrice,
      finalScore
    });

    const payload = {
      ...ratingInput,
      burpRating,
      review,
      photos,
      purchasedFrom,
      servingStyle,
      taggedFriends,
      beverageId: beverage.id,
      final_score: finalScore,
      purchase_price_per_point: purchasePPP,
      retail_price_per_point: retailPPP
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Rating payload ready for submission:', payload);
      alert('Rating submitted successfully!');
      navigate('/beer-details');
    } catch (error) {
      console.error('Failed to submit rating', error);
      alert('Something went wrong while submitting your rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRating = calculateCurrentRating();
  const currentBeverage = beverageTypes[beverageType];
  const stepTitles = ['Main Attributes', 'Bonus Attributes', 'Additional Information', 'Summary'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          to="/beer-details"
          className="flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          <span>Back to Details</span>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Rate This {currentBeverage.name}
            </h1>
            <p className="text-gray-600">Comprehensive beverage evaluation with sliding scale</p>
          </div>

          {/* Beverage Info */}
          <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <img
              src={beverage.image}
              alt={beverage.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-800">{beverage.name}</h3>
              <p className="text-gray-600">{beverage.producer}</p>
              <p className="text-sm text-gray-500">{beverage.style}</p>
            </div>
          </div>

          {/* Style Guide */}
          <div className="mb-6">
            <StyleGuideCard
              beverageStyle={beverage.style}
              beverageType={beverageType}
              isCollapsible={true}
            />
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep + 1} of {totalSteps}: {stepTitles[currentStep]}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentStep + 1) / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Current Rating Display with Enhanced Score Breakdown */}
          <ScoreBreakdown
            currentRating={currentRating}
            showAdminScore={true}
            adminScore={4.2} // Mock admin score
            className="mb-6"
          />

          {/* Hide Bonus Toggle */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            <button
              type="button"
              onClick={() => setHideBonus(!hideBonus)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
            >
              <SafeIcon icon={hideBonus ? FiEyeOff : FiEye} className="w-4 h-4" />
              <span>{hideBonus ? 'Show' : 'Hide'} Bonus Points</span>
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8">
          {/* Step 0: Main Attributes */}
          {currentStep === 0 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Main Attributes</h2>
              {Object.entries(mainAttributes).map(([key, data]) => (
                <AttributeRatingCard
                  key={key}
                  attribute={key}
                  attributeData={data}
                  onChange={(value) => handleMainAttributeChange(key, value)}
                  beverageStyle={beverage.style}
                  beverageType={beverageType}
                  attributeLabel={attributeLabels[key] || key.replace('_', ' ')}
                />
              ))}
            </div>
          )}

          {/* Step 1: Bonus Attributes */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Bonus Attributes</h2>
              
              {/* Selected Bonus Attributes */}
              {selectedBonusAttributes.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Selected Attributes</h3>
                  <div className="space-y-2">
                    {selectedBonusAttributes.map((attr) => (
                      <div key={attr.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            attr.weight > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {attr.weight > 0 ? '+' : ''}{attr.weight}
                          </span>
                          <span className="text-gray-800">{attr.name}</span>
                          <span className="text-xs text-gray-500">
                            ({bonusAttributeCategories[attr.category]?.name})
                          </span>
                        </div>
                        {attr.isCustom && (
                          <button
                            type="button"
                            onClick={() => removeCustomAttribute(attr.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <SafeIcon icon={FiX} className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Manual Bonus Override */}
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Override Bonus Score (-0.5 to +0.5)
                    </label>
                    <input
                      type="number"
                      min="-0.5"
                      max="0.5"
                      step="0.1"
                      value={userBonusOverride || ''}
                      onChange={(e) => setUserBonusOverride(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Leave blank to use calculated value"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Bonus Attribute Categories */}
              {Object.entries(bonusAttributeCategories).map(([categoryKey, category]) => (
                <div key={categoryKey} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{category.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Positive Attributes */}
                    <div>
                      <h4 className="text-md font-medium text-green-700 mb-3">Positive</h4>
                      <div className="space-y-2">
                        {category.positive.map((attr) => {
                          const isSelected = selectedBonusAttributes.some(
                            selected => selected.id === `${categoryKey}-${attr.id}`
                          );
                          return (
                            <button
                              key={attr.id}
                              type="button"
                              onClick={() => handleBonusAttributeToggle(categoryKey, attr, true)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-green-50 border-green-300 text-green-800'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{attr.name}</span>
                                <span className="text-sm text-green-600">+{attr.weight}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Negative Attributes */}
                    <div>
                      <h4 className="text-md font-medium text-red-700 mb-3">Negative</h4>
                      <div className="space-y-2">
                        {category.negative.map((attr) => {
                          const isSelected = selectedBonusAttributes.some(
                            selected => selected.id === `${categoryKey}-${attr.id}`
                          );
                          return (
                            <button
                              key={attr.id}
                              type="button"
                              onClick={() => handleBonusAttributeToggle(categoryKey, attr, false)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-red-50 border-red-300 text-red-800'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{attr.name}</span>
                                <span className="text-sm text-red-600">{attr.weight}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Custom Attribute Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Custom Attribute</h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomAttribute(!showCustomAttribute)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    <SafeIcon icon={FiPlus} className="w-5 h-5" />
                  </button>
                </div>

                {showCustomAttribute && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Custom attribute name"
                      value={customBonusAttribute.name}
                      onChange={(e) => setCustomBonusAttribute(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={customBonusAttribute.category}
                        onChange={(e) => setCustomBonusAttribute(prev => ({
                          ...prev,
                          category: e.target.value
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Object.entries(bonusAttributeCategories).map(([key, category]) => (
                          <option key={key} value={key}>{category.name}</option>
                        ))}
                      </select>
                      <select
                        value={customBonusAttribute.isPositive}
                        onChange={(e) => setCustomBonusAttribute(prev => ({
                          ...prev,
                          isPositive: e.target.value === 'true'
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value={true}>Positive</option>
                        <option value={false}>Negative</option>
                      </select>
                      <input
                        type="number"
                        min="0.05"
                        max="0.2"
                        step="0.01"
                        value={customBonusAttribute.weight}
                        onChange={(e) => setCustomBonusAttribute(prev => ({
                          ...prev,
                          weight: parseFloat(e.target.value) || 0.1
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCustomAttributeAdd}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
                    >
                      Add Custom Attribute
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Additional Information */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Additional Information</h2>

              {/* Photo Upload */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Photos</h3>
                <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
              </div>

              {/* Purchase Information */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Purchase Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchased From
                    </label>
                    <input
                      type="text"
                      value={purchasedFrom}
                      onChange={(e) => setPurchasedFrom(e.target.value)}
                      placeholder="Store name, restaurant, brewery, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serving Style
                    </label>
                    <select
                      value={servingStyle}
                      onChange={(e) => setServingStyle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select serving style...</option>
                      {currentBeverage.servingStyles?.map((style) => (
                        <option key={style} value={style}>{style}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tag Friends */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Tag Friends</h3>
                <TagFriends
                  taggedFriends={taggedFriends}
                  onTaggedFriendsChange={setTaggedFriends}
                />
              </div>

              {/* Burp Rating - Only show for beer, fermented beverages, and cider */}
              {(beverageType === 'beer' || beverageType === 'fermented' || beverageType === 'cider') && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Burp Rating</h3>
                  <p className="text-sm text-gray-600 mb-4">Rate the carbonation and gas release experience</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Object.entries(burpScale).map(([value, data]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBurpRating(parseInt(value))}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          burpRating === parseInt(value)
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{value} - {data.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{data.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Review */}
              <div className="border border-gray-200 rounded-lg p-6">
                <label htmlFor="review" className="block text-lg font-semibold text-gray-800 mb-4">
                  Written Review
                </label>
                <textarea
                  id="review"
                  rows={6}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder={`Share your detailed thoughts about this ${currentBeverage.name.toLowerCase()}...`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {review.length}/1000 characters
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {currentStep === 3 && (
            <RatingSummary
              mainAttributes={mainAttributes}
              selectedBonusAttributes={selectedBonusAttributes}
              designRating={mainAttributes.design?.score || 0}
              burpRating={burpRating}
              review={review}
              photos={photos}
              purchasedFrom={purchasedFrom}
              servingStyle={servingStyle}
              taggedFriends={taggedFriends}
              currentRating={currentRating}
              beverageType={beverageType}
              beverage={beverage}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="px-8 pb-8 border-t border-gray-200 pt-6">
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SafeIcon icon={FiChevronLeft} className="w-5 h-5" />
              <span>Back</span>
            </button>

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <span>Next</span>
                <SafeIcon icon={FiChevronRight} className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <SafeIcon icon={FiCheck} className="w-5 h-5" />
                    <span>Submit Rating ({currentRating.finalRating}/5)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default RateBeer;