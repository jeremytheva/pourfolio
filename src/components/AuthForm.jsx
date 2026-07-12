import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import { useAuth } from '../hooks/useAuth'
import { getAuthProviders } from '../lib/nocodeBackendAuth'

const { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiLoader, FiKey, FiChrome } = FiIcons

const initialProviders = {
  emailPassword: false,
  emailOtp: false,
  google: false
}

function AuthForm({ mode, onToggleMode }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    type: 'General User',
    otp: ''
  })
  const [providers, setProviders] = useState(initialProviders)
  const [providersLoading, setProvidersLoading] = useState(true)
  const [activeMethod, setActiveMethod] = useState('emailPassword')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const { signUp, signIn, requestEmailOtp, verifyEmailOtp, signInWithGoogle } = useAuth()

  const userTypes = [
    {
      value: 'General User',
      label: 'General User',
      description: 'Beer enthusiast and casual drinker'
    },
    {
      value: 'Brewery Login',
      label: 'Brewery Owner',
      description: 'Brewery management account'
    },
    {
      value: 'Admin User',
      label: 'Administrator',
      description: 'System administrator (restricted)'
    }
  ]

  useEffect(() => {
    let mounted = true

    const loadProviders = async () => {
      try {
        const enabledProviders = await getAuthProviders()
        if (!mounted) return

        setProviders(enabledProviders)
        setActiveMethod(enabledProviders.emailPassword ? 'emailPassword' : enabledProviders.emailOtp ? 'emailOtp' : 'google')
      } catch (providerError) {
        console.error('Provider loading error:', providerError)
        if (mounted) setError('Unable to load enabled sign-in methods. Please try again later.')
      } finally {
        if (mounted) setProvidersLoading(false)
      }
    }

    loadProviders()

    return () => {
      mounted = false
    }
  }, [])

  const enabledMethodCount = Object.values(providers).filter(Boolean).length
  const canUsePassword = providers.emailPassword && activeMethod === 'emailPassword'
  const canUseOtp = providers.emailOtp && activeMethod === 'emailOtp' && mode === 'signin'
  const showMethodTabs = mode === 'signin' && enabledMethodCount > 1 && (providers.emailPassword || providers.emailOtp)

  const handleAuthError = (err) => {
    console.error('Authentication error:', err)
    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      setError('Failed to connect to the authentication service. Please check your network connection and try again.')
      return
    }
    setError(err instanceof Error && err.message ? err.message : 'An unexpected error occurred. Please try again.')
  }

  const validateSignup = () => {
    if (formData.password !== formData.confirmPassword) throw new Error('Passwords do not match')
    if (formData.password.length < 6) throw new Error('Password must be at least 6 characters long')
    if (formData.type === 'Admin User' && formData.email !== 'admin@pourfolio.com') {
      throw new Error('Admin accounts require special approval')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setIsLoading(true)

    try {
      if (canUseOtp) {
        const { error: otpError } = otpSent
          ? await verifyEmailOtp(formData.email, formData.otp)
          : await requestEmailOtp(formData.email)

        if (otpError) throw otpError
        if (!otpSent) {
          setOtpSent(true)
          setNotice('Check your email for a one-time passcode, then enter it below.')
        }
        return
      }

      if (!providers.emailPassword) throw new Error('Email and password authentication is not enabled.')

      if (mode === 'signup') {
        validateSignup()
        const { data, error: signUpError } = await signUp(formData.email, formData.password, {
          name: formData.name,
          type: formData.type
        })
        if (signUpError) throw signUpError
        if (data.user) setNotice('Account created successfully! Please check your email to verify your account.')
      } else {
        const { error: signInError } = await signIn(formData.email, formData.password)
        if (signInError) throw signInError
      }
    } catch (err) {
      handleAuthError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    setError('')
    signInWithGoogle()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600">
            {mode === 'signup' ? 'Join the Pourfolio community' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6"
          >
            {notice}
          </motion.div>
        )}

        {providersLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-600">
            <SafeIcon icon={FiLoader} className="w-5 h-5 animate-spin mr-2" />
            Loading sign-in options...
          </div>
        ) : (
          <>
            {showMethodTabs && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-amber-50 rounded-lg mb-6">
                {providers.emailPassword && (
                  <button
                    type="button"
                    onClick={() => setActiveMethod('emailPassword')}
                    className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeMethod === 'emailPassword' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-amber-700'}`}
                  >
                    Password
                  </button>
                )}
                {providers.emailOtp && (
                  <button
                    type="button"
                    onClick={() => setActiveMethod('emailOtp')}
                    className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeMethod === 'emailOtp' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-amber-700'}`}
                  >
                    Email OTP
                  </button>
                )}
              </div>
            )}

            {(canUsePassword || canUseOtp) && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === 'signup' && canUsePassword && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <div className="relative">
                        <SafeIcon icon={FiUser} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input type="text" required value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Enter your full name" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                      <select value={formData.type} onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                        {userTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">{userTypes.find((t) => t.value === formData.type)?.description}</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <SafeIcon icon={FiMail} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input type="email" required value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Enter your email" />
                  </div>
                </div>

                {canUsePassword && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <SafeIcon icon={FiLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))} className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Enter your password" minLength={mode === 'signup' ? 6 : 0} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <SafeIcon icon={showPassword ? FiEyeOff : FiEye} className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {mode === 'signup' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                        <div className="relative">
                          <SafeIcon icon={FiLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))} className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Confirm your password" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <SafeIcon icon={showConfirmPassword ? FiEyeOff : FiEye} className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {canUseOtp && otpSent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">One-Time Passcode</label>
                    <div className="relative">
                      <SafeIcon icon={FiKey} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input type="text" required value={formData.otp} onChange={(e) => setFormData((prev) => ({ ...prev, otp: e.target.value }))} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Enter the code from your email" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  {isLoading ? <><SafeIcon icon={FiLoader} className="w-5 h-5 animate-spin" /><span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span></> : <span>{canUseOtp && !otpSent ? 'Send One-Time Passcode' : mode === 'signup' ? 'Create Account' : 'Sign In'}</span>}
                </button>
              </form>
            )}

            {providers.google && mode === 'signin' && (
              <>
                {(canUsePassword || canUseOtp) && <div className="my-6 flex items-center"><div className="flex-1 border-t border-gray-200" /><span className="px-3 text-sm text-gray-500">or</span><div className="flex-1 border-t border-gray-200" /></div>}
                <button type="button" onClick={handleGoogleSignIn} className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  <SafeIcon icon={FiChrome} className="w-5 h-5 text-amber-600" />
                  <span>Continue with Google</span>
                </button>
              </>
            )}

            {!providers.emailPassword && !providers.emailOtp && !providers.google && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                No sign-in methods are currently enabled for Pourfolio.
              </div>
            )}
          </>
        )}

        {providers.emailPassword && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">{mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}</p>
            <button onClick={onToggleMode} className="text-amber-600 hover:text-amber-700 font-medium mt-1">
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        )}

        {providers.emailPassword && (
          <div className="mt-6 p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-xs text-blue-600"><strong>Admin Login:</strong> admin@pourfolio.com / password</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AuthForm
