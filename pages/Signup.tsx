
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Scissors, Store, User, Lock, ArrowRight, AlertCircle, CheckCircle2, ChevronLeft, Mail, Info } from 'lucide-react';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    businessSlug: '',
    ownerName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password || !formData.ownerName || !formData.confirmPassword) {
      setError('Please fill in all fields in this step.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setStep(2);
  };

  const handleBackStep = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      // Validate slug format (lowercase alphanumeric and hyphens only)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(formData.businessSlug)) {
        throw new Error("Shop ID must contain only lowercase letters, numbers, and hyphens.");
      }

      // We omit confirmPassword when sending to API
      const { confirmPassword, ...signupData } = formData;
      await apiService.signup(signupData);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-2xl shadow-2xl text-center max-w-md w-full animate-in zoom-in duration-300">
           <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle2 size={40} />
           </div>
           <h2 className="text-3xl font-bold text-slate-900 mb-2">Shop Registered!</h2>
           <p className="text-slate-500 mb-8">Your workspace is ready. Redirecting you to the login page...</p>
           <Link to="/login" className="text-yellow-600 font-bold hover:underline">Click here if not redirected</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 py-12">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="bg-yellow-500 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10" 
               style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-yellow-500 transform -rotate-6">
              <Scissors size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {step === 1 ? 'Account Setup' : 'Business Details'}
            </h1>
            <p className="text-slate-800 font-medium opacity-80 mt-1">Step {step} of 2</p>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-900/10">
            <div 
              className="h-full bg-slate-900 transition-all duration-500" 
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in shake duration-300">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4 animate-in slide-in-from-left-4 duration-300">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    value={formData.ownerName}
                    onChange={e => setFormData({...formData, ownerName: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm font-medium"
                    placeholder="e.g. David Kimani"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm font-medium"
                      placeholder="owner@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm font-medium"
                      placeholder="admin"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      required
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      required
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 mt-6"
              >
                Next Step <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Business Name</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm font-medium"
                    placeholder="Grand Central Barbers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Unique Shop ID (Slug)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">@</span>
                  <input 
                    type="text" 
                    required
                    value={formData.businessSlug}
                    onChange={e => setFormData({...formData, businessSlug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm font-mono font-bold"
                    placeholder="my-barber-shop"
                  />
                </div>
                <div className="flex items-start gap-2 mt-1.5 ml-1">
                  <Info size={12} className="text-slate-400 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-tight">This identifier will be used for your shop's dashboard and public booking URL.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={handleBackStep}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 active:scale-95"
                >
                  {isSubmitting ? 'Finalizing...' : 'Register'} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link to="/login" className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center justify-center gap-2">
              <ChevronLeft size={16} /> Already have a shop? Login
            </Link>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">&copy; 2024 BarberPro Multivendor SaaS.</p>
        </div>
      </div>
    </div>
  );
};
