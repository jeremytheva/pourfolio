import { useState, useEffect, useCallback } from 'react'

const AUTH_API_BASE_URL = 'https://app.nocodebackend.com/api/user-auth'
const PROFILE_OVERRIDES_KEY = 'pourfolioProfileOverrides'

const getProfileOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY) || '{}')
  } catch (error) {
    console.error('Error reading profile overrides:', error)
    return {}
  }
}

const saveProfileOverride = (userId, updates) => {
  const overrides = getProfileOverrides()
  const nextProfile = {
    ...(overrides[userId] || {}),
    ...updates
  }

  localStorage.setItem(
    PROFILE_OVERRIDES_KEY,
    JSON.stringify({
      ...overrides,
      [userId]: nextProfile
    })
  )

  return nextProfile
}

const toAuthError = (error) => {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error(error?.message || 'Authentication request failed')
}

const authRequest = async (path, options = {}) => {
  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok || payload?.error) {
    throw toAuthError(payload?.error || payload || response.statusText)
  }

  return payload
}

const findNestedValue = (source, keys) => {
  if (!source || typeof source !== 'object') return null

  for (const key of keys) {
    if (source[key]) return source[key]
  }

  for (const value of Object.values(source)) {
    const nestedValue = findNestedValue(value, keys)
    if (nestedValue) return nestedValue
  }

  return null
}

const normalizeUser = (payload) => {
  const candidate = findNestedValue(payload, ['user', 'profile']) || payload?.data || payload

  if (!candidate || typeof candidate !== 'object') return null

  const metadata = candidate.user_metadata || candidate.metadata || candidate.customData || {}
  const id = candidate.id || candidate.user_id || candidate.userId || candidate._id || candidate.email
  const email = candidate.email || candidate.emailAddress || metadata.email

  if (!id && !email) return null

  return {
    ...candidate,
    id: id || email,
    email,
    user_metadata: metadata
  }
}

const buildProfile = (authUser) => {
  if (!authUser) return null

  const metadata = authUser.user_metadata || {}
  const overrides = getProfileOverrides()[authUser.id] || {}
  const name = authUser.name || authUser.fullName || metadata.name || authUser.email?.split('@')[0] || 'User'
  const type = authUser.type || metadata.type || 'General User'
  const description = authUser.description || metadata.description || ''

  return {
    id: authUser.id,
    email: authUser.email,
    name,
    type,
    description,
    ...metadata,
    ...authUser,
    ...overrides
  }
}

const normalizeAuthState = (payload) => {
  const authUser = normalizeUser(payload)
  const normalizedProfile = buildProfile(authUser)

  return {
    user: authUser,
    profile: normalizedProfile,
    data: {
      ...(payload || {}),
      user: authUser,
      profile: normalizedProfile
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const applyAuthState = useCallback((payload) => {
    const nextState = normalizeAuthState(payload)

    setUser(nextState.user)
    setProfile(nextState.profile)

    return nextState
  }, [])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const session = await authRequest('/get-session', { method: 'GET' })

        if (mounted) {
          applyAuthState(session)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [applyAuthState])

  const signUp = useCallback(async (email, password, userData = {}) => {
    try {
      const payload = await authRequest('/sign-up/email', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name: userData.name,
          type: userData.type || 'General User',
          metadata: {
            name: userData.name,
            type: userData.type || 'General User',
            description: userData.description || ''
          }
        })
      })

      const nextState = applyAuthState(payload)
      return { data: nextState.data, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [applyAuthState])

  const signIn = useCallback(async (email, password) => {
    try {
      const payload = await authRequest('/sign-in/email', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      const nextState = applyAuthState(payload)
      return { data: nextState.data, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [applyAuthState])

  const signOut = useCallback(async () => {
    try {
      await authRequest('/sign-out', { method: 'POST' })
      setUser(null)
      setProfile(null)
      return { error: null }
    } catch (error) {
      return { error: toAuthError(error) }
    }
  }, [])

  const updateProfile = useCallback(async (updates) => {
    if (!user) return { data: null, error: { message: 'No user logged in' } }

    try {
      const updatedProfile = {
        ...profile,
        ...saveProfileOverride(user.id, updates)
      }

      setProfile(updatedProfile)
      setUser((currentUser) => currentUser ? { ...currentUser, ...updates } : currentUser)

      return { data: updatedProfile, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [profile, user])

  return {
    user: user && profile ? { ...user, ...profile } : null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  }
}
