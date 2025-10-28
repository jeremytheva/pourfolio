import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { supabase, isSupabaseConfigured, demoCredentials } from '../utils/supabaseClient';
import { buildUserProfile, buildDemoUser } from '../utils/userProfile';

const { FiMail, FiLock, FiUserPlus, FiLogIn, FiAlertTriangle } = FiIcons;

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please provide both email and password.');
        return;
      }

      if (!isSupabaseConfigured) {
        if (email === demoCredentials.email && password === demoCredentials.password) {
          const demoUser = buildDemoUser();
          onLogin(demoUser);
          navigate('/home');
        } else {
          setError('Supabase is not configured. Use the provided demo credentials.');
        }
        return;
      }

      if (authMode === 'sign-up') {
        if (!fullName.trim()) {
          setError('Please add your full name so we can personalize your profile.');
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setInfo('Check your inbox to confirm your account before signing in.');
        setAuthMode('sign-in');
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const appUser = buildUserProfile(data?.user);
      if (!appUser) {
        setError('We were unable to load your profile. Please try again.');
        return;
      }

      onLogin(appUser);
      navigate('/home');
    } catch (authError) {
      console.error('Authentication error', authError);
      setError('Something went wrong during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Pourfolio</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              {authMode === 'sign-in' ? 'Welcome Back' : 'Create your account'}
            </h2>
            <p className="text-gray-500 text-sm">
              {authMode === 'sign-in'
                ? 'Sign in to access your personalized beverage vault.'
                : 'Join Pourfolio to track, discover, and share beverages you love.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'sign-up' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="fullName">
                  Full name
                </label>
                <div className="relative">
                  <SafeIcon icon={FiUserPlus} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Jane Brewster"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <SafeIcon icon={FiMail} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <SafeIcon icon={FiLock} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
                {info}
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3">
                Supabase credentials are not set. Use <strong>{demoCredentials.email}</strong> with password{' '}
                <strong>{demoCredentials.password}</strong> for demo access.
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-60"
              disabled={loading}
            >
              <SafeIcon icon={authMode === 'sign-in' ? FiLogIn : FiUserPlus} className="w-5 h-5" />
              <span>{loading ? 'Processing...' : authMode === 'sign-in' ? 'Sign in' : 'Create account'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {authMode === 'sign-in' ? (
              <button
                className="text-amber-600 font-semibold hover:underline"
                onClick={() => {
                  resetMessages();
                  setAuthMode('sign-up');
                }}
              >
                Need an account? Create one instead.
              </button>
            ) : (
              <button
                className="text-amber-600 font-semibold hover:underline"
                onClick={() => {
                  resetMessages();
                  setAuthMode('sign-in');
                }}
              >
                Already registered? Sign in here.
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;
