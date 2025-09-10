// Updated settings management utility
import { beverageTypes } from './beverageTypes';

const SETTINGS_KEY = 'brewBudsSettings';
const ADMIN_UPDATES_KEY = 'brewBudsAdminUpdates';

export const getDefaultSettings = (beverageType = 'beer') => {
  const beverage = beverageTypes[beverageType] || beverageTypes.beer;
  return {
    ratingWeights: { ...beverage.defaultWeights },
    hideBonus: false,
    maxWeightSum: beverage.maxWeightSum, // 15
    beverageType: beverageType,
    lastAdminUpdateCheck: null
  };
};

export const getSettings = (beverageType = 'beer') => {
  try {
    const stored = localStorage.getItem(`${SETTINGS_KEY}_${beverageType}`);
    if (stored) {
      const settings = JSON.parse(stored);
      return { ...getDefaultSettings(beverageType), ...settings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return getDefaultSettings(beverageType);
};

export const saveSettings = (settings, beverageType = 'beer') => {
  try {
    localStorage.setItem(`${SETTINGS_KEY}_${beverageType}`, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

export const resetSettings = (beverageType = 'beer') => {
  try {
    localStorage.removeItem(`${SETTINGS_KEY}_${beverageType}`);
    return getDefaultSettings(beverageType);
  } catch (error) {
    console.error('Error resetting settings:', error);
    return getDefaultSettings(beverageType);
  }
};

export const validateWeights = (weights, maxSum = 15) => {
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
  const isValid = sum <= maxSum && Object.values(weights).every(weight => weight >= 0 && weight <= 3);
  
  return {
    isValid,
    sum,
    maxSum,
    errors: {
      exceedsMax: sum > maxSum,
      invalidRange: Object.values(weights).some(weight => weight < 0 || weight > 3),
      exceedsAttributeMax: Object.values(weights).some(weight => weight > 3)
    }
  };
};

export const getAllBeverageSettings = () => {
  const allSettings = {};
  Object.keys(beverageTypes).forEach(type => {
    allSettings[type] = getSettings(type);
  });
  return allSettings;
};

// Admin update notification system
export const createAdminUpdate = (beverageType, newWeights, message) => {
  const update = {
    id: Date.now(),
    beverageType,
    newWeights,
    message,
    timestamp: new Date().toISOString(),
    applied: false
  };
  
  try {
    const existing = localStorage.getItem(ADMIN_UPDATES_KEY);
    const updates = existing ? JSON.parse(existing) : [];
    updates.push(update);
    localStorage.setItem(ADMIN_UPDATES_KEY, JSON.stringify(updates));
    return true;
  } catch (error) {
    console.error('Error creating admin update:', error);
    return false;
  }
};

export const getPendingAdminUpdates = () => {
  try {
    const stored = localStorage.getItem(ADMIN_UPDATES_KEY);
    if (stored) {
      const updates = JSON.parse(stored);
      return updates.filter(update => !update.applied);
    }
  } catch (error) {
    console.error('Error getting admin updates:', error);
  }
  return [];
};

export const applyAdminUpdate = (updateId, accept = true) => {
  try {
    const stored = localStorage.getItem(ADMIN_UPDATES_KEY);
    if (stored) {
      const updates = JSON.parse(stored);
      const update = updates.find(u => u.id === updateId);
      
      if (update) {
        update.applied = true;
        update.accepted = accept;
        
        if (accept) {
          // Apply the new weights
          const currentSettings = getSettings(update.beverageType);
          currentSettings.ratingWeights = { ...update.newWeights };
          currentSettings.lastAdminUpdateCheck = new Date().toISOString();
          saveSettings(currentSettings, update.beverageType);
        }
        
        localStorage.setItem(ADMIN_UPDATES_KEY, JSON.stringify(updates));
        return true;
      }
    }
  } catch (error) {
    console.error('Error applying admin update:', error);
  }
  return false;
};

export const dismissAdminUpdate = (updateId) => {
  return applyAdminUpdate(updateId, false);
};