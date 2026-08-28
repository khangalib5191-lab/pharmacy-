import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Clock, Package, X, CheckCircle, ArrowRight, ShieldAlert, Layers, MapPin, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AlertsModal({ isOpen, onClose, alertData, onRefresh }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'expiry' | 'stock'
  const navigate = useNavigate();

  if (!isOpen || !alertData) return null;

  const { summary, alerts } = alertData;
  const expiredList = alerts?.expired || [];
  const expiringSoonList = alerts?.expiring_soon || [];
  const outOfStockList = alerts?.out_of_stock || [];
  const lowStockList = alerts?.low_stock || [];

  const handleGoToAdmin = (tab) => {
    onClose();
    navigate('/admin');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
                <span>Pharmacy Alert Center</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {summary.total_alerts} Active Warnings
                </span>
              </h3>
              <p className="text-xs text-slate-400">Real-time surveillance for drug expiration & inventory replenishment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh alerts"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-shrink-0">
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-2xl">
            <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Expired</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{summary.expired_count} Items</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Blocked from sale</div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl">
            <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Expiring Soon</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{summary.expiring_soon_count} Items</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Within 90 days</div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-2xl">
            <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              <span>Out of Stock</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{summary.out_of_stock_count} Items</div>
            <div className="text-[10px] text-slate-400 mt-0.5">0 units available</div>
          </div>

          <div className="bg-sky-500/10 border border-sky-500/30 p-3 rounded-2xl">
            <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Low Stock</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{summary.low_stock_count} Items</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Below alert limit</div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold flex-shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'all' ? 'bg-teal-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Alerts ({summary.total_alerts})
          </button>
          <button
            onClick={() => setActiveTab('expiry')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'expiry' ? 'bg-rose-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Expiry Surveillance ({summary.total_expiry_alerts})
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'stock' ? 'bg-sky-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stock Replenishment ({summary.total_stock_alerts})
          </button>
        </div>

        {/* Alerts List Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          
          {/* 1. EXPIRED ITEMS LIST */}
          {(activeTab === 'all' || activeTab === 'expiry') && expiredList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Expired Medicines (Do Not Dispense!)</span>
              </div>
              <div className="space-y-1.5">
                {expiredList.map((m) => (
                  <div key={m.id} className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{m.trade_name} {m.dosage}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-teal-300">{m.product_code}</span>
                        <span>• Batch: {m.batch_number || 'N/A'}</span>
                        <span>• Rack: {m.rack_location || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/40">
                        Expired {m.days_overdue} days ago ({m.expiry_date})
                      </span>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">Stock in Store: <strong>{m.stock_quantity} units</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. EXPIRING SOON LIST */}
          {(activeTab === 'all' || activeTab === 'expiry') && expiringSoonList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Expiring Within 90 Days (FEFO Clearance)</span>
              </div>
              <div className="space-y-1.5">
                {expiringSoonList.map((m) => (
                  <div key={m.id} className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{m.trade_name} {m.dosage}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-teal-300">{m.product_code}</span>
                        <span>• Batch: {m.batch_number || 'N/A'}</span>
                        <span>• Rack: {m.rack_location || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/40">
                        {m.days_remaining} days left ({m.expiry_date})
                      </span>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">Stock in Store: <strong>{m.stock_quantity} units</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. OUT OF STOCK LIST */}
          {(activeTab === 'all' || activeTab === 'stock') && outOfStockList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider">
                <Package className="w-4 h-4" />
                <span>Out of Stock (Replenishment Urgent)</span>
              </div>
              <div className="space-y-1.5">
                {outOfStockList.map((m) => (
                  <div key={m.id} className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{m.trade_name} {m.dosage}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-teal-300">{m.product_code}</span>
                        <span>• Formula: {m.generic_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/40">
                        0 Units Available
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">Min Threshold: {m.min_stock_alert} units</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. LOW STOCK LIST */}
          {(activeTab === 'all' || activeTab === 'stock') && lowStockList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Low Stock Threshold Warnings</span>
              </div>
              <div className="space-y-1.5">
                {lowStockList.map((m) => (
                  <div key={m.id} className="bg-sky-500/10 border border-sky-500/30 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{m.trade_name} {m.dosage}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-teal-300">{m.product_code}</span>
                        <span>• Rack: {m.rack_location || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/40">
                        Only {m.stock_quantity} left (Min: {m.min_stock_alert})
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">Deficit: -{m.units_deficit} units</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {summary.total_alerts === 0 && (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
              <p className="font-bold text-white text-sm">All Inventory Healthy & Up to Date</p>
              <p className="text-xs">No expired products, no critical near-expiry items, and all stock levels are adequate.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={() => handleGoToAdmin('inventory')}
            className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold"
          >
            <span>Open Full Inventory & Expiry Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            Close Alert Center
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
