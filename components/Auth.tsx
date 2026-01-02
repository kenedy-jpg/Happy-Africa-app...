
import React, { useState, useEffect } from 'react';
import { X, User, Loader, Check, ArrowRight, ChevronLeft, Eye, EyeOff, Mail, Phone, Lock, AlertTriangle, Settings, HelpCircle, ExternalLink } from 'lucide-react';
import { User as UserType } from '../types';
import { backend } from '../services/backend';

interface AuthProps {
  onLogin: (user?: UserType) => void;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onShowNotification: (msg: {user: string, avatar: string, text: string, type: string}) => void;
}

const INTERESTS = [
  { id: 'dance', label: 'Dance 💃' },
  { id: 'comedy', label: 'Comedy 😂' },
  { id: 'food', label: 'Food 🍔' },
  { id: 'sports', label: 'Sports ⚽' },
  { id: 'beauty', label: 'Beauty 💄' },
  { id: 'animals', label: 'Animals 🐶' },
  { id: 'gaming', label: 'Gaming 🎮' },
  { id: 'travel', label: 'Travel ✈️' },
  { id: 'music', label: 'Music 🎵' },
  { id: 'tech', label: 'Tech 📱' },
  { id: 'diy', label: 'DIY 🛠️' },
  { id: 'fashion', label: 'Fashion 👗' },
];

type Step = 'method' | 'login_form' | 'signup_form' | 'google_chooser' | 'interests';

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="20px" height="20px" className="mr-2">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

export const Auth: React.FC<AuthProps> = ({ onLogin, onClose, initialMode = 'signup', onShowNotification }) => {
  const [step, setStep] = useState<Step>(initialMode === 'login' ? 'login_form' : 'signup_form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'normal' | 'config' | 'unconfirmed' | 'missing'>('normal');

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
      setError('');
      setErrorType('normal');
  }, [step]);

  const handleLoginSubmit = async () => {
      if (!loginIdentifier || !loginPassword) {
          setError("Please enter your credentials");
          return;
      }
      setIsLoading(true);
      setError('');
      setErrorType('normal');
      try {
          const user = await backend.auth.login(loginIdentifier, loginPassword);
          setIsLoading(false);
          onLogin(user);
      } catch (err: any) {
          setIsLoading(false);
          const msg = err.message || "An error occurred during login.";
          
          if (msg.includes("Invalid login credentials")) {
              setError("Invalid email or password. If you haven't created an account, please use the 'Sign Up' tab.");
              setErrorType('missing');
          } else if (msg.includes("Email not confirmed")) {
              setError("Email not confirmed.");
              setErrorType('unconfirmed');
          } else {
              setError(msg);
          }
      }
  };

  const handleSignupSubmit = async () => {
      if (!username || !email || !signupPassword) {
          setError("All fields are required");
          return;
      }
      setIsLoading(true);
      setError('');
      try {
          await backend.auth.signup({ username, email, phone }, signupPassword);
          setIsLoading(false);
          setStep('interests'); 
      } catch (err: any) {
          setIsLoading(false);
          setError(err.message || "Signup failed. Please try again.");
      }
  };

  const toggleInterest = (id: string) => {
      setSelectedInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleInterestsNext = () => {
      onLogin(backend.auth.getCurrentUser() || undefined);
  };

  const renderLoginForm = () => (
      <div className="w-full flex flex-col gap-6 animate-slide-right">
          <div className="flex flex-col gap-1">
             <h1 className="text-2xl font-bold text-brand-pink">Welcome back!</h1>
             <p className="text-gray-500 text-sm">Log in to your account</p>
          </div>
          
          <div className="flex flex-col gap-4 mt-2">
              <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">Email</label>
                  <input 
                    type="email"
                    placeholder="Enter email"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all text-black"
                    autoFocus
                  />
              </div>
              
              <div className="relative space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">Password</label>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all text-black"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[34px] text-gray-400 hover:text-gray-600"
                  >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
              </div>
          </div>

          {error && (
              <div className={`p-4 rounded-xl flex flex-col gap-3 ${errorType === 'unconfirmed' || errorType === 'missing' ? 'bg-orange-50 border border-orange-200' : 'bg-red-50 border border-red-100'}`}>
                  <div className="flex items-start gap-2">
                      {errorType === 'unconfirmed' || errorType === 'missing' ? <HelpCircle className="text-orange-500 shrink-0 mt-0.5" size={18} /> : <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />}
                      <p className={`text-xs font-bold leading-tight ${errorType === 'unconfirmed' || errorType === 'missing' ? 'text-orange-800' : 'text-red-600'}`}>{error}</p>
                  </div>
                  
                  {errorType === 'missing' && (
                      <button 
                        onClick={() => setStep('signup_form')}
                        className="text-[11px] bg-brand-pink text-white font-black py-2 rounded-lg uppercase tracking-widest mt-1"
                      >
                          Go to Sign Up
                      </button>
                  )}

                  {errorType === 'unconfirmed' && (
                      <div className="bg-white/60 p-3 rounded-lg flex flex-col gap-2">
                          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-tight">To fix this instantly:</p>
                          <ol className="text-[10px] text-gray-600 space-y-1 ml-3 list-decimal font-medium">
                              <li>Open <b>Supabase Dashboard</b></li>
                              <li>Go to <b>Authentication</b> > <b>Settings</b></li>
                              <li>Toggle <b>Confirm email</b> to <b>OFF</b></li>
                              <li>Click <b>Save</b> at the bottom</li>
                          </ol>
                          <a href="https://supabase.com/dashboard/project/_/auth/settings" target="_blank" className="flex items-center gap-1 text-[10px] text-brand-pink font-black uppercase mt-1 hover:underline">
                              Open Settings <ExternalLink size={10}/>
                          </a>
                      </div>
                  )}
              </div>
          )}

          <button 
            onClick={handleLoginSubmit} 
            disabled={!loginIdentifier || !loginPassword || isLoading}
            className="bg-brand-pink text-white font-bold py-4 rounded-xl mt-2 disabled:opacity-50 flex justify-center shadow-lg shadow-brand-pink/20 hover:brightness-110 active:scale-95 transition-all"
          >
              {isLoading ? <Loader className="animate-spin" /> : 'Log in'}
          </button>

          <div className="mt-auto pt-6 border-t border-gray-100">
              <p className="text-sm text-center text-gray-600">
                  Don't have an account?{' '}
                  <button onClick={() => setStep('signup_form')} className="font-bold text-brand-pink hover:underline">Sign up</button>
              </p>
          </div>
      </div>
  );

  const renderSignupForm = () => (
      <div className="w-full flex flex-col gap-4 animate-slide-right flex-1 overflow-y-auto pb-4">
          <div className="flex flex-col gap-1 mb-2">
             <h1 className="text-2xl font-bold text-brand-pink">Create Account</h1>
             <p className="text-gray-500 text-sm">Join the Happy Africa community</p>
          </div>
          
          <div className="flex flex-col gap-4">
              <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">Username</label>
                  <div className="relative">
                      <User size={18} className="absolute left-4 top-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 pl-12 outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all text-black"
                      />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">Email</label>
                  <div className="relative">
                      <Mail size={18} className="absolute left-4 top-4 text-gray-400" />
                      <input 
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 pl-12 outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all text-black"
                      />
                  </div>
              </div>
              
              <div className="relative space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">Password</label>
                  <div className="relative">
                      <Lock size={18} className="absolute left-4 top-4 text-gray-400" />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 pl-12 outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all text-black"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                      >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                  </div>
              </div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-lg border border-red-100 mt-2">{error}</p>}

          <button 
            onClick={handleSignupSubmit} 
            disabled={!username || !email || !signupPassword || isLoading}
            className="bg-brand-pink text-white font-bold py-4 rounded-xl mt-4 disabled:opacity-50 flex justify-center shadow-lg shadow-brand-pink/20 hover:brightness-110 active:scale-95 transition-all"
          >
              {isLoading ? <Loader className="animate-spin" /> : 'Create Account'}
          </button>

          <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-center text-gray-600">
                  Already have an account?{' '}
                  <button onClick={() => setStep('login_form')} className="font-bold text-brand-pink hover:underline">Log in</button>
              </p>
          </div>
      </div>
  );

  const renderInterests = () => (
      <div className="w-full flex flex-col h-full animate-slide-right">
          <div className="mb-4">
              <h1 className="text-2xl font-bold mb-2">Choose your interests</h1>
              <p className="text-gray-500 text-sm">Get better video recommendations.</p>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pb-4">
              {INTERESTS.map((interest) => (
                  <button 
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`p-4 rounded-xl border text-left font-bold text-sm transition-all ${
                        selectedInterests.includes(interest.id) 
                        ? 'border-brand-pink bg-brand-pink/10 text-brand-pink' 
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                      {interest.label}
                  </button>
              ))}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-auto">
              <button 
                onClick={handleInterestsNext}
                className="w-full bg-brand-pink text-white font-bold py-3.5 rounded flex items-center justify-center gap-2"
              >
                  {isLoading ? <Loader className="animate-spin" /> : (
                      <>Next <ArrowRight size={18} /></>
                  )}
              </button>
              <button onClick={handleInterestsNext} className="w-full text-gray-400 text-xs font-bold py-3">Skip</button>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center text-black animate-slide-up">
      <div className="w-full p-4 flex justify-between items-center border-b border-gray-100">
        <button onClick={onClose} disabled={isLoading}>
            <X size={24} />
        </button>
        <h2 className="font-bold text-sm uppercase tracking-widest">{step === 'login_form' ? 'Log In' : step === 'signup_form' ? 'Sign Up' : 'Vibe Check'}</h2>
        <div className="w-6"></div>
      </div>

      <div className={`flex-1 w-full max-w-md p-8 flex flex-col ${step === 'interests' ? 'overflow-hidden' : ''}`}>
          {step === 'login_form' && renderLoginForm()}
          {step === 'signup_form' && renderSignupForm()}
          {step === 'interests' && renderInterests()}
      </div>
    </div>
  );
};
