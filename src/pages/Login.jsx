import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Pill, Lock, User, KeyRound, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('pin'); // 'pin' or 'password'
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinPress = (num) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handlePinClear = () => {
    setPin('');
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    const success = await login({ pin });
    setLoading(false);
    if (success) {
      navigate('/pos');
    } else {
      setPin('');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    const success = await login({ username, password });
    setLoading(false);
    if (success) {
      navigate('/pos');
    }
  };

  const fillQuickDemo = (role) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
      setPin('1234');
    } else {
      setUsername('cashier');
      setPassword('cashier123');
      setPin('5678');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Medical Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl border border-slate-800 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20 mb-4">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Pill className="w-8 h-8 text-teal-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">PharmaConnect</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">Local Host POS & Inventory System</p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 mb-6 text-xs font-semibold">
          <button
            onClick={() => setMode('pin')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              mode === 'pin'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Quick Staff PIN</span>
          </button>

          <button
            onClick={() => setMode('password')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              mode === 'password'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Password Login</span>
          </button>
        </div>

        {/* PIN Pad Mode */}
        {mode === 'pin' ? (
          <div className="space-y-6">
            {/* PIN Display Dots */}
            <div className="flex justify-center items-center gap-4 py-3">
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
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinPress(num.toString())}
                  className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-100 text-xl font-bold border border-slate-800/80 hover:border-teal-500/40 active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handlePinClear}
                className="h-14 rounded-2xl bg-slate-900/50 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-slate-800 hover:border-rose-500/40 transition"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handlePinPress('0')}
                className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-100 text-xl font-bold border border-slate-800 active:scale-95 transition"
              >
                0
              </button>

              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={pin.length !== 4 || loading}
                className={`h-14 rounded-2xl flex items-center justify-center transition-all ${
                  pin.length === 4
                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30'
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or cashier"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 transition-all mt-4"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>
        )}

        {/* Demo Quick Fill Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Demo Credentials</span>
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => fillQuickDemo('admin')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition"
            >
              👑 Admin (PIN: 1234)
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('cashier')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition"
            >
              🛒 Cashier (PIN: 5678)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
