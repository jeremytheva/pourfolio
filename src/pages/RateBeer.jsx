import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import { useMutation, useQuery } from '@tanstack/react-query';
import SafeIcon from '../common/SafeIcon';
import AttributeRatingCard from '../components/AttributeRatingCard';
import StyleGuideCard from '../components/StyleGuideCard';
import PhotoUpload from '../components/PhotoUpload';
import TagFriends from '../components/TagFriends';
import RatingSummary from '../components/RatingSummary';
import ScoreBreakdown from '../components/ScoreBreakdown';
import { calculateFinalRating, defaultBonusAttributeCategories, burpScale } from '../utils/ratingCalculator';
import { getSettings } from '../utils/settingsManager';
import { beverageTypes, attributeLabels } from '../utils/beverageTypes';
import { createRating, extractItems, getBonusAttributes } from '../lib/nocode';

const {
  FiArrowLeft,
  FiCheck,
  FiPlus,
  FiX,
  FiEyeOff,
  FiEye,
  FiChevronLeft,
  FiChevronRight
} = FiIcons;

const fallbackCategoryKey = Object.keys(defaultBonusAttributeCategories)[0] || 'emotionalImpact';

const startCase = (value) =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normaliseBonusAttributes = (items) => {
  if (!items || items.length === 0) {
    return null;
  }

  const grouped = {};

  items.forEach((item) => {
    if (!item) {
      return;
    }

    const rawKey =
      item.category_key ||
      item.category ||
      item.categoryKey ||
      item.group_key ||
      fallbackCategoryKey;

    const key = String(rawKey).trim().toLowerCase().replace(/\s+/g, '_');
    const name =
      item.category_label ||
      item.category_name ||
      item.categoryLabel ||
      startCase(key);

    if (!grouped[key]) {
      grouped[key] = {
        name,
        positive: [],
        negative: []
      };
    }

    const attributeName =
      item.name ||
      item.attribute_name ||
      item.display_name ||
      'Unnamed Attribute';

    const rawWeight = Number(
      item.weight ??
        item.default_weight ??
        item.weight_value ??
        item.weight_delta ??
        (item.is_positive ? 0.1 : -0.1)
    );

    const resolvedWeight = Number.isFinite(rawWeight) && rawWeight !== 0 ? Math.abs(rawWeight) : 0.05;
    const isPositive = typeof item.is_positive === 'boolean' ? item.is_positive : rawWeight >= 0;
    const signedWeight = isPositive ? resolvedWeight : -resolvedWeight;

    const attribute = {
      id: item.id || item.identifier || item.uuid || `${key}-${attributeName}`,
      name: attributeName,
      weight: signedWeight,
      description: item.description || item.notes || '',
      isPositive
    };

    if (isPositive) {
      grouped[key].positive.push(attribute);
    } else {
      grouped[key].negative.push(attribute);
    }
  });

  return grouped;
};

const normalisePhoto = (photo) => {
  if (!photo) {
    return null;
  }
  if (typeof photo === 'string') {
    return photo;
  }
  return photo.preview || photo.url || photo.dataUrl || null;
};

function RateBeer({ selectedBeverageCategory = 'beer' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const beverageType = searchParams.get('type') || selectedBeverageCategory;
  const beverageId = searchParams.get('id') || searchParams.get('beverageId');
  const [settings, setSettings] = useState(getSettings(beverageType));

  const bonusAttributesQuery = useQuery({
    queryKey: ['bonus-attributes'],
    queryFn: getBonusAttributes,
    staleTime: 5 * 60_000
  });

  const { categories: bonusAttributeCategories, usingFallbackBonusCategories } = useMemo(() => {
    const grouped = normaliseBonusAttributes(extractItems(bonusAttributesQuery.data));
    if (grouped && Object.keys(grouped).length > 0) {
      return { categories: grouped, usingFallbackBonusCategories: false };
    }
    return { categories: defaultBonusAttributeCategories, usingFallbackBonusCategories: true };
  }, [bonusAttributesQuery.data]);

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;

  const initializeAttributes = useCallback((type) => {
    const beverage = beverageTypes[type];
    const typeSettings = getSettings(type);
    const attrs = {};

    beverage.attributes.forEach((attr) => {
      attrs[attr] = {
        score: 1,
        weight: typeSettings.ratingWeights[attr] || beverage.defaultWeights[attr]
      };
    });

    return attrs;
  }, []);

  const [mainAttributes, setMainAttributes] = useState(() => initializeAttributes(beverageType));

  const [selectedBonusAttributes, setSelectedBonusAttributes] = useState([]);
  const [customBonusAttribute, setCustomBonusAttribute] = useState({
    name: '',
    category: fallbackCategoryKey,
    weight: 0.1,
    isPositive: true
  });

  const [burpRating, setBurpRating] = useState(0);
  const [review, setReview] = useState('');
  const [userBonusOverride, setUserBonusOverride] = useState(null);
  const [hideBonus, setHideBonus] = useState(settings.hideBonus);

  const [photos, setPhotos] = useState([]);
  const [purchasedFrom, setPurchasedFrom] = useState('');
  const [servingStyle, setServingStyle] = useState('');
  const [taggedFriends, setTaggedFriends] = useState([]);

  const [showCustomAttribute, setShowCustomAttribute] = useState(false);

  const beverage = {
    name:
      beverageType === 'beer' ? 'IPA Delight'
        : beverageType === 'wine' ? 'Chardonnay Reserve'
          : beverageType === 'spirits' ? 'Single Malt Scotch'
            : beverageType === 'cider' ? 'Traditional Dry Cider'
              : beverageType === 'mead' ? 'Traditional Honey Mead'
                : 'Ginger Kombucha',
    producer:
      beverageType === 'beer' ? 'Brewery X'
        : beverageType === 'wine' ? 'Vineyard Estate'
          : beverageType === 'spirits' ? 'Distillery Co.'
            : beverageType === 'cider' ? 'Orchard Cidery'
              : beverageType === 'mead' ? 'Meadery Guild'
                : 'Fermentation Co.',
    style:
      beverageType === 'beer' ? 'American IPA'
        : beverageType === 'wine' ? 'Chardonnay'
          : beverageType === 'spirits' ? 'Single Malt Scotch'
            : beverageType === 'cider' ? 'Traditional Cider'
              : beverageType === 'mead' ? 'Traditional Mead'
                : 'Kombucha',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=400&fit=crop'
  };

  useEffect(() => {
    const newSettings = getSettings(beverageType);
    setSettings(newSettings);
    setHideBonus(newSettings.hideBonus);
    setMainAttributes(initializeAttributes(beverageType));
    setSelectedBonusAttributes([]);
    setUserBonusOverride(null);
    setBurpRating(0);
    setReview('');
    setPurchasedFrom('');
    setServingStyle('');
    setPhotos([]);
    setTaggedFriends([]);
  }, [beverageType, initializeAttributes]);

  useEffect(() => {
    const availableCategories = Object.keys(bonusAttributeCategories);
    if (availableCategories.length === 0) {
      return;
    }
    setCustomBonusAttribute((prev) => {
      if (availableCategories.includes(prev.category)) {
        return prev;
      }
      return {
        ...prev,
        category: availableCategories[0]
      };
    });
  }, [bonusAttributeCategories]);

  const handleMainAttributeChange = (attribute, value) => {
    setMainAttributes((prev) => ({
      ...prev,
      [attribute]: {
        ...prev[attribute],
        score: value
      }
    }));
  };

  const handleBonusAttributeToggle = (categoryKey, attribute, isPositive) => {
    const attributeId = `${categoryKey}-${attribute.id}`;
    const exists = selectedBonusAttributes.some((attr) => attr.id === attributeId);

    if (exists) {
      setSelectedBonusAttributes((prev) => prev.filter((attr) => attr.id !== attributeId));
    } else {
      const weight = isPositive ? Math.abs(attribute.weight || 0) : -Math.abs(attribute.weight || 0);
      const name = attribute.name || 'Unnamed Attribute';
      setSelectedBonusAttributes((prev) => [
        ...prev,
        {
          id: attributeId,
          name,
          weight,
          category: categoryKey,
          isPositive,
          description: attribute.description
        }
      ]);
    }
  };

  const handleCustomAttributeAdd = () => {
    if (customBonusAttribute.name.trim()) {
      const availableCategories = Object.keys(bonusAttributeCategories);
      const defaultCategory = availableCategories[0] || fallbackCategoryKey;
      const weight = customBonusAttribute.isPositive
        ? Math.abs(customBonusAttribute.weight)
        : -Math.abs(customBonusAttribute.weight);

      const newAttribute = {
        id: `custom-${Date.now()}`,
        name: customBonusAttribute.name,
        weight,
        category: customBonusAttribute.category,
        isPositive: customBonusAttribute.isPositive,
        isCustom: true
      };

      setSelectedBonusAttributes((prev) => [...prev, newAttribute]);
      setCustomBonusAttribute({
        name: '',
        category: defaultCategory,
        weight: 0.1,
        isPositive: true
      });
      setShowCustomAttribute(false);
    }
  };

  const removeCustomAttribute = (attributeId) => {
    setSelectedBonusAttributes((prev) => prev.filter((attr) => attr.id !== attributeId));
  };

  const currentRating = useMemo(() => (
    calculateFinalRating(
      mainAttributes,
      selectedBonusAttributes,
      userBonusOverride,
      hideBonus,
      beverageType
    )
  ), [mainAttributes, selectedBonusAttributes, userBonusOverride, hideBonus, beverageType]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((step) => step + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };

  const ratingMutation = useMutation({
    mutationFn: createRating,
    onSuccess: () => {
      alert('Rating submitted successfully!');
      navigate('/beer-details');
    },
    onError: (mutationError) => {
      alert(`Unable to submit rating: ${mutationError.message}`);
    }
  });

  const isSubmitting = ratingMutation.isPending;

  const handleSubmit = () => {
    const hasValidRatings = Object.values(mainAttributes).some((attr) => attr.score > 1);

    if (!hasValidRatings) {
      alert('Please provide ratings for the main attributes');
      return;
    }

    const payload = {
      beverage_id: beverageId ? Number(beverageId) : null,
      beverage_type: beverageType,
      base_rating: currentRating.baseRating,
      bonus_points: currentRating.bonusPoints,
      final_rating: currentRating.finalRating,
      hide_bonus: hideBonus,
      user_bonus_override: userBonusOverride,
      main_attribute_scores: Object.entries(mainAttributes).map(([attribute, data]) => ({
        attribute,
        score: data.score,
        weight: data.weight
      })),
      selected_bonus_attributes: selectedBonusAttributes.map((attr) => ({
        id: attr.id,
        name: attr.name,
        weight: attr.weight,
        category: attr.category,
        is_positive: attr.isPositive,
        description: attr.description
      })),
      review,
      burp_rating: burpRating,
      purchased_from: purchasedFrom,
      serving_style: servingStyle,
      tagged_friend_ids: taggedFriends.map((friend) => friend.id),
      tagged_friend_names: taggedFriends.map((friend) => friend.name),
      photos: photos.map(normalisePhoto).filter(Boolean),
      submitted_at: new Date().toISOString()
    };

    ratingMutation.mutate(payload);
  };

  const currentBeverage = beverageTypes[beverageType];
  const stepTitles = ['Main Attributes', 'Bonus Attributes', 'Additional Information', 'Summary'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="p-8 border-b border-gray-200">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Rate This {currentBeverage.name}
            </h1>
            <p className="text-gray-600">Comprehensive beverage evaluation with sliding scale</p>
          </div>

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

          <div className="mb-6">
            <StyleGuideCard
              beverageStyle={beverage.style}
              beverageType={beverageType}
              isCollapsible={true}
            />
          </div>

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

          <ScoreBreakdown
            currentRating={currentRating}
            showAdminScore={true}
            adminScore={4.2}
            className="mb-6"
          />

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

        <div className="p-8">
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

          {currentStep === 1 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Bonus Attributes</h2>

              {bonusAttributesQuery.isLoading && (
                <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              )}

              {(bonusAttributesQuery.error || usingFallbackBonusCategories) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <p className="font-medium">
                    Using default bonus attribute definitions
                  </p>
                  <p className="text-sm">
                    {bonusAttributesQuery.error
                      ? 'We could not load the bonus attribute metadata from NoCodeBackend. The in-app defaults will be used until the API is reachable.'
                      : 'No bonus attribute metadata is available yet. Populate the bonus_attributes table to override the in-app defaults.'}
                  </p>
                </div>
              )}

              {selectedBonusAttributes.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Selected Attributes</h3>
                  <div className="space-y-2">
                    {selectedBonusAttributes.map((attr) => (
                      <div key={attr.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              attr.weight > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {attr.weight > 0 ? '+' : ''}{attr.weight}
                          </span>
                          <span className="text-gray-800">{attr.name}</span>
                          <span className="text-xs text-gray-500">
                            ({bonusAttributeCategories[attr.category]?.name || startCase(attr.category)})
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

                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Override Bonus Score (-0.5 to +0.5)
                    </label>
                    <input
                      type="number"
                      min="-0.5"
                      max="0.5"
                      step="0.1"
                      value={userBonusOverride ?? ''}
                      onChange={(e) => setUserBonusOverride(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Leave blank to use calculated value"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {Object.entries(bonusAttributeCategories).map(([categoryKey, category]) => (
                <div key={categoryKey} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{category.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-medium text-green-700 mb-3">Positive</h4>
                      <div className="space-y-2">
                        {category.positive.map((attr) => {
                          const isSelected = selectedBonusAttributes.some(
                            (selected) => selected.id === `${categoryKey}-${attr.id}`
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
                                <span className="text-sm text-green-600">+{Math.abs(attr.weight)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-md font-medium text-red-700 mb-3">Negative</h4>
                      <div className="space-y-2">
                        {category.negative.map((attr) => {
                          const isSelected = selectedBonusAttributes.some(
                            (selected) => selected.id === `${categoryKey}-${attr.id}`
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
                                <span className="text-sm text-red-600">-{Math.abs(attr.weight)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

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
                      onChange={(e) => setCustomBonusAttribute((prev) => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={customBonusAttribute.category}
                        onChange={(e) => setCustomBonusAttribute((prev) => ({
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
                        value={String(customBonusAttribute.isPositive)}
                        onChange={(e) => setCustomBonusAttribute((prev) => ({
                          ...prev,
                          isPositive: e.target.value === 'true'
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="true">Positive</option>
                        <option value="false">Negative</option>
                      </select>
                      <input
                        type="number"
                        min="0.05"
                        max="0.5"
                        step="0.01"
                        value={customBonusAttribute.weight}
                        onChange={(e) => setCustomBonusAttribute((prev) => ({
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

          {currentStep === 2 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Additional Information</h2>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Photos</h3>
                <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
              </div>

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

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Tag Friends</h3>
                <TagFriends
                  taggedFriends={taggedFriends}
                  onTaggedFriendsChange={setTaggedFriends}
                />
              </div>

              {(beverageType === 'beer' || beverageType === 'fermented' || beverageType === 'cider') && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Burp Rating</h3>
                  <p className="text-sm text-gray-600 mb-4">Rate the carbonation and gas release experience</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Object.entries(burpScale).map(([value, data]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBurpRating(parseInt(value, 10))}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          burpRating === parseInt(value, 10)
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

          {currentStep === 3 && (
            <div className="space-y-6">
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
              {ratingMutation.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                  <p className="font-semibold">Unable to submit rating.</p>
                  <p className="text-sm">{ratingMutation.error.message}</p>
                </div>
              )}
            </div>
          )}
        </div>

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
