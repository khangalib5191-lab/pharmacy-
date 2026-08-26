import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Wifi,
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
  Info,
  Truck,
  RotateCcw,
  Users,
  UserCheck,
  DollarSign,
  Wallet,
  Settings,
  Database,
  History,
  Lock,
  Eye,
  Percent,
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
  Legend,
} from 'recharts';

export default function AdminDashboard() {
  const { user, token, showToast } = useAuth();
  const navigate = useNavigate();

  // Active module tab
  const [activeTab, setActiveTab] = useState('analytics');

  // Analytics & Graph State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [graphView, setGraphView] = useState('month'); // day, week, month, year, custom
  const [graphDate, setGraphDate] = useState(new Date().toISOString().split('T')[0]);
  const [graphData, setGraphData] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);

  // Products State
  const [medicines, setMedicines] = useState([]);
  const [medSearch, setMedSearch] = useState('');
  const [medLoading, setMedLoading] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [barcodePrintItem, setBarcodePrintItem] = useState(null);

  // Inventory & Expiry State
  const [expiryData, setExpiryData] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ medicine_id: '', adjustment_type: 'add', quantity: '', reason: 'Inventory count adjustment', notes: '' });

  // Suppliers & Purchases State
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_invoice: '',
    discount: 0,
    paid_amount: 0,
    payment_method: 'Cash',
    items: [{ medicine_id: '', quantity: 10, unit_cost: 10, batch_number: 'BATCH-' + Date.now().toString().slice(-4), expiry_date: '2028-01-01' }],
  });

  // Supplier Returns State
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    supplier_id: '',
    return_date: new Date().toISOString().split('T')[0],
    reason: 'damaged',
    notes: '',
    items: [{ medicine_id: '', quantity: 1, unit_cost: 0, reason: 'damaged' }],
  });

  // Customers State
  const [customers, setCustomers] = useState([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '', credit_limit: 5000, opening_balance: 0 });

  // Cashier Shifts State
  const [shifts, setShifts] = useState([]);

  // Reports State
  const [reportType, setReportType] = useState('sales');
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Users Management State
  const [usersList, setUsersList] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'CASHIER', pin: '' });

  // Audit Logs & Backup Info
  const [auditLogs, setAuditLogs] = useState([]);
  const [backupInfo, setBackupInfo] = useState(null);

  // Product Form
  const [formData, setFormData] = useState({
    trade_name: '',
    generic_name: '',
    brand: '',
    dosage: '',
    form: 'Tablet',
    manufacturer: '',
    category: 'Tablet',
    barcode: '',
    cost_price: '',
    selling_price: '',
    wholesale_price: '',
    stock_quantity: 50,
    min_stock_alert: 20,
    batch_number: 'BATCH-2026',
    expiry_date: '2028-12-31',
    rack_location: 'Rack A-01',
    status: 'active',
  });

  // RBAC Guard: Protect `/admin` against non-admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      showToast('Access Denied: Admin privileges required.', 'error');
      navigate('/pos');
    }
  }, [user, navigate]);

  // Data Fetchers
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch('/api/analytics/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setAnalytics(data);
    } catch (err) {
      showToast('Failed to load analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchGraphData = async () => {
    try {
      setGraphLoading(true);
      const res = await fetch(`/api/analytics/graph?view=${graphView}&date=${graphDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setGraphData(data.data);
    } catch (err) {
      // ignore
    } finally {
      setGraphLoading(false);
    }
  };

  const fetchMedicines = async () => {
    try {
      setMedLoading(true);
      const url = new URL('/api/medicines', window.location.origin);
      if (medSearch) url.searchParams.append('search', medSearch);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setMedicines(data.medicines);
    } catch (err) {
      showToast('Error loading medicines', 'error');
    } finally {
      setMedLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    const res = await fetch('/api/suppliers', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setSuppliers(data.suppliers);
  };

  const fetchPurchases = async () => {
    const res = await fetch('/api/purchases', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setPurchases(data.purchases);
  };

  const fetchPurchaseReturns = async () => {
    const res = await fetch('/api/purchase-returns', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setPurchaseReturns(data.returns);
  };

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setCustomers(data.customers);
  };

  const fetchShifts = async () => {
    const res = await fetch('/api/shifts/history', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setShifts(data.shifts);
  };

  const fetchExpiryData = async () => {
    const res = await fetch('/api/inventory/expiry-dashboard', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setExpiryData(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setUsersList(data.users);
  };

  const fetchBackupAndLogs = async () => {
    const bRes = await fetch('/api/backup/info', { headers: { Authorization: `Bearer ${token}` } });
    const bData = await bRes.json();
    if (bData.success) setBackupInfo(bData.database);

    const aRes = await fetch('/api/backup/audit-logs?limit=50', { headers: { Authorization: `Bearer ${token}` } });
    const aData = await aRes.json();
    if (aData.success) setAuditLogs(aData.logs);
  };

  const generateReport = async () => {
    try {
      setReportLoading(true);
      let endpoint = `/api/reports/sales-summary?start_date=${reportStartDate}&end_date=${reportEndDate}`;
      if (reportType === 'products') endpoint = `/api/reports/product-sales?start_date=${reportStartDate}&end_date=${reportEndDate}`;
      if (reportType === 'valuation') endpoint = `/api/reports/stock-valuation`;
      if (reportType === 'profit') endpoint = `/api/reports/profit-loss?start_date=${reportStartDate}&end_date=${reportEndDate}`;

      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setReportData(data);
    } catch (err) {
      showToast('Failed to generate report', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAnalytics();
    fetchGraphData();
    fetchMedicines();
    fetchSuppliers();
    fetchCustomers();
    fetchExpiryData();
  }, []);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
      fetchGraphData();
    } else if (activeTab === 'inventory') {
      fetchMedicines();
      fetchExpiryData();
    } else if (activeTab === 'procurement') {
      fetchPurchases();
      fetchSuppliers();
    } else if (activeTab === 'returns') {
      fetchPurchaseReturns();
      fetchSuppliers();
    } else if (activeTab === 'suppliers') {
      fetchSuppliers();
    } else if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'shifts') {
      fetchShifts();
    } else if (activeTab === 'reports') {
      generateReport();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'backup') {
      fetchBackupAndLogs();
    }
  }, [activeTab, graphView, graphDate]);

  // Product Create/Update
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const url = editingMed ? `/api/medicines/${editingMed.id}` : '/api/medicines';
      const method = editingMed ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingMed ? 'Product updated' : 'Product created', 'success');
        setIsMedModalOpen(false);
        setEditingMed(null);
        fetchMedicines();
      } else {
        showToast(data.message || 'Error saving product', 'error');
      }
    } catch (err) {
      showToast('Network error saving product', 'error');
    }
  };

  // Stock Adjustment
  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(adjustForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Stock adjusted successfully', 'success');
        setIsAdjustModalOpen(false);
        fetchMedicines();
        fetchExpiryData();
      } else {
        showToast(data.message || 'Adjustment failed', 'error');
      }
    } catch (err) {
      showToast('Error adjusting stock', 'error');
    }
  };

  // Direct Purchase Save
  const handleSavePurchase = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(purchaseForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Purchase recorded & stock updated', 'success');
        setIsPurchaseModalOpen(false);
        fetchPurchases();
        fetchMedicines();
      } else {
        showToast(data.message || 'Purchase failed', 'error');
      }
    } catch (err) {
      showToast('Error recording purchase', 'error');
    }
  };

  // Supplier Return Save & Confirm
  const handleSaveSupplierReturn = async (e) => {
    e.preventDefault();
    try {
      // 1. Create return draft
      const res = await fetch('/api/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(returnForm),
      });
      const data = await res.json();
      if (data.success) {
        // 2. Immediately confirm to deduct stock and update supplier ledger
        const cRes = await fetch(`/api/purchase-returns/${data.returnId}/confirm`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const cData = await cRes.json();
        if (cData.success) {
          showToast(`Supplier return ${data.return_number} confirmed! Stock decreased.`, 'success');
          setIsReturnModalOpen(false);
          fetchPurchaseReturns();
          fetchMedicines();
        } else {
          showToast(cData.message || 'Failed to confirm return', 'error');
        }
      } else {
        showToast(data.message || 'Return creation failed', 'error');
      }
    } catch (err) {
      showToast('Error processing supplier return', 'error');
    }
  };

  // Create Customer
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(customerForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Customer created', 'success');
        setIsCustomerModalOpen(false);
        fetchCustomers();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Error creating customer', 'error');
    }
  };

  // Create User
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('User created successfully', 'success');
        setIsUserModalOpen(false);
        setUserForm({ username: '', password: '', name: '', role: 'CASHIER', pin: '' });
        fetchUsers();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Error creating user', 'error');
    }
  };

  const navItems = [
    { id: 'analytics', label: 'Dashboard & Analytics', icon: LayoutDashboard },
    { id: 'inventory', label: 'Products & Batches', icon: Package },
    { id: 'procurement', label: 'Purchases & GRN', icon: Truck },
    { id: 'returns', label: 'Supplier Returns', icon: RotateCcw },
    { id: 'suppliers', label: 'Suppliers & Ledger', icon: Layers },
    { id: 'customers', label: 'Customers & Credit', icon: Users },
    { id: 'shifts', label: 'Cashier Shifts', icon: Wallet },
    { id: 'reports', label: 'Reports & Exports', icon: BarChart3 },
    { id: 'users', label: 'Staff & Security', icon: UserCheck },
    { id: 'backup', label: 'Audit & Backup', icon: Database },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Pharmacy ERP Management</h1>
            <span className="px-2.5 py-1 text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-lg">
              PKR Currency
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete management for stock, FEFO batches, supplier returns, double-entry ledgers, and cashier audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/20 transition"
          >
            <Pill className="w-4 h-4" />
            <span>Open POS Counter</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex flex-wrap gap-2 glass-card p-2 rounded-2xl border border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────────────── TAB 1: EXECUTIVE ANALYTICS & GRAPH ──────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* KPI Cards in PKR */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-xs font-semibold">Today's Net Sales</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  Rs. {analytics.metrics.today_revenue.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{analytics.metrics.today_transactions} transactions completed</div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-xs font-semibold">Today's Gross Profit</div>
                <div className="text-2xl font-bold font-mono text-teal-400 mt-1">
                  Rs. {analytics.metrics.today_profit.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">COGS: Rs. {analytics.metrics.today_cost.toFixed(2)}</div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-xs font-semibold">Supplier Payables</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  Rs. {analytics.metrics.supplier_payables.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Total outstanding credit balance</div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-xs font-semibold">Stock Alerts</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-rose-400 font-bold font-mono text-xl">{analytics.metrics.out_of_stock_count} Out</span>
                  <span className="text-amber-400 font-bold font-mono text-xl">{analytics.metrics.low_stock_count} Low</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{analytics.metrics.expiring_soon_count} items expiring soon</div>
              </div>
            </div>
          )}

          {/* Dynamic Graph Section */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-lg">Sales & Profit Timeline (PKR)</h3>
                <p className="text-xs text-slate-400">Dynamic multi-period revenue, COGS, and gross profit</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {['day', 'week', 'month', 'year'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setGraphView(view)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      graphView === view ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {view}
                  </button>
                ))}
                <input
                  type={graphView === 'year' ? 'number' : 'date'}
                  value={graphDate}
                  onChange={(e) => setGraphDate(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graphData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue (Rs.)" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="profit" name="Gross Profit (Rs.)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorProf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ──────────────── TAB 2: PRODUCT MASTER & INVENTORY ──────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                placeholder="Search products by SKU, Trade Name, Generic, Barcode..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingMed(null);
                  setFormData({
                    trade_name: '', generic_name: '', brand: '', dosage: '', form: 'Tablet',
                    manufacturer: '', category: 'Tablet', barcode: '', cost_price: '',
                    selling_price: '', wholesale_price: '', stock_quantity: 50, min_stock_alert: 20,
                    batch_number: 'BATCH-' + Date.now().toString().slice(-4), expiry_date: '2028-12-31',
                    rack_location: 'Rack A-01', status: 'active',
                  });
                  setIsMedModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
              <button
                onClick={() => setIsAdjustModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              >
                <Edit className="w-4 h-4 text-amber-400" />
                <span>Stock Adjustment</span>
              </button>
            </div>
          </div>

          {/* Expiry Dashboard Buckets */}
          {expiryData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">
                <div className="text-rose-400 text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Expired Stock ({expiryData.expired.length})
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Must be quarantined or returned</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl">
                <div className="text-amber-400 text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expiring in 7 Days ({expiryData.expiring_7.length})
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Immediate clearance / return</div>
              </div>
              <div className="bg-sky-500/10 border border-sky-500/30 p-3.5 rounded-xl">
                <div className="text-sky-400 text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expiring in 30 Days ({expiryData.expiring_30.length})
                </div>
                <div className="text-[11px] text-slate-400 mt-1">FEFO priority dispatch</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 p-3.5 rounded-xl">
                <div className="text-slate-300 text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expiring in 90 Days ({expiryData.expiring_90.length})
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Monitor supplier return window</div>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Cost (Rs.)</th>
                  <th className="py-3 px-3">Selling (Rs.)</th>
                  <th className="py-3 px-3">Stock Units</th>
                  <th className="py-3 px-3">Batch & Expiry</th>
                  <th className="py-3 px-3">Rack</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-bold">{med.product_code || 'MED-000'}</span>
                      {med.barcode && <div className="text-[10px] text-slate-400">{med.barcode}</div>}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {med.trade_name}
                      <span className="block text-[10px] text-slate-400">{med.generic_name || med.brand || ''}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">Rs. {parseFloat(med.cost_price || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">Rs. {parseFloat(med.selling_price || 0).toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        med.stock_quantity <= 0 ? 'bg-rose-500/20 text-rose-300' : med.stock_quantity <= med.min_stock_alert ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {med.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                      <div>{med.batch_number || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{med.expiry_date || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{med.rack_location || 'N/A'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingMed(med);
                          setFormData({ ...med });
                          setIsMedModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-teal-300 transition mr-2"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: PROCUREMENT & GRN ──────────────── */}
      {activeTab === 'procurement' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Purchase Invoices & GRN</h3>
              <p className="text-xs text-slate-400">Record stock replenishment from pharmaceutical distributors</p>
            </div>
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Purchase</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Purchase #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Invoice Ref</th>
                  <th className="py-3 px-3">Total (Rs.)</th>
                  <th className="py-3 px-3">Paid (Rs.)</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-300">{p.purchase_number}</td>
                    <td className="py-3 px-3 text-slate-300">{p.purchase_date}</td>
                    <td className="py-3 px-3 font-semibold text-white">{p.supplier_name || 'Direct'}</td>
                    <td className="py-3 px-3 text-slate-400">{p.supplier_invoice || 'N/A'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-white">Rs. {parseFloat(p.total_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">Rs. {parseFloat(p.paid_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 4: SUPPLIER RETURNS ──────────────── */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Supplier Returns (Purchase Returns)</h3>
              <p className="text-xs text-slate-400">Return damaged, expired, or recalled medicines to suppliers (debits ledger & decreases stock)</p>
            </div>
            <button
              onClick={() => setIsReturnModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Create Supplier Return</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Total Amount (Rs.)</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchaseReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-rose-300">{r.return_number}</td>
                    <td className="py-3 px-3 text-slate-300">{r.return_date}</td>
                    <td className="py-3 px-3 font-semibold text-white">{r.supplier_name || 'N/A'}</td>
                    <td className="py-3 px-3 text-amber-300 font-semibold">{r.reason || 'General'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-white">Rs. {parseFloat(r.total_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 5: SUPPLIERS & LEDGER ──────────────── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Suppliers & Double-Entry Ledger</h3>
              <p className="text-xs text-slate-400">Track payables, purchase invoices, returns, and payment disbursements</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Total Purchases</th>
                  <th className="py-3 px-3">Total Returns</th>
                  <th className="py-3 px-3">Current Balance (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{s.name}</td>
                    <td className="py-3 px-3 text-slate-300">{s.company || 'N/A'}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{s.phone || 'N/A'}</td>
                    <td className="py-3 px-3 font-mono">Rs. {parseFloat(s.total_purchases || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-rose-400">Rs. {parseFloat(s.total_returns || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      Rs. {parseFloat(s.balance || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 6: CUSTOMERS & CREDIT ──────────────── */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Customer Accounts & Credit Ledger</h3>
              <p className="text-xs text-slate-400">Manage customer balances, credit limits, and credit sales recovery</p>
            </div>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Credit Limit</th>
                  <th className="py-3 px-3">Total Sales</th>
                  <th className="py-3 px-3">Outstanding Balance (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{c.phone || 'N/A'}</td>
                    <td className="py-3 px-3 font-mono">Rs. {parseFloat(c.credit_limit || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">Rs. {parseFloat(c.total_sales || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      Rs. {parseFloat(c.balance || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 7: CASHIER SHIFTS ──────────────── */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-white text-base">Cashier Shifts & Drawer Reconciliation</h3>
            <p className="text-xs text-slate-400">Audit opening cash float, total cash sales, actual closing cash, and variances</p>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Shift ID</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-3">Opened At</th>
                  <th className="py-3 px-3">Float (Rs.)</th>
                  <th className="py-3 px-3">Cash Sales</th>
                  <th className="py-3 px-3">Expected Cash</th>
                  <th className="py-3 px-3">Actual Cash</th>
                  <th className="py-3 px-3">Difference</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-300">#{s.id}</td>
                    <td className="py-3 px-3 font-semibold text-white">{s.cashier_name}</td>
                    <td className="py-3 px-3 text-slate-400">{new Date(s.opened_at).toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono">Rs. {parseFloat(s.opening_cash || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">Rs. {parseFloat(s.total_cash_sales || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono">Rs. {parseFloat(s.expected_cash || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-white">{s.actual_cash != null ? `Rs. ${s.actual_cash}` : 'Active'}</td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {s.cash_difference != null ? (
                        <span className={s.cash_difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {s.cash_difference >= 0 ? `+Rs. ${s.cash_difference}` : `Rs. ${s.cash_difference}`}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${s.status === 'open' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 8: REPORTS & EXPORTS ──────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'sales', label: 'Sales Summary' },
                { id: 'products', label: 'Product Velocity' },
                { id: 'valuation', label: 'Stock Valuation' },
                { id: 'profit', label: 'Profit & Loss' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setReportType(r.id); generateReport(); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    reportType === r.id ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
              <button
                onClick={generateReport}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold"
              >
                Run
              </button>
            </div>
          </div>

          {/* Report Display */}
          {reportData && (
            <div className="glass-card p-6 rounded-2xl border border-slate-800">
              <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-4 bg-slate-950 rounded-xl">
                {JSON.stringify(reportData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 9: STAFF & SECURITY ──────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">User Accounts & Access Control</h3>
              <p className="text-xs text-slate-400">Manage cashier credentials, roles, PINs, and security permissions</p>
            </div>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff User</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-3">Full Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">PIN</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-teal-300">{u.username}</td>
                    <td className="py-3 px-3 text-white font-semibold">{u.name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">{u.pin ? '••••' : 'None'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 10: AUDIT & BACKUP ──────────────── */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          
          {/* Backup Action Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-400" />
                Database Backup & Storage Safety
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Download a verified offline snapshot of your entire pharmacy database (`pharmacy.db`).
              </p>
              {backupInfo && (
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                  <span>Size: <strong className="text-white">{backupInfo.size_mb} MB</strong></span>
                  <span>Products: <strong className="text-white">{backupInfo.medicines}</strong></span>
                  <span>Sales: <strong className="text-white">{backupInfo.sales}</strong></span>
                  <span>Audit Logs: <strong className="text-white">{backupInfo.audit_records}</strong></span>
                </div>
              )}
            </div>

            <a
              href="/api/backup/download"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-teal-500/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup (.db)</span>
            </a>
          </div>

          {/* Audit Logs Trail */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 font-bold text-white text-sm">
              Live System Audit Logs (Last 50 Events)
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 text-slate-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-teal-300">{log.username || 'System'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ──────────────── MODAL: ADD / EDIT PRODUCT ──────────────── */}
      {isMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">{editingMed ? 'Edit Product' : 'Add New Medicine Product'}</h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Generic Formula</label>
                  <input
                    type="text"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Dosage / Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Form</label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Inhaler', 'Drops', 'Vitamins'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Barcode (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave blank if non-barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Cost Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Rack / Shelf</label>
                  <input
                    type="text"
                    value={formData.rack_location}
                    onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMedModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: STOCK ADJUSTMENT ──────────────── */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Manual Stock Adjustment</h3>
            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Select Medicine *</label>
                <select
                  required
                  value={adjustForm.medicine_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, medicine_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="">Choose medicine...</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.trade_name} (Current: {m.stock_quantity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Action Type</label>
                  <select
                    value={adjustForm.adjustment_type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="add">Add Stock (+)</option>
                    <option value="remove">Remove Stock (-)</option>
                    <option value="set">Set Exact Stock (=)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Reason for Adjustment *</label>
                <input
                  type="text"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: CREATE SUPPLIER RETURN ──────────────── */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create Supplier Return (Purchase Return)</h3>
            <p className="text-xs text-slate-400">Items will be deducted from inventory and debited to supplier ledger.</p>
            <form onSubmit={handleSaveSupplierReturn} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Select Supplier *</label>
                <select
                  required
                  value={returnForm.supplier_id}
                  onChange={(e) => setReturnForm({ ...returnForm, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="">Choose supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.company || 'Distributor'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Medicine to Return *</label>
                <select
                  required
                  value={returnForm.items[0]?.medicine_id || ''}
                  onChange={(e) => {
                    const med = medicines.find(m => String(m.id) === String(e.target.value));
                    setReturnForm({
                      ...returnForm,
                      items: [{
                        medicine_id: e.target.value,
                        quantity: 1,
                        unit_cost: med ? med.cost_price : 0,
                        reason: returnForm.reason,
                      }],
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="">Choose product...</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.trade_name} (Avail: {m.stock_quantity}, Cost: Rs. {m.cost_price})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Return Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={returnForm.items[0]?.quantity || ''}
                    onChange={(e) => {
                      const updated = [...returnForm.items];
                      updated[0].quantity = parseFloat(e.target.value);
                      setReturnForm({ ...returnForm, items: updated });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Return Reason</label>
                  <select
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="damaged">Damaged Goods</option>
                    <option value="expired">Expired Stock</option>
                    <option value="wrong_product">Wrong Product</option>
                    <option value="overstock">Overstock Return</option>
                    <option value="supplier_recall">Supplier Recall</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold"
                >
                  Confirm Supplier Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: CREATE CUSTOMER ──────────────── */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create Customer Profile</h3>
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Phone</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    value={customerForm.credit_limit}
                    onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: CREATE USER ──────────────── */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create Staff Account</h3>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Username *</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Password *</label>
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Role *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="CASHIER">CASHIER</option>
                    <option value="PHARMACIST">PHARMACIST</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Quick Login 4-Digit PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 5678"
                  value={userForm.pin}
                  onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
