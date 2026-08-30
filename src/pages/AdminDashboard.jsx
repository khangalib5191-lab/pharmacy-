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
  Receipt,
  Printer,
  X,
  CreditCard,
  Banknote,
  KeyRound,
  FileSpreadsheet,
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
import ReceiptModal from '../components/ReceiptModal';

export default function AdminDashboard() {
  const { user, token, showToast } = useAuth();
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('analytics');
  const [reprintReceipt, setReprintReceipt] = useState(null);

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
  const [barcodePrintMed, setBarcodePrintMed] = useState(null);

  // Inventory & Expiry State
  const [expiryData, setExpiryData] = useState(null);
  const [inventoryAlertFilter, setInventoryAlertFilter] = useState('all');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    medicine_id: '',
    adjustment_type: 'add',
    quantity: '',
    reason: 'Stock count adjustment',
    notes: '',
  });

  // Suppliers & Procurement State
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false);
  const [quickSupplierForm, setQuickSupplierForm] = useState({ name: '', company: '', phone: '', address: '' });
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_invoice: '',
    discount: 0,
    paid_amount: 0,
    payment_method: 'Cash',
    notes: '',
    items: [
      {
        medicine_id: '',
        quantity: 10,
        unit_cost: 10,
        selling_price: 15,
        batch_number: 'BATCH-' + Date.now().toString().slice(-4),
        expiry_date: '2028-12-31',
      },
    ],
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
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    credit_limit: 5000,
    opening_balance: 0,
  });

  // Ledger Viewing State (Supplier & Customer)
  const [viewingLedgerSupplier, setViewingLedgerSupplier] = useState(null);
  const [supplierLedgerEntries, setSupplierLedgerEntries] = useState([]);
  const [supplierPaymentAmount, setSupplierPaymentAmount] = useState('');
  
  const [viewingLedgerCustomer, setViewingLedgerCustomer] = useState(null);
  const [customerLedgerEntries, setCustomerLedgerEntries] = useState([]);
  const [customerPaymentAmount, setCustomerPaymentAmount] = useState('');

  // Cashier Shifts State
  const [shifts, setShifts] = useState([]);

  // Reports State
  const [reportType, setReportType] = useState('sales');
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Staff & Security State
  const [usersList, setUsersList] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'CASHIER',
    pin: '',
  });
  const [resettingUser, setResettingUser] = useState(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');

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
    pieces_per_pack: 30,
    unit_selling_price: '',
    unit_cost_price: '',
    wholesale_price: '',
    stock_quantity: 50,
    min_stock_alert: 20,
    batch_number: 'BATCH-2026',
    expiry_date: '2028-12-31',
    rack_location: 'Rack A-01',
    status: 'active',
  });

  // RBAC Guard
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      showToast('Access Denied: Admin privileges required.', 'error');
      navigate('/pos');
    }
  }, [user, navigate]);

  // Data Fetching
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

  // Tab switch
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
      fetchMedicines();
    } else if (activeTab === 'returns') {
      fetchPurchaseReturns();
      fetchSuppliers();
      fetchMedicines();
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

  // Product Save
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

  // Quick Save Supplier from GRN
  const handleSaveQuickSupplier = async (e) => {
    e.preventDefault();
    if (!quickSupplierForm.name || !quickSupplierForm.name.trim()) {
      showToast('Supplier name is required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(quickSupplierForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Supplier created and added to dropdown!', 'success');
        setIsQuickSupplierModalOpen(false);
        setQuickSupplierForm({ name: '', company: '', phone: '', address: '' });
        await fetchSuppliers();
        if (data.supplierId || data.id) {
          setPurchaseForm((prev) => ({ ...prev, supplier_id: data.supplierId || data.id }));
        }
      } else {
        showToast(data.message || 'Failed to add supplier', 'error');
      }
    } catch (err) {
      showToast('Network error adding supplier', 'error');
    }
  };

  // Direct Purchase & GRN Save
  const handleSavePurchase = async (e) => {
    e.preventDefault();
    try {
      const validItems = purchaseForm.items.filter((i) => i.medicine_id && i.quantity > 0);
      if (validItems.length === 0) {
        showToast('Please add at least one medicine item to the purchase invoice', 'error');
        return;
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...purchaseForm,
          items: validItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Purchase ${data.purchase_number} recorded & stock updated!`, 'success');
        setIsPurchaseModalOpen(false);
        fetchPurchases();
        fetchMedicines();
        fetchSuppliers();
      } else {
        showToast(data.message || 'Purchase failed', 'error');
      }
    } catch (err) {
      showToast('Error recording purchase invoice', 'error');
    }
  };

  // Supplier Return Save & Confirm
  const handleSaveSupplierReturn = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(returnForm),
      });
      const data = await res.json();
      if (data.success) {
        // Immediately confirm
        const cRes = await fetch(`/api/purchase-returns/${data.returnId}/confirm`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const cData = await cRes.json();
        if (cData.success) {
          showToast(`Supplier return ${data.return_number} confirmed! Stock decreased & ledger adjusted.`, 'success');
          setIsReturnModalOpen(false);
          fetchPurchaseReturns();
          fetchMedicines();
          fetchSuppliers();
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

  // View Supplier Ledger Statement
  const openSupplierLedger = async (supplier) => {
    try {
      setViewingLedgerSupplier(supplier);
      const res = await fetch(`/api/suppliers/${supplier.id}/ledger`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setSupplierLedgerEntries(data.ledger);
    } catch (err) {
      showToast('Error loading supplier ledger', 'error');
    }
  };

  // Record Payment to Supplier
  const handleRecordSupplierPayment = async (e) => {
    e.preventDefault();
    if (!supplierPaymentAmount || parseFloat(supplierPaymentAmount) <= 0) return;
    try {
      const res = await fetch(`/api/suppliers/${viewingLedgerSupplier.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(supplierPaymentAmount), notes: 'Supplier Payment' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Payment recorded in supplier ledger', 'success');
        setSupplierPaymentAmount('');
        openSupplierLedger(viewingLedgerSupplier);
        fetchSuppliers();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Error recording payment', 'error');
    }
  };

  // View Customer Ledger Statement
  const openCustomerLedger = async (customer) => {
    try {
      setViewingLedgerCustomer(customer);
      const res = await fetch(`/api/customers/${customer.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCustomerLedgerEntries(data.ledger);
    } catch (err) {
      showToast('Error loading customer ledger', 'error');
    }
  };

  // Record Payment from Customer
  const handleRecordCustomerPayment = async (e) => {
    e.preventDefault();
    if (!customerPaymentAmount || parseFloat(customerPaymentAmount) <= 0) return;
    try {
      const res = await fetch(`/api/customers/${viewingLedgerCustomer.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(customerPaymentAmount), notes: 'Credit Payment Receipt' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Customer payment received', 'success');
        setCustomerPaymentAmount('');
        openCustomerLedger(viewingLedgerCustomer);
        fetchCustomers();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Error recording customer payment', 'error');
    }
  };

  // Create Customer
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...customerForm,
          credit_limit: parseFloat(customerForm.credit_limit || 0),
          opening_balance: parseFloat(customerForm.opening_balance || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Customer profile created for ${customerForm.name}!`, 'success');
        setIsCustomerModalOpen(false);
        setCustomerForm({ name: '', phone: '', address: '', credit_limit: 5000, opening_balance: 0 });
        await fetchCustomers();
      } else {
        showToast(data.message || 'Failed to create customer', 'error');
      }
    } catch (err) {
      showToast('Network error creating customer', 'error');
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
        showToast('Staff user created', 'success');
        setIsUserModalOpen(false);
        setUserForm({ username: '', password: '', name: '', role: 'CASHIER', pin: '' });
        fetchUsers();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Error creating staff user', 'error');
    }
  };

  // Admin Reset Password for staff member
  const handleResetStaffPassword = async (e) => {
    e.preventDefault();
    if (!newStaffPassword || newStaffPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/auth/reset-password/${resettingUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newStaffPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Password reset successfully for ${resettingUser.username}`, 'success');
        setResettingUser(null);
        setNewStaffPassword('');
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Error resetting password', 'error');
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
              PKR (Rs.)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete management for stock, FEFO batches, supplier returns, double-entry ledgers, and cashier audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-500/20 transition"
          >
            <Pill className="w-4 h-4" />
            <span>Open POS Counter</span>
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
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
                <div className="text-[10px] text-slate-500 mt-1">{analytics.metrics.today_transactions} sales completed</div>
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
                <h3 className="font-bold text-white text-lg">Sales & Gross Profit Timeline (PKR)</h3>
                <p className="text-xs text-slate-400">Dynamic multi-period revenue, COGS, and gross profit in Rs.</p>
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

      {/* ──────────────── TAB 2: PRODUCTS & BATCHES ──────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                placeholder="Search products by SKU code, Trade Name, Generic, Barcode..."
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
                    selling_price: '', pieces_per_pack: 30, unit_selling_price: '', unit_cost_price: '',
                    wholesale_price: '', stock_quantity: 50, min_stock_alert: 20,
                    batch_number: 'BATCH-' + Date.now().toString().slice(-4), expiry_date: '2028-12-31',
                    rack_location: 'Rack A-01', status: 'active',
                  });
                  setIsMedModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
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

          {/* Expiry & Stock Health KPI Cards */}
          {expiryData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setInventoryAlertFilter(inventoryAlertFilter === 'expired' ? 'all' : 'expired')}
                className={`text-left p-3.5 rounded-2xl transition border ${
                  inventoryAlertFilter === 'expired'
                    ? 'bg-rose-500/25 border-rose-500 ring-2 ring-rose-500/50 shadow-lg'
                    : 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                }`}
              >
                <div className="text-rose-400 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Expired Stock
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-white font-mono font-bold text-[10px]">
                    {expiryData.expired.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Must be quarantined or returned to supplier</div>
              </button>

              <button
                type="button"
                onClick={() => setInventoryAlertFilter(inventoryAlertFilter === 'expiring_7' ? 'all' : 'expiring_7')}
                className={`text-left p-3.5 rounded-2xl transition border ${
                  inventoryAlertFilter === 'expiring_7'
                    ? 'bg-amber-500/25 border-amber-500 ring-2 ring-amber-500/50 shadow-lg'
                    : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <div className="text-amber-400 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expiring in 7 Days
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-white font-mono font-bold text-[10px]">
                    {expiryData.expiring_7.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Immediate FEFO clearance or return</div>
              </button>

              <button
                type="button"
                onClick={() => setInventoryAlertFilter(inventoryAlertFilter === 'expiring_30' ? 'all' : 'expiring_30')}
                className={`text-left p-3.5 rounded-2xl transition border ${
                  inventoryAlertFilter === 'expiring_30'
                    ? 'bg-sky-500/25 border-sky-500 ring-2 ring-sky-500/50 shadow-lg'
                    : 'bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20'
                }`}
              >
                <div className="text-sky-400 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expiring in 30 Days
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-white font-mono font-bold text-[10px]">
                    {expiryData.expiring_30.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Priority dispatch / shelf rotation</div>
              </button>

              <button
                type="button"
                onClick={() => setInventoryAlertFilter(inventoryAlertFilter === 'expiring_90' ? 'all' : 'expiring_90')}
                className={`text-left p-3.5 rounded-2xl transition border ${
                  inventoryAlertFilter === 'expiring_90'
                    ? 'bg-slate-700 border-slate-500 ring-2 ring-slate-400/50 shadow-lg'
                    : 'bg-slate-800 border border-slate-700 hover:bg-slate-700/80'
                }`}
              >
                <div className="text-slate-300 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expiring in 90 Days
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-white font-mono font-bold text-[10px]">
                    {expiryData.expiring_90.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Monitor supplier return window</div>
              </button>
            </div>
          )}

          {/* Quick Alert Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-slate-400 text-[11px]">Filter List:</span>
            <button
              onClick={() => setInventoryAlertFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition ${
                inventoryAlertFilter === 'all' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Items ({medicines.length})
            </button>
            <button
              onClick={() => setInventoryAlertFilter('expired')}
              className={`px-3 py-1.5 rounded-xl transition ${
                inventoryAlertFilter === 'expired' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
              }`}
            >
              🚨 Expired
            </button>
            <button
              onClick={() => setInventoryAlertFilter('expiring_90')}
              className={`px-3 py-1.5 rounded-xl transition ${
                inventoryAlertFilter === 'expiring_90' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
              }`}
            >
              ⏳ Expiring in ≤90 Days
            </button>
            <button
              onClick={() => setInventoryAlertFilter('low_stock')}
              className={`px-3 py-1.5 rounded-xl transition ${
                inventoryAlertFilter === 'low_stock' ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-sky-400 hover:bg-slate-700'
              }`}
            >
              ⚠️ Low Stock
            </button>
            <button
              onClick={() => setInventoryAlertFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-xl transition ${
                inventoryAlertFilter === 'out_of_stock' ? 'bg-purple-500 text-white font-bold' : 'bg-slate-800 text-purple-400 hover:bg-slate-700'
              }`}
            >
              ⛔ Out of Stock
            </button>
          </div>

          {/* Products Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-3">Product Name & Pack Size</th>
                  <th className="py-3 px-3">Cost Price</th>
                  <th className="py-3 px-3">Selling Price</th>
                  <th className="py-3 px-3">Stock (Packs + Loose)</th>
                  <th className="py-3 px-3">Batch & Expiry</th>
                  <th className="py-3 px-3">Rack</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {medicines
                  .filter((med) => {
                    const matchSearch = !medSearch || 
                      med.trade_name.toLowerCase().includes(medSearch.toLowerCase()) ||
                      (med.product_code && med.product_code.toLowerCase().includes(medSearch.toLowerCase())) ||
                      (med.generic_name && med.generic_name.toLowerCase().includes(medSearch.toLowerCase())) ||
                      (med.barcode && med.barcode.toLowerCase().includes(medSearch.toLowerCase()));
                    if (!matchSearch) return false;

                    if (inventoryAlertFilter === 'all') return true;
                    const now = new Date();
                    const exp = med.expiry_date ? new Date(med.expiry_date) : null;
                    const diffDays = exp ? Math.ceil((exp - now) / (1000 * 60 * 60 * 24)) : null;

                    if (inventoryAlertFilter === 'expired') return diffDays !== null && diffDays < 0;
                    if (inventoryAlertFilter === 'expiring_7') return diffDays !== null && diffDays >= 0 && diffDays <= 7;
                    if (inventoryAlertFilter === 'expiring_30') return diffDays !== null && diffDays >= 0 && diffDays <= 30;
                    if (inventoryAlertFilter === 'expiring_90') return diffDays !== null && diffDays >= 0 && diffDays <= 90;
                    if (inventoryAlertFilter === 'low_stock') return med.stock_quantity > 0 && med.stock_quantity <= med.min_stock_alert;
                    if (inventoryAlertFilter === 'out_of_stock') return med.stock_quantity <= 0;
                    return true;
                  })
                  .map((med) => {
                    const now = new Date();
                    const exp = med.expiry_date ? new Date(med.expiry_date) : null;
                    const diffDays = exp ? Math.ceil((exp - now) / (1000 * 60 * 60 * 24)) : null;
                    const isExpired = diffDays !== null && diffDays < 0;
                    const isExpiringSoon = diffDays !== null && diffDays >= 0 && diffDays <= 90;
                    const ppp = Math.max(1, parseInt(med.pieces_per_pack) || 1);
                    const usp = parseFloat(med.unit_selling_price) > 0 ? parseFloat(med.unit_selling_price) : (parseFloat(med.selling_price || 0) / ppp);
                    const ucp = parseFloat(med.unit_cost_price) > 0 ? parseFloat(med.unit_cost_price) : (parseFloat(med.cost_price || 0) / ppp);

                    return (
                      <tr key={med.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-bold">{med.product_code || 'MED-000'}</span>
                          {med.barcode && <div className="text-[10px] text-slate-400 mt-0.5">{med.barcode}</div>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{med.trade_name}</span>
                            {ppp > 1 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                {ppp} {med.form || 'units'}/pk
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-400">{med.generic_name || med.brand || ''}</span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="text-white font-medium">Rs. {parseFloat(med.cost_price || 0).toFixed(2)} <span className="text-[10px] text-slate-500">/pk</span></div>
                          {ppp > 1 && (
                            <div className="text-[10px] text-slate-400">Rs. {ucp.toFixed(2)} /unit</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="font-bold text-emerald-400">Rs. {parseFloat(med.selling_price || 0).toFixed(2)} <span className="text-[10px] text-emerald-600 font-normal">/pk</span></div>
                          {ppp > 1 && (
                            <div className="text-[10px] text-teal-300 font-bold">Rs. {usp.toFixed(2)} /unit</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 text-xs ${
                              med.stock_quantity <= 0 ? 'bg-rose-500/20 text-rose-300' : med.stock_quantity <= med.min_stock_alert ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {med.stock_quantity <= 0 ? 'Out of Stock (0)' : med.stock_quantity <= med.min_stock_alert ? `Low (${med.stock_display || med.stock_quantity})` : (med.stock_display || `${med.stock_quantity} Packs`)}
                            </span>
                            {ppp > 1 && med.stock_quantity > 0 && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Total: {med.total_loose_units || Math.round(med.stock_quantity * ppp)} loose units
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          <div>Batch: {med.batch_number || 'N/A'}</div>
                          {isExpired ? (
                            <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              EXPIRED ({med.expiry_date})
                            </div>
                          ) : isExpiringSoon ? (
                            <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Exp in {diffDays}d ({med.expiry_date})
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">{med.expiry_date || 'N/A'}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-300">{med.rack_location || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingMed(med);
                              setFormData({
                                ...med,
                                pieces_per_pack: med.pieces_per_pack || 1,
                                unit_selling_price: med.unit_selling_price || '',
                                unit_cost_price: med.unit_cost_price || '',
                              });
                              setIsMedModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-teal-300 transition mr-1"
                            title="Edit Medicine"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setBarcodePrintMed(med)}
                            className="p-1.5 text-slate-400 hover:text-sky-300 transition"
                            title="Print Barcode Label"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
              <h3 className="font-bold text-white text-base">Purchase Invoices & Goods Receiving (GRN)</h3>
              <p className="text-xs text-slate-400">Record distributor deliveries, update stock, cost prices, batches, and supplier payables</p>
            </div>
            <button
              onClick={() => {
                setPurchaseForm({
                  supplier_id: suppliers[0]?.id || '',
                  purchase_date: new Date().toISOString().split('T')[0],
                  supplier_invoice: '',
                  discount: 0,
                  paid_amount: 0,
                  payment_method: 'Cash',
                  notes: '',
                  items: [
                    {
                      medicine_id: medicines[0]?.id || '',
                      quantity: 10,
                      unit_cost: medicines[0]?.cost_price || 10,
                      selling_price: medicines[0]?.selling_price || 15,
                      batch_number: 'BATCH-' + Date.now().toString().slice(-4),
                      expiry_date: '2028-12-31',
                    },
                  ],
                });
                setIsPurchaseModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Purchase / GRN</span>
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
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold">No purchase invoices recorded yet</p>
                      <p className="text-xs">Click "Record Purchase / GRN" above to receive stock</p>
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-teal-300">{p.purchase_number}</td>
                      <td className="py-3 px-3 text-slate-300">{p.purchase_date}</td>
                      <td className="py-3 px-3 font-semibold text-white">{p.supplier_name || 'Direct Distributor'}</td>
                      <td className="py-3 px-3 text-slate-400">{p.supplier_invoice || 'N/A'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-white">Rs. {parseFloat(p.total_amount || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 font-mono text-emerald-400">Rs. {parseFloat(p.paid_amount || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 font-semibold text-slate-300">{p.payment_method}</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
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
              onClick={() => {
                setReturnForm({
                  supplier_id: suppliers[0]?.id || '',
                  return_date: new Date().toISOString().split('T')[0],
                  reason: 'damaged',
                  notes: '',
                  items: [{ medicine_id: medicines[0]?.id || '', quantity: 1, unit_cost: medicines[0]?.cost_price || 0, reason: 'damaged' }],
                });
                setIsReturnModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition"
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
                {purchaseReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold">No supplier returns created yet</p>
                    </td>
                  </tr>
                ) : (
                  purchaseReturns.map((r) => (
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
                  ))
                )}
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
                  <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openSupplierLedger(s)}
                        className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-300 hover:text-slate-950 border border-teal-500/30 rounded-lg font-bold text-xs transition"
                      >
                        Statement Ledger
                      </button>
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
                  <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCustomerLedger(c)}
                        className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-300 hover:text-slate-950 border border-teal-500/30 rounded-lg font-bold text-xs transition"
                      >
                        View Ledger
                      </button>
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

          {/* Visual Reports Section */}
          {reportLoading ? (
            <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-teal-400" />
              <p className="font-semibold text-xs">Generating report data...</p>
            </div>
          ) : !reportData ? (
            <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center text-slate-500">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">Select dates and click "Run" to view report</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* 1. SALES SUMMARY REPORT */}
              {reportType === 'sales' && reportData.totals && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Total Net Sales</div>
                      <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                        Rs. {parseFloat(reportData.totals.total_sales || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{reportData.totals.count} transactions</div>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Total Gross Profit</div>
                      <div className="text-xl font-bold font-mono text-teal-400 mt-1">
                        Rs. {parseFloat(reportData.totals.total_profit || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">COGS: Rs. {parseFloat(reportData.totals.total_cost || 0).toFixed(2)}</div>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Total Discounts Given</div>
                      <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                        Rs. {parseFloat(reportData.totals.total_discount || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Average Ticket Value</div>
                      <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                        Rs. {reportData.totals.count > 0 ? (reportData.totals.total_sales / reportData.totals.count).toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Receipt #</th>
                          <th className="py-2.5 px-3">Date & Time</th>
                          <th className="py-2.5 px-3">Cashier</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Payment</th>
                          <th className="py-2.5 px-3">Subtotal</th>
                          <th className="py-2.5 px-3">Discount</th>
                          <th className="py-2.5 px-3">Total (Rs.)</th>
                          <th className="py-2.5 px-3">Profit (Rs.)</th>
                          <th className="py-2.5 px-3 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(reportData.sales || []).map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 font-mono font-bold text-teal-300">{s.receipt_number}</td>
                            <td className="py-2 px-3 text-slate-400">{new Date(s.created_at).toLocaleString()}</td>
                            <td className="py-2 px-3 text-white font-medium">{s.cashier_name}</td>
                            <td className="py-2 px-3 text-slate-300">{s.customer_name || 'Walk-in'}</td>
                            <td className="py-2 px-3 font-semibold text-slate-300">{s.payment_method}</td>
                            <td className="py-2 px-3 font-mono">Rs. {parseFloat(s.subtotal || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono text-rose-400">Rs. {parseFloat(s.discount || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-400">Rs. {parseFloat(s.total_amount || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono font-bold text-teal-300">Rs. {parseFloat(s.gross_profit || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => setReprintReceipt(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-[11px] font-bold transition shadow-sm"
                                title="Print computerized receipt"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print Bill</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. PRODUCT VELOCITY REPORT */}
              {reportType === 'products' && (
                <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
                  <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 font-bold text-white text-xs">
                    Top Selling Medicines Ranked by Sales Volume & Profitability
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 text-center">Rank</th>
                        <th className="py-2.5 px-3">Medicine Name</th>
                        <th className="py-2.5 px-3">Dosage</th>
                        <th className="py-2.5 px-3">Units Sold</th>
                        <th className="py-2.5 px-3">Total Revenue</th>
                        <th className="py-2.5 px-3">Total COGS</th>
                        <th className="py-2.5 px-3">Gross Profit</th>
                        <th className="py-2.5 px-3">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(reportData.products || []).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3 text-center">
                            <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[10px] ${
                              idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-white">{p.trade_name}</td>
                          <td className="py-2 px-3 text-slate-400">{p.dosage || 'N/A'}</td>
                          <td className="py-2 px-3 font-mono font-bold text-teal-300">{p.total_qty_sold}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-400">Rs. {parseFloat(p.total_revenue || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">Rs. {parseFloat(p.total_cogs || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-teal-400">Rs. {parseFloat(p.total_profit || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{p.transaction_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. STOCK VALUATION REPORT */}
              {reportType === 'valuation' && reportData.summary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Total Stock Units</div>
                      <div className="text-xl font-bold font-mono text-white mt-1">
                        {reportData.summary.total_units} Units
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{reportData.summary.total_items} distinct products</div>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Cost Valuation</div>
                      <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                        Rs. {parseFloat(reportData.summary.total_cost_valuation || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Total capital invested in stock</div>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Retail Valuation</div>
                      <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                        Rs. {parseFloat(reportData.summary.total_retail_valuation || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Estimated gross selling value</div>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-xs font-semibold">Potential Profit</div>
                      <div className="text-xl font-bold font-mono text-teal-400 mt-1">
                        Rs. {parseFloat(reportData.summary.potential_profit || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Unrealized stock margin</div>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden border border-slate-800 max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3">Stock Units</th>
                          <th className="py-2.5 px-3">Unit Cost</th>
                          <th className="py-2.5 px-3">Unit Retail</th>
                          <th className="py-2.5 px-3">Cost Valuation</th>
                          <th className="py-2.5 px-3">Retail Valuation</th>
                          <th className="py-2.5 px-3">Potential Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(reportData.stock || []).map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 font-mono font-bold text-teal-300">{s.product_code || 'MED-000'}</td>
                            <td className="py-2 px-3 font-semibold text-white">{s.trade_name}</td>
                            <td className="py-2 px-3 font-mono font-bold text-white">{s.stock_quantity}</td>
                            <td className="py-2 px-3 font-mono">Rs. {parseFloat(s.cost_price || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono text-emerald-400">Rs. {parseFloat(s.selling_price || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono text-amber-300">Rs. {parseFloat(s.stock_cost_value || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono text-emerald-300">Rs. {parseFloat(s.stock_retail_value || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono font-bold text-teal-300">Rs. {parseFloat(s.potential_profit || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. PROFIT & LOSS REPORT */}
              {reportType === 'profit' && reportData.data && (
                <div className="glass-card p-6 rounded-2xl border border-slate-800 max-w-2xl mx-auto space-y-4">
                  <div className="text-center pb-3 border-b border-slate-800">
                    <h4 className="text-lg font-bold text-white">Profit & Loss Income Statement</h4>
                    <p className="text-xs text-slate-400">Period: {reportStartDate} to {reportEndDate}</p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400 font-semibold">Gross Sales Revenue:</span>
                      <span className="font-mono font-bold text-white">Rs. {parseFloat(reportData.data.gross_sales || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-rose-400">
                      <span>Less: Customer Sales Returns:</span>
                      <span className="font-mono font-bold">-Rs. {parseFloat(reportData.data.sales_returns || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-t border-slate-800 font-bold text-white text-sm">
                      <span>Net Sales:</span>
                      <span className="text-emerald-400 font-mono">Rs. {parseFloat(reportData.data.net_sales || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-amber-400">
                      <span>Less: Cost of Goods Sold (COGS):</span>
                      <span className="font-mono font-bold">-Rs. {parseFloat(reportData.data.cogs || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-b border-slate-800 font-bold text-sm text-teal-300 bg-slate-950/60 px-3 rounded-lg">
                      <span>Gross Profit ({reportData.data.gross_margin_percent}% Margin):</span>
                      <span className="font-mono">Rs. {parseFloat(reportData.data.gross_profit || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-400">
                      <span>Less: Operating Expenses:</span>
                      <span className="font-mono">-Rs. {parseFloat(reportData.data.total_expenses || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t border-slate-700 font-bold text-base text-white bg-emerald-500/10 px-4 rounded-xl border border-emerald-500/30">
                      <span>Net Profit ({reportData.data.net_margin_percent}% Net Margin):</span>
                      <span className="text-emerald-400 font-mono">Rs. {parseFloat(reportData.data.net_profit || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 9: STAFF & SECURITY ──────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Staff Accounts & Access Control</h3>
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
                  <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setResettingUser(u);
                          setNewStaffPassword('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs transition border border-slate-700"
                        title="Reset Staff Password"
                      >
                        Reset Password
                      </button>
                    </td>
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

      {/* ──────────────── MODAL 1: RECORD PURCHASE & GRN (COMPLETE WORKFLOW) ──────────────── */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-400" />
                <h3 className="text-lg font-bold text-white">Record Purchase Invoice & Goods Receiving (GRN)</h3>
              </div>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">Supplier *</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickSupplierModalOpen(true)}
                      className="text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Supplier</span>
                    </button>
                  </div>
                  <select
                    required
                    value={purchaseForm.supplier_id}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Select distributor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company || 'Distributor'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Supplier Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-99410"
                    value={purchaseForm.supplier_invoice}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_invoice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Invoice / GRN Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Delivered Medicines & Batch Info</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseForm({
                        ...purchaseForm,
                        items: [
                          ...purchaseForm.items,
                          {
                            medicine_id: medicines[0]?.id || '',
                            quantity: 10,
                            unit_cost: medicines[0]?.cost_price || 10,
                            selling_price: medicines[0]?.selling_price || 15,
                            batch_number: 'BATCH-' + Date.now().toString().slice(-4),
                            expiry_date: '2028-12-31',
                          },
                        ],
                      });
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-teal-200 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {purchaseForm.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                      <div className="md:col-span-2">
                        <label className="text-[10px] text-slate-400">Medicine Product</label>
                        <select
                          value={item.medicine_id}
                          onChange={(e) => {
                            const med = medicines.find(m => String(m.id) === String(e.target.value));
                            const updated = [...purchaseForm.items];
                            updated[idx].medicine_id = e.target.value;
                            if (med) {
                              updated[idx].unit_cost = med.cost_price;
                              updated[idx].selling_price = med.selling_price;
                            }
                            setPurchaseForm({ ...purchaseForm, items: updated });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          <option value="">Select product...</option>
                          {medicines.map(m => (
                            <option key={m.id} value={m.id}>{m.trade_name} ({m.dosage || ''})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400">Batch #</label>
                        <input
                          type="text"
                          value={item.batch_number}
                          onChange={(e) => {
                            const updated = [...purchaseForm.items];
                            updated[idx].batch_number = e.target.value;
                            setPurchaseForm({ ...purchaseForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400">Expiry Date</label>
                        <input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => {
                            const updated = [...purchaseForm.items];
                            updated[idx].expiry_date = e.target.value;
                            setPurchaseForm({ ...purchaseForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400">Qty (Units)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...purchaseForm.items];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setPurchaseForm({ ...purchaseForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400">Cost (Rs.)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) => {
                              const updated = [...purchaseForm.items];
                              updated[idx].unit_cost = parseFloat(e.target.value) || 0;
                              setPurchaseForm({ ...purchaseForm, items: updated });
                            }}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                          />
                        </div>
                        {purchaseForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPurchaseForm({
                                ...purchaseForm,
                                items: purchaseForm.items.filter((_, i) => i !== idx),
                              });
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 mt-4"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Payments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Discount on Invoice (Rs.)</label>
                  <input
                    type="number"
                    value={purchaseForm.discount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Amount Paid Now (Rs.)</label>
                  <input
                    type="number"
                    value={purchaseForm.paid_amount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paid_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Payment Method</label>
                  <select
                    value={purchaseForm.payment_method}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Credit">Credit (Supplier Account)</option>
                  </select>
                </div>
              </div>

              {/* Calculated Total */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Total Purchase Invoice Amount:</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  Rs. {purchaseForm.items.reduce((s, i) => s + (i.unit_cost * (i.quantity || 0)), 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-bold"
                >
                  Confirm Purchase & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 2: SUPPLIER LEDGER STATEMENT ──────────────── */}
      {viewingLedgerSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{viewingLedgerSupplier.name} — Statement of Account</h3>
                <p className="text-xs text-slate-400">Current Balance: Rs. {viewingLedgerSupplier.balance || 0}</p>
              </div>
              <button onClick={() => setViewingLedgerSupplier(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Record Payment */}
            <form onSubmit={handleRecordSupplierPayment} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Payment Amount (Rs.)"
                value={supplierPaymentAmount}
                onChange={(e) => setSupplierPaymentAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
              >
                Disburse Payment
              </button>
            </form>

            <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Debit (Paid)</th>
                    <th className="py-2.5 px-3">Credit (Purchased)</th>
                    <th className="py-2.5 px-3">Balance (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {supplierLedgerEntries.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400 font-mono">{new Date(e.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-3 font-semibold text-teal-300">{e.transaction_type}</td>
                      <td className="py-2 px-3 font-mono text-emerald-400">{e.debit > 0 ? `Rs. ${e.debit}` : '-'}</td>
                      <td className="py-2 px-3 font-mono text-amber-400">{e.credit > 0 ? `Rs. ${e.credit}` : '-'}</td>
                      <td className="py-2 px-3 font-mono font-bold text-white">Rs. {e.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 3: CUSTOMER LEDGER STATEMENT ──────────────── */}
      {viewingLedgerCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{viewingLedgerCustomer.name} — Customer Credit Ledger</h3>
                <p className="text-xs text-slate-400">Outstanding Balance: Rs. {viewingLedgerCustomer.balance || 0}</p>
              </div>
              <button onClick={() => setViewingLedgerCustomer(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Record Payment */}
            <form onSubmit={handleRecordCustomerPayment} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Received Amount (Rs.)"
                value={customerPaymentAmount}
                onChange={(e) => setCustomerPaymentAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl"
              >
                Record Receipt
              </button>
            </form>

            <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Debit (Credit Sale)</th>
                    <th className="py-2.5 px-3">Credit (Paid)</th>
                    <th className="py-2.5 px-3">Balance (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customerLedgerEntries.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400 font-mono">{new Date(e.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-3 font-semibold text-teal-300">{e.transaction_type}</td>
                      <td className="py-2 px-3 font-mono text-rose-400">{e.debit > 0 ? `Rs. ${e.debit}` : '-'}</td>
                      <td className="py-2 px-3 font-mono text-emerald-400">{e.credit > 0 ? `Rs. ${e.credit}` : '-'}</td>
                      <td className="py-2 px-3 font-mono font-bold text-white">Rs. {e.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 4: ADMIN RESET STAFF PASSWORD ──────────────── */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-teal-400" />
              Reset Password for: {resettingUser.username}
            </h3>
            <form onSubmit={handleResetStaffPassword} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">New Staff Password (min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 5: PRINTABLE BARCODE STICKER LABEL ──────────────── */}
      {barcodePrintMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Barcode Label Sticker</span>
              <button onClick={() => setBarcodePrintMed(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="barcode-sticker" className="p-4 bg-white text-slate-950 rounded-xl text-center space-y-1 shadow-inner">
              <div className="font-bold text-sm tracking-tight">{barcodePrintMed.trade_name}</div>
              <div className="text-[11px] text-slate-600">{barcodePrintMed.dosage} • {barcodePrintMed.form}</div>
              <div className="font-mono text-xl font-bold py-1 tracking-widest">
                ||| | |||| | ||| ||
              </div>
              <div className="text-[10px] font-mono text-slate-700 font-bold">
                {barcodePrintMed.barcode || barcodePrintMed.product_code}
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-300 text-xs font-bold">
                <span>Exp: {barcodePrintMed.expiry_date || 'N/A'}</span>
                <span className="text-emerald-700">Rs. {parseFloat(barcodePrintMed.selling_price || 0).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sticker</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 6: ADD / EDIT MEDICINE ──────────────── */}
      {isMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">{editingMed ? 'Edit Medicine Product' : 'Add New Medicine Product'}</h3>
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
                  <label className="text-[11px] font-semibold text-slate-400">Cost Price / Pack (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost_price}
                    onChange={(e) => {
                      const cp = e.target.value;
                      const ppp = Math.max(1, parseInt(formData.pieces_per_pack) || 1);
                      const autoUcp = cp ? (parseFloat(cp) / ppp).toFixed(2) : '';
                      setFormData({ ...formData, cost_price: cp, unit_cost_price: autoUcp });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Selling Price / Pack (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => {
                      const sp = e.target.value;
                      const ppp = Math.max(1, parseInt(formData.pieces_per_pack) || 1);
                      const autoUsp = sp ? (parseFloat(sp) / ppp).toFixed(2) : '';
                      setFormData({ ...formData, selling_price: sp, unit_selling_price: autoUsp });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Stock Quantity (Packs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* ── Packaging & Loose Unit Dispensing Formulas ── */}
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5" />
                    Packaging Unit & Loose Dispensing Configuration
                  </span>
                  <span className="text-[10px] text-teal-400 font-semibold">✨ Auto-Calculates 1 Unit Price On Its Own</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">
                      Pieces in 1 Pack (Capsules/Tabs) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 30"
                      value={formData.pieces_per_pack || ''}
                      onChange={(e) => {
                        const pppVal = e.target.value;
                        const ppp = Math.max(1, parseInt(pppVal) || 1);
                        const autoUsp = formData.selling_price ? (parseFloat(formData.selling_price) / ppp).toFixed(2) : '';
                        const autoUcp = formData.cost_price ? (parseFloat(formData.cost_price) / ppp).toFixed(2) : '';
                        setFormData({
                          ...formData,
                          pieces_per_pack: pppVal,
                          unit_selling_price: autoUsp,
                          unit_cost_price: autoUcp,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/40 text-xs text-white focus:outline-none focus:border-teal-400 font-mono font-bold"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">e.g. 10 or 30 caps per packet</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">
                      Price per 1 Unit / Capsule (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Auto-calculated"
                      value={formData.unit_selling_price || ''}
                      onChange={(e) => setFormData({ ...formData, unit_selling_price: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-teal-500/50 text-xs text-teal-300 focus:outline-none focus:border-teal-400 font-mono font-bold"
                    />
                    <span className="text-[9px] text-teal-400 mt-0.5 block font-semibold">
                      Auto: Rs. {(parseFloat(formData.selling_price || 0) / Math.max(1, parseInt(formData.pieces_per_pack || 1))).toFixed(2)} /unit
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">
                      Cost per 1 Unit / Capsule (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Auto-calculated"
                      value={formData.unit_cost_price || ''}
                      onChange={(e) => setFormData({ ...formData, unit_cost_price: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">
                      Auto: Rs. {(parseFloat(formData.cost_price || 0) / Math.max(1, parseInt(formData.pieces_per_pack || 1))).toFixed(2)} /unit
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-teal-500/30 flex items-center justify-between font-mono">
                  <span>
                    💡 <strong className="text-white">{formData.pieces_per_pack || 1} {formData.form || 'units'}</strong> in 1 Pack @ <strong className="text-emerald-400">Rs. {parseFloat(formData.selling_price || 0).toFixed(2)}</strong>
                  </span>
                  <span className="text-teal-300 font-bold">
                    = Rs. {(parseFloat(formData.unit_selling_price) > 0 ? parseFloat(formData.unit_selling_price) : (parseFloat(formData.selling_price || 0) / Math.max(1, parseInt(formData.pieces_per_pack || 1)))).toFixed(2)} / {formData.form || 'capsule'}
                  </span>
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
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 7: STOCK ADJUSTMENT ──────────────── */}
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

      {/* ──────────────── MODAL 8: CREATE SUPPLIER RETURN ──────────────── */}
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

      {/* ──────────────── MODAL 9: CREATE CUSTOMER ──────────────── */}
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

      {/* ──────────────── MODAL 10: CREATE STAFF USER ──────────────── */}
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
                  Create Staff User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 11: QUICK ADD SUPPLIER ──────────────── */}
      {isQuickSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-400" />
                <span>Add New Supplier / Distributor</span>
              </h3>
              <button onClick={() => setIsQuickSupplierModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSupplier} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Supplier / Distributor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shaheen Pharmaceuticals"
                  value={quickSupplierForm.name}
                  onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. GSK Distributor"
                  value={quickSupplierForm.company}
                  onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, company: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Phone</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={quickSupplierForm.phone}
                    onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Address / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore"
                    value={quickSupplierForm.address}
                    onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 8: REPRINT SALES RECEIPT ──────────────── */}
      {reprintReceipt && (
        <ReceiptModal
          receipt={reprintReceipt}
          onClose={() => setReprintReceipt(null)}
          onNewSale={() => setReprintReceipt(null)}
        />
      )}

    </div>
  );
}
