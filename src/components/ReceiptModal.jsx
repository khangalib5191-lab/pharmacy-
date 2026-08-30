import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, CheckCircle2, X, FileText, Sparkles, Building2, Phone } from 'lucide-react';

export default function ReceiptModal({ receipt, onClose, onNewSale }) {
  if (!receipt) return null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handlePrint();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const totalItemsCount = receipt.items?.length || 0;
  const totalUnitsCount = receipt.items?.reduce((acc, item) => acc + (parseFloat(item.quantity) || 0), 0) || 0;

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* Header Action Bar (Screen Only - No print) */}
        <div className="no-print p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Sale Completed Successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-md shadow-teal-500/20 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 overflow-y-auto bg-slate-900 text-white" id="printable-receipt">
          
          {/* Pharmacy Top Header */}
          <div className="text-center pb-3 border-b border-slate-700/80 print-border-dark space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight uppercase print-text-dark text-white font-serif">
              One Ten Pharmacy
            </h2>
            <p className="text-[11px] text-slate-300 print-text-dark font-medium">
              Main Commercial Boulevard, Phase 2, Market Center
            </p>
            <p className="text-[10px] text-slate-400 print-text-dark font-medium">
              Tel: 0355-5456348 (+92 355 5456348) • Drug License: DL-PK-2026-110
            </p>
            <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-300 border border-teal-500/30 print-text-dark">
              Retail Sales Invoice
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="py-2.5 text-xs border-b border-slate-700/80 print-border-dark space-y-1 text-slate-300 print-text-dark">
            <div className="flex justify-between">
              <span className="text-slate-400 print-text-dark">Invoice #:</span>
              <span className="font-mono font-bold text-white print-text-dark">{receipt.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print-text-dark">Date & Time:</span>
              <span className="font-mono">{new Date(receipt.created_at || Date.now()).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print-text-dark">Cashier:</span>
              <span className="font-medium">{receipt.cashier_name || 'Staff Cashier'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print-text-dark">Customer:</span>
              <span className="font-semibold text-teal-300 print-text-dark">{receipt.customer_name || 'Walk-in Customer'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print-text-dark">Payment Mode:</span>
              <span className="font-bold text-emerald-400 print-text-dark">{receipt.payment_method || 'Cash'}</span>
            </div>
          </div>

          {/* Itemized Medicine Table */}
          <div className="py-2.5 border-b border-slate-700/80 print-border-dark">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 print-text-dark font-bold uppercase text-[10px] border-b border-slate-800 print-border-dark pb-1">
                  <th className="py-1 text-left">Description</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 print-border-dark text-slate-200 print-text-dark">
                {receipt.items?.map((item, idx) => {
                  const ppp = Math.max(1, parseInt(item.pieces_per_pack) || 1);
                  const isPiece = item.sale_unit === 'piece' || item.sale_unit === 'loose';
                  const isMixed = item.sale_unit === 'mixed' || (item.packs_qty > 0 && item.units_qty > 0);

                  let unitLabel = '';
                  if (isMixed) {
                    const pk = item.packs_qty !== undefined ? item.packs_qty : Math.floor(parseFloat(item.quantity || 0));
                    const un = item.units_qty !== undefined ? item.units_qty : Math.round((parseFloat(item.quantity || 0) - pk) * ppp);
                    unitLabel = `${pk} Pk + ${un} ${item.form || 'Unit'}${un > 1 ? 's' : ''}`;
                  } else if (isPiece) {
                    const un = item.units_qty !== undefined ? item.units_qty : item.quantity;
                    unitLabel = `${un} ${item.form || 'Capsule'}${parseFloat(un) > 1 ? 's' : ''}`;
                  } else {
                    const pk = item.packs_qty !== undefined ? item.packs_qty : item.quantity;
                    unitLabel = `${formatQty(pk)} Pk`;
                  }

                  return (
                    <tr key={idx} className="py-1.5">
                      <td className="py-1.5 pr-1">
                        <div className="font-bold text-white print-text-dark flex items-center gap-1">
                          <span>{item.trade_name}</span>
                          {isPiece && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 print-text-dark">
                              Loose
                            </span>
                          )}
                          {isMixed && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 print-text-dark">
                              Pack+Loose
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 print-text-dark">
                          {item.dosage ? `${item.dosage} ` : ''}{item.generic_name ? `• ${item.generic_name}` : ''}
                        </div>
                      </td>
                      <td className="py-1.5 text-center font-mono font-bold print-text-dark text-teal-300 text-[11px]">
                        {unitLabel}
                      </td>
                      <td className="py-1.5 text-right font-mono text-slate-400 print-text-dark">
                        Rs. {parseFloat(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right font-mono font-bold text-white print-text-dark">
                        Rs. {parseFloat(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Totals */}
          <div className="pt-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400 print-text-dark text-[11px]">
              <span>Items / Total Units:</span>
              <span className="font-mono text-slate-300 print-text-dark">{totalItemsCount} items ({totalUnitsCount} units)</span>
            </div>
            <div className="flex justify-between text-slate-300 print-text-dark">
              <span>Gross Subtotal:</span>
              <span className="font-mono font-medium">Rs. {parseFloat(receipt.subtotal || receipt.total_amount).toFixed(2)}</span>
            </div>
            {parseFloat(receipt.discount || 0) > 0 && (
              <div className="flex justify-between text-rose-400 print-text-dark">
                <span>Special Discount:</span>
                <span className="font-mono font-semibold">-Rs. {parseFloat(receipt.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-white print-text-dark pt-2 border-t border-slate-700 print-border-dark">
              <span>NET PAYABLE:</span>
              <span className="font-mono text-emerald-400 print-text-dark">
                Rs. {parseFloat(receipt.total_amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Pharmacy Disclaimer */}
          <div className="text-center pt-3 pb-2 text-[10px] text-slate-400 print-text-dark border-t border-slate-800 print-border-dark mt-3 space-y-0.5">
            <p className="font-semibold text-slate-300 print-text-dark">Thank you for visiting One Ten Pharmacy!</p>
            <p>Medicines once sold cannot be returned without original computer receipt within 3 days.</p>
            <p>Cold-chain & cut-strip items are non-returnable.</p>
          </div>

          {/* ── COMPANY BRANDING FOOTER (100% TRANSPARENT VECTOR NEWARA LOGO) ── */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-700/80 print-border-dark text-center space-y-2">
            
            {/* Pure Transparent Vector Logo (No background / No checkerboard) */}
            <div className="flex justify-center items-center">
              <img
                src="/newara-logo-transparent.svg"
                alt="Newara Software Company"
                className="h-20 w-auto object-contain mx-auto transition-transform hover:scale-105"
              />
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 print-text-dark font-medium">
                Enterprise Pharmacy POS & ERP Systems
              </p>
              <p className="text-[9px] text-slate-500 print-text-dark font-mono font-bold">
                Helpline & Support: 0355-5456348 • www.newarasoftware.com
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons (Screen Only - No print) */}
        <div className="no-print p-4 bg-slate-900 border-t border-slate-800 flex gap-3 sticky bottom-0 z-10">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition shadow-sm border border-slate-700 active:scale-95"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 active:scale-95"
          >
            <span>Next Customer</span>
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
