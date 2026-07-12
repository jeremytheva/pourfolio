import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { beverageTypes, beverageSubtypes } from '../utils/beverageTypes';

const { FiX, FiPlus, FiImage } = FiIcons;

function AddBeverageModal({ isOpen, onClose, onSubmit }) {
  const [beverageData, setBeverageData] = useState({
    name: '',
    producer: '',
    type: 'beer',
    category: '',
    style: '',
    description: '',
    abv: '',
    details: {},
    image: '',
    retailPrice: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!beverageData.name.trim() || !beverageData.producer.trim()) {
      alert('Please fill in the required fields.');
      return;
    }

    onSubmit({
      ...beverageData,
      id: Date.now(),
      addedDate: new Date().toISOString(),
      rating: 0,
      totalReviews: 0
    });

    // Reset form
    setBeverageData({
      name: '',
      producer: '',
      type: 'beer',
      category: '',
      style: '',
      description: '',
      abv: '',
      details: {},
      image: '',
      retailPrice: ''
    });
    onClose();
  };

  const getProducerLabel = (type) => {
    switch (type) {
      case 'beer': return 'Brewery';
      case 'wine': return 'Winery';
      case 'spirits': return 'Distillery';
      case 'cider': return 'Cidery';
      case 'mead': return 'Meadery';
      case 'fermented': return 'Producer';
      default: return 'Producer';
    }
  };

  const getDetailFields = (type) => {
    switch (type) {
      case 'beer': return ['ibu'];
      case 'wine': return ['vintage', 'region'];
      case 'spirits': return ['age', 'proof'];
      case 'cider': return ['residualSugar', 'appleVariety'];
      case 'mead': return ['honeyType', 'residualSugar'];
      case 'fermented': return ['probiotics', 'baseIngredient'];
      default: return [];
    }
  };

  const getDetailLabel = (field) => {
    const labels = {
      ibu: 'IBU (International Bitterness Units)',
      vintage: 'Vintage Year',
      region: 'Region',
      age: 'Age Statement',
      proof: 'Proof',
      residualSugar: 'Residual Sugar',
      appleVariety: 'Apple Variety',
      honeyType: 'Honey Type',
      probiotics: 'Probiotic Strains',
      baseIngredient: 'Base Ingredient'
    };
    return labels[field] || field;
  };

  if (!isOpen) return null;

  const currentBeverage = beverageTypes[beverageData.type];
  const availableCategories = beverageSubtypes[beverageData.type] || [];
  const detailFields = getDetailFields(beverageData.type);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Add New Beverage</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Beverage Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Beverage Type *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(beverageTypes).map(([key, type]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBeverageData(prev => ({
                      ...prev,
                      type: key,
                      category: '',
                      details: {}
                    }))}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                      beverageData.type === key
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{type.icon}</span>
                    <span className="font-medium">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beverage Name *
                </label>
                <input
                  type="text"
                  required
                  value={beverageData.name}
                  onChange={(e) => setBeverageData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., IPA Delight"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getProducerLabel(beverageData.type)} *
                </label>
                <input
                  type="text"
                  required
                  value={beverageData.producer}
                  onChange={(e) => setBeverageData(prev => ({
                    ...prev,
                    producer: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Craft Beer Co."
                />
              </div>
            </div>

            {/* Category and ABV */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={beverageData.category}
                  onChange={(e) => setBeverageData(prev => ({
                    ...prev,
                    category: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select category...</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ABV (Alcohol by Volume) %
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="80"
                  value={beverageData.abv}
                  onChange={(e) => setBeverageData(prev => ({
                    ...prev,
                    abv: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., 6.5"
                />
              </div>
            </div>

            {/* Style and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style
                </label>
                <input
                  type="text"
                  value={beverageData.style}
                  onChange={(e) => setBeverageData(prev => ({
                    ...prev,
                    style: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., American IPA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retail Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={beverageData.retailPrice}
                  onChange={(e) => setBeverageData(prev => ({
                    ...prev,
                    retailPrice: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., 8.99"
                />
              </div>
            </div>

            {/* Type-specific Details */}
            {detailFields.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-4">Additional Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailFields.map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {getDetailLabel(field)}
                      </label>
                      <input
                        type="text"
                        value={beverageData.details[field] || ''}
                        onChange={(e) => setBeverageData(prev => ({
                          ...prev,
                          details: {
                            ...prev.details,
                            [field]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder={`Enter ${getDetailLabel(field).toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={beverageData.description}
                onChange={(e) => setBeverageData(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Describe the beverage, its characteristics, and what makes it special..."
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <SafeIcon icon={FiImage} className="w-4 h-4 inline mr-1" />
                Image URL (Optional)
              </label>
              <input
                type="url"
                value={beverageData.image}
                onChange={(e) => setBeverageData(prev => ({
                  ...prev,
                  image: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Add Beverage</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AddBeverageModal;