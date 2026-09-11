import { DEFAULT_RATING_WEIGHTS, sanitiseRatingWeights } from '../lib/ratingFormulaV2.js'

const SETTINGS_KEY = 'pourfolioRatingSettings'
const LEGACY_SETTINGS_KEY = 'brewBudsSettings_beer'
const SETTINGS_VERSION = 2

export const getDefaultSettings = () => ({
  ratingWeights: { ...DEFAULT_RATING_WEIGHTS },
  settingsVersion: SETTINGS_VERSION
})

const normaliseStoredSettings = (settings) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  try {
    return {
      ratingWeights: sanitiseRatingWeights(settings.ratingWeights),
      settingsVersion: SETTINGS_VERSION
    }
  } catch {
    return null
  }
}

const readStoredSettings = (key) => {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return normaliseStoredSettings(JSON.parse(raw))
  } catch {
    return null
  }
}

export const getSettings = () => {
  try {
    const current = readStoredSettings(SETTINGS_KEY)
    if (current) return current

    const legacy = readStoredSettings(LEGACY_SETTINGS_KEY)
    if (legacy) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(legacy))
      localStorage.removeItem(LEGACY_SETTINGS_KEY)
      return legacy
    }
  } catch (error) {
    console.error('Error loading rating settings:', error)
  }
  return getDefaultSettings()
}

export const saveSettings = (settings) => {
  try {
    const next = normaliseStoredSettings(settings)
    if (!next) return false
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    localStorage.removeItem(LEGACY_SETTINGS_KEY)
    return true
  } catch (error) {
    console.error('Error saving rating settings:', error)
    return false
  }
}

export const resetSettings = () => {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    localStorage.removeItem(LEGACY_SETTINGS_KEY)
  } catch (error) {
    console.error('Error resetting rating settings:', error)
  }
  return getDefaultSettings()
}

export const validateWeights = (weights, expectedSum = 1) => {
  let normalised
  try {
    normalised = sanitiseRatingWeights(weights)
  } catch {
    return {
      isValid: false,
      sum: 0,
      maxSum: expectedSum,
      errors: { invalidRange: true, allZero: false, incorrectTotal: true, exceedsMax: false }
    }
  }

  const values = Object.values(normalised)
  const sum = values.reduce((total, weight) => total + weight, 0)
  const allZero = values.every((weight) => weight === 0)
  const incorrectTotal = Math.abs(sum - expectedSum) > 0.001
  return {
    isValid: !allZero && !incorrectTotal,
    sum,
    maxSum: expectedSum,
    errors: {
      invalidRange: false,
      allZero,
      incorrectTotal,
      exceedsMax: sum > expectedSum + 0.001
    }
  }
}
