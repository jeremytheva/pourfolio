import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { getSettings, saveSettings, resetSettings, validateWeights } from '../utils/settingsManager';

const { FiSettings, FiRotateCcw, FiCheck, FiAlertTriangle, FiEye, FiEyeOff } = FiIcons;

function Settings() {
  const [settings, setSettingsState] = useState(getSettings());
  const [tempWeights, setTempWeights] = useState(settings.ratingWeights);
  const [tempHideBonus, setTempHideBonus] = useState(settings.hideBonus);
  const [validation, setValidation] = useState({ isValid: true, sum: 0, errors: {} });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const attributeLabels = {
    design: 'Design',
    appearance: 'Appearance', 
    aroma: 'Aroma',
    mouthfeel: 'Mouthfeel',
    flavour: 'Flavour',
    follow: 'Follow (Finish)'
  };

  useEffect(() => {
    const newValidation = validateWeights(tempWeights);
    setValidation(newValidation);
    
    // Check if there are any changes
    const weightsChanged = JSON.stringify(tempWeights) !== JSON.stringify(settings.ratingWeights);
    const bonusChanged = tempHideBonus !== settings.hideBonus;
    setHasChanges(weightsChanged || bonusChanged);
  }, [tempWeights, tempHideBonus, settings]);

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

    if (saveSettings(newSettings)) {
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
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      const defaultSettings = resetSettings();
      setSettingsState(defaultSettings);
      setTempWeights(defaultSettings.ratingWeights);
      setTempHideBonus(defaultSettings.hideBonus);
      setSaveStatus('reset');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const getStatusMessage = () => {
    switch (saveStatus) {
      case 'success':
        return { text: 'Settings saved successfully!', color: 'text-green-600' };
      case 'error':
        return { text: 'Error saving settings. Please try again.', color: 'text-red-600' };
      case 'reset':
        return { text: 'Settings reset to defaults.', color: 'text-blue-600' };
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <SafeIcon icon={FiSettings} className="w-8 h-8 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Rating Settings</h1>
            <p className="text-gray-600">Customize your beer rating preferences</p>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg bg-gray-50 border-l-4 ${
              saveStatus === 'success' ? 'border-green-500' : 
              saveStatus === 'error' ? 'border-red-500' : 'border-blue-500'
            }`}
          >
            <p className={statusMessage.color}>{statusMessage.text}</p>
          </motion.div>
        )}

        {/* Rating Weights Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Rating Attribute Weights</h2>
          <p className="text-gray-600 mb-6">
            Adjust the importance of each rating attribute. Values range from 0 to 3, 
            and the total should not exceed {settings.maxWeightSum}.
          </p>

          <div className="space-y-6">
            {Object.entries(attributeLabels).map(([key, label]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <div className="text-xs text-gray-500">
                    Current weight: {tempWeights[key]}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={tempWeights[key]}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(tempWeights[key] / 3) * 100}%, #e5e7eb ${(tempWeights[key] / 3) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  
                  <input
                    type="number"
                    min="0"
                    max="3"
                    step="0.1"
                    value={tempWeights[key]}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Validation Summary */}
          <div className={`mt-6 p-4 rounded-lg ${
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
            
            {validation.errors.exceedsMax && (
              <p className="text-red-700 text-sm">
                Total weight exceeds maximum allowed ({validation.maxSum})
              </p>
            )}
            
            {validation.errors.invalidRange && (
              <p className="text-red-700 text-sm">
                All weights must be between 0 and 3
              </p>
            )}
            
            {validation.isValid && (
              <p className="text-green-700 text-sm">
                Weight distribution is valid
              </p>
            )}
          </div>
        </div>

        {/* Display Options */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Display Options</h2>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Hide Bonus Attribute Points</label>
                <p className="text-xs text-gray-500 mt-1">
                  When enabled, bonus points are calculated but not visibly added to the final rating
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setTempHideBonus(!tempHideBonus)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  tempHideBonus 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                <SafeIcon icon={tempHideBonus ? FiEyeOff : FiEye} className="w-4 h-4" />
                <span className="text-sm">{tempHideBonus ? 'Hidden' : 'Visible'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
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
            <span>Reset to Defaults</span>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">How Rating Weights Work</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Higher weights make attributes more important in the final rating</li>
            <li>• The 1-7 scale is automatically converted to a 0-5 final rating</li>
            <li>• Bonus attributes can add or subtract up to 2 points from the final score</li>
            <li>• Changes apply immediately to new ratings you submit</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

export default Settings;