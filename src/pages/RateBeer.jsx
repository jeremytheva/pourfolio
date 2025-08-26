import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import SliderRating from '../components/SliderRating';
import StyleGuidanceCard from '../components/StyleGuidanceCard';
import { calculateFinalRating, bonusAttributeCategories, burpScale } from '../utils/ratingCalculator';
import { getSettings } from '../utils/settingsManager';

const { FiArrowLeft, FiCheck, FiPlus, FiX, FiEyeOff, FiEye } = FiIcons;

function RateBeer() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getSettings());
  
  // Main rating attributes with 1-7 scale
  const [mainAttributes, setMainAttributes] = useState({
    design: { score: 1, weight: settings.ratingWeights.design },
    appearance: { score: 1, weight: settings.ratingWeights.appearance },
    aroma: { score: 1, weight: settings.ratingWeights.aroma },
    mouthfeel: { score: 1, weight: settings.ratingWeights.mouthfeel },
    flavour: { score: 1, weight: settings.ratingWeights.flavour },
    follow: { score: 1, weight: settings.ratingWeights.follow }
  });

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

  // UI state
  const [activeTab, setActiveTab] = useState('main');
  const [showCustomAttribute, setShowCustomAttribute] = useState(false);

  // Dummy beer data
  const beer = {
    name: 'IPA Delight',
    brewery: 'Brewery X',
    style: 'American IPA',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=400&fit=crop'
  };

  // Update weights when settings change
  useEffect(() => {
    const currentSettings = getSettings();
    setSettings(currentSettings);
    setHideBonus(currentSettings.hideBonus);
    
    setMainAttributes(prev => ({
      design: { ...prev.design, weight: currentSettings.ratingWeights.design },
      appearance: { ...prev.appearance, weight: currentSettings.ratingWeights.appearance },
      aroma: { ...prev.aroma, weight: currentSettings.ratingWeights.aroma },
      mouthfeel: { ...prev.mouthfeel, weight: currentSettings.ratingWeights.mouthfeel },
      flavour: { ...prev.flavour, weight: currentSettings.ratingWeights.flavour },
      follow: { ...prev.follow, weight: currentSettings.ratingWeights.follow }
    }));
  }, []);

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
    return calculateFinalRating(mainAttributes, selectedBonusAttributes, userBonusOverride, hideBonus);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const hasValidRatings = Object.values(mainAttributes).some(attr => attr.score > 1);
    if (!hasValidRatings) {
      alert('Please provide ratings for the main attributes');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Rating submitted successfully!');
      navigate('/beer-details');
    }, 1500);
  };

  const currentRating = calculateCurrentRating();

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
          <span>Back to Beer Details</span>
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Rate This Beer</h1>
            <p className="text-gray-600">Comprehensive beer evaluation with sliding scale</p>
          </div>

          {/* Beer Info */}
          <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <img
              src={beer.image}
              alt={beer.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-800">{beer.name}</h3>
              <p className="text-gray-600">{beer.brewery}</p>
              <p className="text-sm text-gray-500">{beer.style}</p>
            </div>
          </div>

          {/* Current Rating Display */}
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {currentRating.finalRating}/5
            </div>
            <div className="text-sm text-gray-600">
              Base: {currentRating.baseRating}
              {!hideBonus && ` + Bonus: ${currentRating.bonusPoints}`}
              {hideBonus && ' (Bonus Hidden)'}
            </div>
          </div>

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

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 py-4 px-6 text-sm font-medium ${
              activeTab === 'main'
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Main Attributes
          </button>
          <button
            onClick={() => setActiveTab('bonus')}
            className={`flex-1 py-4 px-6 text-sm font-medium ${
              activeTab === 'bonus'
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bonus Attributes
          </button>
          <button
            onClick={() => setActiveTab('additional')}
            className={`flex-1 py-4 px-6 text-sm font-medium ${
              activeTab === 'additional'
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Additional
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Main Attributes Tab */}
          {activeTab === 'main' && (
            <div className="space-y-8">
              {Object.entries(mainAttributes).map(([key, data]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-800 capitalize">
                        {key === 'follow' ? 'Follow (Finish)' : key}
                      </h3>
                      <StyleGuidanceCard beerStyle={beer.style} attribute={key} />
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>Weight: {data.weight}</span>
                    </div>
                  </div>
                  
                  <SliderRating
                    attribute={key}
                    value={data.score}
                    onChange={(value) => handleMainAttributeChange(key, value)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bonus Attributes Tab */}
          {activeTab === 'bonus' && (
            <div className="space-y-8">
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
                      Override Bonus Score (-2 to +2)
                    </label>
                    <input
                      type="number"
                      min="-2"
                      max="2"
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
                      onChange={(e) => setCustomBonusAttribute(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={customBonusAttribute.category}
                        onChange={(e) => setCustomBonusAttribute(prev => ({ ...prev, category: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Object.entries(bonusAttributeCategories).map(([key, category]) => (
                          <option key={key} value={key}>{category.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={customBonusAttribute.isPositive}
                        onChange={(e) => setCustomBonusAttribute(prev => ({ ...prev, isPositive: e.target.value === 'true' }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value={true}>Positive</option>
                        <option value={false}>Negative</option>
                      </select>
                      
                      <input
                        type="number"
                        min="0.1"
                        max="0.8"
                        step="0.1"
                        value={customBonusAttribute.weight}
                        onChange={(e) => setCustomBonusAttribute(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0.1 }))}
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

          {/* Additional Tab */}
          {activeTab === 'additional' && (
            <div className="space-y-8">
              {/* Burp Rating */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Burp Rating</h3>
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
                  placeholder="Share your detailed thoughts about this beer..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {review.length}/1000 characters
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Submitting Rating...</span>
                </>
              ) : (
                <>
                  <SafeIcon icon={FiCheck} className="w-5 h-5" />
                  <span>Submit Rating ({currentRating.finalRating}/5)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default RateBeer;