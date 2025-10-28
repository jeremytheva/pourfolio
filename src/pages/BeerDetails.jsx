import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import SendToFriendModal from '../components/SendToFriendModal';
import CellarModal from '../components/CellarModal';
import StyleGuideCard from '../components/StyleGuideCard';
import StyleRangeIndicator from '../components/StyleRangeIndicator';
import ColorRangeDisplay from '../components/ColorRangeDisplay';
import ScoreBreakdown from '../components/ScoreBreakdown';
import RadarChart from '../components/RadarChart';
import { beverageTypes } from '../utils/beverageTypes';
import { getCellarEntries, saveCellarEntries } from '../utils/api/mockApi';

const { FiStar, FiArrowLeft, FiShare2, FiPlus } = FiIcons;

function BeerDetails({ selectedBeverageCategory = 'beer' }) {
  const [searchParams] = useSearchParams();
  const beverageType = searchParams.get('type') || selectedBeverageCategory;
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCellarModal, setShowCellarModal] = useState(false);
  const [cellarEntries, setCellarEntries] = useState([]);

  const beverageTypeInfo = beverageTypes[beverageType] || beverageTypes.beer;

  // Dynamic beverage data based on type
  const beverage = {
    id: 1,
    name: beverageType === 'beer' ? 'IPA Delight' : 
          beverageType === 'wine' ? 'Chardonnay Reserve' : 
          beverageType === 'spirits' ? 'Single Malt Scotch 18yr' : 
          beverageType === 'cider' ? 'Traditional Dry Cider' : 
          beverageType === 'mead' ? 'Wildflower Honey Mead' : 'Ginger Kombucha',
    producer: beverageType === 'beer' ? 'Brewery X' : 
              beverageType === 'wine' ? 'Valley Vineyard Estate' : 
              beverageType === 'spirits' ? 'Highland Distillery' : 
              beverageType === 'cider' ? 'Orchard House Cidery' : 
              beverageType === 'mead' ? 'Ancient Meadery' : 'Living Cultures Co.',
    style: beverageType === 'beer' ? 'American IPA' : 
           beverageType === 'wine' ? 'Chardonnay' : 
           beverageType === 'spirits' ? 'Single Malt Scotch Whisky' : 
           beverageType === 'cider' ? 'Traditional English Cider' : 
           beverageType === 'mead' ? 'Traditional Mead' : 'Ginger Kombucha',
    statedStyle: beverageType === 'beer' ? 'West Coast IPA' : 
                 beverageType === 'wine' ? 'Barrel-Aged Chardonnay' : 
                 beverageType === 'spirits' ? 'Highland Single Malt' : 
                 beverageType === 'cider' ? 'Traditional Farmhouse Cider' : 
                 beverageType === 'mead' ? 'Wildflower Traditional' : 'Artisanal Ginger Kombucha',
    details: beverageType === 'beer' ? { abv: 6.5, ibu: 65 } : 
             beverageType === 'wine' ? { abv: 13.5, vintage: '2021' } : 
             beverageType === 'spirits' ? { abv: 43, age: '18 years' } : 
             beverageType === 'cider' ? { abv: 6.2, residualSugar: 'Dry' } : 
             beverageType === 'mead' ? { abv: 14, honey: 'Wildflower' } : { abv: 0.5, probiotics: 'Live cultures' },
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=600&fit=crop',
    description: beverageType === 'beer' ? 'A bold and hoppy IPA with citrus notes and a crisp finish. Brewed with premium hops and malted barley for the perfect balance of bitterness and flavor.' : 
                 beverageType === 'wine' ? 'An elegant Chardonnay with notes of green apple, citrus, and subtle oak. Crisp acidity balanced with creamy texture from partial malolactic fermentation.' : 
                 beverageType === 'spirits' ? 'A complex single malt aged 18 years in oak casks. Rich notes of honey, vanilla, and dried fruits with a long, warming finish.' : 
                 beverageType === 'cider' ? 'A traditional dry cider made from heritage apples. Crisp, refreshing with bright acidity and subtle fruit character.' : 
                 beverageType === 'mead' ? 'A traditional mead crafted from wildflower honey. Smooth and balanced with floral notes and gentle sweetness.' : 'A refreshing kombucha with live probiotics and fresh ginger. Lightly effervescent with tangy, spicy notes.',
    averageRating: 4.5,
    totalReviews: 127,
    type: beverageType,
    retailPrice: beverageType === 'beer' ? 8.99 : 
                 beverageType === 'wine' ? 24.99 : 
                 beverageType === 'spirits' ? 89.99 : 
                 beverageType === 'cider' ? 6.99 : 
                 beverageType === 'mead' ? 18.99 : 4.99,

    // Style ranges for indicators
    styleRanges: beverageType === 'beer' ? {
      abv: { min: 5.5, max: 7.5, globalMin: 0, globalMax: 15 },
      ibu: { min: 40, max: 70, globalMin: 0, globalMax: 120 }
    } : beverageType === 'wine' ? {
      abv: { min: 12, max: 15, globalMin: 8, globalMax: 20 }
    } : beverageType === 'spirits' ? {
      abv: { min: 40, max: 60, globalMin: 20, globalMax: 80 }
    } : beverageType === 'cider' ? {
      abv: { min: 4.5, max: 8.5, globalMin: 0, globalMax: 12 }
    } : beverageType === 'mead' ? {
      abv: { min: 8, max: 18, globalMin: 6, globalMax: 20 }
    } : { abv: { min: 0.1, max: 3, globalMin: 0, globalMax: 5 } },

    // Color ranges for appearance
    colorRange: beverageType === 'beer' ? ['#F4E4BC', '#D4A574', '#B8860B', '#8B4513'] : 
                beverageType === 'wine' ? ['#F5F5DC', '#FFD700', '#DAA520'] : 
                beverageType === 'spirits' ? ['#F5DEB3', '#D2691E', '#8B4513', '#654321'] : 
                beverageType === 'cider' ? ['#FFFACD', '#F0E68C', '#DAA520'] : 
                beverageType === 'mead' ? ['#FFF8DC', '#F0E68C', '#DAA520', '#B8860B'] : ['#F5F5DC', '#F0E68C', '#DAA520'],
    
    beverageColor: beverageType === 'beer' ? '#D4A574' : 
                   beverageType === 'wine' ? '#FFD700' : 
                   beverageType === 'spirits' ? '#D2691E' : 
                   beverageType === 'cider' ? '#F0E68C' : 
                   beverageType === 'mead' ? '#F0E68C' : '#F0E68C'
  };

  const handleAddToCellar = async (cellarEntry) => {
    try {
      const existingEntries = await getCellarEntries();
      const entryWithType = { ...cellarEntry, beverageType };
      const updatedEntries = [...existingEntries, entryWithType];
      await saveCellarEntries(updatedEntries);
      setCellarEntries(updatedEntries);
      alert('Added to cellar successfully!');
    } catch (error) {
      console.error('Failed to add cellar entry', error);
      alert('We could not save this to your cellar. Please try again.');
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <SafeIcon key={i} icon={FiStar} className="w-5 h-5 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <SafeIcon key="half" icon={FiStar} className="w-5 h-5 text-yellow-400 fill-current opacity-50" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <SafeIcon key={`empty-${i}`} icon={FiStar} className="w-5 h-5 text-gray-300" />
      );
    }

    return stars;
  };

  const getDetailsLabels = () => {
    switch (beverageType) {
      case 'beer': return { abv: 'ABV (Alcohol by Volume)', ibu: 'IBU (International Bitterness Units)' };
      case 'wine': return { abv: 'ABV (Alcohol by Volume)', vintage: 'Vintage' };
      case 'spirits': return { abv: 'ABV (Alcohol by Volume)', age: 'Age Statement' };
      case 'cider': return { abv: 'ABV (Alcohol by Volume)', residualSugar: 'Sweetness Level' };
      case 'mead': return { abv: 'ABV (Alcohol by Volume)', honey: 'Honey Type' };
      case 'fermented': return { abv: 'ABV (Alcohol by Volume)', probiotics: 'Health Benefits' };
      default: return { abv: 'ABV (Alcohol by Volume)' };
    }
  };

  const detailLabels = getDetailsLabels();

  // Mock current rating for score breakdown
  const currentRating = {
    finalRating: beverage.averageRating,
    baseRating: 4.2,
    bonusPoints: 0.3,
    hideBonus: false
  };

  // Mock radar chart data
  const ratingChartData = {
    name: beverage.name,
    title: `${beverage.name} - Rating Profile`,
    values: beverageType === 'beer' ? [6.2, 6.5, 6.0, 6.8, 5.9, 4.0, 75] : // appearance, aroma, mouthfeel, flavour, follow, design, value
            beverageType === 'wine' ? [6.0, 6.3, 6.5, 6.2, 6.4, 3.5, 68] : // appearance, aroma, taste, balance, finish, design, value
            beverageType === 'spirits' ? [5.8, 6.7, 6.9, 6.5, 6.6, 4.2, 82] : // appearance, nose, palate, complexity, finish, design, value
            beverageType === 'cider' ? [5.9, 6.1, 6.3, 6.0, 6.2, 3.8, 71] : // appearance, aroma, sweetness, acidity, finish, design, value
            beverageType === 'mead' ? [6.1, 6.4, 6.7, 6.3, 6.5, 4.1, 76] : // appearance, aroma, honey_character, balance, finish, design, value
            [5.7, 6.0, 6.2, 5.9, 6.1, 3.6, 69], // fermented: appearance, aroma, fermentation_character, balance, finish, design, value
    color: '#F59E0B',
    overallScore: beverage.averageRating
  };

  const characteristicsChartData = {
    name: beverage.name,
    title: `${beverage.name} - Characteristics Profile`,
    values: beverageType === 'beer' ? [7.5, 5.2, 8.1, 3.8, 6.4, 4.2, 6.8, 7.0] : // hop, malt, bitter, sweet, fruit, alcohol, body, carb
            beverageType === 'wine' ? [2.1, 6.8, 4.5, 7.2, 5.9, 6.1, 4.8, 7.3] : // tannins, acid, sweet, fruit, oak, mineral, alcohol, body
            beverageType === 'spirits' ? [6.8, 3.2, 5.4, 7.1, 2.1, 6.5, 6.9, 8.2] : // alcohol, sweet, spice, oak, smoke, fruit, grain, smooth
            beverageType === 'cider' ? [8.5, 4.1, 7.2, 5.8, 2.3, 6.4, 5.1, 6.7] : // apple, sweet, acid, fruit, funk, carb, alcohol, body
            beverageType === 'mead' ? [6.8, 7.4, 4.9, 5.2, 4.7, 5.8, 3.1, 6.3] : // honey, floral, fruit, spice, alcohol, acid, carb, body
            [7.1, 4.8, 3.9, 6.2, 5.7, 6.9, 4.2, 5.5], // fermented: tart, funk, sweet, spice, fruit, probiotics, carb, tea
    color: '#3B82F6'
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          to="/home"
          className="flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
          <span>Back to Beverages</span>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Beverage Image */}
        <div className="aspect-video md:aspect-square lg:aspect-video overflow-hidden relative">
          <img
            src={beverage.image}
            alt={beverage.name}
            className="w-full h-full object-cover"
          />
          {/* Type indicator */}
          <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 flex items-center space-x-2">
            <span className="text-xl">{beverageTypeInfo.icon}</span>
            <span className="font-medium text-gray-800">{beverageTypeInfo.name}</span>
          </div>
        </div>

        {/* Beverage Information */}
        <div className="p-8">
          {/* Beverage Name and Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start justify-between mb-4"
          >
            <h1 className="text-4xl font-bold text-gray-800">{beverage.name}</h1>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setShowCellarModal(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Add to Cellar</span>
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <SafeIcon icon={FiShare2} className="w-4 h-4" />
                <span>Send to Friend</span>
              </button>
            </div>
          </motion.div>

          {/* Style Guide */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <StyleGuideCard
              beverageStyle={beverage.style}
              beverageType={beverageType}
              isCollapsible={true}
            />
          </motion.div>

          {/* Color Range Display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <ColorRangeDisplay
              styleColors={beverage.colorRange}
              beverageColor={beverage.beverageColor}
              label={`Expected ${beverageTypeInfo.name} Color Range`}
            />
          </motion.div>

          {/* Beverage Details Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  {beverageType === 'beer' ? 'Brewery' : 
                   beverageType === 'wine' ? 'Winery' : 
                   beverageType === 'spirits' ? 'Distillery' : 
                   beverageType === 'cider' ? 'Cidery' : 
                   beverageType === 'mead' ? 'Meadery' : 'Producer'}
                </label>
                <div className="text-lg text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                  {beverage.producer}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Official Style</label>
                <div className="text-lg text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                  {beverage.style}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Stated Style</label>
                <div className="text-lg text-gray-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  {beverage.statedStyle}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  As labeled by the producer
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(beverage.details).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {detailLabels[key] || key}
                  </label>
                  <div className="text-lg text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">
                    {value}{key === 'abv' ? '%' : ''}
                  </div>
                  {/* Style Range Indicators */}
                  {beverage.styleRanges[key] && (
                    <div className="mt-2">
                      <StyleRangeIndicator
                        label="Style Range"
                        beverageValue={parseFloat(value)}
                        styleMin={beverage.styleRanges[key].min}
                        styleMax={beverage.styleRanges[key].max}
                        globalMin={beverage.styleRanges[key].globalMin}
                        globalMax={beverage.styleRanges[key].globalMax}
                        unit={key === 'abv' ? '%' : ''}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{beverage.description}</p>
          </motion.div>

          {/* Radar Charts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-8"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Analysis Charts</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Rating Chart */}
              <RadarChart
                data={ratingChartData}
                beverageType={beverageType}
                chartType="rating"
                showValue={true}
              />
              
              {/* Characteristics Chart */}
              <RadarChart
                data={characteristicsChartData}
                beverageType={beverageType}
                chartType="characteristics"
                showValue={false}
              />
            </div>
          </motion.div>

          {/* Score Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <ScoreBreakdown
              currentRating={currentRating}
              showAdminScore={true}
              adminScore={4.3}
              purchasePrice={0}
              retailPrice={beverage.retailPrice}
              volumeML={375}
            />
          </motion.div>

          {/* User Reviews Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="border-t pt-8"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">User Reviews</h3>

            {/* Average Rating Display */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-1">
                {renderStars(beverage.averageRating)}
              </div>
              <span className="text-2xl font-bold text-gray-800">{beverage.averageRating}</span>
              <span className="text-gray-600">({beverage.totalReviews} reviews)</span>
            </div>

            {/* Placeholder for reviews */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-gray-600 text-center">
                User reviews will be displayed here. Join the community and be the first to rate this {beverageTypeInfo.name.toLowerCase()}!
              </p>
            </div>

            {/* Rate This Beverage Button */}
            <Link
              to={`/rate-beer?type=${beverageType}`}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <SafeIcon icon={FiStar} className="w-5 h-5" />
              <span>Rate This {beverageTypeInfo.name}</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Modals */}
      <SendToFriendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        beer={beverage}
      />

      <CellarModal
        isOpen={showCellarModal}
        onClose={() => setShowCellarModal(false)}
        beverage={beverage}
        onAdd={handleAddToCellar}
      />
    </div>
  );
}

export default BeerDetails;