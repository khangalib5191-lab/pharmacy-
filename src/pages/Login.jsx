import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Pill, Lock, User, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('pin'); // 'pin' or 'password'
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePinPress = (num) => {
    setErrorMsg('');
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handlePinClear = () => {
    setErrorMsg('');
    setPin('');
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    setErrorMsg('');
    setLoading(true);
    const success = await login({ pin });
    setLoading(false);
    if (success) {
      navigate('/pos');
    } else {
      setErrorMsg('Invalid 4-digit PIN code. Please try again.');
      setPin('');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setErrorMsg('');
    setLoading(true);
    const success = await login({ username, password });
    setLoading(false);
    if (success) {
      navigate('/pos');
    } else {
      setErrorMsg('Incorrect username or password. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl border border-slate-800 relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20 mb-3">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Pill className="w-8 h-8 text-teal-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">One Ten Pharmacy</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">Enterprise Pharmacy POS & Inventory ERP</p>
          
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              PKR Currency (Rs.)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
              Offline-First SQLite
            </span>
          </div>
        </div>

        {/* Error Alert Display */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => { setMode('pin'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              mode === 'pin'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Quick 4-Digit PIN</span>
          </button>

          <button
            onClick={() => { setMode('password'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              mode === 'password'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Password Login</span>
          </button>
        </div>

        {/* PIN Pad Mode */}
        {mode === 'pin' ? (
          <div className="space-y-5">
            {/* PIN Display Dots */}
            <div className="flex justify-center items-center gap-4 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    pin.length > idx
                      ? 'bg-teal-400 border-teal-300 shadow-[0_0_10px_#2dd4bf]'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinPress(num.toString())}
                  className="h-13 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 text-xl font-bold border border-slate-800/90 hover:border-teal-500/40 active:scale-95 transition-all shadow-sm"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handlePinClear}
                className="h-13 py-3 rounded-2xl bg-slate-900/50 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-slate-800 hover:border-rose-500/40 transition"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handlePinPress('0')}
                className="h-13 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 text-xl font-bold border border-slate-800 active:scale-95 transition"
              >
                0
              </button>

              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={pin.length !== 4 || loading}
                className={`h-13 py-3 rounded-2xl flex items-center justify-center transition-all ${
                  pin.length === 4
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                }`}
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          /* Password Form Mode */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
