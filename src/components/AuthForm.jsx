import React, { useState } from 'react';
    import { motion } from 'framer-motion';
    import * as FiIcons from 'react-icons/fi';
    import SafeIcon from '../common/SafeIcon';
    import { useAuth } from '../hooks/useAuth';

    const { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiLoader } = FiIcons;

    function AuthForm({ mode, onToggleMode }) {
      const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        type: 'General User',
      });
      const [showPassword, setShowPassword] = useState(false);
      const [showConfirmPassword, setShowConfirmPassword] = useState(false);
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState('');

      const { signUp, signIn } = useAuth();

      const userTypes = [
        {
          value: 'General User',
          label: 'General User',
          description: 'Beer enthusiast and casual drinker',
        },
        {
          value: 'Brewery Login',
          label: 'Brewery Owner',
          description: 'Brewery management account',
        },
        {
          value: 'Admin User',
          label: 'Administrator',
          description: 'System administrator (restricted)',
        },
      ];

      const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
          if (mode === 'signup') {
            if (formData.password !== formData.confirmPassword) {
              throw new Error('Passwords do not match');
            }
            if (formData.password.length < 6) {
              throw new Error('Password must be at least 6 characters long');
            }
            // For admin users, restrict email
            if (formData.type === 'Admin User' && formData.email !== 'admin@pourfolio.com') {
              throw new Error('Admin accounts require special approval');
            }
            const { data, error } = await signUp(formData.email, formData.password, {
              name: formData.name,
              type: formData.type,
            });
            if (error) throw error;
            if (data.user) {
              // Show success message
              alert('Account created successfully! Please check your email to verify your account.');
            }
          } else {
            const { data, error } = await signIn(formData.email, formData.password);
            if (error) throw error;
          }
        } catch (err) {
          console.error('Authentication error:', err);
          let errorMessage = 'An unexpected error occurred. Please try again.';
          if (err instanceof Error && err.message.includes('Failed to fetch')) {
            errorMessage =
              'Failed to connect to the authentication service. Please check your network connection and try again. This might be due to a CORS issue or a network blockage.';
          } else if (err instanceof Error && err.message) {
            errorMessage = err.message;
          }
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };

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
                {mode === 'signup'
                  ? 'Join the Pourfolio community'
                  : 'Sign in to your account'}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <SafeIcon
                        icon={FiUser}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                      />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {userTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {userTypes.find((t) => t.value === formData.type)?.description}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <SafeIcon
                    icon={FiMail}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <SafeIcon
                    icon={FiLock}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter your password"
                    minLength={mode === 'signup' ? 6 : 0}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={showPassword ? FiEyeOff : FiEye} className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <SafeIcon
                      icon={FiLock}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <SafeIcon
                        icon={showConfirmPassword ? FiEyeOff : FiEye}
                        className="w-5 h-5"
                      />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <SafeIcon icon={FiLoader} className="w-5 h-5 animate-spin" />
                    <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <button
                onClick={onToggleMode}
                className="text-amber-600 hover:text-amber-700 font-medium mt-1"
              >
                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
              </button>
            </div>

            {/* Admin Login Hint */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xs text-blue-600">
                <strong>Admin Login:</strong> admin@pourfolio.com / password
              </p>
            </div>
          </div>
        </motion.div>
      );
    }

    export default AuthForm;