import React, { useEffect, useRef, useState } from 'react'
import { FiChrome, FiLoader } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getAuthProviders } from '../lib/nocodeBackend.js'

const unavailableProviders = Object.freeze({
  emailPassword: false,
  emailOtp: false,
  google: false
})

const CONFIGURATION_ERROR_CODES = new Set([
  'auth_configuration_missing',
  'rate_limit_configuration_missing'
])

const hasReliableProviderState = (enabled) => enabled &&
  ['emailPassword', 'emailOtp', 'google'].every((provider) => typeof enabled[provider] === 'boolean')

const withRequestId = (message, error) => error?.requestId
  ? `${message} Request ID: ${error.requestId}.`
  : message

const friendlyAuthError = (error) => {
  if (CONFIGURATION_ERROR_CODES.has(error?.code)) {
    return withRequestId(
      'Authentication is not configured for this deployment. Please contact support.',
      error
    )
  }
  if (error?.code === 'rate_limit_service_unavailable') {
    return withRequestId('Authentication is temporarily unavailable. Please try again later.', error)
  }
  return withRequestId(error?.message || 'Authentication could not be completed.', error)
}

const friendlyProviderError = (error) => {
  if (CONFIGURATION_ERROR_CODES.has(error?.code)) return friendlyAuthError(error)
  return withRequestId(
    'Sign-in options are temporarily unavailable. Please try again later or contact support.',
    error
  )
}

function AuthForm({ mode, onToggleMode }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    otp: ''
  })
  const [providers, setProviders] = useState(unavailableProviders)
  const [providerStatus, setProviderStatus] = useState('loading')
  const [activeMethod, setActiveMethod] = useState('emailPassword')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const errorRef = useRef(null)
  const { signUp, signIn, requestEmailOtp, verifyEmailOtp, signInWithGoogle } = useAuth()

  useEffect(() => {
    let active = true
    getAuthProviders()
      .then((enabled) => {
        if (!active) return
        if (!hasReliableProviderState(enabled)) throw new Error('Invalid authentication provider response.')
        setProviders(enabled)
        if (Object.values(enabled).some(Boolean)) {
          setActiveMethod(enabled.emailPassword ? 'emailPassword' : enabled.emailOtp ? 'emailOtp' : 'google')
          setProviderStatus('ready')
          return
        }
        setProviderStatus('unavailable')
        setError('No sign-in methods are currently enabled. Please contact support.')
      })
      .catch((providerError) => {
        if (!active) return
        setProviders(unavailableProviders)
        setActiveMethod('emailPassword')
        setProviderStatus('unavailable')
        setError(friendlyProviderError(providerError))
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (mode === 'signup' && activeMethod !== 'emailPassword') {
      setActiveMethod('emailPassword')
    }
  }, [activeMethod, mode])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const canUsePassword = providerStatus === 'ready' && providers.emailPassword && activeMethod === 'emailPassword'
  const canUseOtp = providerStatus === 'ready' && mode === 'signin' && providers.emailOtp && activeMethod === 'emailOtp'

  const selectMethod = (method) => {
    if (isSubmitting) return
    setError('')
    setNotice('')
    setOtpSent(false)
    setActiveMethod(method)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      if (canUseOtp) {
        const result = otpSent
          ? await verifyEmailOtp(form.email, form.otp)
          : await requestEmailOtp(form.email)
        if (result.error) throw result.error
        if (!otpSent) {
          setOtpSent(true)
          setNotice('Check your email for a one-time passcode.')
        }
        return
      }

      if (!canUsePassword) throw new Error('Email and password sign-in is not enabled.')
      if (mode === 'signup') {
        if (form.password.length < 8) throw new Error('Password must be at least 8 characters long.')
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.')
        const result = await signUp(form.email, form.password, { name: form.name })
        if (result.error) throw result.error
        setNotice('Account created. Check your email if verification is required.')
      } else {
        const result = await signIn(form.email, form.password)
        if (result.error) throw result.error
      }
    } catch (submissionError) {
      setError(friendlyAuthError(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <header className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {mode === 'signup' ? 'Create your Pourfolio' : 'Welcome back'}
        </h1>
        <p className="text-gray-600">
          {mode === 'signup' ? 'Start recording the beers you discover.' : 'Sign in to your beer portfolio.'}
        </p>
      </header>

      {error && (
        <div ref={errorRef} tabIndex={-1} className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 outline-none focus:ring-2 focus:ring-red-300" role="alert">
          {error}
        </div>
      )}
      {notice && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800" role="status" aria-live="polite" aria-atomic="true">{notice}</div>}
      {providerStatus === 'loading' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-gray-700" role="status" aria-live="polite" aria-atomic="true">
          Loading sign-in options…
        </div>
      )}

      {providerStatus === 'ready' && mode === 'signin' && providers.emailPassword && providers.emailOtp && (
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1" role="group" aria-label="Sign-in method">
          <button
            type="button"
            onClick={() => selectMethod('emailPassword')}
            disabled={isSubmitting}
            aria-pressed={activeMethod === 'emailPassword'}
            className={`rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 ${activeMethod === 'emailPassword' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600'}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => selectMethod('emailOtp')}
            disabled={isSubmitting}
            aria-pressed={activeMethod === 'emailOtp'}
            className={`rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 ${activeMethod === 'emailOtp' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600'}`}
          >
            Email code
          </button>
        </div>
      )}

      {(canUsePassword || canUseOtp) && (
        <form onSubmit={handleSubmit} aria-busy={isSubmitting ? 'true' : 'false'} className="space-y-5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input id="auth-name" required autoComplete="name" value={form.name} onChange={update('name')} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input id="auth-email" type="email" required autoComplete="email" value={form.email} onChange={update('email')} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </div>

          {canUsePassword && (
            <div>
              <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input id="auth-password" type="password" required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={form.password} onChange={update('password')} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
          )}

          {mode === 'signup' && canUsePassword && (
            <div>
              <label htmlFor="auth-confirm-password" className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
              <input id="auth-confirm-password" type="password" required minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
          )}

          {canUseOtp && otpSent && (
            <div>
              <label htmlFor="auth-otp" className="mb-1 block text-sm font-medium text-gray-700">One-time passcode</label>
              <input id="auth-otp" inputMode="numeric" required autoComplete="one-time-code" value={form.otp} onChange={update('otp')} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
          )}

          <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting ? 'true' : undefined} className="flex w-full items-center justify-center rounded-lg bg-amber-700 px-4 py-3 font-medium text-white hover:bg-amber-800 disabled:cursor-wait disabled:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
            {isSubmitting ? <><SafeIcon icon={FiLoader} className="mr-2 h-5 w-5 animate-spin" />Working…</> : canUseOtp && !otpSent ? 'Send one-time passcode' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      )}

      {providerStatus === 'ready' && mode === 'signin' && providers.google && (
        <button type="button" onClick={signInWithGoogle} disabled={isSubmitting} className="mt-5 flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
          <SafeIcon icon={FiChrome} className="mr-2 h-5 w-5" />
          Continue with Google
        </button>
      )}

      {providerStatus === 'ready' && providers.emailPassword && (
        <div className="mt-6 text-center text-sm text-gray-600">
          {mode === 'signup' ? 'Already have an account?' : 'New to Pourfolio?'}
          <button type="button" onClick={onToggleMode} disabled={isSubmitting} className="ml-2 font-medium text-amber-700 hover:underline disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
            {mode === 'signup' ? 'Sign in' : 'Create account'}
          </button>
        </div>
      )}
    </div>
  )
}

export default AuthForm