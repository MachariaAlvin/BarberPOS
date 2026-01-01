
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Scissors, Lock, User, ShieldCheck, ArrowRight, AlertCircle, Store, WifiOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, verifyMFA, mfaRequired } = useAuth();
  const navigate = useNavigate();
  
  const [businessSlug, setBusinessSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    setServerOffline(false);

    try {
      const success = await login(businessSlug, username, password);
      if (!success) {
        setError('Invalid Shop ID, username, or password');
      }
    } catch (err: any) {
      if (err.message === "SERVER_OFFLINE") {
        setServerOffline(true);
        setError('The server at localhost:3001 is currently unreachable.');
      } else {
        setError(err.message || 'An error occurred during login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const { isAuthenticated } = useAuth();
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    const success = await verifyMFA(mfaCode);
    setIsSubmitting(false);
    if (!success) {
      setError('Invalid MFA Code');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="bg-yellow-500 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10" 
               style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-yellow-500 transform -rotate-6">
              <Scissors size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">BarberPro</h1>
            {/* <p className="text-slate-800 font-medium opacity-80 mt-1">Multi-Vendor Management</p> */}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <div className="flex-1">
                <span className="text-sm font-bold block">{error}</span>
                {serverOffline && (
                  <p className="text-xs mt-1 text-slate-500 font-normal">Please ensure the backend server is running on port 3001.</p>
                )}
              </div>
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Shop ID (Slug)</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={businessSlug}
                    onChange={e => setBusinessSlug(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium"
                    placeholder="e.g. barberpro"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Example: 'barberpro' for the flagship store</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 active:scale-95"
              >
                {isSubmitting ? 'Verifying...' : 'Login to Store'} <ArrowRight size={18} />
              </button>

              <div className="text-center pt-2">
                <Link to="/signup" className="text-sm font-bold text-yellow-600 hover:underline">
                  Don't have a shop? Register here
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMFAVerify} className="space-y-6 animate-in slide-in-from-right-4">
               <div className="text-center">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <ShieldCheck size={32} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800">Two-Factor Authentication</h2>
                 <p className="text-slate-500 text-sm mt-2">Enter code for your workspace.</p>
               </div>

               <div>
                  <input 
                    type="text" 
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.slice(0, 6))}
                    className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 border-b-2 border-slate-200 focus:border-yellow-500 outline-none"
                    placeholder="000000"
                    autoFocus
                  />
               </div>

               <button 
                type="submit" 
                disabled={isSubmitting || mfaCode.length < 6}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          )}
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">&copy; 2024 BarberPro.</p>
        </div>
      </div>
    </div>
  );
};
