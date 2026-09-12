import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Compass, Sparkles } from 'lucide-react';
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
    strengthColor = 'bg-[#10B981]';
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

  const handleFreeTier = () => {
    // Treat as guest
    navigate('/chat');
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-[#FF4D79]/20">
      
      {/* Left Panel - Branding Graphic */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#F8F9FA] overflow-hidden flex-col justify-between p-12 border-r border-black/5">
        {/* Subtle grid background */}
        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {/* Abstract waveform / gradient graphic */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="w-[800px] h-[600px] bg-gradient-to-tr from-[#FF4D79]/10 via-[#A23CFD]/5 to-transparent blur-3xl rounded-full transform -rotate-12 pointer-events-none" />
        </div>

        <div className="z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4D79] to-[#FF8A65] flex items-center justify-center shadow-lg">
              <Compass className="text-white w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-wide text-gray-900">NuraTravel</span>
          </div>
        </div>

        {/* Replaced the ugly floating card with a simple clean layout element if needed, or left it out completely as requested. */}
        <div className="z-10" />

        <div className="z-10 pb-8">
          <h1 className="text-[54px] font-display font-semibold tracking-tight leading-[1.1] text-gray-900 max-w-lg mb-6">
            One click away <br/>from your <span className="text-[#FF4D79]">dream trip.</span>
          </h1>
          <p className="text-lg text-gray-600 font-light max-w-md">
            Experience the future of travel planning with AI-powered itineraries, voice assistance, and budget optimization.
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-20 relative">
        <div className="flex-1 flex flex-col justify-center w-full max-w-[420px] mx-auto">
          
          <div className="mb-10">
            <h2 className="text-[32px] font-display font-semibold tracking-tight text-[#111] mb-2">
              {mode === 'signup' ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-[15px] text-gray-500 font-light">
              {mode === 'signup' ? 'You are a few moments away from getting started.' : 'Log in to continue your travel planning.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold tracking-wide text-gray-700 uppercase">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D79]/20 focus:border-[#FF4D79] transition-all font-light text-[15px] text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2 relative">
              <label className="text-[13px] font-semibold tracking-wide text-gray-700 uppercase">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D79]/20 focus:border-[#FF4D79] transition-all font-light text-[15px] text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator (Signup only) */}
            {mode === 'signup' && password.length > 0 && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <div className="flex-1 flex gap-1 h-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-full ${i < strength ? strengthColor : 'bg-gray-100'} transition-colors duration-300`} 
                    />
                  ))}
                </div>
                <span className={`text-[11px] uppercase tracking-wider font-bold ${strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-500' : 'text-[#10B981]'}`}>
                  {strengthLabel}
                </span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50/50 text-red-600 text-[14px] rounded-xl border border-red-100 flex items-start gap-3">
                <span className="mt-0.5 text-red-500">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {mode === 'signup' && (
              <div className="flex items-start gap-3 pt-2">
                <input type="checkbox" id="tips" className="mt-1 rounded border-gray-300 text-[#FF4D79] focus:ring-[#FF4D79]" />
                <label htmlFor="tips" className="text-[13px] font-light text-gray-600 cursor-pointer leading-relaxed">
                  Send me tips, updates and offers. By signing up, you accept our <a href="#" className="font-medium text-black hover:underline">Privacy Policy</a> and <a href="#" className="font-medium text-black hover:underline">Terms</a>.
                </label>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#111] hover:bg-black text-white font-medium text-[15px] py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === 'signup' ? 'Create account' : 'Log in'}
              </button>
              
              <button
                type="button"
                onClick={handleFreeTier}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium text-[15px] py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                <Sparkles size={16} className="text-[#FF4D79] group-hover:scale-110 transition-transform" />
                Try Free Tier (2 Messages)
              </button>
            </div>
          </form>

          {/* Social Logins - Greyed out as they require backend setup for now */}
          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute w-full h-px bg-gray-100" />
            <span className="relative bg-white px-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">Or continue with</span>
          </div>

          <div className="mt-8 flex gap-3">
            <button type="button" disabled className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl bg-gray-50/50 opacity-50 cursor-not-allowed text-[14px] font-medium text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 21.53 7.7 24 12 24z" /><path fill="#FBBC05" d="M5.84 15.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V8.07H2.18C1.43 9.55 1 11.22 1 13s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.43 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" /></svg>
              Google
            </button>
            <button type="button" disabled className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl bg-gray-50/50 opacity-50 cursor-not-allowed text-[14px] font-medium text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#00a4ef" d="M11 1h9v9h-9z"/><path fill="#7fba00" d="M1 11h9v9H1z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
              Microsoft
            </button>
          </div>

          <div className="mt-10 text-center">
            {mode === 'signup' ? (
              <p className="text-[14px] font-light text-gray-600">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-medium text-black hover:text-[#FF4D79] transition-colors">Log In</button>
              </p>
            ) : (
              <p className="text-[14px] font-light text-gray-600">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-medium text-black hover:text-[#FF4D79] transition-colors">Sign Up</button>
              </p>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
