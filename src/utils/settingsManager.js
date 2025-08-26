// Settings management utility
const SETTINGS_KEY = 'brewBudsSettings';

export const defaultSettings = {
  ratingWeights: {
    design: 2.0,
    appearance: 2.5,
    aroma: 3.0,
    mouthfeel: 3.0,
    flavour: 3.5,
    follow: 1.0
  },
  hideBonus: false,
  maxWeightSum: 15.0
};

export const getSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      return { ...defaultSettings, ...settings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

export const resetSettings = () => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    return defaultSettings;
  } catch (error) {
    console.error('Error resetting settings:', error);
    return defaultSettings;
  }
};

export const validateWeights = (weights, maxSum = 15.0) => {
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
  const isValid = sum <= maxSum && Object.values(weights).every(weight => weight >= 0 && weight <= 3);
  
  return {
    isValid,
    sum,
    maxSum,
    errors: {
      exceedsMax: sum > maxSum,
      invalidRange: Object.values(weights).some(weight => weight < 0 || weight > 3)
    }
  };
};