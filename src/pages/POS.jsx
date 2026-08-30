import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Scan,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Package,
  Layers,
  MapPin,
  Tag,
  CreditCard,
  Banknote,
  Camera,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  User,
  Percent,
  Calculator,
  Clock,
  ShieldAlert,
  Bell,
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import CameraScannerModal from '../components/CameraScannerModal';

const getDynamicUnitPresets = (piecesPerPack, maxAvailable) => {
  const ppp = Math.max(1, parseInt(piecesPerPack) || 1);
  const list = [];

  if (ppp === 1) {
    list.push({ val: 1, label: '1 Unit' });
    list.push({ val: 2, label: '2 Units' });
    list.push({ val: 3, label: '3 Units' });
    list.push({ val: 5, label: '5 Units' });
  } else if (ppp <= 6) {
    for (let i = 1; i <= ppp; i++) {
      list.push({ val: i, label: i === ppp ? `${i} (Full Pk)` : `${i} Units` });
    }
  } else if (ppp <= 12) {
    // E.g. Panadol (10 units per packet)
    list.push({ val: 1, label: '1 Unit' });
    list.push({ val: 2, label: '2 Units' });
    if (ppp >= 5) list.push({ val: Math.floor(ppp / 2), label: `${Math.floor(ppp / 2)} Units` });
    list.push({ val: ppp, label: `${ppp} Units (Full Pk)` });
  } else if (ppp <= 20) {
    list.push({ val: 1, label: '1 Unit' });
    list.push({ val: 2, label: '2 Units' });
    list.push({ val: 5, label: '5 Units' });
    list.push({ val: Math.floor(ppp / 2), label: `${Math.floor(ppp / 2)} Units (Half)` });
    list.push({ val: ppp, label: `${ppp} Units (Full Pk)` });
  } else {
    // E.g. 30 capsules in 1 packet
    list.push({ val: 1, label: '1 Unit' });
    list.push({ val: 5, label: '5 Units' });
    list.push({ val: 10, label: '10 Units' });
    list.push({ val: Math.floor(ppp / 2), label: `${Math.floor(ppp / 2)} Units (Half)` });
    list.push({ val: ppp, label: `${ppp} Units (Full Pk)` });
  }

  return list.filter((item) => item.val <= maxAvailable);
};

export default function POS() {
  const { token, user, showToast } = useAuth();

  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedForm, setSelectedForm] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [parkedCarts, setParkedCarts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percent'
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Modals
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Active shift & Shift Modals
  const [activeShift, setActiveShift] = useState(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState(1000);
  const [closingCashInput, setClosingCashInput] = useState('');
  const [shiftSummary, setShiftSummary] = useState(null);

  // Quick Add Customer Modal
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: '', phone: '', credit_limit: 5000 });

  const handleSaveQuickCustomer = async (e) => {
    e.preventDefault();
    if (!quickCustomerForm.name || !quickCustomerForm.name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...quickCustomerForm,
          credit_limit: parseFloat(quickCustomerForm.credit_limit || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Customer ${quickCustomerForm.name} created and selected!`, 'success');
        setIsQuickCustomerModalOpen(false);
        const newCustId = data.customerId || data.customer?.id;
        setQuickCustomerForm({ name: '', phone: '', credit_limit: 5000 });
        await fetchAuxData();
        if (newCustId) {
          setSelectedCustomerId(String(newCustId));
          setCustomerName(quickCustomerForm.name);
        }
      } else {
        showToast(data.message || 'Failed to create customer', 'error');
      }
    } catch (err) {
      showToast('Error creating customer', 'error');
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ opening_cash: parseFloat(openingCashInput || 0) }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Cashier shift opened successfully!', 'success');
        setIsOpenShiftModalOpen(false);
        setActiveShift(data.shift);
      } else {
        showToast(data.message || 'Failed to open shift', 'error');
      }
    } catch (err) {
      showToast('Error opening shift', 'error');
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (closingCashInput === '' || parseFloat(closingCashInput) < 0) {
      showToast('Please enter the actual counted cash in drawer', 'error');
      return;
    }
    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ actual_cash: parseFloat(closingCashInput) }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Shift closed and drawer reconciled!', 'success');
        setIsCloseShiftModalOpen(false);
        setShiftSummary(data.shift);
        setActiveShift(null);
        setClosingCashInput('');
      } else {
        showToast(data.message || 'Failed to close shift', 'error');
      }
    } catch (err) {
      showToast('Error closing shift', 'error');
    }
  };

  // USB Barcode Buffer
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const searchInputRef = useRef(null);

  // 1. Fetch Inventory Stock & Customers & Active Shift
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/medicines', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (selectedForm !== 'ALL') url.searchParams.append('form', selectedForm);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMedicines(data.medicines);
      }
    } catch (err) {
      showToast('Error loading medicines list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      // Fetch customers
      const cRes = await fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } });
      const cData = await cRes.json();
      if (cData.success) setCustomers(cData.customers);

      // Fetch shift
      const sRes = await fetch('/api/shifts/current', { headers: { Authorization: `Bearer ${token}` } });
      const sData = await sRes.json();
      if (sData.success) setActiveShift(sData.shift);
    } catch (err) {
      // optional
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [search, selectedForm]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  // 2. USB Barcode Reader Listener Setup
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 4) {
          handleBarcodeScan(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
          if (isInput) e.preventDefault();
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [medicines]);

  // 3. Process Scanned Barcode or Product Code
  const handleBarcodeScan = async (code) => {
    try {
      const trimmed = code.trim();
      let res = await fetch(`/api/medicines/barcode/${trimmed}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = await res.json();

      if (!data.success) {
        // Try product code
        res = await fetch(`/api/medicines/code/${trimmed}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        data = await res.json();
      }

      if (data.success && data.medicine) {
        addToCart(data.medicine);
        showToast(`Added: ${data.medicine.trade_name} (${data.medicine.dosage || ''})`, 'success');
      } else {
        showToast(data.message || `Product code / barcode [${trimmed}] not found`, 'error');
      }
    } catch (err) {
      showToast('Error scanning code', 'error');
    }
  };

  // 4. Cart Operations (Unified Exact Unit Dispensing)
  const addToCart = (medicine, initialQty = 1) => {
    // 1. Expiration Safety Check
    if (medicine.expiry_date) {
      const expDate = new Date(medicine.expiry_date);
      const today = new Date();
      if (expDate < today) {
        showToast(`🚨 CRITICAL SAFETY ALERT: Cannot dispense [${medicine.trade_name}] — Expired on ${medicine.expiry_date}!`, 'error');
        return;
      }
    }

    const ppp = Math.max(1, parseInt(medicine.pieces_per_pack) || 1);
    const totalLoose = Math.round(parseFloat(medicine.stock_quantity || 0) * ppp);

    // 2. Stock Out Check
    if (totalLoose <= 0) {
      showToast(`Cannot add [${medicine.trade_name}] - Item is Out of Stock!`, 'error');
      return;
    }

    const unitPrice = parseFloat(medicine.unit_selling_price) > 0
      ? parseFloat(medicine.unit_selling_price)
      : parseFloat((parseFloat(medicine.selling_price || 0) / ppp).toFixed(2));

    const qtyToAdd = Math.max(1, parseInt(initialQty) || 1);

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.id === medicine.id);

      if (existingIdx >= 0) {
        const existing = prevCart[existingIdx];
        const newQty = existing.quantity + qtyToAdd;
        if (newQty > totalLoose) {
          showToast(`Stock limit reached (${totalLoose} units available)`, 'error');
          return prevCart;
        }
        return prevCart.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: newQty } : item
        );
      }

      return [
        ...prevCart,
        {
          ...medicine,
          cart_key: `med_${medicine.id}`,
          sale_unit: 'piece',
          pieces_per_pack: ppp,
          unit_selling_price: unitPrice,
          unit_cost_price: parseFloat(medicine.unit_cost_price) > 0
            ? parseFloat(medicine.unit_cost_price)
            : parseFloat((parseFloat(medicine.cost_price || 0) / ppp).toFixed(2)),
          quantity: Math.min(qtyToAdd, totalLoose),
        }
      ];
    });
  };

  const setItemExactQty = (medId, exactQty) => {
    const qty = parseInt(exactQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === medId || item.cart_key === medId) {
          const ppp = Math.max(1, parseInt(item.pieces_per_pack) || 1);
          const totalLoose = Math.round(parseFloat(item.stock_quantity || 0) * ppp);
          if (qty > totalLoose) {
            showToast(`Max stock is ${totalLoose} units`, 'error');
            return { ...item, quantity: totalLoose };
          }
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  const updateQuantityDelta = (medId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === medId || item.cart_key === medId) {
            const ppp = Math.max(1, parseInt(item.pieces_per_pack) || 1);
            const totalLoose = Math.round(parseFloat(item.stock_quantity || 0) * ppp);
            const newQty = item.quantity + delta;
            if (newQty > totalLoose) {
              showToast(`Stock limit reached (${totalLoose} units available)`, 'error');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (medId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== medId && item.cart_key !== medId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
  };

  // 5. Hold / Resume Parked Sales
  const handleHoldSale = () => {
    if (cart.length === 0) {
      showToast('No items in cart to hold', 'error');
      return;
    }
    const newParked = {
      id: Date.now(),
      timestamp: new Date(),
      customerName,
      selectedCustomerId,
      discount,
      discountType,
      paymentMethod,
      cart: [...cart],
    };
    setParkedCarts((prev) => [...prev, newParked]);
    clearCart();
    showToast('Sale parked on hold', 'success');
  };

  const handleResumeSale = (parkedId) => {
    const target = parkedCarts.find((p) => p.id === parkedId);
    if (!target) return;
    setCart(target.cart);
    setCustomerName(target.customerName);
    setSelectedCustomerId(target.selectedCustomerId);
    setDiscount(target.discount);
    setDiscountType(target.discountType);
    setPaymentMethod(target.paymentMethod);
    setParkedCarts((prev) => prev.filter((p) => p.id !== parkedId));
    showToast('Resumed parked sale', 'success');
  };

  // Customer selection change
  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    if (!custId) {
      setCustomerName('Walk-in Customer');
    } else {
      const cust = customers.find((c) => String(c.id) === String(custId));
      if (cust) setCustomerName(cust.name);
    }
  };

  const getItemPrice = (item) => {
    const ppp = Math.max(1, parseInt(item.pieces_per_pack) || 1);
    return parseFloat(item.unit_selling_price) > 0
      ? parseFloat(item.unit_selling_price)
      : parseFloat((parseFloat(item.selling_price || 0) / ppp).toFixed(2));
  };

  // Totals Computation
  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const calculatedDiscount =
    discountType === 'percent'
      ? (subtotal * parseFloat(discount || 0)) / 100
      : parseFloat(discount || 0);
  const totalAmount = Math.max(0, subtotal - calculatedDiscount);

  // 6. Complete Sale Checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    try {
      setCheckoutLoading(true);
      const itemsPayload = cart.map((item) => {
        const ppp = Math.max(1, parseInt(item.pieces_per_pack) || 1);
        const unitPrice = getItemPrice(item);

        return {
          ...item,
          sale_unit: 'piece',
          pieces_per_pack: ppp,
          unit_price: unitPrice,
          unit_selling_price: unitPrice,
          quantity: item.quantity,
        };
      });

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: itemsPayload,
          customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
          customer_name: customerName,
          discount: calculatedDiscount,
          payment_method: paymentMethod,
          shift_id: activeShift?.id || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Sale completed successfully!', 'success');
        setCompletedReceipt(data.receipt);
        clearCart();
        fetchMedicines(); // Refresh stock counts instantly
      } else {
        showToast(data.message || 'Checkout failed', 'error');
      }
    } catch (err) {
      showToast('Network error processing checkout', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const categories = ['ALL', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Inhaler', 'Drops', 'Vitamins'];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 animate-fade-in">
      
      {/* Top Banner Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">One Ten Pharmacy POS</h2>
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Scanner Ready
            </span>
            <span className="px-2.5 py-1 text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-lg">
              PKR (Rs.)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Scan barcode, search medicine name, SKU code (e.g. MED-000001), or click items. Full & fractional selling supported.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Shift Status Badge */}
          {activeShift ? (
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-300">Shift #{activeShift.id} (Float: Rs. {activeShift.opening_cash})</span>
              <button
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="text-[11px] bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 px-2 py-0.5 rounded-lg font-bold transition ml-1"
              >
                Close Shift
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Open Cashier Shift</span>
            </button>
          )}

          {parkedCarts.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <PauseCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Parked ({parkedCarts.length})</span>
              <button
                onClick={() => handleResumeSale(parkedCarts[0].id)}
                className="text-xs bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-md hover:bg-amber-400 transition"
              >
                Resume
              </button>
            </div>
          )}

          <button
            onClick={() => setIsCameraScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-600/20 transition"
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>

          <button
            onClick={fetchMedicines}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Stock Search & Inventory Table */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search Input & Category Filters */}
          <div className="glass-card p-4 rounded-2xl space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Product Name, Generic Formula, SKU Code (MED-000001), Barcode, Brand, Rack..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm shadow-inner"
              />
            </div>

            {/* Filter Category Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedForm(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedForm === cat
                      ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Medicines Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Medicine Details</th>
                    <th className="py-3 px-3">SKU / Barcode</th>
                    <th className="py-3 px-3">Rack</th>
                    <th className="py-3 px-3">Price (PKR)</th>
                    <th className="py-3 px-3">Stock Available</th>
                    <th className="py-3 px-4 text-right">Sell Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {medicines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No medicines match your search criteria</p>
                      </td>
                    </tr>
                  ) : (
                    medicines.map((med) => (
                      <tr
                        key={med.id}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-white group-hover:text-teal-300 transition">
                            {med.trade_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{med.generic_name || med.brand || 'General'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {med.dosage || ''} • {med.form || ''}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-bold">{med.product_code || 'MED-000'}</span>
                          {med.barcode && <div className="text-[10px] text-slate-400 mt-0.5">{med.barcode}</div>}
                        </td>

                        <td className="py-3 px-3 font-medium text-slate-300">
                          <div className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3 text-sky-400" />
                            <span>{med.rack_location || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="font-bold text-sm text-white">
                            Rs. {parseFloat(med.selling_price || 0).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/pk</span>
                          </div>
                          {med.pieces_per_pack > 1 && (
                            <div className="text-[10px] text-teal-300 font-bold mt-0.5">
                              Rs. {parseFloat(med.unit_selling_price || (med.selling_price / med.pieces_per_pack)).toFixed(2)} / {med.form?.toLowerCase() || 'cap'}
                              <span className="text-[9px] text-slate-400 font-normal ml-1">({med.pieces_per_pack}/pk)</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {/* Stock Status Badge */}
                            {med.stock_quantity <= 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <XCircle className="w-3 h-3" />
                                Out of Stock
                              </span>
                            ) : med.stock_quantity <= med.min_stock_alert ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Low: {med.stock_display || `${med.stock_quantity} left`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle className="w-3 h-3" />
                                {med.stock_display || `${med.stock_quantity} in Stock`}
                              </span>
                            )}

                            {/* Expiry Warning Badge */}
                            {med.expiry_date && (
                              <div>
                                {new Date(med.expiry_date) < new Date() ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    EXPIRED ({med.expiry_date})
                                  </span>
                                ) : (new Date(med.expiry_date) - new Date()) / (1000 * 60 * 60 * 24) <= 90 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    <Clock className="w-2.5 h-2.5" />
                                    Exp: {Math.ceil((new Date(med.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))}d ({med.expiry_date})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Exp: {med.expiry_date}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {med.expiry_date && new Date(med.expiry_date) < new Date() ? (
                            <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase">
                              Blocked (Expired)
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => addToCart(med, 1)}
                                disabled={med.stock_quantity <= 0}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                  med.stock_quantity <= 0
                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-sm active:scale-95'
                                }`}
                                title="Add 1 Unit to cart (you can adjust or type exact units in cart)"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ 1 Unit</span>
                              </button>
                              {med.pieces_per_pack > 1 && (
                                <button
                                  onClick={() => addToCart(med, med.pieces_per_pack)}
                                  disabled={med.stock_quantity < 1}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                                    med.stock_quantity < 1
                                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                                      : 'border-teal-500/40 bg-teal-500/10 text-teal-300 hover:bg-teal-500 hover:text-slate-950 active:scale-95'
                                  }`}
                                  title={`Add 1 Complete Pack (${med.pieces_per_pack} units)`}
                                >
                                  Pack ({med.pieces_per_pack}u)
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Live Cart & Billing Summary */}
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col h-full min-h-[640px] justify-between">
            
            <div className="space-y-4">
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-teal-400" />
                  <h3 className="font-bold text-white text-lg">Billing Cart</h3>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs">
                    {cart.length} Products
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      onClick={handleHoldSale}
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 transition"
                      title="Hold / Park Sale"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      Hold
                    </button>
                  )}
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition px-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-teal-400" />
                    <span>Customer Profile (Walk-in or Credit)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerModalOpen(true)}
                    className="text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ New Customer</span>
                  </button>
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={handleCustomerChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="">Walk-in Customer (Cash)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - Bal: Rs. {c.balance || 0}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items List */}
              <div className="py-1 space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-14 text-center text-slate-500 space-y-2">
                    <ShoppingCart className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-sm font-semibold">Cart is currently empty</p>
                    <p className="text-xs">Scan or click medicines on left to bill</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const itemKey = item.cart_key || `${item.id}_${item.sale_unit || 'pack'}`;
                    const ppp = Math.max(1, parseInt(item.pieces_per_pack) || 1);
                    const isPiece = item.sale_unit === 'piece';
                    const itemPrice = getItemPrice(item);
                    const totalItemCost = itemPrice * item.quantity;
                    const totalLooseAvail = Math.round(parseFloat(item.stock_quantity || 0) * ppp);

                    return (
                      <div
                        key={itemKey}
                        className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-2.5 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-white truncate">{item.trade_name}</span>
                              {ppp > 1 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-teal-300 border border-slate-700">
                                  {ppp} {item.form || 'units'}/pk
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Rate: <strong className="text-slate-200">Rs. {itemPrice.toFixed(2)}</strong> / {item.form?.toLowerCase() || 'unit'}
                              {' • '}Avail: <strong className="text-teal-300">{totalLooseAvail} units</strong> {ppp > 1 && `(${item.stock_quantity} pk)`}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-extrabold text-sm text-emerald-400">
                              Rs. {totalItemCost.toFixed(2)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="text-[10px] text-rose-400 hover:text-rose-300 inline-flex items-center gap-0.5 mt-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Unified Unit Dispensing Section */}
                        <div className="p-3 rounded-2xl bg-slate-950/90 border border-teal-500/40 space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-teal-400" />
                              Units to Dispense ({item.form || 'Capsules'}):
                            </span>
                            {ppp > 1 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                1 Pack = {ppp} units
                              </span>
                            )}
                          </div>

                          {/* Stepper with Direct Numeric Input */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantityDelta(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className={`w-9 h-9 rounded-xl font-extrabold flex items-center justify-center transition border ${
                                item.quantity <= 1
                                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700 active:scale-95'
                              }`}
                              title="Decrease 1 unit"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <div className="flex-1 relative">
                              <input
                                type="number"
                                min="1"
                                max={totalLooseAvail}
                                value={item.quantity}
                                onChange={(e) => setItemExactQty(item.id, e.target.value)}
                                placeholder="e.g. 6"
                                className="w-full py-2 px-3 text-center bg-slate-900 border-2 border-teal-500/60 focus:border-teal-400 rounded-xl font-mono text-lg font-black text-teal-300 focus:outline-none shadow-inner"
                              />
                              <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-semibold pointer-events-none uppercase tracking-wider">
                                {item.form === 'Capsule' ? 'Caps' : item.form === 'Tablet' ? 'Tabs' : 'Units'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => updateQuantityDelta(item.id, 1)}
                              disabled={item.quantity >= totalLooseAvail}
                              className={`w-9 h-9 rounded-xl font-extrabold flex items-center justify-center transition border ${
                                item.quantity >= totalLooseAvail
                                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-teal-500 border-teal-400 text-slate-950 hover:bg-teal-400 active:scale-95'
                              }`}
                              title="Increase 1 unit"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Dynamic Unit Presets tailored for this medicine */}
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                              <span>Quick Unit Presets:</span>
                              {ppp > 1 && (
                                <span className="text-teal-400 text-[10px]">Max in 1 Pack: {ppp} units</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {getDynamicUnitPresets(ppp, totalLooseAvail).map((preset) => {
                                const isFullPack = preset.val === ppp && ppp > 1;
                                return (
                                  <button
                                    key={preset.val}
                                    type="button"
                                    onClick={() => setItemExactQty(item.id, preset.val)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                      Math.abs(item.quantity - preset.val) < 0.01
                                        ? 'bg-teal-500 text-slate-950 shadow-md ring-1 ring-teal-400'
                                        : isFullPack
                                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Live Dynamic Formula Calculation Banner */}
                          <div className="text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 font-mono flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span>
                                💡 <strong className="text-white">{item.quantity} {item.form || 'units'}</strong> × Rs. {itemPrice.toFixed(2)}
                              </span>
                              <span className="font-extrabold text-emerald-400 text-sm">
                                = Rs. {totalItemCost.toFixed(2)}
                              </span>
                            </div>
                            {ppp > 1 && (
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                (Rate: Rs. {parseFloat(item.selling_price || 0).toFixed(2)} complete pack of {ppp} = Rs. {itemPrice.toFixed(2)}/unit)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Checkout Panel */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              
              {/* Discount Input & Type */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                  <Tag className="w-3.5 h-3.5 text-slate-400 mr-2" />
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="Discount"
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="flex bg-slate-900 rounded-xl border border-slate-700 p-0.5">
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                      discountType === 'fixed' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Rs.
                  </button>
                  <button
                    onClick={() => setDiscountType('percent')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                      discountType === 'percent' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-2">
                {['Cash', 'Card', 'Credit'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === method
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {method === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                    {method === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                    {method === 'Credit' && <User className="w-3.5 h-3.5" />}
                    <span>{method}</span>
                  </button>
                ))}
              </div>

              {/* Bill Totals Summary */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-white">Rs. {subtotal.toFixed(2)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount:</span>
                    <span className="font-mono">-Rs. {calculatedDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-slate-800 font-bold text-sm text-white">
                  <span>Net Payable:</span>
                  <span className="text-emerald-400 font-mono text-base">Rs. {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || checkoutLoading}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-xl ${
                  cart.length === 0 || checkoutLoading
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-teal-500/25 active:scale-[0.98]'
                }`}
              >
                {checkoutLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{checkoutLoading ? 'Processing Sale...' : `Complete Checkout (Rs. ${totalAmount.toFixed(2)})`}</span>
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* Modals */}
      {completedReceipt && (
        <ReceiptModal
          receipt={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
          onNewSale={() => setCompletedReceipt(null)}
        />
      )}

      {isCameraScannerOpen && (
        <CameraScannerModal
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={(scanned) => {
            handleBarcodeScan(scanned);
            setIsCameraScannerOpen(false);
          }}
        />
      )}

      {/* ── OPEN SHIFT MODAL ── */}
      {isOpenShiftModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl my-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-teal-400" />
              <span>Open Cashier Drawer Shift</span>
            </h3>
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Opening Cash Float (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-teal-500 mt-1"
                />
                <p className="text-[10px] text-slate-500 mt-1">Starting cash float placed in drawer for change</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-bold transition shadow-md shadow-teal-500/20"
                >
                  Start Shift
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── CLOSE SHIFT MODAL ── */}
      {isCloseShiftModalOpen && activeShift && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl my-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-rose-400" />
              <span>Close Shift #{activeShift.id} & Reconcile Drawer</span>
            </h3>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Opening Float:</span>
                <span className="font-mono text-white">Rs. {parseFloat(activeShift.opening_cash || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Cash Sales:</span>
                <span className="font-mono text-emerald-400">Rs. {parseFloat(activeShift.total_cash_sales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Expected Drawer Total:</span>
                <span className="font-mono font-bold text-teal-300">
                  Rs. {(parseFloat(activeShift.opening_cash || 0) + parseFloat(activeShift.total_cash_sales || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Actual Physical Counted Cash (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingCashInput}
                  onChange={(e) => setClosingCashInput(e.target.value)}
                  placeholder="Enter counted cash in drawer"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-teal-500 mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition"
                >
                  Reconcile & Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── QUICK ADD CUSTOMER MODAL ── */}
      {isQuickCustomerModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl my-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-teal-400" />
              <span>Create Customer Profile</span>
            </h3>
            <form onSubmit={handleSaveQuickCustomer} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shayan Ali"
                  value={quickCustomerForm.name}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Phone Number</label>
                <input
                  type="text"
                  placeholder="0355-5456348"
                  value={quickCustomerForm.phone}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Credit Limit (Rs.)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={quickCustomerForm.credit_limit}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, credit_limit: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20 transition"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
