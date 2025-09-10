import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { beverageTypes } from '../utils/beverageTypes';

const { FiX, FiPlus, FiCalendar, FiMapPin, FiDollarSign, FiPackage } = FiIcons;

function CellarModal({ isOpen, onClose, beverage, onAdd }) {
  const [cellarEntry, setCellarEntry] = useState({
    purchaseLocation: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    containerType: 'Bottle',
    containerSize: 375,
    unit: 'ml', // ml or fl oz
    purchasePrice: '',
    retailPrice: beverage?.retailPrice || '',
    source: 'Brewery',
    series: '',
    customSeries: '',
    notes: ''
  });

  const containerTypes = ['Bottle', 'Can', 'Draft', 'Growler', 'Crowler', 'Keg', 'Cask'];
  const sources = ['Brewery', 'Craft Beer Bottle Shop', 'Series', 'Home Brew', 'Other'];
  const seriesOptions = ['Sub Rev', 'SCB', 'WCB', 'Festival', 'Birthday Beer', 'Custom'];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const entry = {
      ...cellarEntry,
      beverageId: beverage.id,
      beverageName: beverage.name,
      producer: beverage.producer,
      style: beverage.style,
      addedDate: new Date().toISOString(),
      id: Date.now()
    };

    onAdd(entry);
    onClose();
    
    // Reset form
    setCellarEntry({
      purchaseLocation: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      containerType: 'Bottle',
      containerSize: 375,
      unit: 'ml',
      purchasePrice: '',
      retailPrice: beverage?.retailPrice || '',
      source: 'Brewery',
      series: '',
      customSeries: '',
      notes: ''
    });
  };

  const convertUnits = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'ml' && toUnit === 'fl oz') return value * 0.033814;
    if (fromUnit === 'fl oz' && toUnit === 'ml') return value * 29.5735;
    return value;
  };

  const handleUnitChange = (newUnit) => {
    const convertedSize = convertUnits(cellarEntry.containerSize, cellarEntry.unit, newUnit);
    setCellarEntry(prev => ({
      ...prev,
      unit: newUnit,
      containerSize: Math.round(convertedSize * 100) / 100
    }));
  };

  if (!isOpen) return null;

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
          className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Add to Cellar</h3>
              <p className="text-gray-600">{beverage?.name} by {beverage?.producer}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Purchase Location & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <SafeIcon icon={FiMapPin} className="w-4 h-4 inline mr-1" />
                  Purchase Location
                </label>
                <input
                  type="text"
                  value={cellarEntry.purchaseLocation}
                  onChange={(e) => setCellarEntry(prev => ({ ...prev, purchaseLocation: e.target.value }))}
                  placeholder="Store name, brewery, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <SafeIcon icon={FiCalendar} className="w-4 h-4 inline mr-1" />
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={cellarEntry.purchaseDate}
                  onChange={(e) => setCellarEntry(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Container Type & Size */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <SafeIcon icon={FiPackage} className="w-4 h-4 inline mr-1" />
                  Container Type
                </label>
                <select
                  value={cellarEntry.containerType}
                  onChange={(e) => setCellarEntry(prev => ({ ...prev, containerType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {containerTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Container Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cellarEntry.containerSize}
                  onChange={(e) => setCellarEntry(prev => ({ ...prev, containerSize: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <select
                  value={cellarEntry.unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="ml">ml</option>
                  <option value="fl oz">fl oz</option>
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <SafeIcon icon={FiDollarSign} className="w-4 h-4 inline mr-1" />
                  Purchase Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cellarEntry.purchasePrice}
                  onChange={(e) => setCellarEntry(prev => ({ ...prev, purchasePrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retail Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cellarEntry.retailPrice}
                  onChange={(e) => setCellarEntry(prev => ({ ...prev, retailPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={cellarEntry.source}
                onChange={(e) => setCellarEntry(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {sources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            {/* Series (if Source is Series) */}
            {cellarEntry.source === 'Series' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Series Type
                  </label>
                  <select
                    value={cellarEntry.series}
                    onChange={(e) => setCellarEntry(prev => ({ ...prev, series: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select series...</option>
                    {seriesOptions.map(series => (
                      <option key={series} value={series}>{series}</option>
                    ))}
                  </select>
                </div>
                
                {cellarEntry.series === 'Custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Series Name
                    </label>
                    <input
                      type="text"
                      value={cellarEntry.customSeries}
                      onChange={(e) => setCellarEntry(prev => ({ ...prev, customSeries: e.target.value }))}
                      placeholder="Enter custom series name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={cellarEntry.notes}
                onChange={(e) => setCellarEntry(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this entry..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
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
                <span>Add to Cellar</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CellarModal;