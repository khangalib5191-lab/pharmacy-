import React from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';

export default function ReceiptModal({ receipt, onClose, onNewSale }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatQty = (qty) => {
    const num = parseFloat(qty);
    if (isNaN(num)) return qty;
    if (Math.abs(num - 0.5) < 0.001) return '½ (0.5)';
    if (Math.abs(num - 0.333) < 0.01) return '⅓ (0.33)';
    if (Math.abs(num - 0.25) < 0.001) return '¼ (0.25)';
    if (Math.abs(num - 0.2) < 0.001) return '⅕ (0.2)';
    if (Math.abs(num - 0.166) < 0.01) return '⅙ (0.17)';
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (No print) */}
        <div className="no-print p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Sale Completed Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-6 overflow-y-auto" id="printable-receipt">
          <div className="text-center pb-4 border-b border-slate-700/60">
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">One Ten Pharmacy</h2>
            <p className="text-xs text-slate-400">123 Health Care Boulevard, Main Market</p>
            <p className="text-xs text-slate-400">Tel: +92-300-0000000 | Pharmacy POS</p>
          </div>

          {/* Receipt Info */}
          <div className="py-3 border-b border-slate-700/60 text-xs space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Receipt #:</span>
              <span className="font-mono font-bold text-teal-300">{receipt.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date & Time:</span>
              <span>{new Date(receipt.date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cashier:</span>
              <span>{receipt.cashier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Customer:</span>
              <span>{receipt.customer_name || 'Walk-in Customer'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Method:</span>
              <span className="font-semibold text-sky-400">{receipt.payment_method}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-3 border-b border-slate-700/60">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-200">
                {receipt.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 font-medium">
                      {item.trade_name} <span className="text-[10px] text-slate-400">({item.dosage || ''})</span>
                    </td>
                    <td className="py-1.5 text-center font-semibold text-emerald-400">{formatQty(item.quantity)}</td>
                    <td className="py-1.5 text-right font-mono">Rs. {parseFloat(item.unit_price || 0).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono font-semibold text-emerald-400">
                      Rs. {parseFloat(item.total_price || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Totals */}
          <div className="pt-3 space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal:</span>
              <span className="font-mono">Rs. {parseFloat(receipt.subtotal || 0).toFixed(2)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Discount Applied:</span>
                <span className="font-mono">-Rs. {parseFloat(receipt.discount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-700/60 text-base font-bold text-white">
              <span>Grand Total:</span>
              <span className="text-emerald-400 font-mono">Rs. {parseFloat(receipt.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 text-center text-[10px] text-slate-500 border-t border-slate-800 mt-4">
            <p>Thank you for choosing PharmaConnect Pharmacy!</p>
            <p>Medicines once sold cannot be returned without original receipt.</p>
          </div>
        </div>

        {/* Action Buttons (No print) */}
        <div className="no-print p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition shadow-sm border border-slate-700"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-teal-500/20"
          >
            <span>Next Customer</span>
          </button>
        </div>

      </div>
    </div>
  );
}
