import React, { useState } from 'react';
import axios from 'axios';
import { Loader, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import AuthLoadingOverlay from './AuthLoadingOverlay';
import { withAuthDelay } from '../utils/authDelay';

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ fullname: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await withAuthDelay(() => axios.post('/api/auth/google', {
        credential: credentialResponse.credential,
      }));
      toast.success("Google login successful!");
      onAuthSuccess(res.data.user);
    } catch (err) {
      toast.error('Google login failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { fullname: formData.fullname, email: formData.email, password: formData.password };
      
      const res = await withAuthDelay(() => axios.post(endpoint, payload));
      toast.success(isLogin ? "Welcome back!" : "Account created successfully!");
      onAuthSuccess(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#d4f0f0] via-[#e0f6f8] to-[#cbf0f8]">
      <AuthLoadingOverlay isVisible={loading} />
      
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-200/40 blur-3xl mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-200/40 blur-3xl mix-blend-multiply"></div>

      <div className="bg-[#ffffff]/70 backdrop-blur-xl border border-cyan-300/60 shadow-xl shadow-cyan-950/5 rounded-3xl p-8 max-w-md w-full relative z-10 transition-all duration-300">
        
        <div className="text-center mb-10">
          <div className="flex justify-center items-center mb-4 relative">
            <div className="absolute w-12 h-12 bg-cyan-400 rounded-xl blur-xl opacity-40 animate-pulse" />
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg relative z-10 shadow-cyan-500/20">
              CY
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#0e3b43] mb-2 tracking-tight">CYPHR</h1>
          <p className="text-teal-800/70 text-sm">Your intelligent knowledge workspace</p>
        </div>

        <div className="flex bg-[#a5dfec]/80 p-1 rounded-xl mb-8 border border-cyan-300/50">
          <button
            type="button"
            onClick={() => { setIsLogin(true); }}
            className={`flex-1 py-2 text-sm rounded-lg transition-all duration-300 ${isLogin ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold shadow-md shadow-cyan-500/20' : 'bg-transparent text-teal-900/70 hover:text-teal-950'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); }}
            className={`flex-1 py-2 text-sm rounded-lg transition-all duration-300 ${!isLogin ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold shadow-md shadow-cyan-500/20' : 'bg-transparent text-teal-900/70 hover:text-teal-950'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-teal-800/70 group-focus-within:text-cyan-600 transition-colors" />
              <input
                type="text"
                name="fullname"
                required
                value={formData.fullname}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-cyan-300 bg-[#ffffff]/80 text-[#0e3b43] placeholder-teal-800/40 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/30 transition-all"
                placeholder="Full Name"
              />
            </div>
          )}
          
          <div className="relative group">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-teal-800/70 group-focus-within:text-cyan-600 transition-colors" />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-cyan-300 bg-[#ffffff]/80 text-[#0e3b43] placeholder-teal-800/40 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/30 transition-all"
              placeholder="Email Address"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-teal-800/70 group-focus-within:text-cyan-600 transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-12 pr-12 py-3 rounded-xl border border-cyan-300 bg-[#ffffff]/80 text-[#0e3b43] placeholder-teal-800/40 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/30 transition-all"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-teal-800/70 hover:text-teal-950 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {!isLogin && (
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-teal-800/70 group-focus-within:text-cyan-600 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-12 pr-12 py-3 rounded-xl border border-cyan-300 bg-[#ffffff]/80 text-[#0e3b43] placeholder-teal-800/40 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/30 transition-all"
                placeholder="Confirm Password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center active:scale-[0.98] mt-2"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center">
          <div className="border-t border-cyan-300/40 flex-grow"></div>
          <span className="px-4 text-xs font-semibold text-teal-800/50 uppercase tracking-widest">Or continue with</span>
          <div className="border-t border-cyan-300/40 flex-grow"></div>
        </div>

        <div className="mt-6 flex justify-center opacity-90 hover:opacity-100 transition-opacity">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google login failed')}
            theme="outline"
            size="large"
            shape="rectangular"
            text={isLogin ? 'signin_with' : 'signup_with'}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
