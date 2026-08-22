import React, { useState } from 'react';
import { Camera, X, Scan, Keyboard, AlertCircle } from 'lucide-react';

export default function CameraScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) {
      setError('Please enter a barcode number.');
      return;
    }
    onScanSuccess(manualBarcode.trim());
    setManualBarcode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
            <Camera className="w-5 h-5" />
            <span>Barcode Camera & Quick Scan</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Visual Camera Simulation Box */}
          <div className="relative aspect-video bg-slate-950 rounded-xl border-2 border-dashed border-teal-500/40 flex flex-col items-center justify-center p-4 text-center overflow-hidden group">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse shadow-[0_0_15px_#2dd4bf]" />
            <Scan className="w-12 h-12 text-teal-400/80 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-slate-300">Point Camera / USB Scanner at Barcode</p>
            <p className="text-[11px] text-slate-500 mt-1">USB Hand Scanner is actively listening on all pages</p>
          </div>

          {/* Quick Barcode Keypad / Manual Entry Fallback */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-sky-400" />
              <span>Or Enter Barcode Manually / Test Scan</span>
            </label>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => {
                  setManualBarcode(e.target.value);
                  setError('');
                }}
                placeholder="e.g. 8901234567890"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-600/30 transition-all"
              >
                Scan
              </button>
            </form>

            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
