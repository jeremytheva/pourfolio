import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BeverageTypeSelector from './BeverageTypeSelector';
import { getSettings, saveSettings, resetSettings, validateWeights } from '../utils/settingsManager';
import { beverageTypes, attributeLabels } from '../utils/beverageTypes';

const { FiCheck, FiRotateCcw, FiEye, FiEyeOff, FiAlertTriangle } = FiIcons;

function ProfileSettings({ user }) {
  const [selectedBeverageType, setSelectedBeverageType] = useState('beer');
  const [settings, setSettingsState] = useState(getSettings(selectedBeverageType));
  const [tempWeights, setTempWeights] = useState(settings.ratingWeights);
  const [tempHideBonus, setTempHideBonus] = useState(settings.hideBonus);
  const [validation, setValidation] = useState({ isValid: true, sum: 0, errors: {} });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const currentBeverage = beverageTypes[selectedBeverageType];

  React.useEffect(() => {
    const newSettings = getSettings(selectedBeverageType);
    setSettingsState(newSettings);
    setTempWeights(newSettings.ratingWeights);
    setTempHideBonus(newSettings.hideBonus);
  }, [selectedBeverageType]);

  React.useEffect(() => {
    const newValidation = validateWeights(tempWeights, currentBeverage.maxWeightSum);
    setValidation(newValidation);

    const weightsChanged = JSON.stringify(tempWeights) !== JSON.stringify(settings.ratingWeights);
    const bonusChanged = tempHideBonus !== settings.hideBonus;
    setHasChanges(weightsChanged || bonusChanged);
  }, [tempWeights, tempHideBonus, settings, currentBeverage.maxWeightSum]);

  const handleWeightChange = (attribute, value) => {
    const numValue = parseFloat(value) || 0;
    setTempWeights(prev => ({
      ...prev,
      [attribute]: Math.max(0, Math.min(3, numValue))
    }));
  };

  const handleSave = () => {
    if (!validation.isValid) {
      setSaveStatus('error');
      return;
    }

    const newSettings = {
      ...settings,
      ratingWeights: tempWeights,
      hideBonus: tempHideBonus
    };

    if (saveSettings(newSettings, selectedBeverageType)) {
      setSettingsState(newSettings);
      setHasChanges(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleReset = () => {
    if (confirm(`Reset all ${currentBeverage.name} settings to defaults?`)) {
      const defaultSettings = resetSettings(selectedBeverageType);
      setSettingsState(defaultSettings);
      setTempWeights(defaultSettings.ratingWeights);
      setTempHideBonus(defaultSettings.hideBonus);
      setSaveStatus('reset');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Rating Settings</h2>

      {/* Beverage Type Selector */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Beverage Type</h3>
        <BeverageTypeSelector
          selectedType={selectedBeverageType}
          onTypeChange={setSelectedBeverageType}
        />
      </div>

      {/* Status Message */}
      {saveStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            saveStatus === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            saveStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {saveStatus === 'success' && 'Settings saved successfully!'}
          {saveStatus === 'error' && 'Error saving settings. Please try again.'}
          {saveStatus === 'reset' && 'Settings reset to defaults.'}
        </motion.div>
      )}

      {/* Rating Weights */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {currentBeverage.name} Rating Weights
        </h3>
        <p className="text-gray-600 mb-6">
          Adjust the importance of each attribute. Total should not exceed {currentBeverage.maxWeightSum}.
        </p>

        <div className="space-y-4">
          {Object.entries(currentBeverage.defaultWeights).map(([key, defaultValue]) => (
            <div key={key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {attributeLabels[key] || key.replace('_', ' ')}
                </label>
                <div className="text-xs text-gray-500">
                  Weight: {tempWeights[key] || 0} / 3
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={tempWeights[key] || 0}
                  onChange={(e) => handleWeightChange(key, e.target.value)}
                  className="w-32"
                />
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.1"
                  value={tempWeights[key] || 0}
                  onChange={(e) => handleWeightChange(key, e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Validation */}
        <div className={`mt-4 p-4 rounded-lg ${
          validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <SafeIcon
              icon={validation.isValid ? FiCheck : FiAlertTriangle}
              className={`w-5 h-5 ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}
            />
            <span className={`font-medium ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
              Total Weight: {validation.sum.toFixed(1)} / {validation.maxSum}
            </span>
          </div>
        </div>
      </div>

      {/* Display Options */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Display Options</h3>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Hide Bonus Points</label>
              <p className="text-xs text-gray-500 mt-1">
                Calculate but don't visibly show bonus points in ratings
              </p>
            </div>
            <button
              onClick={() => setTempHideBonus(!tempHideBonus)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                tempHideBonus ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <SafeIcon icon={tempHideBonus ? FiEyeOff : FiEye} className="w-4 h-4" />
              <span className="text-sm">{tempHideBonus ? 'Hidden' : 'Visible'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 pt-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!hasChanges || !validation.isValid}
          className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <SafeIcon icon={FiCheck} className="w-5 h-5" />
          <span>Save Settings</span>
        </button>
        <button
          onClick={handleReset}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <SafeIcon icon={FiRotateCcw} className="w-5 h-5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

export default ProfileSettings;