import { useState } from 'react';

// Input validation utilities

export const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  password: (password) => {
    return password && password.length >= 6
  },

  phone: (phone) => {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
    return phoneRegex.test(phone)
  },

  url: (url) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  rating: (rating) => {
    const num = Number(rating)
    return !isNaN(num) && num >= 1 && num <= 7
  },

  abv: (abv) => {
    const num = Number(abv)
    return !isNaN(num) && num >= 0 && num <= 80
  },

  price: (price) => {
    const num = Number(price)
    return !isNaN(num) && num >= 0
  },

  required: (value) => {
    return value !== null && value !== undefined && value.toString().trim().length > 0
  },

  minLength: (value, min) => {
    return value && value.toString().length >= min
  },

  maxLength: (value, max) => {
    return !value || value.toString().length <= max
  }
}

export function validateForm(data, rules) {
  const errors = {}
  
  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = data[field]
    const fieldErrors = []

    fieldRules.forEach(rule => {
      if (typeof rule === 'string') {
        if (!validators[rule](value)) {
          fieldErrors.push(`Invalid ${rule}`)
        }
      } else if (typeof rule === 'object') {
        const { validator, message, ...params } = rule
        if (!validators[validator](value, ...Object.values(params))) {
          fieldErrors.push(message || `Invalid ${validator}`)
        }
      }
    })

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Form validation hook
export function useFormValidation(initialData, validationRules) {
  const [data, setData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [touched, setTouchedState] = useState({})

  const validateField = (field, value) => {
    const rules = validationRules[field]
    if (!rules) return []

    const fieldErrors = []
    rules.forEach(rule => {
      if (typeof rule === 'string') {
        if (!validators[rule](value)) {
          fieldErrors.push(`Invalid ${rule}`)
        }
      } else if (typeof rule === 'object') {
        const { validator, message, ...params } = rule
        if (!validators[validator](value, ...Object.values(params))) {
          fieldErrors.push(message || `Invalid ${validator}`)
        }
      }
    })

    return fieldErrors
  }

  const setValue = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
    
    if (touched[field]) {
      const fieldErrors = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: fieldErrors }))
    }
  }

  const setTouched = (field) => {
    setTouchedState(prev => ({ ...prev, [field]: true }))
    const fieldErrors = validateField(field, data[field])
    setErrors(prev => ({ ...prev, [field]: fieldErrors }))
  }

  const validateAll = () => {
    const allErrors = {}
    const allTouched = {}

    Object.keys(validationRules).forEach(field => {
      allTouched[field] = true
      const fieldErrors = validateField(field, data[field])
      if (fieldErrors.length > 0) {
        allErrors[field] = fieldErrors
      }
    })

    setTouchedState(allTouched)
    setErrors(allErrors)

    return Object.keys(allErrors).length === 0
  }

  const reset = () => {
    setData(initialData)
    setErrors({})
    setTouchedState({})
  }

  return {
    data,
    errors,
    touched,
    setValue,
    setTouched,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0
  }
}