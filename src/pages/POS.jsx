import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import CameraScannerModal from '../components/CameraScannerModal';

export default function POS() {
  const { token, user, showToast } = useAuth();

  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedForm, setSelectedForm] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Modals
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // USB Barcode Buffer
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // 1. Fetch Inventory Stock
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

  useEffect(() => {
    fetchMedicines();
  }, [search, selectedForm]);

  // 2. USB Barcode Reader Listener Setup
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keystrokes when typing inside inputs unless it's an ENTER scan key
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      
      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 6) {
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

  // 3. Process Scanned Barcode
  const handleBarcodeScan = async (scannedBarcode) => {
    try {
      const res = await fetch(`/api/medicines/barcode/${scannedBarcode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success && data.medicine) {
        addToCart(data.medicine);
        showToast(`Scanned: ${data.medicine.trade_name} (${data.medicine.dosage})`, 'success');
      } else {
        showToast(data.message || `Barcode [${scannedBarcode}] not found`, 'error');
      }
    } catch (err) {
      showToast('Error scanning barcode', 'error');
    }
  };

  // 4. Cart Operations
  const addToCart = (medicine) => {
    if (medicine.stock_quantity === 0) {
      showToast(`Cannot add [${medicine.trade_name}] - Item is Out of Stock!`, 'error');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === medicine.id);
      if (existing) {
        if (existing.quantity >= medicine.stock_quantity) {
          showToast(`Cannot add more [${medicine.trade_name}]. Reached stock limit (${medicine.stock_quantity}).`, 'error');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...medicine, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock_quantity) {
              showToast(`Stock limit reached (${item.stock_quantity} available)`, 'error');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('Walk-in Customer');
  };

  // Totals Computation
  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const totalAmount = Math.max(0, subtotal - parseFloat(discount || 0));

  // 5. Complete Sale Checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    try {
      setCheckoutLoading(true);
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart,
          customer_name: customerName,
          discount: parseFloat(discount || 0),
          payment_method: paymentMethod,
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

  const categories = ['ALL', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Inhaler'];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
      
      {/* Top Banner Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Point of Sale (POS)</h2>
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Scanner Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Scan USB barcode, search medicine name, or click items to add to cart.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCameraScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-600/20 transition"
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

      {/* Main Grid: Left Stock Search Table (2/3 width), Right Live Cart (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Stock Search & Inventory Table */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search Input & Category Filters */}
          <div className="glass-card p-4 rounded-2xl space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Medicine Name, Generic Formula, Brand, Barcode, or Rack Number..."
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

          {/* Medicines Grid / Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Medicine Details</th>
                    <th className="py-3 px-3">Dosage / Form</th>
                    <th className="py-3 px-3">Rack</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Stock Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
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
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => addToCart(med)}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-white group-hover:text-teal-300 transition">
                            {med.trade_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{med.generic_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            UPC: {med.barcode} | {med.manufacturer}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold">
                            {med.dosage}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1 font-medium">{med.form}</span>
                        </td>

                        <td className="py-3.5 px-3 font-medium text-slate-300">
                          <div className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3 text-sky-400" />
                            <span>{med.rack_location}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-sm text-white">
                          ${med.selling_price.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3">
                          {med.stock_quantity === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              Out of Stock
                            </span>
                          ) : med.stock_quantity <= med.min_stock_alert ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              {med.stock_quantity} left (Low)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              {med.stock_quantity} in Stock
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(med);
                            }}
                            disabled={med.stock_quantity === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto transition ${
                              med.stock_quantity === 0
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-teal-500/10 hover:bg-teal-500 text-teal-300 hover:text-slate-950 border border-teal-500/30 font-bold'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
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

        {/* Right Column: Live Cart & Billing Summary */}
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col h-full min-h-[600px] justify-between">
            
            <div>
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-teal-400" />
                  <h3 className="font-bold text-white text-lg">Live Bill Cart</h3>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs">
                    {cart.reduce((s, i) => s + i.quantity, 0)} Items
                  </span>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="py-4 space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <ShoppingCart className="w-12 h-12 mx-auto opacity-30" />
                    <p className="text-sm font-semibold">Cart is currently empty</p>
                    <p className="text-xs">Scan a barcode or click medicine items to build bill</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-white truncate">{item.trade_name}</div>
                        <div className="text-[10px] text-slate-400">{item.dosage} • ${item.selling_price.toFixed(2)}</div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 text-slate-400 hover:text-white transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold text-teal-300 w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 text-slate-400 hover:text-white transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-emerald-400">
                          ${(item.selling_price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-500 hover:text-rose-400 transition mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Customer & Billing Options */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setPaymentMethod('Cash')}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
                      paymentMethod === 'Cash'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('Card')}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
                      paymentMethod === 'Card'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card / POS</span>
                  </button>
                </div>
              </div>

              {/* Grand Total Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">${subtotal.toFixed(2)}</span>
                </div>
                {parseFloat(discount || 0) > 0 && (
                  <div className="flex justify-between text-xs text-rose-400">
                    <span>Discount:</span>
                    <span className="font-mono">-${parseFloat(discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Amount:</span>
                  <span className="font-mono text-emerald-400">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Complete Sale Button */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || checkoutLoading}
                className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
                  cart.length === 0 || checkoutLoading
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-98'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>{checkoutLoading ? 'Processing Sale...' : 'COMPLETE SALE & PRINT BILL'}</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Modals */}
      <ReceiptModal
        receipt={completedReceipt}
        onClose={() => setCompletedReceipt(null)}
        onNewSale={clearCart}
      />

      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={handleBarcodeScan}
      />
    </div>
  );
}
