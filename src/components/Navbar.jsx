import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Pill, LayoutDashboard, ShoppingCart, LogOut, KeyRound, Wifi, UserCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/pos" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Pill className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
                One Ten Pharmacy
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-full">
                Rs. PKR
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Enterprise POS & ERP System</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2">
          <Link
            to="/pos"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              location.pathname === '/pos'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Point of Sale (POS)</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/admin'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-lg shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Management</span>
            </Link>
          )}
        </nav>

        {/* Active User & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* LAN Connectivity Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>LAN Active</span>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user.name}</p>
              <div className="flex items-center justify-end gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    user.role === 'ADMIN' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Change Password / PIN Button for All Users */}
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              title="Security: Change Password or 4-Digit Login PIN"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 border border-slate-700/60 hover:border-teal-500/40 text-xs font-semibold transition-all"
            >
              <KeyRound className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">PIN / Password</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Logout"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  );
}
