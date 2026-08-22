import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pharmacy_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('pharmacy_token') || null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info', duration = 3500) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), duration);
  };

  const login = async ({ username, password, pin }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, pin }),
      });

      const data = await response.json();

      if (!data.success) {
        showToast(data.message || 'Login failed', 'error');
        return false;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('pharmacy_token', data.token);
      localStorage.setItem('pharmacy_user', JSON.stringify(data.user));

      showToast(`Welcome back, ${data.user.name}!`, 'success');
      return true;
    } catch (err) {
      showToast('Network error connecting to local server.', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pharmacy_token');
    localStorage.removeItem('pharmacy_user');
    showToast('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, toast, showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-3 text-sm font-semibold tracking-wide ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-600/50 shadow-rose-950/50'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
                : 'bg-sky-950/90 text-sky-200 border-sky-500/50 shadow-sky-950/50'
            }`}
          >
            <span>{toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
