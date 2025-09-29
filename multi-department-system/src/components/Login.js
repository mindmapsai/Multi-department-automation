import React, { useState } from 'react';
import ApiService from '../services/api';

const Login = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let response;
      if (isSignup) {
        if (!formData.name || !formData.email || !formData.password || !formData.department) {
          throw new Error('All fields are required for signup');
        }
        response = await ApiService.signup(formData.name, formData.email, formData.password, formData.department);
      } else {
        if (!formData.email || !formData.password) {
          throw new Error('Email and password are required');
        }
        response = await ApiService.signin(formData.email, formData.password);
      }
      onLogin(response.user);
    } catch (error) {
      setError(error.message);
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-secondary-200">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-secondary-900">Multi-Department System</h2>
          <p className="mt-2 text-center text-sm text-secondary-600">{isSignup ? 'Create your account' : 'Sign in to your account'}</p>
        </div>
        {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>)}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary-700">Full Name</label>
                <input id="name" name="name" type="text" required={isSignup} className="mt-1 input-field" placeholder="Enter your full name" value={formData.name} onChange={handleInputChange} />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700">Email Address</label>
              <input id="email" name="email" type="email" required className="mt-1 input-field" placeholder="Enter your email address" value={formData.email} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700">Password</label>
              <input id="password" name="password" type="password" required className="mt-1 input-field" placeholder={isSignup ? 'Create a password (min 6 characters)' : 'Enter your password'} value={formData.password} onChange={handleInputChange} />
            </div>
            {isSignup && (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-secondary-700">Department</label>
                <select id="department" name="department" required={isSignup} className="mt-1 select-field" value={formData.department} onChange={handleInputChange}>
                  <option value="">Select your department</option>
                  <option value="HR">Human Resources (HR)</option>
                  <option value="Tech">Technology (Tech)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <button type="submit" disabled={loading} className={`w-full ${loading ? 'btn-secondary cursor-not-allowed' : 'btn-primary'}`}>
              <span className="mr-2">
                <svg className="h-5 w-5 text-white/80 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
              {loading ? (isSignup ? 'Creating Account...' : 'Signing In...') : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </div>
          <div className="text-center">
            <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); setFormData({ name: '', email: '', password: '', department: '' }); }} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
