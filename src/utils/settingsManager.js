import { beverageTypes } from './beverageTypes'
import { DEFAULT_RATING_WEIGHTS, sanitiseRatingWeights } from '../lib/ratingFormulaV1.js'

const SETTINGS_KEY = 'brewBudsSettings'
const ADMIN_UPDATES_KEY = 'brewBudsAdminUpdates'
const SETTINGS_VERSION = 2

const beerDefaults = () => ({
  ratingWeights: { ...DEFAULT_RATING_WEIGHTS },
  hideBonus: false,
  maxWeightSum: 1,
  beverageType: 'beer',
  settingsVersion: SETTINGS_VERSION,
  lastAdminUpdateCheck: null
})

export const getDefaultSettings = (beverageType = 'beer') => {
  if (beverageType === 'beer') return beerDefaults()
  const beverage = beverageTypes[beverageType] || beverageTypes.beer
  return {
    ratingWeights: { ...beverage.defaultWeights },
    hideBonus: false,
    maxWeightSum: beverage.maxWeightSum,
    beverageType,
    settingsVersion: SETTINGS_VERSION,
    lastAdminUpdateCheck: null
  }
}

const isCurrentBeerSettings = (settings) => {
  if (settings?.settingsVersion !== SETTINGS_VERSION) return false
  try {
    sanitiseRatingWeights(settings.ratingWeights)
    return true
  } catch {
    return false
  }
}

export const getSettings = (beverageType = 'beer') => {
  const defaults = getDefaultSettings(beverageType)
  try {
    const stored = localStorage.getItem(`${SETTINGS_KEY}_${beverageType}`)
    if (!stored) return defaults
    const settings = JSON.parse(stored)
    if (beverageType === 'beer' && !isCurrentBeerSettings(settings)) return defaults
    return {
      ...defaults,
      ...settings,
      ratingWeights: { ...defaults.ratingWeights, ...(settings.ratingWeights || {}) }
    }
  } catch (error) {
    console.error('Error loading settings:', error)
    return defaults
  }
}

export const saveSettings = (settings, beverageType = 'beer') => {
  try {
    const next = { ...settings, settingsVersion: SETTINGS_VERSION }
    if (beverageType === 'beer') next.ratingWeights = sanitiseRatingWeights(next.ratingWeights)
    localStorage.setItem(`${SETTINGS_KEY}_${beverageType}`, JSON.stringify(next))
    return true
  } catch (error) {
    console.error('Error saving settings:', error)
    return false
  }
}

export const resetSettings = (beverageType = 'beer') => {
  try {
    localStorage.removeItem(`${SETTINGS_KEY}_${beverageType}`)
    return getDefaultSettings(beverageType)
  } catch (error) {
    console.error('Error resetting settings:', error)
    return getDefaultSettings(beverageType)
  }
}

export const validateWeights = (weights, expectedSum = 1) => {
  const values = Object.values(weights || {}).map(Number)
  const sum = values.reduce((total, weight) => total + weight, 0)
  const invalidRange = values.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 1)
  const allZero = values.length === 0 || values.every((weight) => weight === 0)
  const incorrectTotal = Math.abs(sum - expectedSum) > 0.001
  const isValid = !invalidRange && !allZero && !incorrectTotal

  return {
    isValid,
    sum,
    maxSum: expectedSum,
    errors: { invalidRange, allZero, incorrectTotal, exceedsMax: sum > expectedSum + 0.001 }
  }
}

export const getAllBeverageSettings = () => {
  const allSettings = {}
  Object.keys(beverageTypes).forEach((type) => { allSettings[type] = getSettings(type) })
  return allSettings
}

export const createAdminUpdate = (beverageType, newWeights, message) => {
  const update = { id: Date.now(), beverageType, newWeights, message, timestamp: new Date().toISOString(), applied: false }
  try {
    const existing = localStorage.getItem(ADMIN_UPDATES_KEY)
    const updates = existing ? JSON.parse(existing) : []
    updates.push(update)
    localStorage.setItem(ADMIN_UPDATES_KEY, JSON.stringify(updates))
    return true
  } catch (error) {
    console.error('Error creating admin update:', error)
    return false
  }
}

export const getPendingAdminUpdates = () => {
  try {
    const stored = localStorage.getItem(ADMIN_UPDATES_KEY)
    if (stored) return JSON.parse(stored).filter((update) => !update.applied)
  } catch (error) {
    console.error('Error getting admin updates:', error)
  }
  return []
}

export const applyAdminUpdate = (updateId, accept = true) => {
  try {
    const stored = localStorage.getItem(ADMIN_UPDATES_KEY)
    if (!stored) return false
    const updates = JSON.parse(stored)
    const update = updates.find((item) => item.id === updateId)
    if (!update) return false
    update.applied = true
    update.accepted = accept
    if (accept) {
      const currentSettings = getSettings(update.beverageType)
      currentSettings.ratingWeights = { ...update.newWeights }
      currentSettings.lastAdminUpdateCheck = new Date().toISOString()
      if (!saveSettings(currentSettings, update.beverageType)) return false
    }
    localStorage.setItem(ADMIN_UPDATES_KEY, JSON.stringify(updates))
    return true
  } catch (error) {
    console.error('Error applying admin update:', error)
    return false
  }
}

export const dismissAdminUpdate = (updateId) => applyAdminUpdate(updateId, false)
