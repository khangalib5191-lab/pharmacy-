import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Scan, Keyboard, AlertCircle } from 'lucide-react';

export default function CameraScannerModal({ isOpen, onClose, onScan, onScanSuccess }) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) {
      setError('Please enter a barcode number.');
      return;
    }
    const val = manualBarcode.trim();
    if (onScan) onScan(val);
    if (onScanSuccess) onScanSuccess(val);
    setManualBarcode('');
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden my-auto">
        
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
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-md shadow-teal-500/20"
              >
                Simulate Scan
              </button>
            </form>

            {error && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
