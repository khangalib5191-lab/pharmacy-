import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Wifi,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Pill,
  BarChart3,
  Calendar,
  Layers,
  MapPin,
  Tag,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Smartphone,
  Info
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function AdminDashboard() {
  const { user, token, showToast } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'inventory', 'sales', 'lan'
  
  // Analytics Data State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Inventory Data State
  const [medicines, setMedicines] = useState([]);
  const [medSearch, setMedSearch] = useState('');
  const [medLoading, setMedLoading] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);

  // Sales Audit History State
  const [salesLog, setSalesLog] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  // New Medicine Form State
  const [formData, setFormData] = useState({
    trade_name: '',
    generic_name: '',
    dosage: '',
    form: 'Tablet',
    manufacturer: '',
    barcode: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: 50,
    min_stock_alert: 20,
    batch_number: 'BATCH-2026',
    expiry_date: '2027-12-31',
    rack_location: 'Rack A-01',
  });

  // 1. RBAC Guard: Protect `/admin` route against non-admin cashiers
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      showToast('Access Denied: Admin privileges required.', 'error');
      navigate('/pos');
    }
  }, [user, navigate]);

  // Fetch Dashboard Analytics Data
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch('/api/analytics/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
      }
    } catch (err) {
      showToast('Failed to load analytics dashboard', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch Medicine Stock List
  const fetchMedicines = async () => {
    try {
      setMedLoading(true);
      const url = new URL('/api/medicines', window.location.origin);
      if (medSearch) url.searchParams.append('search', medSearch);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMedicines(data.medicines);
    } catch (err) {
      showToast('Failed to load inventory list', 'error');
    } finally {
      setMedLoading(false);
    }
  };

  // Fetch Sales Audit History
  const fetchSalesLog = async () => {
    try {
      setSalesLoading(true);
      const res = await fetch('/api/sales', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSalesLog(data.sales);
    } catch (err) {
      showToast('Failed to load sales log', 'error');
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'inventory') fetchMedicines();
    if (activeTab === 'sales') fetchSalesLog();
  }, [activeTab, medSearch]);

  // Handle Create / Edit Medicine Submit
  const handleMedFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingMed;
      const url = isEdit ? `/api/medicines/${editingMed.id}` : '/api/medicines';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? 'Medicine updated!' : 'New medicine batch added!', 'success');
        setIsMedModalOpen(false);
        setEditingMed(null);
        resetForm();
        fetchMedicines();
      } else {
        showToast(data.message || 'Operation failed', 'error');
      }
    } catch (err) {
      showToast('Server error saving medicine', 'error');
    }
  };

  const handleEditMed = (med) => {
    setEditingMed(med);
    setFormData({ ...med });
    setIsMedModalOpen(true);
  };

  const handleDeleteMed = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medicine from stock?')) return;
    try {
      const res = await fetch(`/api/medicines/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('Medicine deleted from database', 'info');
        fetchMedicines();
      }
    } catch (err) {
      showToast('Failed to delete medicine', 'error');
    }
  };

  // CSV Report Download Trigger
  const handleExportCSV = () => {
    window.open(`/api/sales/export?token=${token}`, '_blank');
    showToast('Downloading CSV Sales Audit Report...', 'success');
  };

  const resetForm = () => {
    setFormData({
      trade_name: '',
      generic_name: '',
      dosage: '',
      form: 'Tablet',
      manufacturer: '',
      barcode: '',
      cost_price: '',
      selling_price: '',
      stock_quantity: 50,
      min_stock_alert: 20,
      batch_number: 'BATCH-2026',
      expiry_date: '2027-12-31',
      rack_location: 'Rack A-01',
    });
  };

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-400" />
            <span>Admin Management Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Full access to sales analytics, inventory price management, stock entry, and CSV audit reports.
          </p>
        </div>

        {/* Tab Navigation Pill Selector */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeTab === 'analytics'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Visual Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeTab === 'inventory'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeTab === 'sales'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Sales Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('lan')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeTab === 'lan'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>LAN Mobile Setup</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: VISUAL ANALYTICS DASHBOARD */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Key Metric Counters */}
          {analyticsLoading || !analytics ? (
            <div className="p-12 text-center text-slate-400">Loading visual analytics...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Revenue Today</p>
                    <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                      ${analytics.metrics.today_revenue.toFixed(2)}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {analytics.metrics.today_transactions} Orders completed
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Est. Profit Today</p>
                    <h3 className="text-2xl font-bold font-mono text-teal-300 mt-1">
                      ${analytics.metrics.today_profit.toFixed(2)}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Net sales margin</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Low Stock Warning</p>
                    <h3 className="text-2xl font-bold font-mono text-amber-400 mt-1">
                      {analytics.metrics.low_stock_count} Items
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Below min alert limit</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Expiring Soon</p>
                    <h3 className="text-2xl font-bold font-mono text-rose-400 mt-1">
                      {analytics.metrics.expiring_soon_count} Batches
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Within 90 days</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Visual Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Daily Sales Chart (Hourly Revenue) */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-base">Today's Hourly Revenue Trend</h3>
                      <p className="text-xs text-slate-400">Sales velocity generated per hour</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-semibold border border-sky-500/30">
                      Live Hourly
                    </span>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.charts.hourly_sales}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                          formatter={(value) => [`$${value}`, 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Selling Medicines Bar Chart */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-base">Top Fast-Moving Medicines</h3>
                      <p className="text-xs text-slate-400">Highest quantity sold items</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/30">
                      Volume Rank
                    </span>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.charts.top_moving}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="trade_name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                        />
                        <Bar dataKey="total_qty_sold" fill="#14b8a6" radius={[8, 8, 0, 0]}>
                          {analytics.charts.top_moving.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#14b8a6', '#0284c7', '#3b82f6', '#8b5cf6', '#ec4899'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Low Stock & Expiry Critical Alerts Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Low Stock Panel */}
                <div className="glass-card p-6 rounded-3xl border border-slate-800">
                  <h3 className="font-bold text-amber-300 text-base mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span>Low Stock Alert Panel</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="pb-2">Medicine Name</th>
                          <th className="pb-2">Rack</th>
                          <th className="pb-2 text-right">Available Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {analytics.alerts.low_stock.length === 0 ? (
                          <tr><td colSpan={3} className="py-4 text-center text-slate-500">All stock levels healthy!</td></tr>
                        ) : (
                          analytics.alerts.low_stock.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2.5 font-semibold text-white">{item.trade_name} ({item.dosage})</td>
                              <td className="py-2.5 text-slate-400">{item.rack_location}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-amber-400">{item.stock_quantity} units</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expiry Alert Panel */}
                <div className="glass-card p-6 rounded-3xl border border-slate-800">
                  <h3 className="font-bold text-rose-300 text-base mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-rose-400" />
                    <span>Nearing Expiration Panel</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="pb-2">Medicine Name</th>
                          <th className="pb-2">Batch #</th>
                          <th className="pb-2 text-right">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {analytics.alerts.expiring_soon.length === 0 ? (
                          <tr><td colSpan={3} className="py-4 text-center text-slate-500">No expiring medicine batches</td></tr>
                        ) : (
                          analytics.alerts.expiring_soon.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2.5 font-semibold text-white">{item.trade_name}</td>
                              <td className="py-2.5 text-slate-400 font-mono">{item.batch_number}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-rose-400">{item.expiry_date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      )}

      {/* VIEW 2: MEDICINE STOCK INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          
          <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                placeholder="Search stock inventory by trade name, generic formula, barcode..."
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>

            <button
              onClick={() => {
                setEditingMed(null);
                resetForm();
                setIsMedModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Medicine Batch</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Trade & Generic Name</th>
                    <th className="py-3 px-3">Dosage/Form</th>
                    <th className="py-3 px-3">Barcode</th>
                    <th className="py-3 px-3">Cost / Selling</th>
                    <th className="py-3 px-3">Stock Qty</th>
                    <th className="py-3 px-3">Batch & Expiry</th>
                    <th className="py-3 px-3">Rack</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {medLoading ? (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-500">Loading stock...</td></tr>
                  ) : (
                    medicines.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{med.trade_name}</div>
                          <div className="text-[11px] text-slate-400">{med.generic_name}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-300">
                          {med.dosage} <span className="text-[10px] text-slate-500 font-normal">({med.form})</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{med.barcode}</td>
                        <td className="py-3 px-3 font-mono">
                          <span className="text-slate-400">${med.cost_price.toFixed(2)}</span>
                          <span className="text-slate-500 mx-1">/</span>
                          <span className="text-emerald-400 font-bold">${med.selling_price.toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded ${
                              med.stock_quantity === 0
                                ? 'bg-rose-500/10 text-rose-400'
                                : med.stock_quantity <= med.min_stock_alert
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {med.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          <div className="font-mono text-[11px]">{med.batch_number}</div>
                          <div className="text-[10px] text-slate-500">{med.expiry_date}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-medium">{med.rack_location}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditMed(med)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition"
                            title="Edit Medicine"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMed(med.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                            title="Delete Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: SALES & AUDIT LOGS */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          
          <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Sales Audit Trail</h3>
              <p className="text-xs text-slate-400">Complete transactional history recorded on host machine</p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Report</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Cashier</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3 text-right">Items</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {salesLoading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-500">Loading audit history...</td></tr>
                  ) : (
                    salesLog.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-teal-300">{sale.receipt_number}</td>
                        <td className="py-3 px-3 text-slate-300">{new Date(sale.created_at).toLocaleString()}</td>
                        <td className="py-3 px-3 text-slate-200 font-semibold">{sale.cashier_name}</td>
                        <td className="py-3 px-3 text-slate-400">{sale.customer_name}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                            {sale.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">{sale.items ? sale.items.length : 0} items</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">${sale.total_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 4: LOCAL NETWORK (LAN) MOBILE SETUP GUIDE */}
      {activeTab === 'lan' && (
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Local Network (LAN / Wi-Fi) Connection Guide</h3>
              <p className="text-xs text-slate-400">Access this pharmacy POS system from any mobile device or PC on your router</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-teal-400" />
                  <span>Step 1: Connect to Same Wi-Fi</span>
                </p>
                <p className="text-slate-400">
                  Ensure your smartphone, tablet, or secondary cashier computer is connected to the same Wi-Fi router as this host PC.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-sky-400" />
                  <span>Step 2: Open Host IP Address in Mobile Browser</span>
                </p>
                <p className="text-slate-400">
                  Open Chrome or Safari on your phone and type the local network URL shown in your terminal upon startup:
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-teal-500/30 text-teal-300 font-mono font-bold text-center text-sm">
                  http://192.168.X.X:5000
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>No Internet Connection Required</span>
                </p>
                <p className="text-slate-400">
                  This application is 100% offline-first. It runs directly on your local SQLite database without cloud dependencies.
                </p>
              </div>
            </div>

            {/* Visual Setup Infographic Card */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 to-teal-400 p-1 flex items-center justify-center shadow-xl shadow-teal-500/20">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                  <Wifi className="w-10 h-10 text-teal-400 animate-pulse" />
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white text-lg">Server Host Active</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Listening on host <strong>0.0.0.0</strong> port <strong>5000</strong>. Ready for multi-device barcode scanning!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MEDICINE MODAL */}
      {isMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            
            <h3 className="text-xl font-bold text-white pb-3 border-b border-slate-800">
              {editingMed ? 'Edit Medicine Entry' : 'Add New Medicine to Stock Inventory'}
            </h3>

            <form onSubmit={handleMedFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Trade Name</label>
                  <input
                    type="text"
                    required
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    placeholder="e.g. Amoxicillin"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Generic Formula</label>
                  <input
                    type="text"
                    required
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    placeholder="e.g. Amoxicillin Trihydrate"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Strength / Dosage</label>
                  <input
                    type="text"
                    required
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="500mg, 10ml"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Form</label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Cream">Cream</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Drops">Drops</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Manufacturer / Brand</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g. GSK Pharma"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Barcode / UPC Number</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="8901234567890"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="4.50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="7.50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Initial Stock Qty</label>
                  <input
                    type="number"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Min Stock Alert</label>
                  <input
                    type="number"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Batch #</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Rack Location</label>
                  <input
                    type="text"
                    value={formData.rack_location}
                    onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                    placeholder="Rack A-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMedModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-lg shadow-teal-600/30"
                >
                  {editingMed ? 'Save Changes' : 'Add Medicine'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
