import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Compass, Sparkles, MapPin, Plane, Building2, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  
  const [mode, setMode] = useState(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: name,
            }
          }
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
      
      {/* Left Panel - Branding Graphic & Beautiful Card */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#F8F9FA] overflow-hidden flex-col justify-between p-12 border-r border-black/5">
        {/* Subtle grid background */}
        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {/* Abstract waveform / gradient graphic */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="w-[800px] h-[600px] bg-gradient-to-tr from-[#FF4D79]/20 via-[#A23CFD]/10 to-transparent blur-3xl rounded-full transform -rotate-12 pointer-events-none" />
        </div>

        {/* Top Header */}
        <div className="z-10 absolute top-12 left-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D79] to-[#FF8A65] flex items-center justify-center shadow-lg">
              <Compass className="text-white w-4 h-4" />
            </div>
            <span className="font-sans font-bold text-lg tracking-wide text-gray-900">NuraTravel</span>
          </div>
        </div>

        {/* Center Content: Beautiful Floating Agent Info Card */}
        <div className="z-10 flex-1 flex flex-col justify-center max-w-[440px]">
          <h1 className="text-4xl font-sans font-bold tracking-tight leading-[1.1] text-gray-900 mb-8">
            One click away <br/>from your <span className="text-[#FF4D79]">dream trip.</span>
          </h1>

          <div className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500">
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_2s_infinite]" />
            
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#A23CFD] to-[#FF6B4A] p-[1.5px] shadow-sm">
                <div className="w-full h-full bg-white rounded-[10.5px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#A23CFD]" />
                </div>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-[15px] text-gray-900 leading-tight">AI Travel Agent</h3>
                <p className="text-[11px] text-gray-500 font-medium tracking-wide">POWERED BY GEMINI & GROQ</p>
              </div>
            </div>
            
            <p className="text-[13px] text-gray-600 leading-relaxed font-light mb-5">
              Your personal, intelligent travel companion. I can instantly build dynamic itineraries, compare live flight prices, and book the perfect stays. Just ask!
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 border border-white shadow-sm">
                <Plane className="w-3.5 h-3.5 text-[#FF4D79]" />
                <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Smart Flights</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 border border-white shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-[#A23CFD]" />
                <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Curated Stays</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 border border-white shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-[#FF8A65]" />
                <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Live Maps</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 border border-white shadow-sm">
                <MessageSquarePlus className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Voice Ready</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 relative overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center w-full max-w-[360px] mx-auto py-8">
          
          <div className="mb-8">
            <h2 className="text-2xl font-sans font-bold tracking-tight text-gray-900 mb-1.5">
              {mode === 'signup' ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-[13px] text-gray-500 font-normal">
              {mode === 'signup' ? 'You are a few moments away from getting started.' : 'Log in to continue your travel planning.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF4D79]/40 focus:border-[#FF4D79] transition-all font-normal text-[13px] text-gray-900 placeholder:text-gray-400 shadow-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF4D79]/40 focus:border-[#FF4D79] transition-all font-normal text-[13px] text-gray-900 placeholder:text-gray-400 shadow-sm"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF4D79]/40 focus:border-[#FF4D79] transition-all font-normal text-[13px] text-gray-900 placeholder:text-gray-400 shadow-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator (Signup only) */}
            {mode === 'signup' && password.length > 0 && (
              <div className="flex items-center gap-2 pt-0.5 pb-1 animate-in fade-in">
                <div className="flex-1 flex gap-0.5 h-1">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-full ${i < strength ? strengthColor : 'bg-gray-100'} transition-colors duration-300`} 
                    />
                  ))}
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold ${strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-500' : 'text-[#10B981]'}`}>
                  {strengthLabel}
                </span>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF4D79]/40 focus:border-[#FF4D79] transition-all font-normal text-[13px] text-gray-900 placeholder:text-gray-400 shadow-sm"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50/80 text-red-600 text-[12px] rounded-lg border border-red-100 flex items-start gap-2 mt-2">
                <span className="mt-0.5 text-red-500">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {mode === 'signup' && (
              <div className="flex items-start gap-2 pt-2">
                <input type="checkbox" id="tips" className="mt-0.5 rounded border-gray-300 text-[#FF4D79] focus:ring-[#FF4D79] cursor-pointer" />
                <label htmlFor="tips" className="text-[11px] font-normal text-gray-500 cursor-pointer leading-tight">
                  Send me tips, updates and offers. By signing up, you accept our <a href="#" className="font-medium text-black hover:underline">Privacy Policy</a> and <a href="#" className="font-medium text-black hover:underline">Terms</a>.
                </label>
              </div>
            )}

            <div className="pt-3 flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#111] hover:bg-black text-white font-medium text-[13px] py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-px disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {mode === 'signup' ? 'Create account' : 'Log in'}
              </button>
              
              <button
                type="button"
                onClick={handleFreeTier}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium text-[13px] py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 group"
              >
                <Sparkles size={14} className="text-[#FF4D79] group-hover:scale-110 transition-transform" />
                Try Free Tier (2 Messages)
              </button>
            </div>
          </form>

          {/* Social Logins */}
          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute w-full h-px bg-gray-100" />
            <span className="relative bg-white px-3 text-[9px] font-bold tracking-widest text-gray-400 uppercase">Or continue with</span>
          </div>

          <div className="mt-6 flex gap-2">
            <button type="button" disabled className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg bg-gray-50/50 opacity-50 cursor-not-allowed text-[12px] font-medium text-gray-500 shadow-sm">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 21.53 7.7 24 12 24z" /><path fill="#FBBC05" d="M5.84 15.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V8.07H2.18C1.43 9.55 1 11.22 1 13s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.43 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" /></svg>
              Google
            </button>
            <button type="button" disabled className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg bg-gray-50/50 opacity-50 cursor-not-allowed text-[12px] font-medium text-gray-500 shadow-sm">
              <svg className="w-3.5 h-3.5" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#00a4ef" d="M11 1h9v9h-9z"/><path fill="#7fba00" d="M1 11h9v9H1z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
              Microsoft
            </button>
          </div>

          <div className="mt-8 text-center">
            {mode === 'signup' ? (
              <p className="text-[12px] font-normal text-gray-500">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-semibold text-black hover:text-[#FF4D79] transition-colors">Log In</button>
              </p>
            ) : (
              <p className="text-[12px] font-normal text-gray-500">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold text-black hover:text-[#FF4D79] transition-colors">Sign Up</button>
              </p>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
