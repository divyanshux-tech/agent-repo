import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // Password strength logic
  const calculateStrength = (pwd) => {
    let score = 0;
    if (pwd.length > 7) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score; // 0-4
  };

  const strength = calculateStrength(password);
  
  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  if (strength === 2 || strength === 3) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-yellow-500';
  } else if (strength === 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-green-500';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // If email confirmation is off, this logs them in immediately.
        // If it's on, we should tell them to check their email.
        navigate('/chat');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/chat');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* Left Panel - Branding Graphic */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#F8F9FA] overflow-hidden flex-col justify-between p-12">
        {/* Subtle grid background */}
        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        
        {/* Abstract waveform / gradient graphic */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="w-[600px] h-[400px] bg-gradient-to-r from-transparent via-black to-transparent opacity-[0.03] blur-3xl rounded-full transform -rotate-12" />
        </div>

        <div className="z-10">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-black" viewBox="0 0 32 24" fill="currentColor"><path d="M0 12C0 5.37258 5.37258 0 12 0H20C26.6274 0 32 5.37258 32 12C32 18.6274 26.6274 24 20 24H12C5.37258 24 0 18.6274 0 12Z" /></svg>
            <span className="font-display font-semibold text-lg tracking-widest uppercase">NuraTravel</span>
          </div>
        </div>

        {/* Floating Glass Card (mimicking the UI) */}
        <div className="z-10 ml-12 mb-20 bg-white/60 backdrop-blur-xl border border-white p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] max-w-sm">
          <div className="flex items-center gap-4 border-b border-black/5 pb-4 mb-4 text-sm font-medium text-gray-500">
            <span className="text-black font-semibold flex items-center gap-2">
              <span>✈️</span> Trip Planner
            </span>
            <span className="flex items-center gap-2">
              <span>🏨</span> Stays
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Unlock the power of intelligent travel planning. Let our AI curate perfect itineraries, find the best flights, and book your dream stays seamlessly.
          </p>
          <div className="flex gap-3 mt-5">
            <span className="px-3 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 shadow-sm border border-gray-100">Mumbai</span>
            <span className="px-3 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 shadow-sm border border-gray-100">Delhi</span>
            <span className="px-3 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 shadow-sm border border-gray-100">Goa</span>
          </div>
        </div>

        <div className="z-10">
          <h1 className="text-[42px] font-serif tracking-tight leading-tight text-gray-900 max-w-md">
            One Click Away from your Dream Trip
          </h1>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
            {mode === 'signup' ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-gray-600 mb-8 font-light">
            {mode === 'signup' ? 'You are a few moments away from getting started!' : 'Log in to continue your travel planning.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="flex items-start gap-2 mb-6">
                <input type="checkbox" id="tips" className="mt-1 rounded border-gray-300 text-black focus:ring-black" />
                <label htmlFor="tips" className="text-sm font-light text-gray-600 cursor-pointer">
                  Send me tips, updates and offers
                </label>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-900">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-light text-sm"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-sm font-medium text-gray-900">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-light text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator (Signup only) */}
            {mode === 'signup' && password.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 flex gap-1 h-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-full ${i < strength ? strengthColor : 'bg-gray-100'} transition-colors duration-300`} 
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {strengthLabel}
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <p className="text-[12px] text-gray-500 leading-relaxed py-2 font-light">
                By signing up, you accept NuraTravel <a href="#" className="font-medium text-black">privacy policy</a> and <a href="#" className="font-medium text-black">terms of service</a>.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-gray-900 text-white font-medium py-3 rounded-xl transition-all shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signup' ? 'Sign up' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute w-full h-px bg-gray-200" />
            <span className="relative bg-white px-4 text-xs font-medium text-gray-400 lowercase">or</span>
          </div>

          <div className="mt-8 space-y-3">
            <button type="button" className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 21.53 7.7 24 12 24z" /><path fill="#FBBC05" d="M5.84 15.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V8.07H2.18C1.43 9.55 1 11.22 1 13s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.43 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" /></svg>
              Continue with Google
            </button>
            <button type="button" className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
              <svg className="w-4 h-4" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#00a4ef" d="M11 1h9v9h-9z"/><path fill="#7fba00" d="M1 11h9v9H1z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
              Continue with Microsoft
            </button>
          </div>

          <div className="mt-8 text-center">
            {mode === 'signup' ? (
              <p className="text-sm font-light text-gray-600">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-semibold text-black hover:underline">Log In</button>
              </p>
            ) : (
              <p className="text-sm font-light text-gray-600">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold text-black hover:underline">Sign Up</button>
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
