import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authRequest, toAuthError, getGoogleSignInUrl } from '../lib/nocodeBackend'
import { getCurrentUserProfile, updateCurrentUserProfile } from '../services/profileService'
const PROFILE_OVERRIDES_KEY = 'pourfolioProfileOverrides'

const AuthContext = createContext(null)

const getProfileOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY) || '{}')
  } catch (error) {
    console.error('Error reading profile overrides:', error)
    return {}
  }
}

const saveProfileOverride = (userId, updates) => {
  try {
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
  } catch (error) {
    console.error('Error saving profile cache:', error)
    return updates
  }
}

const getStableIdentity = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return null

  return candidate.id || candidate.user_id || candidate.userId || candidate._id || candidate.email || null
}

const hasStableIdentity = (candidate) => Boolean(getStableIdentity(candidate))

const normalizeUser = (payload) => {
  if (!payload || typeof payload !== 'object') return null

  // Accepted NoCodeBackend auth response shapes:
  // - { user: { id|user_id|userId|_id|email, ... } }
  // - { profile: { id|user_id|userId|_id|email, ... } }
  // - { data: { user: { id|user_id|userId|_id|email, ... } } }
  // - { data: { profile: { id|user_id|userId|_id|email, ... } } }
  // - { data: { id|user_id|userId|_id|email, ... } }
  // - { id|user_id|userId|_id|email, ... }
  // Avoid scanning arbitrary nested objects so unrelated payload fields are not
  // mistaken for the authenticated user. Add a documented shape above before
  // accepting any additional backend response format.
  const candidates = [
    payload.user,
    payload.profile,
    payload.data?.user,
    payload.data?.profile,
    payload.data,
    payload
  ]

  const candidate = candidates.find(hasStableIdentity)

  if (!candidate || typeof candidate !== 'object') return null

  const metadata = candidate.user_metadata || candidate.metadata || candidate.customData || {}
  const id = getStableIdentity(candidate)
  const email = candidate.email || candidate.emailAddress || metadata.email

  if (!id) return null

  return {
    ...candidate,
    id,
    email,
    user_metadata: metadata
  }
}

const buildProfile = (authUser, persistedProfile = null) => {
  if (!authUser) return null

  const metadata = authUser.user_metadata || {}
  const overrides = persistedProfile ? {} : getProfileOverrides()[authUser.id] || {}
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
    ...(persistedProfile || {}),
    ...overrides
  }
}

const normalizeAuthState = (payload, persistedProfile = null) => {
  const authUser = normalizeUser(payload)
  const normalizedProfile = buildProfile(authUser, persistedProfile)

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const applyAuthState = useCallback((payload, persistedProfile = null) => {
    const nextState = normalizeAuthState(payload, persistedProfile)

    setUser(nextState.user)
    setProfile(nextState.profile)

    return nextState
  }, [])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const session = await authRequest('/get-session', { method: 'GET' })

        const authUser = normalizeUser(session)
        const { data: persistedProfile, error } = authUser
          ? await getCurrentUserProfile(authUser.id)
          : { data: null, error: null }

        if (error) console.error('Profile initialization error:', error)

        if (mounted) {
          applyAuthState(session, persistedProfile)
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

      const authUser = normalizeUser(payload)
      const { data: persistedProfile } = authUser
        ? await getCurrentUserProfile(authUser.id)
        : { data: null }
      const nextState = applyAuthState(payload, persistedProfile)
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

      const authUser = normalizeUser(payload)
      const { data: persistedProfile } = authUser
        ? await getCurrentUserProfile(authUser.id)
        : { data: null }
      const nextState = applyAuthState(payload, persistedProfile)
      return { data: nextState.data, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [applyAuthState])

  const requestEmailOtp = useCallback(async (email) => {
    try {
      const payload = await authRequest('/sign-in/otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      })

      return { data: payload, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [])

  const verifyEmailOtp = useCallback(async (email, otp) => {
    try {
      const payload = await authRequest('/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      })

      const authUser = normalizeUser(payload)
      const { data: persistedProfile } = authUser
        ? await getCurrentUserProfile(authUser.id)
        : { data: null }
      const nextState = applyAuthState(payload, persistedProfile)
      return { data: nextState.data, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [applyAuthState])

  const signInWithGoogle = useCallback(() => {
    window.location.assign(getGoogleSignInUrl())
  }, [])

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
      const { data, error } = await updateCurrentUserProfile(user.id, updates, profile)

      if (error) return { data: null, error: toAuthError(error) }

      const updatedProfile = {
        ...profile,
        ...(data || updates)
      }

      saveProfileOverride(user.id, updatedProfile)
      setProfile(updatedProfile)
      setUser((currentUser) => currentUser ? { ...currentUser, ...updatedProfile } : currentUser)

      return { data: updatedProfile, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [profile, user])

  const value = useMemo(() => ({
    user: user && profile ? { ...user, ...profile } : null,
    profile,
    loading,
    signUp,
    signIn,
    requestEmailOtp,
    verifyEmailOtp,
    signInWithGoogle,
    signOut,
    updateProfile
  }), [loading, profile, requestEmailOtp, signIn, signInWithGoogle, signOut, signUp, updateProfile, user, verifyEmailOtp])

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
