import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, authRequest, getGoogleSignInUrl, toAuthError } from '../lib/nocodeBackend.js'
import { getCurrentUserProfile, updateCurrentUserProfile } from '../services/profileService.js'

const AuthContext = createContext(null)

export const AUTH_ERROR_CODES = Object.freeze({
  SESSION_MISSING: 'auth_session_missing'
})

const getStableIdentity = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return null
  return candidate.id || candidate.user_id || candidate.userId || candidate._id || null
}

export const buildSignUpPayload = (email, password, userData = {}) => ({
  name: String(userData.name || '').trim(),
  email,
  password
})

export const normalizeAuthUser = (payload) => {
  if (!payload || typeof payload !== 'object') return null

  const candidates = [
    payload.user,
    payload.data?.user,
    payload.session?.user,
    payload.data?.session?.user,
    payload.data,
    payload
  ]
  const candidate = candidates.find((item) => getStableIdentity(item))
  if (!candidate) return null

  return {
    id: String(getStableIdentity(candidate)),
    email: candidate.email || candidate.emailAddress || null,
    name: candidate.name || candidate.user_metadata?.name || null
  }
}

export const resolveAuthenticatedSession = async (payload, {
  applySession,
  getSession = () => authRequest('/get-session', { method: 'GET' })
}) => {
  const directSession = await applySession(payload)
  if (directSession) return directSession

  const refreshedPayload = await getSession()
  const refreshedSession = await applySession(refreshedPayload)
  if (refreshedSession) return refreshedSession

  throw new ApiError(
    'Authentication completed, but no authenticated session was established. Please try again.',
    { code: AUTH_ERROR_CODES.SESSION_MISSING }
  )
}

const buildProfile = (authUser, profilePayload = null) => {
  if (!authUser) return null
  const persisted = profilePayload?.profile || profilePayload || {}
  return {
    id: authUser.id,
    email: authUser.email,
    name: persisted.name || authUser.name || authUser.email?.split('@')[0] || 'User',
    description: persisted.description || '',
    avatar_url: persisted.avatar_url || null
  }
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(async (payload) => {
    const nextAuthUser = normalizeAuthUser(payload)
    if (!nextAuthUser) {
      setAuthUser(null)
      setProfile(null)
      return null
    }

    let profilePayload = null
    try {
      profilePayload = await getCurrentUserProfile()
    } catch {
      // A newly created account may not have a profile row yet. The session
      // remains authoritative and the first profile save will create it.
    }

    const nextProfile = buildProfile(nextAuthUser, profilePayload)
    setAuthUser(nextAuthUser)
    setProfile(nextProfile)
    return { user: nextAuthUser, profile: nextProfile }
  }, [])

  const resolveSession = useCallback((payload) => resolveAuthenticatedSession(payload, {
    applySession
  }), [applySession])

  useEffect(() => {
    let mounted = true

    const initialise = async () => {
      try {
        const session = await authRequest('/get-session', { method: 'GET' })
        if (mounted) await applySession(session)
      } catch {
        if (mounted) {
          setAuthUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initialise()
    return () => {
      mounted = false
    }
  }, [applySession])

  const signUp = useCallback(async (email, password, userData = {}) => {
    try {
      const payload = await authRequest('/sign-up/email', {
        method: 'POST',
        body: buildSignUpPayload(email, password, userData)
      })
      const state = await resolveSession(payload)
      if (state && userData.name) {
        try {
          const saved = await updateCurrentUserProfile({ name: userData.name })
          setProfile(buildProfile(state.user, saved))
        } catch {
          // The account is still valid if profile creation is temporarily
          // unavailable; the profile page exposes a retryable save.
        }
      }
      return { data: state, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [resolveSession])

  const signIn = useCallback(async (email, password) => {
    try {
      const payload = await authRequest('/sign-in/email', {
        method: 'POST',
        body: { email, password }
      })
      return { data: await resolveSession(payload), error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [resolveSession])

  const requestEmailOtp = useCallback(async (email) => {
    try {
      return {
        data: await authRequest('/sign-in/otp', {
          method: 'POST',
          body: { email }
        }),
        error: null
      }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [])

  const verifyEmailOtp = useCallback(async (email, otp) => {
    try {
      const payload = await authRequest('/verify-otp', {
        method: 'POST',
        body: { email, otp }
      })
      return { data: await resolveSession(payload), error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [resolveSession])

  const signInWithGoogle = useCallback(() => {
    window.location.assign(getGoogleSignInUrl())
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authRequest('/sign-out', { method: 'POST' })
      setAuthUser(null)
      setProfile(null)
      return { error: null }
    } catch (signOutError) {
      return { error: toAuthError(signOutError) }
    }
  }, [])

  const updateProfile = useCallback(async (updates) => {
    if (!authUser) return { data: null, error: new Error('No user is signed in.') }

    try {
      const payload = await updateCurrentUserProfile(updates)
      const nextProfile = buildProfile(authUser, payload)
      setProfile(nextProfile)
      return { data: nextProfile, error: null }
    } catch (error) {
      return { data: null, error: toAuthError(error) }
    }
  }, [authUser])

  const user = authUser ? { ...authUser, ...profile } : null
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signUp,
    signIn,
    requestEmailOtp,
    verifyEmailOtp,
    signInWithGoogle,
    signOut,
    updateProfile
  }), [
    loading,
    profile,
    requestEmailOtp,
    signIn,
    signInWithGoogle,
    signOut,
    signUp,
    updateProfile,
    user,
    verifyEmailOtp
  ])

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
