import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, X, KeyRound, Eye, EyeOff, Smartphone, ShieldCheck } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { token, showToast, user } = useAuth();
  const [activeTab, setActiveTab] = useState('password'); // 'password' or 'pin'

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // PIN State
  const [currentPassOrPin, setCurrentPassOrPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match! Please verify and re-type.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        showToast(data.message || 'Current password is incorrect.', 'error');
      }
    } catch (err) {
      showToast('Network error while updating password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassOrPin) {
      showToast('Please enter your current password or PIN', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('New 4-digit PINs do not match!', 'error');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      showToast('PIN must be exactly 4 numeric digits (e.g. 1234)', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password_or_pin: currentPassOrPin,
          new_pin: newPin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('4-Digit Login PIN updated successfully!', 'success');
        setCurrentPassOrPin('');
        setNewPin('');
        setConfirmPin('');
        onClose();
      } else {
        showToast(data.message || 'Verification failed.', 'error');
      }
    } catch (err) {
      showToast('Network error while updating PIN', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] grid place-items-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      {/* Centered Modal Card Container */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl animate-fade-in">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base tracking-tight">Security Credentials</h3>
              <p className="text-xs text-slate-400">User: <strong className="text-teal-300">{user?.name || user?.username}</strong> ({user?.role})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'password'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Account Password</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'pin'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>4-Digit Entry PIN</span>
          </button>
        </div>

        {/* 1. CHANGE PASSWORD FORM */}
        {activeTab === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Enter your current password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                New Password (min 6 chars) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Confirm New Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono shadow-inner"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* 2. CHANGE 4-DIGIT PIN FORM */
          <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Current Password or Current PIN <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPassOrPin}
                onChange={(e) => setCurrentPassOrPin(e.target.value)}
                placeholder="Enter current password or current PIN"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                New 4-Digit Quick Login PIN <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 1234 or 9876"
                className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-base text-center tracking-[0.4em] text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500 shadow-inner"
              />
              <p className="text-[10px] text-slate-400 text-center mt-1">4 numeric digits used for rapid POS login</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Confirm New 4-Digit PIN <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter 4-digit PIN"
                className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-base text-center tracking-[0.4em] text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500 shadow-inner"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5 active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving PIN...' : 'Save New PIN'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
